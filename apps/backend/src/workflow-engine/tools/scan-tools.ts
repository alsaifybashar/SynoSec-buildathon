import { randomUUID } from "crypto";
import { spawn } from "node:child_process";
import { localDemoTargetDefaults } from "@synosec/contracts";
import { createAuditEntry } from "@/platform/db/scan-store.js";
import type { AuditEntry, ScanScope } from "@synosec/contracts";

const commandTimeoutMs = Number(process.env["SCAN_COMMAND_TIMEOUT_MS"] ?? "5000");
const maxOutputBytes = Number(process.env["SCAN_COMMAND_MAX_OUTPUT_BYTES"] ?? "8192");

const curlBinary = process.env["SCAN_BIN_CURL"] ?? "curl";
const ncBinary = process.env["SCAN_BIN_NC"] ?? "nc";
const opensslBinary = process.env["SCAN_BIN_OPENSSL"] ?? "openssl";

export interface ToolExecutionContext {
  scanId: string;
  scope: ScanScope;
  actor: string;
  targetTacticId: string;
}

export interface ToolResult {
  ok: boolean;
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  argv: string[];
  durationMs: number;
}

export interface TcpPortCheckResult extends ToolResult {
  open: boolean;
}

export interface BannerGrabResult extends ToolResult {
  banner: string | null;
}

export interface HttpFetchResult extends ToolResult {
  url: string;
  statusCode: number | null;
  headers: Record<string, string>;
}

export interface TlsInspectionResult extends ToolResult {
  connected: boolean;
}

export interface ParsedTarget {
  host: string;
  port: number | null;
  scheme: string | null;
}

export interface TargetPreflightAnalysis {
  input: string;
  normalizedTarget: string;
  host: string;
  port: number | null;
  scheme: string | null;
  changed: boolean;
  reasons: string[];
}

export class ScanToolRunner {
  constructor(private readonly context: ToolExecutionContext) {}

  async checkTcpPort(host: string, port: number): Promise<TcpPortCheckResult> {
    this.assertHostAllowed(host);
    this.assertPortAllowed(port);
    const timeoutSeconds = Math.max(1, Math.ceil(commandTimeoutMs / 1000));
    const result = await this.executeTcpWithFallbacks("check_tcp_port", host, (candidateHost) => [
      ncBinary,
      "-zvw",
      String(timeoutSeconds),
      candidateHost,
      String(port)
    ]);
    return {
      ...result,
      open: result.ok
    };
  }

  async grabTcpBanner(host: string, port: number): Promise<BannerGrabResult> {
    this.assertHostAllowed(host);
    this.assertPortAllowed(port);
    const timeoutSeconds = Math.max(1, Math.ceil(commandTimeoutMs / 1000));
    const result = await this.executeTcpWithFallbacks("grab_tcp_banner", host, (candidateHost) => [
      ncBinary,
      "-w",
      String(timeoutSeconds),
      candidateHost,
      String(port)
    ]);
    const banner = firstNonEmptyLine(result.stdout);
    return {
      ...result,
      banner
    };
  }

  async fetchHttpHeaders(url: string): Promise<HttpFetchResult> {
    this.assertUrlAllowed(url);
    const timeoutSeconds = Math.max(1, Math.ceil(commandTimeoutMs / 1000));
    const parsed = new URL(url);
    const result = await this.executeUrlWithFallbacks("fetch_http_headers", parsed, (candidateUrl) => [
      curlBinary,
      "-skI",
      "--max-time",
      String(timeoutSeconds),
      candidateUrl
    ]);
    return {
      ...result,
      url: result.argv.at(-1) ?? url,
      statusCode: parseStatusCode(result.stdout),
      headers: parseHttpHeaders(result.stdout)
    };
  }

