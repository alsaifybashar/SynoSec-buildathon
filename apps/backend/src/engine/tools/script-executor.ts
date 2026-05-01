import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import type {
  InternalObservation,
  Severity,
  ToolRequest,
  ToolRun
} from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";

interface BashObservation {
  port?: number;
  key: string;
  title: string;
  summary: string;
  severity: Severity;
  confidence: number;
  evidence: string;
  technique: string;
  relatedKeys?: string[];
}

interface BashExecutionEnvelope {
  output: string;
  observations?: BashObservation[];
  statusReason?: string;
  commandPreview?: string;
}

export interface ScriptExecutionContext {
  scanId: string;
  tacticId: string;
  toolRun: ToolRun;
  request: ToolRequest;
}

export interface ScriptExecutionResult {
  observations: InternalObservation[];
  output: string;
  exitCode: number;
  durationMs?: number;
  truncated?: boolean;
  statusReason?: string;
  commandPreview?: string;
}

const EXECUTOR_OUTPUT_CAP_BYTES = 8 * 1024 * 1024;
const EXECUTOR_OUTPUT_TRUNCATION_MARKER = "\n…[output truncated by executor cap]…\n";

const ACTIVE_SANDBOX_PROFILES = new Set(["active-recon", "active-validation"]);
const ACTIVE_PRIVILEGE_PROFILES = new Set(["active-network", "privileged"]);
const sandboxEnforcementWarned = new Set<string>();

function warnIfActiveProfileUnenforced(request: ToolRequest) {
  const sandbox = request.sandboxProfile;
  const privilege = request.privilegeProfile;
  const isActive = ACTIVE_SANDBOX_PROFILES.has(sandbox) || ACTIVE_PRIVILEGE_PROFILES.has(privilege);
  if (!isActive) return;
  const key = `${request.tool}:${sandbox}:${privilege}`;
  if (sandboxEnforcementWarned.has(key)) return;
  sandboxEnforcementWarned.add(key);
  // eslint-disable-next-line no-console
  console.warn(
    `[script-executor] Active sandbox/privilege profile (${sandbox}/${privilege}) requested for tool '${request.tool}' but no enforcement layer is wired; running with parent privileges.`
  );
}

function terminateProcessGroup(pid: number | undefined) {
  if (pid == null) {
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    return;
  }

  setTimeout(() => {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // The process group may have already exited.
    }
  }, 250).unref();
}

async function materializeBashScript(
  toolName: string,
  bashSource: string
): Promise<{ executablePath: string; cleanup: () => Promise<void> }> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "synosec-bash-tool-"));
  const executablePath = path.join(tempDir, `${toolName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "tool"}.sh`);
  await writeFile(executablePath, bashSource, "utf8");
  await chmod(executablePath, 0o700);
  return {
    executablePath,
    cleanup: () => rm(tempDir, { recursive: true, force: true })
  };
}

function normalizeObservation(
  context: ScriptExecutionContext,
  input: BashObservation,
  index: number
): InternalObservation {
  return {
    id: `${context.toolRun.id}-obs-${index + 1}`,
    scanId: context.scanId,
    tacticId: context.tacticId,
    toolRunId: context.toolRun.id,
    ...(context.request.toolId ? { toolId: context.request.toolId } : {}),
    tool: context.request.tool,
    capabilities: context.request.capabilities,
    target: context.request.target,
    ...(input.port === undefined ? {} : { port: input.port }),
    key: input.key,
    title: input.title,
    summary: input.summary,
    severity: input.severity,
    confidence: input.confidence,
    evidence: input.evidence,
    technique: input.technique,
    relatedKeys: input.relatedKeys ?? [],
    createdAt: new Date().toISOString()
  };
}

interface BashExecutionEnvelopeExtended extends BashExecutionEnvelope {
  exit_code?: number;
  duration_ms?: number;
  truncated?: boolean;
}

