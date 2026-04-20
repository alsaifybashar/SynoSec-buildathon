import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type {
  ConnectorExecutionJob,
  ConnectorExecutionResult,
  ConnectorRegistrationRequest
} from "@synosec/contracts";

interface SandboxExecutionOptions {
  allowedCapabilities: ConnectorRegistrationRequest["allowedCapabilities"];
  allowedSandboxProfiles: ConnectorRegistrationRequest["allowedSandboxProfiles"];
  allowedPrivilegeProfiles: ConnectorRegistrationRequest["allowedPrivilegeProfiles"];
  commandTimeoutMs?: number;
}

function validateSandboxedJob(
  job: ConnectorExecutionJob,
  options: SandboxExecutionOptions
): { binary: string; args: string[] } | ConnectorExecutionResult {
  if (!job.request.capabilities.some((capability) => options.allowedCapabilities.includes(capability))) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: `Capabilities ${job.request.capabilities.join(", ")} are not allowed by this connector.`
    };
  }

  if (!job.request.toolId) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: "Only scripted tool definitions can execute in connector execute mode."
    };
  }

  if (!job.request.sandboxProfile) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: "Missing sandbox profile for db-backed tool execution."
    };
  }

  if (!job.request.privilegeProfile) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: "Missing privilege profile for db-backed tool execution."
    };
  }

  if (!options.allowedSandboxProfiles.includes(job.request.sandboxProfile)) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: `Sandbox profile ${job.request.sandboxProfile} is not allowed by this connector.`
    };
  }

  if (!options.allowedPrivilegeProfiles.includes(job.request.privilegeProfile)) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: `Privilege profile ${job.request.privilegeProfile} is not allowed by this connector.`
    };
  }

  const binary = typeof job.request.parameters["scriptPath"] === "string"
    ? job.request.parameters["scriptPath"]
    : null;
  const scriptVersion = typeof job.request.parameters["scriptVersion"] === "string"
    ? job.request.parameters["scriptVersion"]
    : null;
  const scriptSource = typeof job.request.parameters["scriptSource"] === "string"
    ? job.request.parameters["scriptSource"]
    : null;
  const args = Array.isArray(job.request.parameters["scriptArgs"])
    ? job.request.parameters["scriptArgs"].filter((value): value is string => typeof value === "string")
    : null;

  if (!binary || !args || !scriptVersion || !scriptSource) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: "Structured script path, version, source, and args are required for scripted tool execution."
    };
  }

  return { binary, args };
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
    validated.binary,
    validated.args,
    job,
    options.commandTimeoutMs ?? 30000
  );
}

async function materializeScript(binary: string, scriptVersion: string, scriptSource: string) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "synosec-connector-tool-"));
  const fileName = path.basename(binary) || `tool-${scriptVersion}.sh`;
  const executablePath = path.join(tempDir, fileName);
  await writeFile(executablePath, scriptSource, "utf8");
  await chmod(executablePath, 0o700);
  return {
    executablePath,
    cleanup: () => rm(tempDir, { recursive: true, force: true })
  };
}

async function executeStructuredCommand(binary: string, args: string[], job: ConnectorExecutionJob, timeoutMs: number): Promise<ConnectorExecutionResult> {
  const scriptVersion = String(job.request.parameters["scriptVersion"]);
  const scriptSource = String(job.request.parameters["scriptSource"]);
  const materialized = await materializeScript(binary, scriptVersion, scriptSource);
  return new Promise<ConnectorExecutionResult>((resolve) => {
    const child = spawn(materialized.executablePath, args, {
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
    child.stdin.write(JSON.stringify({
      scanId: job.scanId,
      tacticId: job.tacticId,
      toolRun: job.toolRun,
      request: job.request
    }));
    child.stdin.end();

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      void materialized.cleanup();
      resolve({
        output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
        exitCode: code ?? 1,
        observations: []
      });
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
