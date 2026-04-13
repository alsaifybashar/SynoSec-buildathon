import type { DfsNode, Finding, Observation, OsiLayer, ToolRequest, ToolRun } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";
import { parseScanTarget } from "../tools/scan-tools.js";

export class L4Agent extends BaseAgent {
  readonly agentId = "l4-transport-agent";
  readonly layer: OsiLayer = "L4";

  async execute(node: DfsNode, context: AgentContext): Promise<AgentResult> {
    await this.audit(context.scanId, "l4-scan-start", node.id, {
      target: node.target,
      layer: node.layer
    });
    const parsedTarget = parseScanTarget(node.target);
    const explicitPort = parsedTarget.port;
    await this.audit(context.scanId, "l4-scan-complete", node.id, {
      requestedToolRuns: 1,
      childNodesCount: 0,
      childNodesDerivedFrom: "service_scan observations"
    });

    return {
      requestedToolRuns: [
        {
          tool: "nmap",
          adapter: "service_scan",
          target: node.target,
          layer: "L4",
          riskTier: "passive",
          justification: "Run an aggressive default-port discovery pass before queueing session, TLS, and application analysis.",
          parameters: explicitPort != null
            ? { ports: [String(explicitPort)], aggressive: true, scripts: "default" }
            : { aggressive: true, scripts: "default" }
        }
      ],
      childNodes: [],
      agentSummary: `Layer 4 queued aggressive default-port service discovery for ${node.target}; downstream nodes will be created from observed open services.`,
      isDone: false // signal that we want to analyze the results
    };
  }

  override async analyzeAndPlan(
    node: DfsNode,
    context: AgentContext,
    observations: Observation[],
    _findings: Array<Omit<Finding, "id" | "createdAt">>,
    iteration: number,
    toolRuns: ToolRun[]
  ): Promise<AgentResult> {
    const maxIterations = Number(process.env["AGENT_MAX_ITERATIONS"] ?? 3);
    if (iteration >= maxIterations) {
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: `Layer 4 analysis complete after ${iteration} iteration(s).`,
        isDone: true
      };
    }

    // --- Error recovery: NSE script engine failure ---
    // nmap is installed but /usr/share/nmap/nse_main.lua is missing.
    // Fall back to a plain port scan without scripts.
    const hasNseFailure = toolRuns.some(
      (toolRun) =>
        toolRun.status === "failed" &&
        (toolRun.statusReason?.includes("nse_main.lua") ||
          toolRun.statusReason?.includes("NSE runtime") ||
          toolRun.statusReason?.includes("script engine") ||
          toolRun.output?.includes("nse_main.lua"))
    );
    const alreadyRanNetworkScan = observations.some((o) => o.adapter === "network_scan");

    if (hasNseFailure && !alreadyRanNetworkScan) {
      await this.audit(context.scanId, "l4-nse-fallback", node.id, {
        reason: "NSE failure detected — retrying with basic network scan"
      });
      return {
        requestedToolRuns: [
          {
            tool: "nmap",
            adapter: "network_scan",
            target: node.target,
            layer: "L4",
            riskTier: "passive",
            justification:
              "NSE script engine unavailable — falling back to plain port sweep to identify open services.",
            parameters: { mode: "basic" }
          }
        ],
        childNodes: [],
        agentSummary:
          "NSE failure detected. Retrying with a basic port sweep (no script engine required).",
        isDone: false
      };
    }

    // --- LLM reasoning (when API key is available) ---
    if (process.env["ANTHROPIC_API_KEY"] && observations.length > 0) {
      try {
        const observationSummary = observations
          .map((o) => `[${o.adapter}] ${o.title}: ${o.summary}`)
          .join("\n");

        const attemptedAdapters = toolRuns.map((r) => r.adapter).join(", ") || "none";
        const maxIter = Number(process.env["AGENT_MAX_ITERATIONS"] ?? 3);
        const remainingIterations = maxIter - iteration;

        interface L4Analysis {
          isValid: boolean;
          reasoning: string;
          openServices: string[];
          shouldContinue: boolean;
          nextScan: {
            adapter: "service_scan" | "network_scan";
            justification: string;
            ports?: string[];
            scripts?: string;
          } | null;
        }

        const analysis = await this.generateJson<L4Analysis>({
          system:
            "You are a network penetration testing agent operating in an AI-driven iterative scan loop. " +
            "Analyze scan results and decide if a follow-up scan is needed to deepen port/service intelligence. " +
            "Return JSON only — no markdown.",
          user: [
            `Target: ${node.target} (Layer 4 transport scan)`,
            `Iteration: ${iteration} of ${maxIter} (${remainingIterations} remaining)`,
            `Adapters already run: ${attemptedAdapters}`,
            ``,
            `Observations:`,
            observationSummary,
            ``,
            `Answer:`,
            `1. Are the results valid and complete?`,
            `2. What open services have been confirmed?`,
            `3. Should we run another targeted scan? (e.g., specific port scripts, UDP scan, version-specific probes)`,
            ``,
            `Return JSON:`,
            `{`,
            `  "isValid": boolean,`,
            `  "reasoning": "string",`,
            `  "openServices": ["port/service"],`,
            `  "shouldContinue": boolean,`,
            `  "nextScan": null | { "adapter": "service_scan", "justification": "string", "ports": ["optional port list"], "scripts": "optional nmap scripts" }`,
            `}`
          ].join("\n"),
          maxTokens: 512
        });

        const agentSummary = `${analysis.reasoning} Open services: ${analysis.openServices.join(", ") || "none detected"}.`;

        if (!analysis.shouldContinue || !analysis.nextScan) {
          return {
            requestedToolRuns: [],
            childNodes: [],
            agentSummary,
            isDone: true
          };
        }

        // Queue the follow-up scan the LLM decided on
        const followUp: ToolRequest = {
          tool: "nmap",
          adapter: analysis.nextScan.adapter,
          target: node.target,
          layer: "L4",
          riskTier: "passive",
          justification: analysis.nextScan.justification,
          parameters: {
            ...(analysis.nextScan.ports?.length ? { ports: analysis.nextScan.ports } : {}),
            ...(analysis.nextScan.scripts ? { scripts: analysis.nextScan.scripts } : {}),
            aggressive: true
          }
        };

        return {
          requestedToolRuns: [followUp],
          childNodes: [],
          agentSummary: `${agentSummary} → Queuing follow-up: ${analysis.nextScan.justification}`,
          isDone: false
        };
      } catch (err) {
        console.warn(`[l4-agent] LLM analyzeAndPlan failed at iteration ${iteration}:`, err instanceof Error ? err.message : err);
        // LLM unavailable or returned invalid JSON — fall through to static summary
      }
    }

    // --- Static summary (no LLM) ---
    const openPortObservations = observations.filter((o) => o.adapter === "service_scan");
    const summary =
      openPortObservations.length > 0
        ? `Discovered ${openPortObservations.length} open service(s). Downstream L5/L6/L7 nodes will be derived from these observations.`
        : "No open services detected. Child node derivation may be skipped.";

    return {
      requestedToolRuns: [],
      childNodes: [],
      agentSummary: summary,
      isDone: true
    };
  }
}
