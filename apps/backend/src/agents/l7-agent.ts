import type { DfsNode, OsiLayer } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";

const DATABASE_PORTS = new Set([3306, 5432, 27017, 6379]);

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
    const isDatabase = node.port !== undefined && DATABASE_PORTS.has(node.port);

    const requestedToolRuns = isDatabase
      ? this.buildDatabaseRequests(node)
      : this.buildWebRequests(node, context);

    await this.audit(context.scanId, "l7-scan-complete", node.id, {
      requestedToolRuns: requestedToolRuns.length,
      service,
      isDatabase
    });

    return {
      requestedToolRuns,
      childNodes: [],
      agentSummary: `Layer 7 queued ${requestedToolRuns.length} tool requests for ${node.target} (${service}).`
    };
  }

  private buildDatabaseRequests(node: DfsNode) {
    return [
      {
        tool: "nmap",
        adapter: "service_scan" as const,
        target: node.target,
        ...(node.port !== undefined ? { port: node.port } : {}),
        service: node.service ?? "db",
        layer: "L7" as const,
        riskTier: "passive" as const,
        justification: "Confirm database version and exposure before injection testing.",
        parameters: { detect: "version" }
      },
      {
        tool: "sqlmap",
        adapter: "db_injection_check" as const,
        target: node.target,
        ...(node.port !== undefined ? { port: node.port } : {}),
        service: node.service ?? "db",
        layer: "L7" as const,
        riskTier: "active" as const,
        justification: "Run constrained SQL injection validation against the in-scope target.",
        parameters: { level: 1, risk: 1, batch: true }
      }
    ];
  }

  private buildWebRequests(node: DfsNode, context: AgentContext) {
    const port = node.port ?? 80;
    const service = node.service ?? "http";
    const allowActive = context.scope.allowActiveExploits === true;

    return [
      // 1. HTTP header audit + known-path probing
      {
        tool: "curl",
        adapter: "http_probe" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "passive" as const,
        justification: "Collect HTTP header evidence and probe known sensitive paths.",
        parameters: { paths: ["/", "/admin", "/api/users", "/files", "/login", "/search"] }
      },
      // 2. Technology fingerprinting
      {
        tool: "whatweb",
        adapter: "web_fingerprint" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "passive" as const,
        justification: "Identify application stack and version disclosures.",
        parameters: { aggressive: false }
      },
      // 3. Nikto vulnerability scan
      {
        tool: "nikto",
        adapter: "nikto_scan" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "active" as const,
        justification: "Run comprehensive web vulnerability checks including outdated software and misconfigurations.",
        parameters: { tuning: "x 6 2", timeout: 30 }
      },
      // 4. Content discovery
      {
        tool: "ffuf",
        adapter: "content_discovery" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: allowActive ? "active" as const : "passive" as const,
        justification: "Enumerate in-scope paths and hidden endpoints.",
        parameters: { wordlist: "common.txt", limit: 50 }
      },
      // 5. Nuclei template scan (active — conditional)
      {
        tool: "nuclei",
        adapter: "nuclei_scan" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "active" as const,
        justification: "Run nuclei templates for CVEs, misconfigurations, and exposed panels.",
        parameters: { severity: "medium,high,critical", timeout: 30 }
      },
      // 6. XSS + injection quick checks
      {
        tool: "curl",
        adapter: "vuln_check" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "active" as const,
        justification: "Test for XSS reflection, CORS misconfiguration, and sensitive data exposure.",
        parameters: { checks: ["xss", "cors", "data_exposure", "sqli_error"] }
      }
    ];
  }
}