  async fetchHttpPath(url: string, path: string): Promise<HttpFetchResult> {
    const normalized = new URL(path, ensureTrailingSlash(url)).toString();
    this.assertUrlAllowed(normalized);
    const timeoutSeconds = Math.max(1, Math.ceil(commandTimeoutMs / 1000));
    const parsed = new URL(normalized);
    const result = await this.executeUrlWithFallbacks("fetch_http_path", parsed, (candidateUrl) => [
      curlBinary,
      "-sk",
      "-D",
      "-",
      "-o",
      "/dev/null",
      "--max-time",
      String(timeoutSeconds),
      candidateUrl
    ]);
    return {
      ...result,
      url: result.argv.at(-1) ?? normalized,
      statusCode: parseStatusCode(result.stdout),
      headers: parseHttpHeaders(result.stdout)
    };
  }

  async inspectTls(host: string, port: number): Promise<TlsInspectionResult> {
    this.assertHostAllowed(host);
    this.assertPortAllowed(port);
    const result = await this.executeTcpWithFallbacks("inspect_tls", host, (candidateHost) => [
      opensslBinary,
      "s_client",
      "-brief",
      "-showcerts",
      "-connect",
      `${candidateHost}:${port}`,
      "-servername",
      candidateHost
    ]);
    const combined = `${result.stdout}\n${result.stderr}`;
    return {
      ...result,
      connected: /Protocol version|CONNECTION ESTABLISHED|Peer certificate/i.test(combined)
    };
  }

  private async execute(adapter: string, argv: string[]): Promise<ToolResult> {
    const result = await runProcess(argv, commandTimeoutMs, maxOutputBytes);
    await this.audit(adapter, result);
    return result;
  }

  private async executeTcpWithFallbacks(
    adapter: string,
    host: string,
    buildArgv: (candidateHost: string) => string[]
  ): Promise<ToolResult> {
    let lastResult: ToolResult | null = null;

    for (const candidateHost of getExecutionHostCandidates(host)) {
      const result = await this.execute(adapter, buildArgv(candidateHost));
      if (result.ok) {
        return result;
      }
      lastResult = result;
      if (!shouldRetryWithAlternateHost(result)) {
        break;
      }
    }

    return lastResult ?? {
      ok: false,
      exitCode: null,
      timedOut: false,
      stdout: "",
      stderr: `No tool result for ${host}`,
      argv: buildArgv(host),
      durationMs: 0
    };
  }

  private async executeUrlWithFallbacks(
    adapter: string,
    parsedUrl: URL,
    buildArgv: (candidateUrl: string) => string[]
  ): Promise<ToolResult> {
    let lastResult: ToolResult | null = null;

    for (const candidateHost of getExecutionHostCandidates(parsedUrl.hostname)) {
      const candidateUrl = new URL(parsedUrl.toString());
      candidateUrl.hostname = candidateHost;
      const result = await this.execute(adapter, buildArgv(candidateUrl.toString()));
      if (result.ok && parseStatusCode(result.stdout) != null) {
        return result;
      }
      lastResult = result;
      if (!shouldRetryWithAlternateHost(result)) {
        break;
      }
    }

    return lastResult ?? {
      ok: false,
      exitCode: null,
      timedOut: false,
      stdout: "",
      stderr: `No HTTP response for ${parsedUrl.toString()}`,
      argv: buildArgv(parsedUrl.toString()),
      durationMs: 0
    };
  }

  private async audit(adapter: string, result: ToolResult): Promise<void> {
    const entry: AuditEntry = {
      id: randomUUID(),
      scanId: this.context.scanId,
      timestamp: new Date().toISOString(),
      actor: this.context.actor,
      action: "tool-executed",
      targetTacticId: this.context.targetTacticId,
      scopeValid: true,
      details: {
        adapter,
        argv: result.argv,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        durationMs: result.durationMs,
        stdout: result.stdout,
        stderr: result.stderr
      }
    };
    await createAuditEntry(entry);
  }

  private assertHostAllowed(host: string): void {
    if (!isExecutionTargetAllowed(host, this.context.scope)) {
      throw new Error(`Target ${host} is out of scope for tool execution`);
    }
  }