function parseStructuredResult(
  context: ScriptExecutionContext,
  stdout: string,
  stderr: string,
  exitCode: number,
  durationMs: number
): ScriptExecutionResult {
  const trimmedStdout = stdout.trim();
  const trimmedStderr = stderr.trim();

  // Graceful degradation: if the tool printed nothing parseable, surface what
  // we have (typically stderr + exit code) rather than throwing a 500. The
  // agent can react to a non-zero exit code; an HTTP 500 is dead-end.
  if (!trimmedStdout) {
    return {
      observations: [],
      output: trimmedStderr,
      exitCode,
      durationMs,
      statusReason: "Bash tool emitted no structured envelope."
    };
  }

  let parsed: BashExecutionEnvelopeExtended;
  try {
    parsed = JSON.parse(trimmedStdout) as BashExecutionEnvelopeExtended;
  } catch {
    return {
      observations: [],
      output: trimmedStderr.length > 0 ? `${trimmedStdout}\n${trimmedStderr}` : trimmedStdout,
      exitCode,
      durationMs,
      statusReason: "Bash tool emitted an unstructured result; raw output preserved."
    };
  }

  if (typeof parsed.output !== "string") {
    return {
      observations: [],
      output: trimmedStdout,
      exitCode,
      durationMs,
      statusReason: "Bash tool envelope was missing the 'output' field; raw output preserved."
    };
  }

  return {
    observations: Array.isArray(parsed.observations)
      ? parsed.observations.map((item, index) => normalizeObservation(context, item, index))
      : [],
    output: trimmedStderr.length > 0 ? `${parsed.output}\n${trimmedStderr}` : parsed.output,
    exitCode: typeof parsed.exit_code === "number" ? parsed.exit_code : exitCode,
    durationMs: typeof parsed.duration_ms === "number" ? parsed.duration_ms : durationMs,
    ...(parsed.truncated === true ? { truncated: true } : {}),
    ...(parsed.statusReason ? { statusReason: parsed.statusReason } : {}),
    ...(parsed.commandPreview ? { commandPreview: parsed.commandPreview } : {})
  };
}

export async function executeScriptedTool(
  context: ScriptExecutionContext
): Promise<ScriptExecutionResult> {
  const bashSource = typeof context.request.parameters["bashSource"] === "string"
    ? context.request.parameters["bashSource"]
    : null;

  if (!bashSource) {
    throw new RequestError(500, "This AI tool has no bash source configured.", {
      code: "AI_TOOL_BASH_SOURCE_MISSING",
      userFriendlyMessage: "This AI tool has no bash script configured."
    });
  }

  warnIfActiveProfileUnenforced(context.request);

  const materialized = await materializeBashScript(context.request.tool, bashSource);
  const timeoutMs = typeof context.request.parameters["timeoutMs"] === "number"
    ? context.request.parameters["timeoutMs"]
    : 30000;

  return new Promise<ScriptExecutionResult>((resolve, reject) => {
    const child = spawn(materialized.executablePath, [], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: true
    });

    let stdout = "";
    let stderr = "";
    let executorTruncated = false;
    let settled = false;
    const startedAt = Date.now();

    const appendCapped = (target: "stdout" | "stderr", chunk: string) => {
      const current = target === "stdout" ? stdout : stderr;
      if (current.length >= EXECUTOR_OUTPUT_CAP_BYTES) {
        executorTruncated = true;
        return;
      }
      const room = EXECUTOR_OUTPUT_CAP_BYTES - current.length;
      const slice = chunk.length <= room ? chunk : chunk.slice(0, room) + EXECUTOR_OUTPUT_TRUNCATION_MARKER;
      if (slice.length < chunk.length || chunk.length > room) executorTruncated = true;
      if (target === "stdout") stdout = current + slice;
      else stderr = current + slice;
    };

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      void materialized.cleanup();
      terminateProcessGroup(child.pid);
      resolve({
        observations: [],
        output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
        exitCode: 124,
        durationMs: Date.now() - startedAt,
        ...(executorTruncated ? { truncated: true } : {}),
        statusReason: `Bash tool timed out after ${timeoutMs}ms.`
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      appendCapped("stdout", chunk.toString());
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      appendCapped("stderr", chunk.toString());
    });
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      // Some scripts exit immediately without consuming stdin. Ignore EPIPE and let
      // the normal process close path report the real tool result.
      if (error.code === "EPIPE") {
        return;
      }

      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      void materialized.cleanup();
      reject(error);
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      void materialized.cleanup();
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      void materialized.cleanup();
      try {
        const result = parseStructuredResult(context, stdout, stderr, code ?? 1, Date.now() - startedAt);
        resolve(executorTruncated && !result.truncated ? { ...result, truncated: true } : result);
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.end(JSON.stringify(context));
  });
}

export function buildScriptCommandPreview(request: ToolRequest): string {
  const preview = request.parameters["commandPreview"];
  return typeof preview === "string" && preview.trim().length > 0 ? preview : request.tool;
}
