import type { DfsNode, Finding, Observation, OsiLayer, ToolRun } from "@synosec/contracts";
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
          justification: "Run an aggressive full-port discovery pass before queueing session, TLS, and application analysis.",
          parameters: explicitPort != null
            ? { ports: [String(explicitPort)], aggressive: true, scripts: "default" }
            : { fullPortScan: true, aggressive: true, scripts: "default" }
        }
      ],
      childNodes: [],
      agentSummary: `Layer 4 queued aggressive service discovery for ${node.target}; downstream nodes will be created from observed open services.`,
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
    // Only run one follow-up iteration
    if (iteration >= 2) {
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: "Layer 4 analysis complete.",
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

        interface L4Analysis {
          isValid: boolean;
          reasoning: string;
          openServices: string[];
          needsFollowUp: boolean;
        }

        const analysis = await this.generateJson<L4Analysis>({
          system:
            "You are a network penetration testing agent. Analyze nmap scan results. Return JSON only — no markdown.",
          user: `Target: ${node.target} (Layer 4 service scan)\n\nObservations:\n${observationSummary}\n\nAnswer:\n1. Is this output valid and reasonable?\n2. What open services were discovered?\n3. Are any results suspicious or worth a follow-up scan?\n\nReturn JSON: { "isValid": boolean, "reasoning": "string", "openServices": ["string"], "needsFollowUp": boolean }`,
          maxTokens: 512
        });

        return {
          requestedToolRuns: [],
          childNodes: [],
          agentSummary: `${analysis.reasoning} Open services: ${analysis.openServices.join(", ") || "none detected"}.`,
          isDone: true
        };
      } catch {
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
