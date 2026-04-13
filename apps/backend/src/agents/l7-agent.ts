import type { DfsNode, Finding, Observation, OsiLayer, ToolAdapter, ToolRequest, ToolRun } from "@synosec/contracts";
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
      agentSummary: `Layer 7 queued ${requestedToolRuns.length} tool requests for ${node.target} (${service}).`,
      isDone: false // signal that we want to analyze the results
    };
  }

  override async analyzeAndPlan(
    node: DfsNode,
    context: AgentContext,
    observations: Observation[],
    findings: Array<Omit<Finding, "id" | "createdAt">>,
    iteration: number,
    toolRuns: ToolRun[]
  ): Promise<AgentResult> {
    // Only run one follow-up iteration
    if (iteration >= 2) {
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: "Layer 7 analysis complete.",
        isDone: true
      };
    }

    const port = node.port ?? 80;
    const service = node.service ?? "http";
    const attemptedAdapters = new Set(toolRuns.map((toolRun) => toolRun.adapter));
    const failedRuns = toolRuns.filter((toolRun) => toolRun.status === "failed");

    if (failedRuns.length > 0) {
      const fallbackRequests: ToolRequest[] = [];

      if (!attemptedAdapters.has("http_probe")) {
        fallbackRequests.push({
          tool: "curl",
          adapter: "http_probe",
          target: node.target,
          port,
          service,
          layer: "L7",
          riskTier: "passive",
          justification: "Previous approach failed. Fall back to basic HTTP probing to keep exploring an alternative path.",
          parameters: { paths: ["/", "/login", "/admin"] }
        });
      }

      if (!attemptedAdapters.has("web_fingerprint")) {
        fallbackRequests.push({
          tool: "whatweb",
          adapter: "web_fingerprint",
          target: node.target,
          port,
          service,
          layer: "L7",
          riskTier: "passive",
          justification: "Previous approach failed. Fall back to stack fingerprinting to keep exploring an alternative path.",
          parameters: { aggressive: false }
        });
      }

      if (fallbackRequests.length > 0) {
        return {
          requestedToolRuns: fallbackRequests,
          childNodes: [],
          agentSummary: `Detected ${failedRuns.length} failed approach(es). Pivoting to ${fallbackRequests.length} alternative path probe(s).`,
          isDone: false
        };
      }
    }

    // --- LLM-powered analysis (when API key is present) ---
    if (process.env["ANTHROPIC_API_KEY"] && observations.length > 0) {
      try {
        interface L7Analysis {
          isValid: boolean;
          errorDetected: boolean;
          errorSummary: string | null;
          insights: string;
          technologiesFound: string[];
          nextTools: Array<{
            adapter: string;
            justification: string;
            riskTier: "passive" | "active";
          }> | null;
        }

        const observationSummary = observations
          .slice(0, 12)
          .map(
            (o) =>
              `[${o.adapter}] ${o.title}\nSummary: ${o.summary}\nEvidence (truncated): ${o.evidence.slice(0, 300)}`
          )
          .join("\n---\n");

        const findingsSummary =
          findings.length > 0
            ? findings
                .map((f) => `[${f.severity.toUpperCase()}] ${f.title}: ${f.description}`)
                .join("\n")
            : "No findings yet.";

        const analysis = await this.generateJson<L7Analysis>({
          system:
            "You are a web application penetration testing agent. Analyze tool outputs to decide next steps. Return JSON only — no markdown.",
          user: `Target: ${node.target}:${port} (${service})\n\nTool outputs from this iteration:\n${observationSummary}\n\nFindings so far:\n${findingsSummary}\n\nAnalyze:\n1. Are the outputs valid and reasonable, or do they contain errors?\n2. What do they reveal about the target's technology stack and security posture?\n3. What additional targeted tests would be most valuable right now (if any)?\n\nAllowed adapters for next tools: http_probe, web_fingerprint, vuln_check, nikto_scan, nuclei_scan\n\nReturn JSON: {\n  "isValid": boolean,\n  "errorDetected": boolean,\n  "errorSummary": "string or null",\n  "insights": "key observations about the target",\n  "technologiesFound": ["string"],\n  "nextTools": null | [{ "adapter": "http_probe|web_fingerprint|vuln_check|nikto_scan|nuclei_scan", "justification": "string", "riskTier": "passive|active" }]\n}`,
          maxTokens: 768
        });

        const agentSummary = [
          analysis.insights,
          analysis.errorDetected ? `Error: ${analysis.errorSummary}` : null,
          analysis.technologiesFound.length > 0
            ? `Stack: ${analysis.technologiesFound.join(", ")}`
            : null
        ]
          .filter(Boolean)
          .join(" | ");

        const allowedAdapters = new Set([
          "http_probe",
          "web_fingerprint",
          "vuln_check",
          "nikto_scan",
          "nuclei_scan"
        ]);

        const nextRequests = (analysis.nextTools ?? [])
          .filter((t) => allowedAdapters.has(t.adapter))
          .map((t) => ({
            tool: t.adapter.includes("nikto")
              ? "nikto"
              : t.adapter.includes("nuclei")
                ? "nuclei"
                : "curl",
            adapter: t.adapter as ToolAdapter,
            target: node.target,
            port,
            service,
            layer: "L7" as const,
            riskTier: t.riskTier,
            justification: t.justification,
            parameters: {}
          }));

        return {
          requestedToolRuns: nextRequests,
          childNodes: [],
          agentSummary: agentSummary || "Layer 7 LLM analysis complete.",
          isDone: nextRequests.length === 0
        };
      } catch {
        // LLM unavailable or returned invalid JSON — fall through to rule-based analysis
      }
    }

    // --- Rule-based analysis (no LLM) ---
    const followUpRequests: ToolRequest[] = [];

    // WordPress detected → run targeted web fingerprint again (wpscan-style)
    const isWordPress = observations.some(
      (o) =>
        o.evidence.toLowerCase().includes("wordpress") ||
        o.summary.toLowerCase().includes("wordpress")
    );
    if (isWordPress) {
      followUpRequests.push({
        tool: "curl",
        adapter: "web_fingerprint" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "passive" as const,
        justification: "WordPress detected — probing wp-json and plugin enumeration endpoints.",
        parameters: { paths: ["/wp-json/wp/v2/users", "/wp-content/plugins/", "/wp-login.php"] }
      });
    }

    // Admin panel or login page discovered → test for default credentials / auth bypass
    const hasAdminPath = observations.some(
      (o) =>
        o.evidence.toLowerCase().includes("/admin") ||
        o.evidence.toLowerCase().includes("/login") ||
        o.evidence.toLowerCase().includes("200 /admin")
    );
    if (hasAdminPath && context.scope.allowActiveExploits !== false) {
      followUpRequests.push({
        tool: "curl",
        adapter: "vuln_check" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "active" as const,
        justification: "Admin/login path found — checking for auth bypass and default credentials.",
        parameters: { checks: ["auth_bypass", "default_creds", "sqli_error"] }
      });
    }

    if (followUpRequests.length === 0) {
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: "Layer 7 rule-based analysis complete. No additional targeted scans required.",
        isDone: true
      };
    }

    return {
      requestedToolRuns: followUpRequests,
      childNodes: [],
      agentSummary: `Queued ${followUpRequests.length} follow-up scan(s) based on initial web fingerprinting.`,
      isDone: false
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
