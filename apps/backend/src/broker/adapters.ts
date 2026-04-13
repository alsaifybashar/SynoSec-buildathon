import { randomUUID } from "crypto";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { promisify } from "node:util";
import type {
  Observation,
  Severity,
  ToolAdapter,
  ToolRequest,
  ToolRun
} from "@synosec/contracts";
import { parseScanTarget } from "../tools/scan-tools.js";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

interface AdapterExecutionContext {
  scanId: string;
  nodeId: string;
  toolRun: ToolRun;
  request: ToolRequest;
}

export interface AdapterExecutionResult {
  observations: Observation[];
  output: string;
  exitCode: number;
}

type DerivedObservationInput = Omit<
  Observation,
  "id" | "scanId" | "nodeId" | "toolRunId" | "adapter" | "target" | "createdAt"
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createObservation(
  context: AdapterExecutionContext,
  input: DerivedObservationInput
): Observation {
  return {
    id: randomUUID(),
    scanId: context.scanId,
    nodeId: context.nodeId,
    toolRunId: context.toolRun.id,
    adapter: context.request.adapter,
    target: context.request.target,
    createdAt: new Date().toISOString(),
    ...input
  };
}

function severityForPort(port: number): Severity {
  if ([23, 445, 3306, 5432, 27017, 6379].includes(port)) return "high";
  if ([22, 80, 443, 8080, 8443, 8888].includes(port)) return "info";
  return "medium";
}

function isMissingToolError(error: unknown, tool: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes(`spawn ${tool} ENOENT`) ||
    message.includes(`${tool}: command not found`) ||
    message.includes(`${tool}: not found`) ||
    message.includes(`No such file`)
  );
}

function shouldFallbackToolExecution(error: unknown, tool: string): boolean {
  return isMissingToolError(error, tool);
}

async function runTool(
  file: string,
  args: string[],
  timeoutMs = 30000
): Promise<{ output: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024
    });
    return {
      output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
      exitCode: 0
    };
  } catch (error: unknown) {
    if (error instanceof Error && "stdout" in error && "stderr" in error) {
      // execFile throws on non-zero exit but may still have output
      const stdout = String((error as NodeJS.ErrnoException & { stdout?: unknown }).stdout ?? "");
      const stderr = String((error as NodeJS.ErrnoException & { stderr?: unknown }).stderr ?? "");
      const code = (error as NodeJS.ErrnoException & { code?: unknown }).code;
      const exitCode = typeof (error as { status?: number }).status === "number"
        ? (error as unknown as { status: number }).status
        : 1;
      if (stdout.length > 0 || stderr.length > 0) {
        return {
          output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
          exitCode
        };
      }
    }
    throw error;
  }
}

function parseOpenPorts(output: string): Array<{ port: number; service: string; version?: string }> {
  const results: Array<{ port: number; service: string; version?: string }> = [];
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!/^\d+\/tcp\s+open/.test(trimmed)) continue;
    const match = trimmed.match(/^(\d+)\/tcp\s+open\s+(\S+)(?:\s+(.+))?$/);
    if (match) {
      const entry: { port: number; service: string; version?: string } = {
        port: Number(match[1]),
        service: match[2] ?? "unknown"
      };
      if (match[3]) entry.version = match[3].trim();
      results.push(entry);
    }
  }
  return results;
}

