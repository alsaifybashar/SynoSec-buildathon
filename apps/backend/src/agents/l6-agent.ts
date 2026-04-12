import type { DfsNode, OsiLayer } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";
import { parseScanTarget } from "../tools/scan-tools.js";

// ---------------------------------------------------------------------------
// L6 Structured response from Claude
// ---------------------------------------------------------------------------

interface L6ClaudeResponse {
  findings: Array<{
    title: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    confidence: number;
    description: string;
    evidence: string;
    technique: string;
    reproduceCommand?: string;
  }>;
  tlsDetails: {
    version: string;
    certSubject?: string;
    certExpiry?: string;
    weakCiphers?: string[];
    grade?: string;
  };
  agentSummary: string;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

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

    let parsed: L6ClaudeResponse;
    const parsedTarget = parseScanTarget(node.target);
    const targetHost = parsedTarget.host;
    const port = node.port ?? parsedTarget.port ?? 443;
    const tools = this.createToolRunner(node, context);

    try {
      parsed = await this.runRealTlsInspection(targetHost, port, tools);
    } catch (err: unknown) {
      console.error("L6Agent tool error:", err instanceof Error ? err.message : err);
      parsed = {
        findings: [],
        tlsDetails: {
          version: "unknown"
        },
        agentSummary: `TLS inspection of ${targetHost}:${port} did not produce verifiable findings.`
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

    const childNodes: AgentResult["childNodes"] = [];

    await this.audit(context.scanId, "l6-scan-complete", node.id, {
      findingsCount: findings.length,
      tlsGrade: parsed.tlsDetails.grade,
      weakCiphersCount: parsed.tlsDetails.weakCiphers?.length ?? 0
    });

    return {
      findings,
      childNodes,
      agentSummary: parsed.agentSummary
    };
  }

  private async runRealTlsInspection(
    targetHost: string,
    port: number,
    tools: ReturnType<L6Agent["createToolRunner"]>
  ): Promise<L6ClaudeResponse> {
    const tls = await tools.inspectTls(targetHost, port);
    if (!tls.connected) {
      throw new Error(`TLS handshake failed for ${targetHost}:${port}`);
    }

    const evidence = [formatCommand(tls.argv), tls.stdout, tls.stderr].filter(Boolean).join("\n");
    const subject = firstMatch(evidence, /subject=([^\n]+)/i);
    const issuer = firstMatch(evidence, /issuer=([^\n]+)/i);
    const protocol = firstMatch(evidence, /Protocol version:\s*([^\n]+)/i) ?? "TLS";
    const cipher = firstMatch(evidence, /Ciphersuite:\s*([^\n]+)/i);
    const verifyError = firstMatch(evidence, /Verification error:\s*([^\n]+)/i);

    const findings: L6ClaudeResponse["findings"] = [
      {
        title: "TLS Service Detected",
        severity: "info",
        confidence: 0.98,
        description: `${targetHost}:${port} negotiated ${protocol}${cipher ? ` with ${cipher}` : ""}.`,
        evidence,
        technique: "TLS audit",
        reproduceCommand: tls.argv.join(" ")
      }
    ];

    if (subject || issuer) {
      findings.push({
        title: "Certificate Metadata Enumerated",
        severity: "info",
        confidence: 0.95,
        description: `Certificate details were retrievable${subject ? ` for ${subject}` : ""}${issuer ? ` and issued by ${issuer}` : ""}.`,
        evidence,
        technique: "Cert inspection",
        reproduceCommand: tls.argv.join(" ")
      });
    }

    if (verifyError) {
      findings.push({
        title: "TLS Certificate Validation Issue",
        severity: "medium",
        confidence: 0.92,
        description: `The TLS handshake reported a certificate validation problem: ${verifyError}.`,
        evidence,
        technique: "TLS audit",
        reproduceCommand: tls.argv.join(" ")
      });
    }

    return {
      findings,
      tlsDetails: {
        version: protocol,
        ...(subject ? { certSubject: subject } : {}),
        ...(issuer ? { grade: issuer.includes("Let's Encrypt") ? "B" : "C" } : {})
      },
      agentSummary: `TLS inspection of ${targetHost}:${port} completed using openssl.`
    };
  }
}

function formatCommand(argv: string[]): string {
  return `$ ${argv.join(" ")}`;
}

function firstMatch(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? null;
}
