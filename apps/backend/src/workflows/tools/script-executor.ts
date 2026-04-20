import { spawn } from "node:child_process";
import path from "node:path";
import type {
  Observation,
  Severity,
  ToolExecutionMode,
  ToolRequest,
  ToolRun
} from "@synosec/contracts";

interface ScriptObservation {
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

interface ScriptExecutionEnvelope {
  output?: string;
  observations?: ScriptObservation[];
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

function resolveScriptPath(scriptPath: string): string {
  return path.isAbsolute(scriptPath)
    ? scriptPath
    : path.resolve(process.cwd(), scriptPath);
}

function normalizeObservation(
  context: ScriptExecutionContext,
  input: ScriptObservation,
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
  if (trimmedStdout.length > 0) {
    try {
      const parsed = JSON.parse(trimmedStdout) as ScriptExecutionEnvelope;
      return {
        observations: Array.isArray(parsed.observations)
          ? parsed.observations.map((item, index) => normalizeObservation(context, item, index))
          : [],
        output: parsed.output ?? `${trimmedStdout}${stderr ? `\n${stderr}` : ""}`.trim(),
        exitCode,
        ...(parsed.statusReason ? { statusReason: parsed.statusReason } : {}),
        ...(parsed.commandPreview ? { commandPreview: parsed.commandPreview } : {})
      };
    } catch {
      // Fall back to plain-text stdout for thin bash wrappers.
    }
  }

  return {
    observations: [],
    output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
    exitCode,
    ...(stderr.trim().length > 0 && exitCode !== 0 ? { statusReason: stderr.trim() } : {})
  };
}

export async function executeScriptedTool(
  context: ScriptExecutionContext
): Promise<ScriptExecutionResult> {
  const scriptPath = context.request.scriptPath;
  if (!scriptPath) {
    throw new Error(`No script path configured for ${context.request.tool}.`);
  }

  const resolvedScriptPath = resolveScriptPath(scriptPath);
  const scriptArgs = Array.isArray(context.request.parameters["scriptArgs"])
    ? context.request.parameters["scriptArgs"].filter((value): value is string => typeof value === "string")
    : [];
  const timeoutMs = typeof context.request.parameters["timeoutMs"] === "number"
    ? context.request.parameters["timeoutMs"]
    : 30000;

  return new Promise<ScriptExecutionResult>((resolve, reject) => {
    const child = spawn(resolvedScriptPath, scriptArgs, {
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
      child.kill("SIGTERM");
      resolve({
        observations: [],
        output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
        exitCode: 124,
        statusReason: `Scripted tool timed out after ${timeoutMs}ms.`
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(parseStructuredResult(context, stdout, stderr, code ?? 1));
    });

    child.stdin.write(JSON.stringify(context));
    child.stdin.end();
  });
}

export function buildScriptCommandPreview(request: ToolRequest): string {
  if (!request.scriptPath) {
    return request.tool;
  }

  const scriptArgs = Array.isArray(request.parameters["scriptArgs"])
    ? request.parameters["scriptArgs"].filter((value): value is string => typeof value === "string")
    : [];
  return [request.scriptPath, ...scriptArgs].join(" ").trim();
}
