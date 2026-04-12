import type { DfsNode, OsiLayer } from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";

// ---------------------------------------------------------------------------
// L3 Structured response from Claude
// ---------------------------------------------------------------------------

interface L3ClaudeResponse {
  findings: Array<{
    title: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    confidence: number;
    description: string;
    evidence: string;
    technique: string;
    reproduceCommand?: string;
  }>;
  discoveredHosts: string[];
  agentSummary: string;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class L3Agent extends BaseAgent {
  readonly agentId = "l3-network-agent";
  readonly layer: OsiLayer = "L3";

  async execute(node: DfsNode, context: AgentContext): Promise<AgentResult> {
    await this.audit(context.scanId, "l3-scan-start", node.id, {
      target: node.target,
      layer: node.layer
    });

    const systemPrompt = `You are a network reconnaissance agent operating at OSI Layer 3 (Network Layer).
You simulate realistic penetration testing activities including ICMP ping sweeps, traceroutes, and OS fingerprinting.
Your findings must be technically accurate and realistic for a professional penetration test.
Respond ONLY with valid JSON, no markdown code blocks, no explanation.`;

    const userPrompt = `Perform a Layer 3 network reconnaissance against target: ${node.target}

Simulate the following techniques:
1. ICMP ping sweep to discover live hosts in the target range
2. Traceroute to map routing hops and network topology
3. OS fingerprinting based on TTL values and TCP/IP stack behavior

Previous context from orchestrator:
${context.roundSummary || "No previous analysis available. This is the first round."}

Scope targets: ${context.scope.targets.join(", ")}

Return ONLY this JSON structure:
{
  "findings": [
    {
      "title": "string",
      "severity": "info|low|medium|high|critical",
      "confidence": 0.0-1.0,
      "description": "string",
      "evidence": "simulated tool output showing command and results",
      "technique": "ICMP sweep | Traceroute | OS fingerprint",
      "reproduceCommand": "optional nmap or ping command"
    }
  ],
  "discoveredHosts": ["ip1", "ip2"],
  "agentSummary": "brief paragraph summarizing what was found"
}

Produce 2-4 findings. Include at least one finding per technique used. Make the evidence field look like real terminal output.`;

    let parsed: L3ClaudeResponse;

    try {
      parsed = await this.generateJson<L3ClaudeResponse>({
        system: systemPrompt,
        user: userPrompt,
        maxTokens: 2048
      });
    } catch (err: unknown) {
      console.error("L3Agent LLM error:", err instanceof Error ? err.message : err);
      // Fallback findings
      parsed = {
        findings: [
          {
            title: "ICMP Ping Sweep Completed",
            severity: "info",
            confidence: 0.9,
            description: `Ping sweep of ${node.target} identified reachable hosts.`,
            evidence: `$ nmap -sn ${node.target}\nHost 192.168.1.1 is up (0.0012s latency)\nHost 192.168.1.10 is up (0.0020s latency)`,
            technique: "ICMP sweep",
            reproduceCommand: `nmap -sn ${node.target}`
          }
        ],
        discoveredHosts: [node.target.replace("/24", ".1"), node.target.replace("/24", ".10")],
        agentSummary: `Layer 3 reconnaissance of ${node.target} completed. Hosts discovered.`
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

    // Build child nodes for discovered hosts → L4 layer
    const childNodes: AgentResult["childNodes"] = [];
    const scopedHosts = parsed.discoveredHosts.filter((host) =>
      this.validateScope(host, context.scope)
    );

    for (const host of scopedHosts) {
      // Determine risk: internet-facing vs internal
      const isInternetFacing =
        !host.startsWith("192.168.") &&
        !host.startsWith("10.") &&
        !host.startsWith("172.16.") &&
        !host.includes("local");
      const riskScore = isInternetFacing ? 0.7 : 0.4;

      childNodes.push({
        target: host,
        layer: "L4",
        riskScore,
        status: "pending",
        depth: node.depth + 1
      });
    }

    await this.audit(context.scanId, "l3-scan-complete", node.id, {
      findingsCount: findings.length,
      discoveredHosts: parsed.discoveredHosts,
      childNodesCount: childNodes.length
    });

    return {
      findings,
      childNodes,
      agentSummary: parsed.agentSummary
    };
  }
}
