import { randomUUID } from "crypto";
import { spawn } from "node:child_process";
import { createAuditEntry } from "../db/neo4j.js";
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
  targetNodeId: string;
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

export class ScanToolRunner {
  constructor(private readonly context: ToolExecutionContext) {}

  async checkTcpPort(host: string, port: number): Promise<TcpPortCheckResult> {
    this.assertHostAllowed(host);
    this.assertPortAllowed(port);
    const timeoutSeconds = Math.max(1, Math.ceil(commandTimeoutMs / 1000));
    const result = await this.execute("check_tcp_port", [ncBinary, "-zvw", String(timeoutSeconds), host, String(port)]);
    return {
      ...result,
      open: result.ok
    };
  }

  async grabTcpBanner(host: string, port: number): Promise<BannerGrabResult> {
    this.assertHostAllowed(host);
    this.assertPortAllowed(port);
    const timeoutSeconds = Math.max(1, Math.ceil(commandTimeoutMs / 1000));
    const result = await this.execute("grab_tcp_banner", [ncBinary, "-w", String(timeoutSeconds), host, String(port)]);
    const banner = firstNonEmptyLine(result.stdout);
    return {
      ...result,
      banner
    };
  }

  async fetchHttpHeaders(url: string): Promise<HttpFetchResult> {
    this.assertUrlAllowed(url);
    const timeoutSeconds = Math.max(1, Math.ceil(commandTimeoutMs / 1000));
    const result = await this.execute("fetch_http_headers", [
      curlBinary,
      "-skI",
      "--max-time",
      String(timeoutSeconds),
      url
    ]);
    return {
      ...result,
      url,
      statusCode: parseStatusCode(result.stdout),
      headers: parseHttpHeaders(result.stdout)
    };
  }

  async fetchHttpPath(url: string, path: string): Promise<HttpFetchResult> {
    const normalized = new URL(path, ensureTrailingSlash(url)).toString();
    this.assertUrlAllowed(normalized);
    const timeoutSeconds = Math.max(1, Math.ceil(commandTimeoutMs / 1000));
    const result = await this.execute("fetch_http_path", [
      curlBinary,
      "-sk",
      "-D",
      "-",
      "-o",
      "/dev/null",
      "--max-time",
      String(timeoutSeconds),
      normalized
    ]);
    return {
      ...result,
      url: normalized,
      statusCode: parseStatusCode(result.stdout),
      headers: parseHttpHeaders(result.stdout)
    };
  }

  async inspectTls(host: string, port: number): Promise<TlsInspectionResult> {
    this.assertHostAllowed(host);
    this.assertPortAllowed(port);
    const result = await this.execute("inspect_tls", [
      opensslBinary,
      "s_client",
      "-brief",
      "-showcerts",
      "-connect",
      `${host}:${port}`,
      "-servername",
      host
    ]);
    const combined = `${result.stdout}\n${result.stderr}`;
    return {
      ...result,
      connected: /Protocol version|CONNECTION ESTABLISHED|Peer certificate/i.test(combined)
    };
  }

  private async execute(adapter: string, argv: string[]): Promise<ToolResult> {
    const startedAt = Date.now();
    const result = await runProcess(argv, commandTimeoutMs, maxOutputBytes);
    await this.audit(adapter, result);
    return result;
  }

  private async audit(adapter: string, result: ToolResult): Promise<void> {
    const entry: AuditEntry = {
      id: randomUUID(),
      scanId: this.context.scanId,
      timestamp: new Date().toISOString(),
      actor: this.context.actor,
      action: "tool-executed",
      targetNodeId: this.context.targetNodeId,
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
    if (!isTargetInScope(host, this.context.scope)) {
      throw new Error(`Target ${host} is out of scope for tool execution`);
    }
  }

  private assertUrlAllowed(url: string): void {
    const parsed = new URL(url);
    const target = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
    if (!isTargetInScope(target, this.context.scope)) {
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

export function isTargetInScope(target: string, scope: ScanScope): boolean {
  const normalizedTarget = normalizeScopeToken(target);

  for (const exclusion of scope.exclusions) {
    const normalizedExclusion = normalizeScopeToken(exclusion);
    if (normalizedTarget === normalizedExclusion || normalizedTarget.startsWith(normalizedExclusion)) {
      return false;
    }
  }

  for (const scopeTarget of scope.targets) {
    const normalizedScopeTarget = normalizeScopeToken(scopeTarget);
    if (normalizedTarget === normalizedScopeTarget || normalizedTarget.startsWith(normalizedScopeTarget)) {
      return true;
    }
    if (normalizedScopeTarget.startsWith(normalizedTarget)) {
      return true;
    }
  }

  return false;
}

function normalizeScopeToken(value: string): string {
  try {
    const parsed = parseScanTarget(value);
    return parsed.host;
  } catch {
    return value.replace(/:\d+$/, "");
  }
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
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