  private assertUrlAllowed(url: string): void {
    const parsed = new URL(url);
    const target = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
    if (!isExecutionTargetAllowed(target, this.context.scope)) {
      throw new Error(`Target ${target} is out of scope for tool execution`);
    }
  }

  private assertPortAllowed(port: number): void {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port ${port}`);
    }
  }
}

export function parseScanTarget(target: string): ParsedTarget {
  if (/^[a-z]+:\/\//i.test(target)) {
    const parsed = new URL(target);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : null,
      scheme: parsed.protocol.replace(/:$/, "")
    };
  }

  const parsed = new URL(`tcp://${target}`);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : null,
    scheme: null
  };
}

export function analyzeTargetInput(input: string): TargetPreflightAnalysis {
  const trimmed = input.trim();
  let candidate = trimmed;
  const reasons: string[] = [];

  // Repair common malformed web inputs like https//example.com or http:example.com.
  if (/^https?\/\//i.test(candidate) && !/^https?:\/\//i.test(candidate)) {
    candidate = candidate.replace(/^(https?)\/\//i, "$1://");
    reasons.push("Inserted missing colon after URL scheme.");
  } else if (/^https?:[^/]/i.test(candidate) && !/^https?:\/\//i.test(candidate)) {
    candidate = candidate.replace(/^(https?):/i, "$1://");
    reasons.push("Inserted missing slashes after URL scheme.");
  }

  const looksLikeWebInput =
    /^[a-z]+:\/\//i.test(candidate)
    || /[/?#]/.test(candidate)
    || /:\d+\/.+/.test(candidate);

  let parsed: ParsedTarget;
  let normalizedTarget: string;

  if (looksLikeWebInput) {
    const withDefaultScheme = /^[a-z]+:\/\//i.test(candidate) ? candidate : `http://${candidate}`;
    const url = new URL(withDefaultScheme);
    parsed = {
      host: url.hostname,
      port: url.port ? Number(url.port) : inferDefaultPort(url.protocol.replace(/:$/, "")),
      scheme: url.protocol.replace(/:$/, "")
    };
    normalizedTarget = parsed.port ? `${parsed.host}:${parsed.port}` : parsed.host;

    if (!/^[a-z]+:\/\//i.test(trimmed)) {
      reasons.push("Assumed HTTP scheme for web-style target input.");
    }
    if ((url.pathname && url.pathname !== "/") || url.search || url.hash) {
      reasons.push("Dropped path, query, or fragment because scan scope targets must identify the host/service.");
    }
  } else {
    parsed = parseScanTarget(candidate);
    normalizedTarget = parsed.port ? `${parsed.host}:${parsed.port}` : parsed.host;
  }

  if (parsed.port == null && parsed.scheme != null) {
    const scheme = parsed.scheme;
    const inferredPort = inferDefaultPort(scheme);
    if (inferredPort != null) {
      parsed = { ...parsed, port: inferredPort };
      normalizedTarget = `${parsed.host}:${inferredPort}`;
      reasons.push(`Inferred default ${scheme.toUpperCase()} port ${inferredPort}.`);
    }
  }

  if (trimmed !== normalizedTarget && reasons.length === 0) {
    reasons.push("Canonicalized target format for scanner compatibility.");
  }

  return {
    input: trimmed,
    normalizedTarget,
    host: parsed.host,
    port: parsed.port,
    scheme: parsed.scheme,
    changed: trimmed !== normalizedTarget,
    reasons
  };
}

export function isTargetInScope(target: string, scope: ScanScope): boolean {
  const candidate = parseScopeToken(target);

  for (const exclusion of scope.exclusions) {
    if (scopeTokenMatches(candidate, parseScopeToken(exclusion))) {
      return false;
    }
  }

  for (const scopeTarget of scope.targets) {
    if (scopeTokenMatches(candidate, parseScopeToken(scopeTarget))) {
      return true;
    }
  }

  return false;
}

export function isExecutionTargetAllowed(target: string, scope: ScanScope): boolean {
  if (isTargetInScope(target, scope)) {
    return true;
  }

  const candidate = parseScopeToken(target);
  for (const scopeTarget of scope.targets) {
    const allowedTarget = parseScopeToken(scopeTarget);
    const aliases = new Set(getExecutionHostCandidates(allowedTarget.host));
    if (aliases.has(candidate.host) && portsAreCompatible(candidate.port, allowedTarget.port)) {
      return true;
    }
  }

  return false;
}

function parseScopeToken(value: string): { host: string; port: number | null } {
  try {
    const parsed = analyzeTargetInput(value);
    return { host: parsed.host, port: parsed.port };
  } catch {
    const match = value.match(/^(.*?)(?::(\d+))?$/);
    const host = match?.[1]?.trim() ?? value.trim();
    const portValue = match?.[2];
    return {
      host,
      port: portValue ? Number(portValue) : null
    };
  }
}

function scopeTokenMatches(
  candidate: { host: string; port: number | null },
  allowed: { host: string; port: number | null }
): boolean {
  return candidate.host === allowed.host && portsAreCompatible(candidate.port, allowed.port);
}

function portsAreCompatible(candidatePort: number | null, allowedPort: number | null): boolean {
  return candidatePort == null || allowedPort == null || candidatePort === allowedPort;
}

function getExecutionHostCandidates(host: string): string[] {
  const candidates = [host];
  const demoHosts = new Set([
    localDemoTargetDefaults.internalHost,
    "localhost",
    "127.0.0.1",
    "host.docker.internal"
  ]);

  if (demoHosts.has(host)) {
    candidates.push(
      localDemoTargetDefaults.internalHost,
      "localhost",
      "127.0.0.1",
      "host.docker.internal"
    );
  }

  return [...new Set(candidates)];
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function inferDefaultPort(scheme: string | null): number | null {
  switch (scheme) {
    case "http":
      return 80;
    case "https":
      return 443;
    default:
      return null;
  }
}

function parseStatusCode(text: string): number | null {
  const match = text.match(/HTTP\/\d+(?:\.\d+)?\s+(\d{3})/);
  return match ? Number(match[1]) : null;
}

function parseHttpHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key.length > 0) {
      headers[key] = value;
    }
  }
  return headers;
}