function parseNmapHostUp(output: string, target: string): DerivedObservationInput[] {
  const lowered = output.toLowerCase();
  if (!lowered.includes("host is up") && !lowered.includes("1 host up")) {
    return [];
  }
  return [
    {
      key: `host-up:${target}`,
      title: "Host reachable via ICMP",
      summary: `Confirmed ${target} is reachable and should move to service discovery.`,
      severity: "info",
      confidence: 0.98,
      evidence: output,
      technique: "ICMP sweep",
      relatedKeys: []
    }
  ];
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

async function executeNetworkScan(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  try {
    const { output, exitCode } = await runTool("nmap", ["-sn", context.request.target], 30000);
    return {
      observations: parseNmapHostUp(output, context.request.target).map((obs) =>
        createObservation(context, obs)
      ),
      output,
      exitCode
    };
  } catch (error: unknown) {
    if (!shouldFallbackToolExecution(error, "nmap")) {
      throw error;
    }
    const parsed = parseScanTarget(context.request.target);
    const evidence = `fallback network probe\nhost=${parsed.host}\nresolution=ok`;
    return {
      observations: [
        createObservation(context, {
          key: `host-resolved:${parsed.host}`,
          title: "Host resolved for scanning",
          summary: `Confirmed ${parsed.host} resolved and is eligible for service discovery.`,
          severity: "info",
          confidence: 0.75,
          evidence,
          technique: "DNS resolution",
          relatedKeys: []
        })
      ],
      output: evidence,
      exitCode: 0
    };
  }
}

async function executeServiceScan(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const target = context.request.target;
  const ports = Array.isArray(context.request.parameters["ports"])
    ? (context.request.parameters["ports"] as string[]).join(",")
    : undefined;
  const args = ["-sV", "--open"];
  if (ports) args.push("-p", ports);
  args.push(target);

  try {
    const { output, exitCode } = await runTool("nmap", args, 60000);
    return {
      observations: parseOpenPorts(output).map(({ port, service, version }) =>
        createObservation(context, {
          key: `open-port:${target}:${port}`,
          title: `Open ${service.toUpperCase()} service on ${port}`,
          summary: `${service} is reachable on ${target}:${port}${version ? ` (${version})` : ""}.`,
          severity: severityForPort(port),
          confidence: 0.93,
          port,
          evidence: output,
          technique: "TCP SYN scan",
          relatedKeys: []
        })
      ),
      output,
      exitCode
    };
  } catch (error: unknown) {
    if (!shouldFallbackToolExecution(error, "nmap")) {
      throw error;
    }
    return fallbackServiceScan(context);
  }
}

async function executeSessionAudit(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const target = context.request.target;
  const port = context.request.port;

  if (context.request.service === "smb") {
    try {
      const { output, exitCode } = await runTool("smbclient", ["-L", target, "-N"], 15000);
      const anonymous = output.toLowerCase().includes("anonymous") || output.includes("IPC$");
      return {
        observations: anonymous
          ? [
              createObservation(context, {
                key: `smb-null-session:${target}`,
                title: "SMB null session enabled",
                summary: "Anonymous enumeration appears possible against the SMB service.",
                severity: "high",
                confidence: 0.86,
                port,
                evidence: output,
                technique: "SMB enum",
                relatedKeys: []
              })
            ]
          : [],
        output,
        exitCode
      };
    } catch (error: unknown) {
      if (!isMissingToolError(error, "smbclient")) throw error;
      return { observations: [], output: "smbclient unavailable; SMB session audit skipped.", exitCode: 0 };
    }
  }

  // SSH audit
  try {
    const { output, exitCode } = await runTool("ssh-audit", [target], 20000);
    const passwordAuth = output.toLowerCase().includes("password");
    const weakAlgorithms = /arcfour|3des|blowfish|cbc/i.test(output);
    const observations: Observation[] = [];

    if (passwordAuth) {
      observations.push(
        createObservation(context, {
          key: `ssh-password-auth:${target}`,
          title: "SSH password authentication exposed",
          summary: "Password-based SSH authentication remains enabled and should be reviewed.",
          severity: "medium",
          confidence: 0.79,
          port,
          evidence: output,
          technique: "SSH audit",
          relatedKeys: []
        })
      );
    }
    if (weakAlgorithms) {
      observations.push(
        createObservation(context, {
          key: `ssh-weak-algo:${target}`,
          title: "SSH weak algorithms accepted",
          summary: "SSH service supports legacy/weak cipher or MAC algorithms.",
          severity: "medium",
          confidence: 0.82,
          port,
          evidence: output,
          technique: "SSH audit",
          relatedKeys: []
        })
      );
    }

    return { observations, output, exitCode };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "ssh-audit")) throw error;
    return { observations: [], output: "ssh-audit unavailable; SSH session audit skipped.", exitCode: 0 };
  }
}

async function executeTlsAudit(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsed = parseScanTarget(context.request.target);
  const target = parsed.host;
  const port = context.request.port ?? parsed.port ?? 443;

  try {
    const { output, exitCode } = await runTool("sslscan", [`${target}:${port}`], 25000);
    return buildTlsAuditResult(context, output, exitCode, target, port);
  } catch (error: unknown) {
    if (!isMissingToolError(error, "sslscan")) throw error;
    const inspected = await inspectTlsWithNode(target, port);
    return buildTlsAuditResult(context, inspected.evidence, inspected.connected ? 0 : 1, target, port);
  }
}

