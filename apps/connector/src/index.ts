import {
  connectorPollResponseSchema,
  connectorRegistrationResponseSchema,
  evaluateConnectorToolSupport,
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
      allowedCapabilities: this.options.registration.allowedCapabilities,
      allowedSandboxProfiles: this.options.registration.allowedSandboxProfiles,
      allowedPrivilegeProfiles: this.options.registration.allowedPrivilegeProfiles,
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
    allowedCapabilities: ConnectorRegistrationRequest["allowedCapabilities"];
    allowedSandboxProfiles: ConnectorRegistrationRequest["allowedSandboxProfiles"];
    allowedPrivilegeProfiles: ConnectorRegistrationRequest["allowedPrivilegeProfiles"];
    installedBinaries?: ConnectorRegistrationRequest["installedBinaries"];
    commandTimeoutMs?: number;
  }
): Promise<ConnectorExecutionResult> {
  const support = evaluateConnectorToolSupport(job.request, {
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
