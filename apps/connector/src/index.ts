import { spawn } from "node:child_process";
import {
  connectorPollResponseSchema,
  connectorRegistrationResponseSchema,
  type ConnectorExecutionJob,
  type ConnectorExecutionResult,
  type ConnectorRegistrationRequest
} from "@synosec/contracts";

export interface ConnectorClientOptions {
  baseUrl: string;
  token: string;
  registration: ConnectorRegistrationRequest;
  fetchImpl?: typeof fetch;
  commandTimeoutMs?: number;
}

export class SynoSecConnectorClient {
  private readonly fetchImpl: typeof fetch;
  private connectorId: string | null = null;

  constructor(private readonly options: ConnectorClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async register(): Promise<string> {
    const response = await this.fetchImpl(this.url("/api/connectors/register"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.options.registration)
    });
    const payload = connectorRegistrationResponseSchema.parse(await response.json());
    this.connectorId = payload.connectorId;
    return payload.connectorId;
  }

  async runOnce(): Promise<ConnectorExecutionJob | null> {
    const connectorId = this.connectorId ?? await this.register();
    const response = await this.fetchImpl(this.url(`/api/connectors/${connectorId}/poll`), {
      method: "POST",
      headers: this.headers()
    });
    const payload = connectorPollResponseSchema.parse(await response.json());
    if (!payload.job) {
      return null;
    }

    const job = payload.job;
    const result = await executeConnectorJob(job, {
      allowedAdapters: this.options.registration.allowedAdapters,
      ...(this.options.commandTimeoutMs === undefined ? {} : { commandTimeoutMs: this.options.commandTimeoutMs })
    });
    await this.fetchImpl(this.url(`/api/connectors/${connectorId}/jobs/${job.id}/result`), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(result)
    });
    return job;
  }

  private headers(): HeadersInit {
    return {
      authorization: `Bearer ${this.options.token}`,
      "content-type": "application/json"
    };
  }

  private url(path: string): string {
    return new URL(path, this.options.baseUrl).toString();
  }
}

export async function executeConnectorJob(
  job: ConnectorExecutionJob,
  options: {
    allowedAdapters: ConnectorRegistrationRequest["allowedAdapters"];
    commandTimeoutMs?: number;
  }
): Promise<ConnectorExecutionResult> {
  if (!options.allowedAdapters.includes(job.request.adapter)) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: `Adapter ${job.request.adapter} is not allowed by this connector.`
    };
  }

  switch (job.mode) {
    case "dry-run":
      return {
        output: `dry-run: ${job.toolRun.commandPreview}`,
        exitCode: 0,
        observations: []
      };
    case "simulate":
      return {
        output: `simulate: ${job.toolRun.commandPreview}`,
        exitCode: 0,
        observations: []
      };
    case "execute":
      return executeShellCommand(job.toolRun.commandPreview, options.commandTimeoutMs ?? 30000);
  }
}

async function executeShellCommand(command: string, timeoutMs: number): Promise<ConnectorExecutionResult> {
  return new Promise<ConnectorExecutionResult>((resolve) => {
    const child = spawn("sh", ["-lc", command], {
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
