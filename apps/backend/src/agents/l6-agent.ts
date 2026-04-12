import type { DfsNode, OsiLayer } from "@synosec/contracts";
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
      agentSummary: `Layer 6 requested a TLS audit for ${node.target}:${node.port ?? 443}.`
    };
  }
}
