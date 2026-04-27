import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type {
  ConnectorSupportSubject,
  ConnectorExecutionJob,
  ConnectorExecutionResult,
  ConnectorRegistrationRequest,
  InternalObservation,
  Severity
} from "@synosec/contracts";
import { evaluateConnectorToolSupport } from "@synosec/contracts";

interface SandboxExecutionOptions {
  allowedCapabilities: ConnectorRegistrationRequest["allowedCapabilities"];
  allowedSandboxProfiles: ConnectorRegistrationRequest["allowedSandboxProfiles"];
  allowedPrivilegeProfiles: ConnectorRegistrationRequest["allowedPrivilegeProfiles"];
  installedBinaries?: readonly string[];
  commandTimeoutMs?: number;
}

const MAX_CONNECTOR_TOOL_TIMEOUT_MS = 300_000;

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

function validateSandboxedJob(
  job: ConnectorExecutionJob,
  options: SandboxExecutionOptions
): ConnectorExecutionResult | { bashSource: string } {
  const support = evaluateConnectorToolSupport(toConnectorSupportSubject(job), {
    allowedCapabilities: options.allowedCapabilities,
    allowedSandboxProfiles: options.allowedSandboxProfiles,
    allowedPrivilegeProfiles: options.allowedPrivilegeProfiles,
    installedBinaries: options.installedBinaries ?? []
  });
  if (!support.supported) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: support.statusReason
    };
  }

  const bashSource = typeof job.request.parameters["bashSource"] === "string"
    ? job.request.parameters["bashSource"]
    : "";

  if (bashSource.length === 0) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: "Structured bash source is required for connector execution."
    };
  }

  return { bashSource };
}

export async function executeSandboxedConnectorJob(
  job: ConnectorExecutionJob,
  options: SandboxExecutionOptions
): Promise<ConnectorExecutionResult> {
  const validated = validateSandboxedJob(job, options);
  if ("output" in validated) {
    return validated;
  }

  return executeStructuredCommand(
    validated.bashSource,
    job,
    resolveCommandTimeoutMs(job, options)
  );
}

function resolveCommandTimeoutMs(job: ConnectorExecutionJob, options: SandboxExecutionOptions) {
  const requestedTimeoutMs = typeof job.request.parameters["timeoutMs"] === "number"
    ? job.request.parameters["timeoutMs"]
    : MAX_CONNECTOR_TOOL_TIMEOUT_MS;
  const connectorLimitMs = options.commandTimeoutMs ?? MAX_CONNECTOR_TOOL_TIMEOUT_MS;
  return Math.max(1_000, Math.min(requestedTimeoutMs, connectorLimitMs, MAX_CONNECTOR_TOOL_TIMEOUT_MS));
}

function toConnectorSupportSubject(job: ConnectorExecutionJob): ConnectorSupportSubject {
  return {
    ...(job.request.toolId ? { toolId: job.request.toolId } : {}),
    tool: job.request.tool,
    capabilities: job.request.capabilities,
    sandboxProfile: job.request.sandboxProfile,
    privilegeProfile: job.request.privilegeProfile,
    parameters: job.request.parameters
  };
}

function normalizeObservation(
  job: ConnectorExecutionJob,
  input: BashObservation,
  index: number
): InternalObservation {
  return {
    id: `${job.toolRun.id}-obs-${index + 1}`,
    scanId: job.scanId,
    tacticId: job.tacticId,
    toolRunId: job.toolRun.id,
    ...(job.request.toolId ? { toolId: job.request.toolId } : {}),
    tool: job.request.tool,
    capabilities: job.request.capabilities,
    target: job.request.target,
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

async function materializeScript(toolName: string, bashSource: string) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "synosec-connector-tool-"));
  const fileName = `${toolName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "tool"}.sh`;
  const executablePath = path.join(tempDir, fileName);
  await writeFile(executablePath, bashSource, "utf8");
  await chmod(executablePath, 0o700);
  return {
    executablePath,
    cleanup: () => rm(tempDir, { recursive: true, force: true })
  };
}

async function executeStructuredCommand(
  bashSource: string,
  job: ConnectorExecutionJob,
  timeoutMs: number
): Promise<ConnectorExecutionResult> {
  const materialized = await materializeScript(job.request.tool, bashSource);
  return new Promise<ConnectorExecutionResult>((resolve) => {
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
      child.kill("SIGTERM");
      void materialized.cleanup();
      resolve({
        output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
        exitCode: 124,
        observations: [],
        statusReason: `Connector command timed out after ${timeoutMs}ms.`
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EPIPE") {
        return;
      }

      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      void materialized.cleanup();
      resolve({
        output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
        exitCode: 1,
        observations: [],
        statusReason: error.message
      });
    });
    child.stdin.end(JSON.stringify({
      scanId: job.scanId,
      tacticId: job.tacticId,
      toolRun: job.toolRun,
      request: job.request
    }));

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      void materialized.cleanup();

      try {
        const parsed = JSON.parse(stdout.trim()) as Omit<ConnectorExecutionResult, "observations"> & {
          observations?: BashObservation[];
          commandPreview?: string;
        };
        resolve({
          output: parsed.output,
          exitCode: code ?? 1,
          observations: Array.isArray(parsed.observations)
            ? parsed.observations.map((observation, index) => normalizeObservation(job, observation, index))
            : [],
          ...(parsed.statusReason ? { statusReason: parsed.statusReason } : {})
        });
      } catch (error) {
        resolve({
          output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
          exitCode: code ?? 1,
          observations: [],
          statusReason: `Connector bash tool emitted invalid JSON output: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      void materialized.cleanup();
      resolve({
        output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
        exitCode: 1,
        observations: [],
        statusReason: error.message
      });
    });
  });
}
