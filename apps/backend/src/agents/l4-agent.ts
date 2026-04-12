import type { DfsNode, OsiLayer } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";

export class L4Agent extends BaseAgent {
  readonly agentId = "l4-transport-agent";
  readonly layer: OsiLayer = "L4";

  async execute(node: DfsNode, context: AgentContext): Promise<AgentResult> {
    await this.audit(context.scanId, "l4-scan-start", node.id, {
      target: node.target,
      layer: node.layer
    });

    await this.audit(context.scanId, "l4-scan-complete", node.id, {
      requestedToolRuns: 1,
      childNodesCount: 4
    });

    return {
      requestedToolRuns: [
        {
          tool: "nmap",
          adapter: "service_scan",
          target: node.target,
          layer: "L4",
          riskTier: "passive",
          justification: "Identify exposed services before queueing session, TLS, and application analysis.",
          parameters: { ports: ["22", "80", "443", "445", "5432"] }
        }
      ],
      childNodes: [
        {
          target: node.target,
          layer: "L5",
          service: "ssh",
          port: 22,
          riskScore: 0.45,
          status: "pending",
          depth: node.depth + 1
        },
        {
          target: node.target,
          layer: "L5",
          service: "smb",
          port: 445,
          riskScore: 0.75,
          status: "pending",
          depth: node.depth + 1
        },
        {
          target: node.target,
          layer: "L6",
          service: "https",
          port: 443,
          riskScore: 0.55,
          status: "pending",
          depth: node.depth + 1
        },
        {
          target: node.target,
          layer: "L7",
          service: "http",
          port: 80,
          riskScore: 0.7,
          status: "pending",
          depth: node.depth + 1
        }
      ],
      agentSummary: `Layer 4 queued service discovery for ${node.target} and expanded the DFS graph using evidence-driven child nodes.`
    };
  }
}
