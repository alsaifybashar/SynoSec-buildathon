import {
  connectorPollResponseSchema,
  connectorRegistrationResponseSchema,
  evaluateConnectorToolSupport,
  type ConnectorSupportSubject,
  type ConnectorExecutionJob,
  type ConnectorExecutionResult,
  type ConnectorRegistrationRequest
} from "@synosec/contracts";
import { executeSandboxedConnectorJob } from "./sandbox/execute-job.js";

export interface ConnectorClientOptions {
  baseUrl: string;
  token: string;
  registration: ConnectorRegistrationRequest;
  fetchImpl?: typeof fetch;
  commandTimeoutMs?: number;
}

export type ConnectorRequestPhase = "register" | "poll" | "submit-result";

export class ConnectorClientError extends Error {
  readonly status: number | null;
  readonly body: string | null;
  readonly phase: ConnectorRequestPhase;
  readonly causeError: unknown;

  constructor(input: {
    message: string;
    phase: ConnectorRequestPhase;
    status?: number;
    body?: string;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = "ConnectorClientError";
    this.phase = input.phase;
    this.status = input.status ?? null;
    this.body = input.body ?? null;
    this.causeError = input.cause ?? null;
  }
}

export class SynoSecConnectorClient {
  private readonly fetchImpl: typeof fetch;
  private connectorId: string | null = null;

  constructor(private readonly options: ConnectorClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async register(): Promise<string> {
    const response = await this.request("/api/connectors/register", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.options.registration)
    }, "register");
    const payload = connectorRegistrationResponseSchema.parse(await response.json());
    this.connectorId = payload.connectorId;
    return payload.connectorId;
  }

  async runOnce(): Promise<ConnectorExecutionJob | null> {
    const connectorId = this.connectorId ?? await this.register();
    const response = await this.request(`/api/connectors/${connectorId}/poll`, {
      method: "POST",
      headers: this.headers()
    }, "poll");
    const payload = connectorPollResponseSchema.parse(await response.json());
    if (!payload.job) {
      return null;
    }

    const job = payload.job;
    const result = await executeConnectorJob(job, {
      allowedCapabilities: this.options.registration.allowedCapabilities,
      allowedSandboxProfiles: this.options.registration.allowedSandboxProfiles,
      allowedPrivilegeProfiles: this.options.registration.allowedPrivilegeProfiles,
      installedBinaries: this.options.registration.installedBinaries,
      ...(this.options.commandTimeoutMs === undefined ? {} : { commandTimeoutMs: this.options.commandTimeoutMs })
    });
    const resultResponse = await this.request(`/api/connectors/${connectorId}/jobs/${job.id}/result`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(result)
    }, "submit-result");
    return job;
  }

  invalidateRegistration(): void {
    this.connectorId = null;
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

  private async request(path: string, init: RequestInit, phase: ConnectorRequestPhase) {
    let response: Response;
    try {
      response = await this.fetchImpl(this.url(path), init);
    } catch (error) {
      throw new ConnectorClientError({
        message: `Connector ${phase} request failed`,
        phase,
        cause: error
      });
    }

    await assertOk(response, phase);
    return response;
  }
}

async function assertOk(response: Response, phase: ConnectorRequestPhase) {
  if (response.ok) {
    return;
  }

  const body = await response.text();
  throw new ConnectorClientError({
    message: `Connector ${phase} request failed (${response.status})`,
    phase,
    status: response.status,
    body
  });
}

export async function executeConnectorJob(
  job: ConnectorExecutionJob,
  options: {
    allowedCapabilities: ConnectorRegistrationRequest["allowedCapabilities"];
    allowedSandboxProfiles: ConnectorRegistrationRequest["allowedSandboxProfiles"];
    allowedPrivilegeProfiles: ConnectorRegistrationRequest["allowedPrivilegeProfiles"];
    installedBinaries?: ConnectorRegistrationRequest["installedBinaries"];
    commandTimeoutMs?: number;
  }
): Promise<ConnectorExecutionResult> {
  const support = evaluateConnectorToolSupport(toConnectorSupportSubject(job), {
    allowedCapabilities: options.allowedCapabilities,
    allowedSandboxProfiles: options.allowedSandboxProfiles,
    allowedPrivilegeProfiles: options.allowedPrivilegeProfiles,
    installedBinaries: thisInstalledBinaries(options)
  });
  if (!support.supported) {
    return {
      output: "",
      exitCode: 1,
      observations: [],
      statusReason: support.statusReason
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
      return executeSandboxedConnectorJob(job, options);
  }
}

function thisInstalledBinaries(options: {
  installedBinaries?: ConnectorRegistrationRequest["installedBinaries"];
}) {
  return options.installedBinaries ?? [];
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
