import type { DfsNode, OsiLayer } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";

export class L3Agent extends BaseAgent {
  readonly agentId = "l3-network-agent";
  readonly layer: OsiLayer = "L3";

  async execute(node: DfsNode, context: AgentContext): Promise<AgentResult> {
    await this.audit(context.scanId, "l3-scan-start", node.id, {
      target: node.target,
      layer: node.layer
    });
    await this.audit(context.scanId, "l3-scan-complete", node.id, {
      requestedToolRuns: 1,
      nextLayer: "L4"
    });

    return {
      requestedToolRuns: [
        {
          tool: "nmap",
          adapter: "network_scan",
          target: node.target,
          layer: "L3",
          riskTier: "passive",
          justification: "Confirm reachability before deeper transport and application scans.",
          parameters: { mode: "icmp" }
        }
      ],
      childNodes: [
        {
          target: node.target,
          layer: "L4",
          riskScore: 0.65,
          status: "pending",
          depth: node.depth + 1
        }
      ],
      agentSummary: `Layer 3 queued evidence-backed network reconnaissance for ${node.target}.`
    };
  }
}