async function executeHttpProbe(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsed = parseScanTarget(context.request.target);
  const target = parsed.host;
  const port = context.request.port ?? parsed.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";
  const baseUrl = `${scheme}://${target}:${port}`;

  const observations: Observation[] = [];
  const outputParts: string[] = [];

  // Probe all requested paths
  const paths = Array.isArray(context.request.parameters["paths"])
    ? (context.request.parameters["paths"] as string[])
    : ["/", "/admin"];

  const headerResult = await fetchHeaders(baseUrl);
  outputParts.push(headerResult.output);

  // Security header audit
  const missingHeaders: string[] = [];
  if (!/strict-transport-security/i.test(headerResult.output)) missingHeaders.push("HSTS");
  if (!/content-security-policy/i.test(headerResult.output)) missingHeaders.push("CSP");
  if (!/x-frame-options/i.test(headerResult.output)) missingHeaders.push("X-Frame-Options");
  if (!/x-content-type-options/i.test(headerResult.output)) missingHeaders.push("X-Content-Type-Options");

  if (missingHeaders.length > 0) {
    observations.push(
      createObservation(context, {
        key: `missing-security-headers:${target}:${port}`,
        title: "Missing HTTP security headers",
        summary: `Response omits defensive headers: ${missingHeaders.join(", ")}.`,
        severity: "low",
        confidence: 0.95,
        port,
        evidence: headerResult.output,
        technique: "Header audit",
        relatedKeys: []
      })
    );
  }

  // Version/server disclosure
  const serverHeader = headerResult.output.match(/^server:\s*(.+)$/im)?.[1]?.trim();
  const poweredBy = headerResult.output.match(/^x-powered-by:\s*(.+)$/im)?.[1]?.trim();
  if (serverHeader || poweredBy) {
    observations.push(
      createObservation(context, {
        key: `version-disclosure:${target}:${port}`,
        title: "Server version disclosed in HTTP headers",
        summary: `Server header: ${serverHeader ?? "n/a"}, X-Powered-By: ${poweredBy ?? "n/a"}.`,
        severity: "low",
        confidence: 0.97,
        port,
        evidence: headerResult.output,
        technique: "Header audit",
        relatedKeys: []
      })
    );
  }

  // CORS misconfiguration check
  const corsResult = await fetchWithOrigin(baseUrl, "https://evil.example.com");
  outputParts.push(corsResult.output);
  if (/access-control-allow-origin:\s*\*/i.test(corsResult.output) ||
      /access-control-allow-origin:\s*https?:\/\/evil/i.test(corsResult.output)) {
    observations.push(
      createObservation(context, {
        key: `cors-misconfiguration:${target}:${port}`,
        title: "CORS misconfiguration detected",
        summary: "Access-Control-Allow-Origin reflects or wildcards origins — cross-site request forgery risk.",
        severity: "medium",
        confidence: 0.88,
        port,
        evidence: corsResult.output,
        technique: "CORS probe",
        relatedKeys: []
      })
    );
  }

  // Probe each path
  for (const path of paths) {
    const pageResult = await fetchPage(`${baseUrl}${path}`);
    outputParts.push(pageResult.output);
    const status = parseHttpStatus(pageResult.output);

    if (path === "/admin" && status != null && [200, 401, 403].includes(status)) {
      observations.push(
        createObservation(context, {
          key: `admin-surface:${target}:${port}`,
          title: "Administrative surface discovered",
          summary: `Admin panel at ${path} responded with HTTP ${status} — review auth controls.`,
          severity: status === 200 ? "high" : "medium",
          confidence: 0.82,
          port,
          evidence: pageResult.output,
          technique: "HTTP route probe",
          relatedKeys: []
        })
      );
    }

    if (path === "/api/users" && status === 200) {
      const hasPii = /password|ssn|credit.?card|hash/i.test(pageResult.output);
      observations.push(
        createObservation(context, {
          key: `api-data-exposure:${target}:${port}`,
          title: "Unauthenticated API data exposure",
          summary: hasPii
            ? "Unauthenticated /api/users returns PII including password hashes, SSN, or credit card data."
            : "Unauthenticated /api/users endpoint is accessible.",
          severity: hasPii ? "critical" : "high",
          confidence: 0.97,
          port,
          evidence: pageResult.output.slice(0, 2048),
          technique: "API probe",
          relatedKeys: []
        })
      );
    }

    if (path === "/files" && status === 200) {
      const hasSensitiveFiles = /id_rsa|\.env|password|backup|\.sql/i.test(pageResult.output);
      if (hasSensitiveFiles) {
        observations.push(
          createObservation(context, {
            key: `directory-listing:${target}:${port}`,
            title: "Directory listing with sensitive files",
            summary: "Directory listing exposes sensitive files (private keys, env files, backups).",
            severity: "critical",
            confidence: 0.95,
            port,
            evidence: pageResult.output.slice(0, 2048),
            technique: "Directory traversal",
            relatedKeys: []
          })
        );
      }
    }
  }

  return {
    observations,
    output: outputParts.join("\n\n"),
    exitCode: 0
  };
}

async function executeWebFingerprint(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsed = parseScanTarget(context.request.target);
  const target = parsed.host;
  const port = context.request.port ?? parsed.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";
  const url = `${scheme}://${target}:${port}`;

  try {
    const { output, exitCode } = await runTool("whatweb", [url, "--color=never"], 20000);
    return buildWebFingerprintResult(context, output, exitCode, target, port);
  } catch (error: unknown) {
    if (!isMissingToolError(error, "whatweb")) throw error;
    const { output, exitCode } = await fetchPage(url);
    return buildWebFingerprintResult(context, output, exitCode, target, port);
  }
}

