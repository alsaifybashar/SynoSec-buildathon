import { randomUUID } from "crypto";
import { execFile } from "node:child_process";
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

function createObservation(
  context: AdapterExecutionContext,
  input: Omit<Observation, "id" | "scanId" | "nodeId" | "toolRunId" | "adapter" | "target" | "createdAt">
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

function ensureToolInstalled(error: unknown, tool: string): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`${tool} execution failed: ${message}`);
}

function isMissingToolError(error: unknown, tool: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`${tool} execution failed: spawn ${tool} ENOENT`) || message.includes(`spawn ${tool} ENOENT`);
}

function shouldFallbackToolExecution(error: unknown, tool: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    isMissingToolError(error, tool) ||
    message.includes(`${tool} execution failed:`) ||
    message.includes(`Command failed: ${tool} `)
  );
}

async function runTool(
  file: string,
  args: string[],
  timeoutMs = 30000
): Promise<{ output: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024
    });
    return {
      output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
      exitCode: 0
    };
  } catch (error: unknown) {
    ensureToolInstalled(error, file);
  }
}

function parseOpenPorts(output: string): Array<{ port: number; service: string }> {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\/tcp\s+open/.test(line))
    .map((line) => {
      const match = line.match(/^(\d+)\/tcp\s+open\s+([^\s]+)/);
      return match ? { port: Number(match[1]), service: match[2] } : null;
    })
    .filter((value): value is { port: number; service: string } => value !== null);
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

