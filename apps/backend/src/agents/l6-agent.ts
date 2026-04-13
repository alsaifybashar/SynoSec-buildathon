import type { DfsNode, Finding, Observation, OsiLayer, ToolRun } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";

export class L6Agent extends BaseAgent {
  readonly agentId = "l6-presentation-agent";
  readonly layer: OsiLayer = "L6";

  async execute(node: DfsNode, context: AgentContext): Promise<AgentResult> {
    await this.audit(context.scanId, "l6-scan-start", node.id, {
      target: node.target,
      layer: node.layer,
      service: node.service,
      port: node.port
    });
    await this.audit(context.scanId, "l6-scan-complete", node.id, {
      requestedToolRuns: 1,
      port: node.port ?? 443
    });

    return {
      requestedToolRuns: [
        {
          tool: "sslscan",
          adapter: "tls_audit",
          target: node.target,
          port: node.port ?? 443,
          service: node.service ?? "https",
          layer: "L6",
          riskTier: "active",
          justification: "Collect protocol and certificate evidence before trusting TLS findings.",
          parameters: { scripts: ["ssl-enum-ciphers"] }
        }
      ],
      childNodes: [],
      agentSummary: `Layer 6 requested a TLS audit for ${node.target}:${node.port ?? 443}.`,
      isDone: false // signal: analyze results and decide follow-up
    };
  }

  override async analyzeAndPlan(
    node: DfsNode,
    context: AgentContext,
    observations: Observation[],
    _findings: Array<Omit<Finding, "id" | "createdAt">>,
    iteration: number,
    _toolRuns: ToolRun[]
  ): Promise<AgentResult> {
    const maxIterations = Number(process.env["AGENT_MAX_ITERATIONS"] ?? 3);
    if (iteration >= maxIterations) {
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: `Layer 6 TLS analysis complete after ${iteration} iteration(s).`,
        isDone: true
      };
    }

    if (!process.env["ANTHROPIC_API_KEY"] || observations.length === 0) {
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: "Layer 6 TLS audit complete. No additional cipher/certificate checks needed.",
        isDone: true
      };
    }

    try {
      const observationSummary = observations
        .map((o) => `[${o.adapter}] ${o.title}: ${o.summary}\nEvidence: ${o.evidence.slice(0, 400)}`)
        .join("\n---\n");

      interface L6Analysis {
        insights: string;
        weaknesses: string[];
        certificateIssues: string[];
        shouldContinue: boolean;
        nextAction: string | null;
      }

      const port = node.port ?? 443;

      const analysis = await this.generateJson<L6Analysis>({
        system:
          "You are a TLS/SSL security auditor. Analyze TLS scan results and identify cipher weaknesses, cert chain issues, and protocol version problems. " +
          "Return JSON only — no markdown.",
        user: [
          `Target: ${node.target}:${port} (TLS/SSL layer)`,
          `Iteration: ${iteration} of ${maxIterations}`,
          ``,
          `TLS audit observations:`,
          observationSummary,
          ``,
          `Analyze:`,
          `1. What TLS weaknesses were found (weak ciphers, old protocols, cert issues)?`,
          `2. Are there expired, self-signed, or misconfigured certificates?`,
          `3. Is a follow-up check warranted (e.g., specific cipher enumeration, HSTS check)?`,
          ``,
          `Return JSON:`,
          `{ "insights": "string", "weaknesses": ["cipher/protocol issues"], "certificateIssues": ["cert problems"], "shouldContinue": boolean, "nextAction": "what to check next or null" }`
        ].join("\n"),
        maxTokens: 512
      });

      const summary = [
        `[L6 iter ${iteration}] ${analysis.insights}`,
        analysis.weaknesses.length > 0 ? `Weak: ${analysis.weaknesses.join(", ")}` : null,
        analysis.certificateIssues.length > 0 ? `Cert issues: ${analysis.certificateIssues.join(", ")}` : null
      ].filter(Boolean).join(" | ");

      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: summary,
        isDone: true
      };
    } catch (err) {
      console.warn(`[l6-agent] LLM analyzeAndPlan failed at iteration ${iteration}:`, err instanceof Error ? err.message : err);
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: "Layer 6 TLS analysis complete.",
        isDone: true
      };
    }
  }
}