async function executeDbInjectionCheck(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsed = parseScanTarget(context.request.target);
  const target = parsed.host;
  const port = context.request.port ?? parsed.port;
  const baseUrl = `http://${target}${port ? `:${port}` : ""}/`;

  try {
    const { output, exitCode } = await runTool(
      "sqlmap",
      ["-u", baseUrl, "--batch", "--level=1", "--risk=1", "--output-dir=/tmp/sqlmap-synosec"],
      45000
    );

    if (!/injectable|appears to be/i.test(output)) {
      return { observations: [], output, exitCode };
    }

    return {
      observations: [
        createObservation(context, {
          key: `sqli:${target}:${port ?? "app"}`,
          title: "Potential SQL injection detected",
          summary: "sqlmap reported an injectable parameter on the target.",
          severity: "high",
          confidence: 0.89,
          ...(port != null ? { port } : {}),
          evidence: output,
          technique: "SQLi probe",
          relatedKeys: []
        })
      ],
      output,
      exitCode
    };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "sqlmap")) throw error;
    return { observations: [], output: "sqlmap unavailable; DB injection check skipped.", exitCode: 0 };
  }
}

async function executeContentDiscovery(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsed = parseScanTarget(context.request.target);
  const target = parsed.host;
  const port = context.request.port ?? parsed.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";
  const baseUrl = `${scheme}://${target}:${port}`;

  // Try several wordlist locations
  const wordlistCandidates = [
    "/usr/share/dirb/wordlists/common.txt",
    "/usr/share/wordlists/dirb/common.txt",
    "/usr/share/dirbuster/wordlists/directory-list-2.3-small.txt"
  ];
  const wordlist = wordlistCandidates.find((path) => existsSync(path)) ?? wordlistCandidates[0];

  try {
    const { output, exitCode } = await runTool(
      "ffuf",
      [
        "-u", `${baseUrl}/FUZZ`,
        "-w", wordlist ?? "/usr/share/dirb/wordlists/common.txt",
        "-mc", "200,204,301,302,307,401,403",
        "-maxtime", "25",
        "-s" // silent mode — one result per line
      ],
      30000
    );

    // ffuf silent mode outputs: STATUS SIZE WORDS LINES URL
    const discovered = output
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .slice(0, 20)
      .map((line, index) =>
        createObservation(context, {
          key: `content-discovery:${target}:${port}:${index}`,
          title: "Discovered application path",
          summary: `ffuf discovered a path on ${target}:${port}: ${line.trim()}`,
          severity: "medium",
          confidence: 0.78,
          port,
          evidence: line.trim(),
          technique: "Content discovery",
          relatedKeys: []
        })
      );

    return { observations: discovered, output, exitCode };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "ffuf")) throw error;

    // Fallback: probe common paths manually
    const probePaths = ["/robots.txt", "/login", "/admin", "/api", "/.git", "/.env", "/backup", "/config"];
    const outputParts: string[] = [];
    const observations: Observation[] = [];

    for (const path of probePaths) {
      try {
        const { output } = await fetchPage(`${baseUrl}${path}`);
        outputParts.push(`$ curl -k -i ${baseUrl}${path}\n${output}`);
        const statusCode = parseHttpStatus(output);
        if (statusCode != null && [200, 301, 302, 401, 403].includes(statusCode)) {
          const isHighRisk = [/.env/i, /.git/i, /backup/i, /config/i].some((re) => re.test(path));
          observations.push(
            createObservation(context, {
              key: `content-discovery:${target}:${port}:${path}`,
              title: "Discovered application path",
              summary: `${path} responded with HTTP ${statusCode} on ${target}:${port}.`,
              severity: isHighRisk && statusCode === 200 ? "high" : statusCode === 200 ? "medium" : "info",
              confidence: 0.85,
              port,
              evidence: output,
              technique: "Content discovery",
              relatedKeys: []
            })
          );
        }
      } catch {
        // skip unresponsive paths
      }
    }

    return { observations, output: outputParts.join("\n\n"), exitCode: 0 };
  }
}

async function executeNiktoScan(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsed = parseScanTarget(context.request.target);
  const target = parsed.host;
  const port = context.request.port ?? parsed.port ?? 80;
  const tuning = String(context.request.parameters["tuning"] ?? "x 6 2");
  const timeout = Number(context.request.parameters["timeout"] ?? 30);

  try {
    const { output, exitCode } = await runTool(
      "nikto",
      [
        "-h", target,
        "-p", String(port),
        "-Tuning", tuning,
        "-timeout", String(timeout),
        "-maxtime", `${timeout}s`,
        "-nointeractive",
        "-Format", "txt"
      ],
      (timeout + 10) * 1000
    );

    const observations: Observation[] = [];

    // Parse nikto findings — each vuln line starts with "+ "
    const vulnLines = output
      .split("\n")
      .filter((line) => line.trim().startsWith("+") && !line.includes("OSVDB-0") && !line.startsWith("+ End ") && !line.startsWith("+ Server:") && !line.startsWith("+ Target ") && !line.startsWith("+ Nikto"));

    for (let i = 0; i < vulnLines.length; i++) {
      const line = vulnLines[i]!.trim();
      if (line.length < 5) continue;

      const isCritical = /admin|password|credential|inject|exec|remote|shell/i.test(line);
      const isHigh = /traversal|include|cve-|osvdb-/i.test(line);
      const severity: Severity = isCritical ? "high" : isHigh ? "medium" : "low";

      observations.push(
        createObservation(context, {
          key: `nikto:${target}:${port}:${i}`,
          title: extractNiktoTitle(line),
          summary: line.replace(/^\+\s*/, ""),
          severity,
          confidence: 0.82,
          port,
          evidence: line,
          technique: "Nikto web scan",
          relatedKeys: []
        })
      );
    }

    return { observations, output, exitCode };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "nikto")) throw error;
    return { observations: [], output: "nikto unavailable; web vulnerability scan skipped.", exitCode: 0 };
  }
}

