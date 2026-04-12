import type { DfsNode, OsiLayer } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";
import { parseScanTarget } from "../tools/scan-tools.js";

// ---------------------------------------------------------------------------
// L7 Structured response from Claude
// ---------------------------------------------------------------------------

interface L7ClaudeResponse {
  findings: Array<{
    title: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    confidence: number;
    description: string;
    evidence: string;
    technique: string;
    reproduceCommand?: string;
  }>;
  agentSummary: string;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

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

    const parsedTarget = parseScanTarget(node.target);
    const targetHost = parsedTarget.host;
    const targetPort = node.port ?? parsedTarget.port;
    const targetUrl = targetPort
      ? `${[443, 8443].includes(targetPort) ? "https" : "http"}://${targetHost}:${targetPort}`
      : `http://${targetHost}`;

    const service = node.service ?? "http";
    const isTelnet = service === "telnet" || node.port === 23;
    const isDatabase = node.port && [3306, 5432, 27017, 6379].includes(node.port);

    let parsed: L7ClaudeResponse;
    const tools = this.createToolRunner(node, context);

    try {
      if (isTelnet || isDatabase) {
        throw new Error(`No safe HTTP tooling available for ${service}`);
      }
      parsed = await this.runRealHttpChecks(targetUrl, targetHost, tools);
    } catch (err: unknown) {
      console.error("L7Agent tool error:", err instanceof Error ? err.message : err);
      parsed = {
        findings: [],
        agentSummary: `Application checks for ${node.target} did not produce verifiable findings.`
      };
    }

    const findings: AgentResult["findings"] = parsed.findings.map((f) => ({
      nodeId: node.id,
      scanId: context.scanId,
      agentId: this.agentId,
      severity: f.severity,
      confidence: f.confidence,
      title: f.title,
      description: f.description,
      evidence: f.evidence,
      technique: f.technique,
      ...(f.reproduceCommand ? { reproduceCommand: f.reproduceCommand } : {}),
      validated: false
    }));

    // L7 generally doesn't spawn further child nodes (it's the deepest layer in our model)
    const childNodes: AgentResult["childNodes"] = [];

    await this.audit(context.scanId, "l7-scan-complete", node.id, {
      findingsCount: findings.length,
      criticalCount: findings.filter((f) => f.severity === "critical").length,
      highCount: findings.filter((f) => f.severity === "high").length
    });

    return {
      findings,
      childNodes,
      agentSummary: parsed.agentSummary
    };
  }

  private async runRealHttpChecks(
    targetUrl: string,
    targetHost: string,
    tools: ReturnType<L7Agent["createToolRunner"]>
  ): Promise<L7ClaudeResponse> {
    const findings: L7ClaudeResponse["findings"] = [];
    const headers = await tools.fetchHttpHeaders(targetUrl);
    if (headers.statusCode == null) {
      throw new Error(`No HTTP response from ${targetUrl}`);
    }

    const evidence = [formatCommand(headers.argv), headers.stdout].filter(Boolean).join("\n");
    const missingHeaders = ["strict-transport-security", "content-security-policy", "x-frame-options"]
      .filter((header) => headers.headers[header] == null);

    if (missingHeaders.length > 0) {
      findings.push({
        title: "Missing Security Headers",
        severity: "low",
        confidence: 0.99,
        description: `${targetHost} is missing important HTTP security headers: ${missingHeaders.join(", ")}.`,
        evidence,
        technique: "Header audit",
        reproduceCommand: headers.argv.join(" ")
      });
    }

    const leakedHeaders = ["server", "x-powered-by"]
      .filter((header) => headers.headers[header] != null)
      .map((header) => `${header}: ${headers.headers[header]}`);
    if (leakedHeaders.length > 0) {
      findings.push({
        title: "Server Version Disclosure",
        severity: "info",
        confidence: 0.99,
        description: "Server-side technology details are exposed in HTTP response headers.",
        evidence: [evidence, leakedHeaders.join("\n")].join("\n"),
        technique: "Tech fingerprint",
        reproduceCommand: headers.argv.join(" ")
      });
    }

    for (const path of ["/robots.txt", "/login", "/admin"]) {
      const response = await tools.fetchHttpPath(targetUrl, path);
      if (response.statusCode != null && [200, 301, 302, 401, 403].includes(response.statusCode)) {
        findings.push({
          title: `Interesting Application Path: ${path}`,
          severity: response.statusCode === 200 ? "medium" : "info",
          confidence: 0.9,
          description: `${path} responded with HTTP ${response.statusCode}. This endpoint should be reviewed during manual validation.`,
          evidence: [formatCommand(response.argv), response.stdout].filter(Boolean).join("\n"),
          technique: "Auth bypass",
          reproduceCommand: response.argv.join(" ")
        });
      }
    }

    if (findings.length === 0) {
      findings.push({
        title: "HTTP Service Reachable",
        severity: "info",
        confidence: 0.95,
        description: `${targetUrl} returned HTTP ${headers.statusCode}.`,
        evidence,
        technique: "Header audit",
        reproduceCommand: headers.argv.join(" ")
      });
    }

    return {
      findings,
      agentSummary: `Application checks against ${targetUrl} completed using curl-based probes.`
    };
  }
}

function formatCommand(argv: string[]): string {
  return `$ ${argv.join(" ")}`;
}
