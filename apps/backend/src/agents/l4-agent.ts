import type { DfsNode, OsiLayer } from "@synosec/contracts";
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
    const candidatePorts = explicitPort != null
      ? [String(explicitPort)]
      : ["22", "80", "443", "445", "5432"];
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
          justification: "Identify exposed services before queueing session, TLS, and application analysis.",
          parameters: { ports: candidatePorts }
        }
      ],
      childNodes: [],
      agentSummary: `Layer 4 queued service discovery for ${node.target}; downstream nodes will be created from observed open services.`
    };
  }
}
