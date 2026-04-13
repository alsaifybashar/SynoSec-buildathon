import type { DfsNode, Finding, Observation, OsiLayer, ToolRun } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";

export class L5Agent extends BaseAgent {
  readonly agentId = "l5-session-agent";
  readonly layer: OsiLayer = "L5";

  async execute(node: DfsNode, context: AgentContext): Promise<AgentResult> {
    await this.audit(context.scanId, "l5-scan-start", node.id, {
      target: node.target,
      layer: node.layer,
      service: node.service,
      port: node.port
    });

    await this.audit(context.scanId, "l5-scan-complete", node.id, {
      requestedToolRuns: 1,
      service: node.service ?? "ssh"
    });

    return {
      requestedToolRuns: [
        {
          tool: node.service === "smb" ? "smbclient" : "ssh-audit",
          adapter: "session_audit",
          target: node.target,
          ...(node.port !== undefined ? { port: node.port } : {}),
          ...(node.service ? { service: node.service } : {}),
          layer: "L5",
          riskTier: "active",
          justification: "Validate session-layer exposure with constrained enumeration.",
          parameters: { authentication: "none" }
        }
      ],
      childNodes: [],
      agentSummary: `Layer 5 requested a constrained session audit for ${node.target}.`,
      isDone: false // signal: analyze results and decide follow-up
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
        agentSummary: `Layer 5 analysis complete after ${iteration} iteration(s).`,
        isDone: true
      };
    }

    if (!process.env["ANTHROPIC_API_KEY"] || observations.length === 0) {
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: "Layer 5 session audit complete. No further session-layer probing needed.",
        isDone: true
      };
    }

    try {
      const observationSummary = observations
        .map((o) => `[${o.adapter}] ${o.title}: ${o.summary}\nEvidence: ${o.evidence.slice(0, 300)}`)
        .join("\n---\n");

      interface L5Analysis {
        insights: string;
        sessionVulnerabilities: string[];
        shouldContinue: boolean;
        nextCheck: string | null;
      }

      const analysis = await this.generateJson<L5Analysis>({
        system:
          "You are a session-layer penetration tester. Analyze SSH/SMB audit results and decide if follow-up session probing is warranted. " +
          "Return JSON only — no markdown.",
        user: [
          `Target: ${node.target}:${node.port ?? "default"} (${node.service ?? "ssh"})`,
          `Iteration: ${iteration} of ${maxIterations}`,
          ``,
          `Session audit observations:`,
          observationSummary,
          ``,
          `Questions:`,
          `1. Were session vulnerabilities (weak algorithms, anonymous sessions, default creds) found?`,
          `2. Is there value in a follow-up deep probe (e.g., null session enumeration, NetBIOS lookup)?`,
          `3. Summarize what was found and whether to continue.`,
          ``,
          `Return JSON:`,
          `{ "insights": "string", "sessionVulnerabilities": ["string"], "shouldContinue": boolean, "nextCheck": "description of next action or null" }`
        ].join("\n"),
        maxTokens: 512
      });

      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: `[L5 iter ${iteration}] ${analysis.insights}${analysis.sessionVulnerabilities.length > 0 ? ` Vulnerabilities: ${analysis.sessionVulnerabilities.join(", ")}.` : ""}`,
        isDone: true // L5 doesn't queue additional tool runs — findings are passed to graph
      };
    } catch (err) {
      console.warn(`[l5-agent] LLM analyzeAndPlan failed at iteration ${iteration}:`, err instanceof Error ? err.message : err);
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: "Layer 5 session audit analysis complete.",
        isDone: true
      };
    }
  }
}
