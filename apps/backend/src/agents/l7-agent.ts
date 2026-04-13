import type {
  DfsNode,
  Finding,
  Observation,
  OsiLayer,
  ToolAdapter,
  ToolCapability,
  ToolRequest,
  ToolRun
} from "@synosec/contracts";
import { BaseAgent, type AgentContext, type AgentResult } from "./base-agent.js";
import { getToolCapabilities } from "../tools/tool-catalog.js";

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
    const maxIterations = Number(process.env["AGENT_MAX_ITERATIONS"] ?? 3);
    // Allow up to maxIterations - 1 follow-up rounds (iteration is 1-indexed here)
    if (iteration >= maxIterations) {
      return {
        requestedToolRuns: [],
        childNodes: [],
        agentSummary: `Layer 7 analysis complete after ${iteration} iteration(s).`,
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
    if (process.env["ANTHROPIC_API_KEY"]) {
      try {
        interface L7Analysis {
          isValid: boolean;
          errorDetected: boolean;
          errorSummary: string | null;
          insights: string;
          technologiesFound: string[];
          shouldContinue: boolean;
          nextTools: Array<{
            adapter:
              | "http_probe"
              | "web_fingerprint"
              | "vuln_check"
              | "nikto_scan"
              | "nuclei_scan"
              | "subdomain_enum"
              | "httpx_probe"
              | "web_crawl"
              | "historical_urls"
              | "feroxbuster_scan"
              | "db_injection_check"
              | "external_tool";
            binary?: string;
            args?: string[];
            justification: string;
            riskTier: "passive" | "active" | "controlled-exploit";
          }> | null;
        }

        const capabilities = await getToolCapabilities();
        const installedTools = capabilities.capabilities
          .filter((capability: ToolCapability) => capability.available)
          .filter((capability: ToolCapability) => ["web", "content", "dns", "subdomain", "network"].includes(capability.category))
          .map((capability: ToolCapability) => `${capability.displayName} (${capability.binary ?? "manual"})`)
          .slice(0, 25)
          .join(", ");

        const allObservationsSummary = observations
          .slice(-15)
          .map(
            (o) =>
              `[iter:${iteration}][${o.adapter}] ${o.title}\n  Summary: ${o.summary}\n  Evidence: ${o.evidence.slice(0, 400)}`
          )
          .join("\n---\n");

        const findingsSummary =
          findings.length > 0
            ? findings
                .map((f) => `[${f.severity.toUpperCase()}] ${f.title}: ${f.description}`)
                .join("\n")
            : "No confirmed findings yet.";

        // Track which adapters have already been run to avoid redundancy
        const attemptedAdapters = toolRuns.map((r) => r.adapter).join(", ") || "none";
        const maxIter = Number(process.env["AGENT_MAX_ITERATIONS"] ?? 3);
        const remainingIterations = maxIter - iteration;

        const analysis = await this.generateJson<L7Analysis>({
          system:
            "You are an expert web application penetration tester operating in an autonomous AI-driven scan loop. " +
            "Your job: analyze what has been found so far, then decide which specific tool to run NEXT to deepen the investigation. " +
            "Think like an attacker chaining discoveries — each result should lead to a targeted follow-up. " +
            "If you see an admin panel, probe it. If you find a CMS, check for known CVEs. If headers reveal a framework, look for framework-specific vulns. " +
            "Return JSON only — no markdown, no explanation outside the JSON.",
          user: [
            `Target: ${node.target}:${port} (${service})`,
            `Scan iteration: ${iteration} of ${maxIter} (${remainingIterations} remaining)`,
            `Adapters already run: ${attemptedAdapters}`,
            ``,
            `=== ACCUMULATED TOOL OUTPUTS (all iterations) ===`,
            allObservationsSummary || "No observations collected yet.",
            ``,
            `=== CONFIRMED FINDINGS SO FAR ===`,
            findingsSummary,
            ``,
            `=== INSTALLED TOOLS ===`,
            installedTools || "none detected",
            ``,
            `Analyze:`,
            `1. What vulnerabilities or attack surfaces have been revealed?`,
            `2. What is the most valuable NEXT probe given what we know? (avoid re-running completed adapters)`,
            `3. Should we keep iterating, or is the L7 surface sufficiently covered?`,
            ``,
            `Allowed adapters: http_probe, web_fingerprint, vuln_check, nikto_scan, nuclei_scan, subdomain_enum, httpx_probe, web_crawl, historical_urls, feroxbuster_scan, db_injection_check, external_tool`,
            `For external_tool: choose from installed list, provide binary + args.`,
            `For db_injection_check: only request if SQL-injectable endpoint was observed.`,
            ``,
            `Return JSON:`,
            `{`,
            `  "isValid": boolean,`,
            `  "errorDetected": boolean,`,
            `  "errorSummary": "string or null",`,
            `  "insights": "key findings and what they imply for next steps",`,
            `  "technologiesFound": ["string"],`,
            `  "shouldContinue": boolean,`,
            `  "nextTools": null | [{ "adapter": "...", "binary": "optional", "args": ["optional"], "justification": "why this next", "riskTier": "passive|active|controlled-exploit" }]`,
            `}`
          ].join("\n"),
          maxTokens: 1024
        });

        const agentSummary = [
          `[Iter ${iteration}] ${analysis.insights}`,
          analysis.errorDetected ? `⚠ Error: ${analysis.errorSummary}` : null,
          analysis.technologiesFound.length > 0
            ? `Stack detected: ${analysis.technologiesFound.join(", ")}`
            : null,
          analysis.shouldContinue ? `→ Continuing scan.` : `→ Marking L7 surface as covered.`
        ]
          .filter(Boolean)
          .join(" | ");

        if (!analysis.shouldContinue || !analysis.nextTools?.length) {
          return {
            requestedToolRuns: [],
            childNodes: [],
            agentSummary: agentSummary || "Layer 7 LLM determined surface is sufficiently covered.",
            isDone: true
          };
        }

        const allowedAdapters = new Set([
          "http_probe",
          "web_fingerprint",
          "vuln_check",
          "nikto_scan",
          "nuclei_scan",
          "subdomain_enum",
          "httpx_probe",
          "web_crawl",
          "historical_urls",
          "feroxbuster_scan",
          "db_injection_check",
          "external_tool"
        ]);

        const nextRequests = (analysis.nextTools ?? [])
          .filter((t) => allowedAdapters.has(t.adapter))
          .map((t) => ({
            tool: t.adapter === "external_tool"
              ? (t.binary ?? "external-tool")
              : t.adapter === "subdomain_enum"
                ? "subfinder"
                : t.adapter === "httpx_probe"
                  ? "httpx"
                  : t.adapter === "web_crawl"
                    ? "katana"
                    : t.adapter === "historical_urls"
                      ? "gau"
                      : t.adapter === "feroxbuster_scan"
                        ? "feroxbuster"
                        : t.adapter === "db_injection_check"
                          ? "sqlmap"
                          : t.adapter.includes("nikto")
                            ? "nikto"
                            : t.adapter.includes("nuclei")
                              ? "nuclei"
                              : "curl",
            adapter: t.adapter as ToolAdapter,
            target: node.target,
            port,
            service,
            layer: "L7" as const,
            riskTier: t.riskTier as "passive" | "active" | "controlled-exploit",
            justification: t.justification,
            parameters: t.adapter === "external_tool"
              ? {
                  ...(t.binary ? { binary: t.binary } : {}),
                  ...(Array.isArray(t.args) ? { args: t.args } : {})
                }
              : t.adapter === "subdomain_enum"
                ? { passive: true }
                : t.adapter === "db_injection_check"
                  ? { level: 1, risk: 1, batch: true }
                  : {}
          }));

        return {
          requestedToolRuns: nextRequests,
          childNodes: [],
          agentSummary: agentSummary || "Layer 7 LLM analysis complete.",
          isDone: nextRequests.length === 0
        };
      } catch (err) {
        console.warn(`[l7-agent] LLM analyzeAndPlan failed at iteration ${iteration}:`, err instanceof Error ? err.message : err);
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
      {
        tool: "subfinder",
        adapter: "subdomain_enum" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "passive" as const,
        justification: "Enumerate subdomains to widen the reachable attack surface before deeper application testing.",
        parameters: { passive: true }
      },
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
      {
        tool: "httpx",
        adapter: "httpx_probe" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "passive" as const,
        justification: "Probe the target with HTTPx to collect status, title, and technology hints.",
        parameters: {}
      },
      {
        tool: "katana",
        adapter: "web_crawl" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "passive" as const,
        justification: "Crawl the target to discover deeper application paths for follow-up testing.",
        parameters: {}
      },
      {
        tool: "gau",
        adapter: "historical_urls" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: "passive" as const,
        justification: "Recover historical URLs to expand the reachable application surface.",
        parameters: {}
      },
      {
        tool: "feroxbuster",
        adapter: "feroxbuster_scan" as const,
        target: node.target,
        port,
        service,
        layer: "L7" as const,
        riskTier: allowActive ? "active" as const : "passive" as const,
        justification: "Enumerate content and hidden directories with feroxbuster.",
        parameters: {}
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
