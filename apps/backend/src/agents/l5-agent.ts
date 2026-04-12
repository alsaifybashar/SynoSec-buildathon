import type { DfsNode, OsiLayer } from "@synosec/contracts";
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
      agentSummary: `Layer 5 requested a constrained session audit for ${node.target}.`
    };
  }
}
