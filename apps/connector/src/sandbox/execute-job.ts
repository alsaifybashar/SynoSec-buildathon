import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type {
  ConnectorExecutionJob,
  ConnectorExecutionResult,
  ConnectorRegistrationRequest
} from "@synosec/contracts";
import { evaluateConnectorToolSupport } from "@synosec/contracts";

interface SandboxExecutionOptions {
  allowedCapabilities: ConnectorRegistrationRequest["allowedCapabilities"];
  allowedSandboxProfiles: ConnectorRegistrationRequest["allowedSandboxProfiles"];
  allowedPrivilegeProfiles: ConnectorRegistrationRequest["allowedPrivilegeProfiles"];
  installedBinaries?: readonly string[];
  commandTimeoutMs?: number;
}

function validateSandboxedJob(
  job: ConnectorExecutionJob,
  options: SandboxExecutionOptions
): ConnectorExecutionResult | { bashSource: string } {
  const support = evaluateConnectorToolSupport(job.request, {
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
    : null;

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
    options.commandTimeoutMs ?? 30000
  );
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
        const parsed = JSON.parse(stdout.trim()) as ConnectorExecutionResult & { commandPreview?: string };
        resolve({
          output: parsed.output,
          exitCode: code ?? 1,
          observations: parsed.observations ?? [],
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
