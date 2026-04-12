import { randomUUID } from "crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  Observation,
  Severity,
  ToolAdapter,
  ToolRequest,
  ToolRun
} from "@synosec/contracts";

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
  if ([22, 80, 443, 8080, 8443].includes(port)) return "info";
  return "medium";
}

function ensureToolInstalled(error: unknown, tool: string): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`${tool} execution failed: ${message}`);
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

type DerivedObservationInput = Omit<
  Observation,
  "id" | "scanId" | "nodeId" | "toolRunId" | "adapter" | "target" | "createdAt"
>;

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
      severity: "info" as const,
      confidence: 0.98,
      evidence: output,
      technique: "ICMP sweep",
      relatedKeys: []
    }
  ];
}

async function executeNetworkScan(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { output, exitCode } = await runTool("nmap", ["-sn", context.request.target]);
  return {
    observations: parseNmapHostUp(output, context.request.target).map((observation) =>
      createObservation(context, observation)
    ),
    output,
    exitCode
  };
}

async function executeServiceScan(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const target = context.request.target;
  const ports = Array.isArray(context.request.parameters["ports"])
    ? (context.request.parameters["ports"] as string[]).join(",")
    : undefined;
  const args = ["-sV"];
  if (ports) args.push("-p", ports);
  args.push(target);

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
}

async function executeSessionAudit(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const target = context.request.target;
  const port = context.request.port;
  if (context.request.service === "smb") {
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
  }

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
}

async function executeTlsAudit(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const target = context.request.target;
  const port = context.request.port ?? 443;
  const { output, exitCode } = await runTool("sslscan", [`${target}:${port}`]);
  const observations: Observation[] = [];

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

async function executeHttpProbe(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const target = context.request.target;
  const port = context.request.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";
  const baseUrl = `${scheme}://${target}:${port}`;
  const headerResult = await runTool("curl", ["-k", "-I", baseUrl]);
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

  const adminResult = await runTool("curl", ["-k", "-i", `${baseUrl}/admin`]);
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
  const target = context.request.target;
  const port = context.request.port ?? 80;
  const scheme = port === 443 || port === 8443 ? "https" : "http";
  const { output, exitCode } = await runTool("whatweb", [`${scheme}://${target}:${port}`]);

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

async function executeDbInjectionCheck(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const target = context.request.target;
  const port = context.request.port;
  const baseUrl = `http://${target}${port ? `:${port}` : ""}/`;
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
        port,
        evidence: output,
        technique: "SQLi probe",
        relatedKeys: []
      })
    ],
    output,
    exitCode
  };
}

async function executeContentDiscovery(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const target = context.request.target;
  const port = context.request.port ?? 80;
  const { output, exitCode } = await runTool("ffuf", [
    "-u",
    `http://${target}:${port}/FUZZ`,
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
