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
  const args = Array.isArray(job.request.parameters["scriptArgs"])
    ? job.request.parameters["scriptArgs"].filter((value): value is string => typeof value === "string")
    : null;

  if (!binary || !args) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: "Structured script path and args are required for scripted tool execution."
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
    options.commandTimeoutMs ?? 30000
  );
}

async function executeStructuredCommand(binary: string, args: string[], timeoutMs: number): Promise<ConnectorExecutionResult> {
  return new Promise<ConnectorExecutionResult>((resolve) => {
    const child = spawn(binary, args, {
      stdio: ["ignore", "pipe", "pipe"]
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

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
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
      resolve({
        output: `${stdout}${stderr ? `\n${stderr}` : ""}`.trim(),
        exitCode: 1,
        observations: [],
        statusReason: error.message
      });
    });
  });
}
