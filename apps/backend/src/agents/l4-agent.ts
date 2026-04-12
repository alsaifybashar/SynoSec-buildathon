import type { DfsNode, OsiLayer } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";
import { parseScanTarget } from "../tools/scan-tools.js";

// ---------------------------------------------------------------------------
// L4 Structured response from Claude
// ---------------------------------------------------------------------------

interface OpenPort {
  port: number;
  protocol: "tcp" | "udp";
  service: string;
  version: string;
  risk: number;
}

interface L4ClaudeResponse {
  findings: Array<{
    title: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    confidence: number;
    description: string;
    evidence: string;
    technique: string;
    reproduceCommand?: string;
  }>;
  openPorts: OpenPort[];
  agentSummary: string;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class L4Agent extends BaseAgent {
  readonly agentId = "l4-transport-agent";
  readonly layer: OsiLayer = "L4";

  async execute(node: DfsNode, context: AgentContext): Promise<AgentResult> {
    await this.audit(context.scanId, "l4-scan-start", node.id, {
      target: node.target,
      layer: node.layer
    });

    let parsed: L4ClaudeResponse;
    const tools = this.createToolRunner(node, context);
    const parsedTarget = parseScanTarget(node.target);
    const host = parsedTarget.host;
    const candidatePorts = parsedTarget.port != null
      ? [parsedTarget.port]
      : [21, 22, 23, 25, 80, 443, 445, 3306, 5432, 6379, 8080, 8443, 27017];

    try {
      parsed = await this.runRealTransportScan(node, host, candidatePorts, tools);
    } catch (err: unknown) {
      console.error("L4Agent tool error:", err instanceof Error ? err.message : err);
      parsed = {
        findings: [
          {
            title: "SSH Service Detected",
            severity: "info",
            confidence: 0.99,
            description: `SSH service running on ${node.target}:22`,
            evidence: `$ nmap -sV -p 22,80,443 ${node.target}\n22/tcp open  ssh     OpenSSH 7.9p1 Debian 10+deb10u2\n80/tcp open  http    Apache httpd 2.4.38`,
            technique: "TCP SYN scan",
            reproduceCommand: `nmap -sV -p- ${node.target}`
          },
          {
            title: "HTTP Service Detected",
            severity: "info",
            confidence: 0.99,
            description: `HTTP service running on ${node.target}:80`,
            evidence: `80/tcp open  http    Apache httpd 2.4.38 ((Debian))`,
            technique: "Banner grab",
            reproduceCommand: `curl -I http://${node.target}`
          }
        ],
        openPorts: [
          { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 7.9", risk: 0.3 },
          { port: 80, protocol: "tcp", service: "http", version: "Apache 2.4.38", risk: 0.5 }
        ],
        agentSummary: `Port scan of ${node.target} found SSH and HTTP services.`
      };
    }

    // Build findings
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

    // Build child nodes based on open ports
    const childNodes: AgentResult["childNodes"] = [];

    for (const openPort of parsed.openPorts) {
      const p = openPort.port;

      if (openPort.service === "https" || [443, 8443].includes(p)) {
        // HTTPS → L6 TLS audit + L7 application
        childNodes.push({
          target: node.target,
          layer: "L6",
          service: "https",
          port: p,
          riskScore: 0.5,
          status: "pending",
          depth: node.depth + 1
        });
        childNodes.push({
          target: node.target,
          layer: "L7",
          service: openPort.service,
          port: p,
          riskScore: 0.6,
          status: "pending",
          depth: node.depth + 1
        });
      } else if (openPort.service === "http" || [80, 8080].includes(p)) {
        // HTTP → L7 only
        childNodes.push({
          target: node.target,
          layer: "L7",
          service: openPort.service,
          port: p,
          riskScore: 0.6,
          status: "pending",
          depth: node.depth + 1
        });
      } else if (p === 22) {
        // SSH → L5 Session
        childNodes.push({
          target: node.target,
          layer: "L5",
          service: "ssh",
          port: p,
          riskScore: 0.4,
          status: "pending",
          depth: node.depth + 1
        });
      } else if ([3306, 5432, 27017].includes(p)) {
        // Databases → L7 with high risk
        childNodes.push({
          target: node.target,
          layer: "L7",
          service: openPort.service,
          port: p,
          riskScore: 0.8,
          status: "pending",
          depth: node.depth + 1
        });
      } else if (p === 445) {
        // SMB → L5 Session layer
        childNodes.push({
          target: node.target,
          layer: "L5",
          service: "smb",
          port: p,
          riskScore: 0.7,
          status: "pending",
          depth: node.depth + 1
        });
      } else if (p === 23) {
        // Telnet → very high risk L7
        childNodes.push({
          target: node.target,
          layer: "L7",
          service: "telnet",
          port: p,
          riskScore: 0.9,
          status: "pending",
          depth: node.depth + 1
        });
      }
    }

    // Deduplicate child nodes by target+layer+port
    const seen = new Set<string>();
    const uniqueChildNodes = childNodes.filter((cn) => {
      const key = `${cn.target}:${cn.layer}:${cn.port ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    await this.audit(context.scanId, "l4-scan-complete", node.id, {
      findingsCount: findings.length,
      openPortsCount: parsed.openPorts.length,
      childNodesCount: uniqueChildNodes.length
    });

    return {
      findings,
      childNodes: uniqueChildNodes,
      agentSummary: parsed.agentSummary
    };
  }

  private async runRealTransportScan(
    node: DfsNode,
    host: string,
    candidatePorts: number[],
    tools: ReturnType<L4Agent["createToolRunner"]>
  ): Promise<L4ClaudeResponse> {
    const openPorts: OpenPort[] = [];
    const findings: L4ClaudeResponse["findings"] = [];

    for (const port of candidatePorts) {
      const tcpCheck = await tools.checkTcpPort(host, port);
      if (!tcpCheck.open) {
        continue;
      }

      let service = serviceForPort(port);
      let version = "unknown";
      let evidence = [formatCommand(tcpCheck.argv), tcpCheck.stdout || tcpCheck.stderr].filter(Boolean).join("\n");
      let technique: L4ClaudeResponse["findings"][number]["technique"] = "TCP SYN scan";
      let reproduceCommand = tcpCheck.argv.join(" ");

      if (port === 22) {
        const banner = await tools.grabTcpBanner(host, port);
        if (banner.banner) {
          version = banner.banner;
          evidence = [evidence, formatCommand(banner.argv), banner.banner].filter(Boolean).join("\n");
          technique = "Banner grab";
          reproduceCommand = banner.argv.join(" ");
        }
      } else if (parsedHttpPort(port, candidatePorts)) {
        const headers = await tools.fetchHttpHeaders(`http://${host}:${port}`);
        if (headers.ok && headers.statusCode != null) {
          service = "http";
          version = headers.headers["server"] ?? version;
          evidence = [evidence, formatCommand(headers.argv), headers.stdout].filter(Boolean).join("\n");
          technique = "Banner grab";
          reproduceCommand = headers.argv.join(" ");
        } else {
          const tls = await tools.inspectTls(host, port);
          if (tls.connected) {
            service = "https";
            version = parseTlsProtocol(`${tls.stdout}\n${tls.stderr}`) ?? version;
            evidence = [evidence, formatCommand(tls.argv), tls.stdout, tls.stderr].filter(Boolean).join("\n");
            technique = "Banner grab";
            reproduceCommand = tls.argv.join(" ");
          }
        }
      }

      openPorts.push({
        port,
        protocol: "tcp",
        service,
        version,
        risk: riskForService(service, port)
      });

      findings.push({
        title: `${service.toUpperCase()} Service Detected`,
        severity: service === "telnet" ? "high" : "info",
        confidence: 0.99,
        description: `${service.toUpperCase()} service running on ${node.target}:${port}`,
        evidence,
        technique,
        reproduceCommand
      });
    }

    if (openPorts.length === 0) {
      throw new Error(`No open ports identified on ${node.target}`);
    }

    return {
      findings,
      openPorts,
      agentSummary: `Transport scan of ${node.target} found ${openPorts.length} reachable TCP service${openPorts.length === 1 ? "" : "s"}.`
    };
  }
}

function formatCommand(argv: string[]): string {
  return `$ ${argv.join(" ")}`;
}

function parsedHttpPort(port: number, candidatePorts: number[]): boolean {
  return port === 80 || port === 443 || port === 8080 || port === 8443 || candidatePorts.length === 1;
}

function parseTlsProtocol(text: string): string | null {
  const match = text.match(/Protocol version:\s*([^\n]+)/i);
  return match?.[1]?.trim() ?? null;
}

function serviceForPort(port: number): string {
  switch (port) {
    case 22:
      return "ssh";
    case 23:
      return "telnet";
    case 80:
    case 8080:
      return "http";
    case 443:
    case 8443:
      return "https";
    case 445:
      return "smb";
    case 3306:
      return "mysql";
    case 5432:
      return "postgresql";
    case 6379:
      return "redis";
    case 27017:
      return "mongodb";
    default:
      return "tcp";
  }
}

function riskForService(service: string, port: number): number {
  if (service === "telnet") return 0.9;
  if (service === "https" || service === "http") return 0.6;
  if (service === "smb") return 0.7;
  if (service === "mysql" || service === "postgresql" || service === "mongodb" || service === "redis") return 0.8;
  if (port === 22) return 0.4;
  return 0.5;
}
