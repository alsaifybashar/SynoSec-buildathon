import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import type {
  Observation,
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
  observations: Observation[];
  output: string;
  exitCode: number;
  statusReason?: string;
  commandPreview?: string;
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
): Observation {
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

function parseStructuredResult(
  context: ScriptExecutionContext,
  stdout: string,
  stderr: string,
  exitCode: number
): ScriptExecutionResult {
  const trimmedStdout = stdout.trim();
  if (!trimmedStdout) {
    throw new RequestError(500, "The AI tool did not emit a structured result.", {
      code: "AI_TOOL_INVALID_RESULT_ENVELOPE",
      userFriendlyMessage: "This AI tool did not return a structured result."
    });
  }

  let parsed: BashExecutionEnvelope;
  try {
    parsed = JSON.parse(trimmedStdout) as BashExecutionEnvelope;
  } catch (error) {
    throw new RequestError(500, "The AI tool emitted an invalid structured result.", {
      code: "AI_TOOL_INVALID_RESULT_JSON",
      userFriendlyMessage: "This AI tool returned an invalid structured result.",
      cause: error
    });
  }

  if (typeof parsed.output !== "string") {
    throw new RequestError(500, "The AI tool returned an incomplete structured result.", {
      code: "AI_TOOL_INVALID_RESULT_OUTPUT",
      userFriendlyMessage: "This AI tool returned an incomplete structured result."
    });
  }

  return {
    observations: Array.isArray(parsed.observations)
      ? parsed.observations.map((item, index) => normalizeObservation(context, item, index))
      : [],
    output: stderr.trim().length > 0 ? `${parsed.output}\n${stderr.trim()}` : parsed.output,
    exitCode,
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

  const materialized = await materializeBashScript(context.request.tool, bashSource);
  const timeoutMs = typeof context.request.parameters["timeoutMs"] === "number"
    ? context.request.parameters["timeoutMs"]
    : 30000;

  return new Promise<ScriptExecutionResult>((resolve, reject) => {
    const child = spawn(materialized.executablePath, [], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      void materialized.cleanup();
      child.kill("SIGTERM");
      resolve({
        observations: [],
        output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
        exitCode: 124,
        statusReason: `Bash tool timed out after ${timeoutMs}ms.`
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
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
        resolve(parseStructuredResult(context, stdout, stderr, code ?? 1));
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