async function executeNetworkScan(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  try {
    const { output, exitCode } = await runTool("nmap", ["-sn", context.request.target]);
    return {
      observations: parseNmapHostUp(output, context.request.target).map((observation) =>
        createObservation(context, observation)
      ),
      output,
      exitCode
    };
  } catch (error: unknown) {
    if (!shouldFallbackToolExecution(error, "nmap")) {
      throw error;
    }

    const parsedTarget = parseScanTarget(context.request.target);
    const evidence = `fallback network probe\nhost=${parsedTarget.host}\nresolution=ok`;
    return {
      observations: [
        createObservation(context, {
          key: `host-resolved:${parsedTarget.host}`,
          title: "Host resolved for scanning",
          summary: `Confirmed ${parsedTarget.host} resolved and is eligible for service discovery.`,
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
  const args = ["-sV"];
  if (ports) args.push("-p", ports);
  args.push(target);

  try {
    const { output, exitCode } = await runTool("nmap", args);
    return {
      observations: parseOpenPorts(output).map(({ port, service }) =>
        createObservation(context, {
          key: `open-port:${target}:${port}`,
          title: `Open ${service.toUpperCase()} service on ${port}`,
          summary: `${service} is reachable on ${target}:${port}.`,
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
      const { output, exitCode } = await runTool("smbclient", ["-L", target, "-N"]);
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
      if (!isMissingToolError(error, "smbclient")) {
        throw error;
      }
      return {
        observations: [],
        output: "smbclient unavailable; SMB session audit skipped.",
        exitCode: 0
      };
    }
  }

  try {
    const { output, exitCode } = await runTool("ssh-audit", [target]);
    const passwordAuth = output.toLowerCase().includes("password");
    return {
      observations: passwordAuth
        ? [
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
          ]
        : [],
      output,
      exitCode
    };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "ssh-audit")) {
      throw error;
    }
    return {
      observations: [],
      output: "ssh-audit unavailable; SSH session audit skipped.",
      exitCode: 0
    };
  }
}

async function executeTlsAudit(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsedTarget = parseScanTarget(context.request.target);
  const target = parsedTarget.host;
  const port = context.request.port ?? parsedTarget.port ?? 443;

  try {
    const { output, exitCode } = await runTool("sslscan", [`${target}:${port}`]);
    return buildTlsAuditResult(context, output, exitCode, target, port);
  } catch (error: unknown) {
    if (!isMissingToolError(error, "sslscan")) {
      throw error;
    }

    const inspected = await inspectTlsWithNode(target, port);
    return buildTlsAuditResult(context, inspected.evidence, inspected.connected ? 0 : 1, target, port);
  }
}

async function executeHttpProbe(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsedTarget = parseScanTarget(context.request.target);
  const target = parsedTarget.host;
  const port = context.request.port ?? parsedTarget.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";
  const baseUrl = `${scheme}://${target}:${port}`;
  const headerResult = await fetchHeaders(baseUrl);
  const observations: Observation[] = [];

  if (!/strict-transport-security/i.test(headerResult.output) || !/content-security-policy/i.test(headerResult.output)) {
    observations.push(
      createObservation(context, {
        key: `missing-security-headers:${target}:${port}`,
        title: "Missing HTTP security headers",
        summary: "The application response omits several defensive headers.",
        severity: "low",
        confidence: 0.95,
        port,
        evidence: headerResult.output,
        technique: "Header audit",
        relatedKeys: []
      })
    );
  }

  const adminResult = await fetchPage(`${baseUrl}/admin`);
  if (/HTTP\/.*\s(200|401|403)/.test(adminResult.output)) {
    observations.push(
      createObservation(context, {
        key: `admin-surface:${target}:${port}`,
        title: "Administrative surface discovered",
        summary: "An administrative route appears reachable and should be reviewed for authn/authz.",
        severity: "medium",
        confidence: 0.76,
        port,
        evidence: adminResult.output,
        technique: "HTTP route probe",
        relatedKeys: []
      })
    );
  }

  return {
    observations,
    output: [`$ curl -k -I ${baseUrl}`, headerResult.output, `$ curl -k -i ${baseUrl}/admin`, adminResult.output].join("\n\n"),
    exitCode: Math.max(headerResult.exitCode, adminResult.exitCode)
  };
}

async function executeWebFingerprint(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsedTarget = parseScanTarget(context.request.target);
  const target = parsedTarget.host;
  const port = context.request.port ?? parsedTarget.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";

  try {
    const { output, exitCode } = await runTool("whatweb", [`${scheme}://${target}:${port}`]);
    return buildWebFingerprintResult(context, output, exitCode, target, port);
  } catch (error: unknown) {
    if (!isMissingToolError(error, "whatweb")) {
      throw error;
    }
    const { output, exitCode } = await fetchPage(`${scheme}://${target}:${port}`);
    return buildWebFingerprintResult(context, output, exitCode, target, port);
  }
}

async function executeDbInjectionCheck(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsedTarget = parseScanTarget(context.request.target);
  const target = parsedTarget.host;
  const port = context.request.port ?? parsedTarget.port;
  const baseUrl = `http://${target}${port ? `:${port}` : ""}/`;

  try {
    const { output, exitCode } = await runTool("sqlmap", ["-u", baseUrl, "--batch", "--level=1", "--risk=1"]);

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
    if (!isMissingToolError(error, "sqlmap")) {
      throw error;
    }
    return {
      observations: [],
      output: "sqlmap unavailable; DB injection check skipped.",
      exitCode: 0
    };
  }
}

async function executeContentDiscovery(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsedTarget = parseScanTarget(context.request.target);
  const target = parsedTarget.host;
  const port = context.request.port ?? parsedTarget.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";
  const baseUrl = `${scheme}://${target}:${port}`;

  try {
    const { output, exitCode } = await runTool("ffuf", [
      "-u",
      `${baseUrl}/FUZZ`,
      "-w",
      "/usr/share/wordlists/dirb/common.txt",
      "-mc",
      "200,204,301,302,307,401,403",
      "-maxtime",
      "20"
    ], 25000);

    return {
      observations: output
        .split("\n")
        .filter((line) => line.trim().startsWith("/"))
        .slice(0, 10)
        .map((line, index) =>
          createObservation(context, {
            key: `content-discovery:${target}:${port}:${index}`,
            title: "Discovered application path",
            summary: `ffuf discovered an in-scope path on ${target}:${port}.`,
            severity: "medium",
            confidence: 0.78,
            port,
            evidence: line,
            technique: "Content discovery",
            relatedKeys: []
          })
        ),
      output,
      exitCode
    };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "ffuf")) {
      throw error;
    }

    const outputParts: string[] = [];
    const observations: Observation[] = [];
    for (const path of ["/robots.txt", "/login", "/admin"]) {
      const { output } = await fetchPage(`${baseUrl}${path}`);
      outputParts.push(`$ curl -k -i ${baseUrl}${path}\n${output}`);
      const statusCode = parseHttpStatus(output);
      if (statusCode != null && [200, 301, 302, 401, 403].includes(statusCode)) {
        observations.push(
          createObservation(context, {
            key: `content-discovery:${target}:${port}:${path}`,
            title: "Discovered application path",
            summary: `${path} responded with HTTP ${statusCode} on ${target}:${port}.`,
            severity: statusCode === 200 ? "medium" : "info",
            confidence: 0.82,
            port,
            evidence: output,
            technique: "Content discovery",
            relatedKeys: []
          })
        );
      }
    }

    return {
      observations,
      output: outputParts.join("\n\n"),
      exitCode: 0
    };
  }
}

const adapterExecutors: Record<ToolAdapter, (context: AdapterExecutionContext) => Promise<AdapterExecutionResult>> = {
  network_scan: executeNetworkScan,
  service_scan: executeServiceScan,
  session_audit: executeSessionAudit,
  tls_audit: executeTlsAudit,
  http_probe: executeHttpProbe,
  web_fingerprint: executeWebFingerprint,
  db_injection_check: executeDbInjectionCheck,
  content_discovery: executeContentDiscovery
};

export async function executeAdapter(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const executor = adapterExecutors[context.request.adapter];
  if (!executor) {
    throw new Error(`No adapter registered for ${context.request.adapter}`);
  }
  return executor(context);
}

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
        summary: "The service still accepts TLS 1.0/1.1 and should be tightened to TLS 1.2+.",
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
  return {
    observations: output.trim().length > 0
      ? [
          createObservation(context, {
            key: `version-disclosure:${target}:${port}`,
            title: "Technology fingerprint collected",
            summary: "The scanner identified application stack details that can guide follow-on validation.",
            severity: "info",
            confidence: 0.9,
            port,
            evidence: output,
            technique: "Tech fingerprint",
            relatedKeys: []
          })
        ]
      : [],
    output,
    exitCode
  };
}

async function fallbackServiceScan(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const parsedTarget = parseScanTarget(context.request.target);
  const host = parsedTarget.host;
  const requestedPorts = Array.isArray(context.request.parameters["ports"])
    ? (context.request.parameters["ports"] as string[]).map((value) => Number(value)).filter(Number.isInteger)
    : [];
  const candidatePorts = requestedPorts.length > 0
    ? requestedPorts
    : parsedTarget.port != null
      ? [parsedTarget.port]
      : [80, 443];

  const observations: Observation[] = [];
  const outputParts: string[] = [];

  for (const port of [...new Set(candidatePorts)]) {
    const probe = await probePort(host, port, parsedTarget.scheme);
    outputParts.push(probe.evidence);
    if (!probe.open) {
      continue;
    }

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

  return {
    observations,
    output: outputParts.join("\n\n"),
    exitCode: observations.length > 0 ? 0 : 1
  };
}

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
      // Fall through to TCP/TLS probes.
    }
  }

  const tcpProbe = await probeTcpConnect(host, port);
  if (!tcpProbe.open) {
    return {
      open: false,
      service: "tcp",
      evidence: tcpProbe.evidence,
      technique: "TCP connect",
      confidence: 0.5
    };
  }

  if (port === 443 || port === 8443 || schemeHint === "https") {
    const tlsProbe = await inspectTlsWithNode(host, port);
    if (tlsProbe.connected) {
      return {
        open: true,
        service: "https",
        evidence: tlsProbe.evidence,
        technique: "TLS handshake",
        confidence: 0.9
      };
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
  if (schemeHint === "https" || port === 443 || port === 8443) {
    return "https";
  }
  if (schemeHint === "http" || [80, 8080, 8888].includes(port)) {
    return "http";
  }
  return null;
}

function inferServiceForPort(port: number): string {
  switch (port) {
    case 22:
      return "ssh";
    case 23:
      return "telnet";
    case 80:
    case 8080:
    case 8888:
      return "http";
    case 443:
    case 8443:
      return "https";
    case 445:
      return "smb";
    case 5432:
      return "postgresql";
    default:
      return "tcp";
  }
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
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ connected: false, evidence: `$ tls-connect ${host}:${port}\nTimed out` });
    }, 5000);

    socket.once("secureConnect", () => {
      clearTimeout(timeout);
      const certificate = socket.getPeerCertificate();
      const protocol = socket.getProtocol();
      const cipher = socket.getCipher();
      socket.end();
      resolve({
        connected: true,
        evidence: [
          `$ tls-connect ${host}:${port}`,
          `Protocol version: ${protocol ?? "unknown"}`,
          `Ciphersuite: ${cipher?.name ?? "unknown"}`,
          certificate?.subject?.CN ? `Peer certificate: CN=${certificate.subject.CN}` : "Peer certificate: unavailable"
        ].join("\n")
      });
    });

    socket.once("error", (error: Error) => {
      clearTimeout(timeout);
      resolve({ connected: false, evidence: `$ tls-connect ${host}:${port}\n${error.message}` });
    });
  });
}

async function fetchHeaders(url: string): Promise<{ output: string; exitCode: number }> {
  try {
    const result = await runTool("curl", ["-k", "-I", url]);
    return {
      output: `$ curl -k -I ${url}\n${result.output}`,
      exitCode: result.exitCode
    };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "curl")) {
      throw error;
    }
    return requestWithNode(url, "HEAD");
  }
}

async function fetchPage(url: string): Promise<{ output: string; exitCode: number }> {
  try {
    const result = await runTool("curl", ["-k", "-i", url]);
    return {
      output: `$ curl -k -i ${url}\n${result.output}`,
      exitCode: result.exitCode
    };
  } catch (error: unknown) {
    if (!isMissingToolError(error, "curl")) {
      throw error;
    }
    return requestWithNode(url, "GET");
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
          if (method === "GET") {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
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

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });
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

  return [
    `$ node-http ${method} ${url}`,
    `HTTP/1.1 ${statusCode}`,
    headerLines,
    body
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
}