function firstNonEmptyLine(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

function looksLikeNameResolutionFailure(text: string): boolean {
  return /could not resolve host|name or service not known|nodename nor servname provided|temporary failure in name resolution/i.test(text);
}

function shouldRetryWithAlternateHost(result: ToolResult): boolean {
  return result.timedOut || looksLikeNameResolutionFailure(result.stderr);
}

async function runProcess(argv: string[], timeoutMs: number, outputLimitBytes: number): Promise<ToolResult> {
  return await new Promise<ToolResult>((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(argv[0] ?? "", argv.slice(1), {
      stdio: "pipe"
    });

    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;

    const killTimer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      const remaining = outputLimitBytes - stdoutBytes;
      if (remaining > 0) {
        const slice = text.slice(0, remaining);
        stdout += slice;
        stdoutBytes += Buffer.byteLength(slice);
      }
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      const remaining = outputLimitBytes - stderrBytes;
      if (remaining > 0) {
        const slice = text.slice(0, remaining);
        stderr += slice;
        stderrBytes += Buffer.byteLength(slice);
      }
    });

    child.on("error", (error) => {
      clearTimeout(killTimer);
      reject(error);
    });

    child.on("close", (exitCode) => {
      clearTimeout(killTimer);
      resolve({
        ok: exitCode === 0 && timedOut === false,
        exitCode,
        timedOut,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        argv,
        durationMs: Date.now() - startedAt
      });
    });

    child.stdin.end();
  });
}