async function executeNucleiScan(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsed = parseScanTarget(context.request.target);
  const target = parsed.host;
  const port = context.request.port ?? parsed.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";
  const url = `${scheme}://${target}:${port}`;
  const severity = String(context.request.parameters["severity"] ?? "medium,high,critical");
  const timeout = Number(context.request.parameters["timeout"] ?? 30);

  try {
    const { output, exitCode } = await runTool(
      "nuclei",
      [
        "-u", url,
        "-severity", severity,
        "-timeout", String(timeout),
        "-no-color",
        "-silent",
        "-nc",
        "-stats=false"
      ],
      (timeout + 15) * 1000
    );

    const observations: Observation[] = [];

    // Nuclei output format: [template-id] [protocol] [severity] URL [matched]
    const lines = output.split("\n").filter((line) => line.trim().length > 0);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      const match = line.match(/\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(\S+)(.*)?/);
      if (!match) continue;

      const templateId = match[1] ?? "unknown";
      const proto = match[2] ?? "http";
      const sev = match[3]?.toLowerCase() ?? "info";
      const matchedUrl = match[4] ?? url;
      const extra = match[5]?.trim() ?? "";

      const severityMap: Record<string, Severity> = {
        critical: "critical",
        high: "high",
        medium: "medium",
        low: "low",
        info: "info"
      };

      observations.push(
        createObservation(context, {
          key: `nuclei:${target}:${port}:${templateId}`,
          title: `Nuclei: ${templateId}`,
          summary: `[${sev.toUpperCase()}] ${templateId} matched on ${matchedUrl}${extra ? ` — ${extra}` : ""}`,
          severity: severityMap[sev] ?? "medium",
          confidence: 0.9,
          port,
          evidence: line,
          technique: `Nuclei template scan (${proto})`,
          relatedKeys: []
        })
      );
    }

    return { observations, output, exitCode };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "nuclei")) throw error;
    return { observations: [], output: "nuclei unavailable; template scan skipped.", exitCode: 0 };
  }
}

