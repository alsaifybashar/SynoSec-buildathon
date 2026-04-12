import type { DfsNode, OsiLayer } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";

export class L7Agent extends BaseAgent {
  readonly agentId = "l7-application-agent";
  readonly layer: OsiLayer = "L7";

  async execute(node: DfsNode, context: AgentContext): Promise<AgentResult> {
    await this.audit(context.scanId, "l7-scan-start", node.id, {
      target: node.target,
      layer: node.layer,
      service: node.service,
      port: node.port
    });
    const service = node.service ?? "http";
    const isDatabase = node.port && [3306, 5432, 27017, 6379].includes(node.port);
    await this.audit(context.scanId, "l7-scan-complete", node.id, {
      requestedToolRuns: isDatabase ? 2 : 3,
      service
    });

    return {
      requestedToolRuns: isDatabase
        ? [
            {
              tool: "nmap",
              adapter: "service_scan",
              target: node.target,
              ...(node.port !== undefined ? { port: node.port } : {}),
              service,
              layer: "L7",
              riskTier: "passive",
              justification: "Confirm the database-facing application surface before injection testing.",
              parameters: { detect: "version" }
            },
            {
              tool: "sqlmap",
              adapter: "db_injection_check",
              target: node.target,
              ...(node.port !== undefined ? { port: node.port } : {}),
              service,
              layer: "L7",
              riskTier: "active",
              justification: "Run constrained SQL injection validation against the in-scope target.",
              parameters: { level: 1, risk: 1, batch: true }
            }
          ]
        : [
            {
              tool: "curl",
              adapter: "http_probe",
              target: node.target,
              port: node.port ?? 80,
              service,
              layer: "L7",
              riskTier: "passive",
              justification: "Collect HTTP header and route evidence for application-layer risk analysis.",
              parameters: { paths: ["/", "/admin"] }
            },
            {
              tool: "whatweb",
              adapter: "web_fingerprint",
              target: node.target,
              port: node.port ?? 80,
              service,
              layer: "L7",
              riskTier: "passive",
              justification: "Fingerprint the application stack to guide follow-on validation.",
              parameters: { aggressive: false }
            },
            {
              tool: "ffuf",
              adapter: "content_discovery",
              target: node.target,
              port: node.port ?? 80,
              service,
              layer: "L7",
              riskTier: context.scope.allowActiveExploits ? "controlled-exploit" : "active",
              justification: "Enumerate in-scope content and debug surfaces with constrained wordlists.",
              parameters: { wordlist: "common.txt", limit: 25 }
            }
          ],
      childNodes: [],
      agentSummary: `Layer 7 converted application analysis for ${node.target} into brokered tool requests with evidence capture.`
    };
  }
}