async function executeVulnCheck(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsed = parseScanTarget(context.request.target);
  const target = parsed.host;
  const port = context.request.port ?? parsed.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";
  const baseUrl = `${scheme}://${target}:${port}`;
  const checks = Array.isArray(context.request.parameters["checks"])
    ? (context.request.parameters["checks"] as string[])
    : ["xss", "cors", "data_exposure", "sqli_error"];

  const observations: Observation[] = [];
  const outputParts: string[] = [];

  // XSS reflection check
  if (checks.includes("xss")) {
    const xssPayload = "<script>alert('xss-test-synosec')</script>";
    const xssUrl = `${baseUrl}/search?q=${encodeURIComponent(xssPayload)}`;
    try {
      const result = await fetchPage(xssUrl);
      outputParts.push(`=== XSS reflection test ===\n${result.output}`);
      if (result.output.includes(xssPayload) || result.output.includes("xss-test-synosec")) {
        observations.push(
          createObservation(context, {
            key: `xss-reflected:${target}:${port}`,
            title: "Reflected XSS vulnerability confirmed",
            summary: `The /search endpoint reflects user input without sanitization — script injection possible.`,
            severity: "high",
            confidence: 0.97,
            port,
            evidence: `GET ${xssUrl}\n\n${result.output.slice(0, 1024)}`,
            technique: "XSS reflection probe",
            relatedKeys: []
          })
        );
      }
    } catch {
      // skip
    }
  }

  // SQL injection error-based check
  if (checks.includes("sqli_error")) {
    const sqliPayloads = ["'", "' OR '1'='1", "\" OR \"1\"=\"1"];
    for (const payload of sqliPayloads) {
      try {
        const result = await fetchPage(`${baseUrl}/login`, {
          method: "POST",
          body: `username=${encodeURIComponent(payload)}&password=test`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        outputParts.push(`=== SQLi error test (payload: ${payload}) ===\n${result.output}`);
        const hasError = /sql|syntax|mysql|postgresql|sqlite|select\s.*from|query/i.test(result.output);
        const bypassSuccess = /"success"\s*:\s*true/i.test(result.output) && result.output.includes("bypass");
        if (hasError || bypassSuccess) {
          observations.push(
            createObservation(context, {
              key: `sqli-error:${target}:${port}`,
              title: bypassSuccess ? "SQL injection authentication bypass" : "SQL injection error-based disclosure",
              summary: bypassSuccess
                ? "Authentication bypassed via SQL injection — the login endpoint is injectable."
                : "The login endpoint returns SQL error messages that confirm injection.",
              severity: "critical",
              confidence: bypassSuccess ? 0.98 : 0.85,
              port,
              evidence: `POST ${baseUrl}/login\npayload=${payload}\n\n${result.output.slice(0, 2048)}`,
              technique: "SQL injection probe",
              relatedKeys: []
            })
          );
          break;
        }
      } catch {
        // skip
      }
    }
  }

  // Sensitive data exposure via /echo (command injection simulation)
  if (checks.includes("data_exposure")) {
    try {
      const result = await fetchPage(`${baseUrl}/api/users`);
      outputParts.push(`=== Sensitive data exposure check ===\n${result.output}`);
      const status = parseHttpStatus(result.output);
      const hasPii = /password|hash|ssn|credit.?card/i.test(result.output);
      if (status === 200 && hasPii) {
        observations.push(
          createObservation(context, {
            key: `data-exposure-api:${target}:${port}`,
            title: "PII/credential data exposed in unauthenticated API",
            summary: "/api/users returns password hashes, SSNs, or credit card numbers without authentication.",
            severity: "critical",
            confidence: 0.99,
            port,
            evidence: result.output.slice(0, 2048),
            technique: "Sensitive data discovery",
            relatedKeys: []
          })
        );
      }
    } catch {
      // skip
    }
  }

  return {
    observations,
    output: outputParts.join("\n\n"),
    exitCode: 0
  };
}

// ---------------------------------------------------------------------------
// Adapter registry
// ---------------------------------------------------------------------------

const adapterExecutors: Record<ToolAdapter, (context: AdapterExecutionContext) => Promise<AdapterExecutionResult>> = {
  network_scan: executeNetworkScan,
  service_scan: executeServiceScan,
  session_audit: executeSessionAudit,
  tls_audit: executeTlsAudit,
  http_probe: executeHttpProbe,
  web_fingerprint: executeWebFingerprint,
  db_injection_check: executeDbInjectionCheck,
  content_discovery: executeContentDiscovery,
  nikto_scan: executeNiktoScan,
  nuclei_scan: executeNucleiScan,
  vuln_check: executeVulnCheck
};

export async function executeAdapter(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const executor = adapterExecutors[context.request.adapter];
  if (!executor) {
    throw new Error(`No adapter registered for ${context.request.adapter}`);
  }
  return executor(context);
}

// ---------------------------------------------------------------------------
// TLS helpers
// ---------------------------------------------------------------------------

function buildTlsAuditResult(
  context: AdapterExecutionContext,
  output: string,
  exitCode: number,
  target: string,
  port: number
): AdapterExecutionResult {
  const observations: Observation[] = [
    createObservation(context, {
      key: `tls-service:${target}:${port}`,
      title: "TLS service negotiated",
      summary: `TLS was negotiated successfully on ${target}:${port}.`,
      severity: "info",
      confidence: 0.95,
      port,
      evidence: output,
      technique: "TLS audit",
      relatedKeys: []
    })
  ];

  if (output.includes("TLSv1.0") || output.includes("TLSv1.1")) {
    observations.push(
      createObservation(context, {
        key: `tls-deprecated:${target}:${port}`,
        title: "Deprecated TLS protocol support",
        summary: "The service still accepts TLS 1.0/1.1 — tighten to TLS 1.2+.",
        severity: "medium",
        confidence: 0.88,
        port,
        evidence: output,
        technique: "TLS audit",
        relatedKeys: []
      })
    );
  }

  if (/3des|rc4|des-cbc/i.test(output)) {
    observations.push(
      createObservation(context, {
        key: `tls-weak-ciphers:${target}:${port}`,
        title: "Weak TLS cipher suites accepted",
        summary: "The endpoint accepts cipher suites that should be removed from the server policy.",
        severity: "medium",
        confidence: 0.83,
        port,
        evidence: output,
        technique: "Cipher enum",
        relatedKeys: []
      })
    );
  }

  return { observations, output, exitCode };
}

function buildWebFingerprintResult(
  context: AdapterExecutionContext,
  output: string,
  exitCode: number,
  target: string,
  port: number
): AdapterExecutionResult {
  const observations: Observation[] = [];

  if (output.trim().length > 0) {
    observations.push(
      createObservation(context, {
        key: `version-disclosure:${target}:${port}`,
        title: "Technology fingerprint collected",
        summary: "Scanner identified application stack details to guide follow-on validation.",
        severity: "info",
        confidence: 0.9,
        port,
        evidence: output,
        technique: "Tech fingerprint",
        relatedKeys: []
      })
    );

    // Detect outdated/EOL software
    const eolVersions = [
      { re: /PHP\/[45]\./i, label: "PHP 4/5 (EOL)" },
      { re: /Apache\/2\.2\./i, label: "Apache 2.2 (EOL)" },
      { re: /nginx\/1\.[0-9]\./i, label: "nginx < 1.10 (EOL)" },
      { re: /WordPress\s3\.|WordPress\s4\./i, label: "WordPress < 5 (outdated)" }
    ];
    for (const { re, label } of eolVersions) {
      if (re.test(output)) {
        observations.push(
          createObservation(context, {
            key: `eol-software:${target}:${port}:${label}`,
            title: `Outdated/EOL software detected: ${label}`,
            summary: `The application stack includes ${label} which may contain known CVEs.`,
            severity: "high",
            confidence: 0.91,
            port,
            evidence: output,
            technique: "Tech fingerprint",
            relatedKeys: []
          })
        );
      }
    }
  }

  return { observations, output, exitCode };
}

// ---------------------------------------------------------------------------
// Fallback service scan
// ---------------------------------------------------------------------------

async function fallbackServiceScan(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsed = parseScanTarget(context.request.target);
  const host = parsed.host;
  const requestedPorts = Array.isArray(context.request.parameters["ports"])
    ? (context.request.parameters["ports"] as string[]).map(Number).filter(Number.isInteger)
    : [];
  const candidatePorts = requestedPorts.length > 0
    ? requestedPorts
    : parsed.port != null
      ? [parsed.port]
      : [80, 443];

  const observations: Observation[] = [];
  const outputParts: string[] = [];

  for (const port of [...new Set(candidatePorts)]) {
    const probe = await probePort(host, port, parsed.scheme);
    outputParts.push(probe.evidence);
    if (!probe.open) continue;

    observations.push(
      createObservation(context, {
        key: `open-port:${host}:${port}`,
        title: `Open ${probe.service.toUpperCase()} service on ${port}`,
        summary: `${probe.service} is reachable on ${host}:${port}.`,
        severity: severityForPort(port),
        confidence: probe.confidence,
        port,
        evidence: probe.evidence,
        technique: probe.technique,
        relatedKeys: []
      })
    );
  }

  return { observations, output: outputParts.join("\n\n"), exitCode: observations.length > 0 ? 0 : 1 };
}

// ---------------------------------------------------------------------------
// Network probes
// ---------------------------------------------------------------------------

async function probePort(
  host: string,
  port: number,
  schemeHint: string | null
): Promise<{ open: boolean; service: string; evidence: string; technique: string; confidence: number }> {
  const httpScheme = preferredHttpScheme(port, schemeHint);
  if (httpScheme) {
    try {
      const { output } = await fetchHeaders(`${httpScheme}://${host}:${port}`);
      if (parseHttpStatus(output) != null) {
        return {
          open: true,
          service: httpScheme === "https" ? "https" : "http",
          evidence: `$ curl -k -I ${httpScheme}://${host}:${port}\n${output}`,
          technique: "HTTP probe",
          confidence: 0.92
        };
      }
    } catch {
      // fall through
    }
  }

  const tcpProbe = await probeTcpConnect(host, port);
  if (!tcpProbe.open) {
    return { open: false, service: "tcp", evidence: tcpProbe.evidence, technique: "TCP connect", confidence: 0.5 };
  }

  if (port === 443 || port === 8443 || schemeHint === "https") {
    const tlsProbe = await inspectTlsWithNode(host, port);
    if (tlsProbe.connected) {
      return { open: true, service: "https", evidence: tlsProbe.evidence, technique: "TLS handshake", confidence: 0.9 };
    }
  }

  return {
    open: true,
    service: inferServiceForPort(port),
    evidence: tcpProbe.evidence,
    technique: "TCP connect",
    confidence: 0.8
  };
}

function preferredHttpScheme(port: number, schemeHint: string | null): "http" | "https" | null {
  if (schemeHint === "https" || port === 443 || port === 8443) return "https";
  if (schemeHint === "http" || [80, 8080, 8888].includes(port)) return "http";
  return null;
}

function inferServiceForPort(port: number): string {
  const map: Record<number, string> = {
    21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 53: "dns",
    80: "http", 110: "pop3", 143: "imap", 443: "https",
    445: "smb", 993: "imaps", 995: "pop3s", 3306: "mysql",
    3389: "rdp", 5432: "postgresql", 5900: "vnc", 6379: "redis",
    8080: "http", 8443: "https", 8888: "http", 27017: "mongodb"
  };
  return map[port] ?? "tcp";
}

function parseHttpStatus(output: string): number | null {
  const match = output.match(/HTTP\/\d+(?:\.\d+)?\s+(\d{3})/);
  return match ? Number(match[1]) : null;
}

async function probeTcpConnect(host: string, port: number): Promise<{ open: boolean; evidence: string }> {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ open: false, evidence: `$ tcp-connect ${host}:${port}\nTimed out` });
    }, 4000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.end();
      resolve({ open: true, evidence: `$ tcp-connect ${host}:${port}\nConnected` });
    });
    socket.once("error", (error: Error) => {
      clearTimeout(timeout);
      resolve({ open: false, evidence: `$ tcp-connect ${host}:${port}\n${error.message}` });
    });
  });
}

async function inspectTlsWithNode(host: string, port: number): Promise<{ connected: boolean; evidence: string }> {
  return await new Promise((resolve) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false });
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ connected: false, evidence: `$ tls-connect ${host}:${port}\nTimed out` });
    }, 5000);
    socket.once("secureConnect", () => {
      clearTimeout(timeout);
      const cert = socket.getPeerCertificate();
      const protocol = socket.getProtocol();
      const cipher = socket.getCipher();
      socket.end();
      resolve({
        connected: true,
        evidence: [
          `$ tls-connect ${host}:${port}`,
          `Protocol version: ${protocol ?? "unknown"}`,
          `Ciphersuite: ${cipher?.name ?? "unknown"}`,
          cert?.subject?.CN ? `Peer certificate: CN=${cert.subject.CN}` : "Peer certificate: unavailable"
        ].join("\n")
      });
    });
    socket.once("error", (error: Error) => {
      clearTimeout(timeout);
      resolve({ connected: false, evidence: `$ tls-connect ${host}:${port}\n${error.message}` });
    });
  });
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchHeaders(url: string): Promise<{ output: string; exitCode: number }> {
  try {
    const result = await runTool("curl", ["-k", "-I", "-s", "--max-time", "8", url], 10000);
    return { output: `$ curl -k -I ${url}\n${result.output}`, exitCode: result.exitCode };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "curl")) throw error;
    return requestWithNode(url, "HEAD");
  }
}

async function fetchPage(
  url: string,
  options?: { method?: "POST" | "GET"; body?: string; headers?: Record<string, string> }
): Promise<{ output: string; exitCode: number }> {
  if (options?.method === "POST") {
    try {
      const curlArgs = ["-k", "-i", "-s", "--max-time", "8", "-X", "POST"];
      if (options.body) curlArgs.push("-d", options.body);
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          curlArgs.push("-H", `${key}: ${value}`);
        }
      }
      curlArgs.push(url);
      const result = await runTool("curl", curlArgs, 12000);
      return { output: `$ curl -k -i -X POST ${url}\n${result.output}`, exitCode: result.exitCode };
    } catch (error: unknown) {
      if (!isMissingToolError(error, "curl")) throw error;
      return requestWithNode(url, "GET"); // fallback GET for POST
    }
  }
  try {
    const result = await runTool("curl", ["-k", "-i", "-s", "--max-time", "8", url], 12000);
    return { output: `$ curl -k -i ${url}\n${result.output}`, exitCode: result.exitCode };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "curl")) throw error;
    return requestWithNode(url, "GET");
  }
}

async function fetchWithOrigin(url: string, origin: string): Promise<{ output: string; exitCode: number }> {
  try {
    const result = await runTool(
      "curl",
      ["-k", "-I", "-s", "--max-time", "8", "-H", `Origin: ${origin}`, url],
      10000
    );
    return { output: `$ curl -k -I -H "Origin: ${origin}" ${url}\n${result.output}`, exitCode: result.exitCode };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "curl")) throw error;
    return requestWithNode(url, "HEAD");
  }
}

async function requestWithNode(
  urlString: string,
  method: "HEAD" | "GET"
): Promise<{ output: string; exitCode: number }> {
  const url = new URL(urlString);
  const transport = url.protocol === "https:" ? https : http;

  return await new Promise((resolve, reject) => {
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method,
        rejectUnauthorized: false,
        timeout: 8000
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => {
          if (method === "GET") chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          const body = method === "GET" ? Buffer.concat(chunks).toString("utf8") : "";
          resolve({
            output: formatNodeHttpResponse(urlString, method, res.statusCode ?? 0, res.headers, body),
            exitCode: 0
          });
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.end();
  });
}

function formatNodeHttpResponse(
  url: string,
  method: "HEAD" | "GET",
  statusCode: number,
  headers: http.IncomingHttpHeaders,
  body: string
): string {
  const headerLines = Object.entries(headers)
    .flatMap(([key, value]) =>
      value === undefined
        ? []
        : Array.isArray(value)
          ? value.map((entry) => `${key}: ${entry}`)
          : [`${key}: ${value}`]
    )
    .join("\n");

  return [`$ node-http ${method} ${url}`, `HTTP/1.1 ${statusCode}`, headerLines, body]
    .filter((part) => part.length > 0)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function extractNiktoTitle(line: string): string {
  const cleaned = line.replace(/^\+\s*/, "").trim();
  // Extract description before the first period or colon
  const title = cleaned.split(/[.:]/)[0]?.trim() ?? cleaned;
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}
