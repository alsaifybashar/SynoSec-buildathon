import { randomUUID } from "crypto";
import type {
  ConnectorDescriptor,
  ConnectorExecutionJob,
  ConnectorExecutionResult,
  ConnectorRegistrationRequest,
  ConnectorRegistrationResponse,
  ConnectorStatusResponse,
  ToolRequest,
  ToolRun
} from "@synosec/contracts";

interface DispatchRequest {
  scanId: string;
  tacticId: string;
  agentId: string;
  toolRun: ToolRun;
  request: ToolRequest;
}

interface DispatchResolution {
  result: ConnectorExecutionResult;
  connectorId: string;
  leasedAt: string;
  leaseExpiresAt: string;
  mode: ConnectorExecutionJob["mode"];
}

interface PendingDispatch extends DispatchRequest {
  jobId: string;
  createdAt: string;
  resolve: (value: DispatchResolution) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface ActiveDispatch extends PendingDispatch {
  connectorId: string;
  leasedAt: string;
  leaseExpiresAt: string;
  mode: ConnectorExecutionJob["mode"];
}

const defaultPollIntervalMs = Number(process.env["CONNECTOR_POLL_INTERVAL_MS"] ?? "1000");
const defaultLeaseDurationMs = Number(process.env["CONNECTOR_LEASE_DURATION_MS"] ?? "15000");
const defaultDispatchTimeoutMs = Number(process.env["CONNECTOR_DISPATCH_TIMEOUT_MS"] ?? "30000");

class ConnectorControlPlane {
  private connectors = new Map<string, ConnectorDescriptor>();
  private pendingJobs: PendingDispatch[] = [];
  private activeJobs = new Map<string, ActiveDispatch>();

  register(input: ConnectorRegistrationRequest): ConnectorRegistrationResponse {
    const connectorId = randomUUID();
    const timestamp = new Date().toISOString();

    this.connectors.set(connectorId, {
      connectorId,
      name: input.name,
      version: input.version,
      allowedAdapters: input.allowedAdapters,
      runMode: input.runMode,
      concurrency: input.concurrency,
      capabilities: input.capabilities,
      registeredAt: timestamp,
      lastSeenAt: timestamp
    });

    return {
      connectorId,
      pollIntervalMs: defaultPollIntervalMs,
      leaseDurationMs: defaultLeaseDurationMs,
      acceptedAt: timestamp
    };
  }

  async dispatch(input: DispatchRequest): Promise<DispatchResolution> {
    return new Promise<DispatchResolution>((resolve, reject) => {
      const jobId = randomUUID();
      const timeout = setTimeout(() => {
        this.pendingJobs = this.pendingJobs.filter((candidate) => candidate.jobId !== jobId);
        const active = this.activeJobs.get(jobId);
        if (active) {
          const connector = this.connectors.get(active.connectorId);
          if (connector) {
            this.connectors.set(active.connectorId, {
              ...connector,
              activeJobId: undefined,
              lastSeenAt: new Date().toISOString()
            });
          }
          this.activeJobs.delete(jobId);
        }
        reject(new Error("Timed out waiting for a connector to complete the tool run."));
      }, defaultDispatchTimeoutMs);

      this.pendingJobs.push({
        ...input,
        jobId,
        createdAt: new Date().toISOString(),
        resolve,
        reject,
        timeout
      });
    });
  }

  pollNext(connectorId: string): ConnectorExecutionJob | null {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Unknown connector ${connectorId}.`);
    }

    const now = new Date().toISOString();
    if (connector.activeJobId) {
      this.connectors.set(connectorId, { ...connector, lastSeenAt: now });
      return null;
    }

    const pendingIndex = this.pendingJobs.findIndex((job) =>
      connector.allowedAdapters.includes(job.request.adapter)
    );

    this.connectors.set(connectorId, { ...connector, lastSeenAt: now });

    if (pendingIndex === -1) {
      return null;
    }

    const pending = this.pendingJobs.splice(pendingIndex, 1)[0];
    if (!pending) {
      return null;
    }

    const leasedAt = new Date().toISOString();
    const leaseExpiresAt = new Date(Date.now() + defaultLeaseDurationMs).toISOString();
    const active: ActiveDispatch = {
      ...pending,
      connectorId,
      leasedAt,
      leaseExpiresAt,
      mode: connector.runMode
    };

    this.activeJobs.set(active.jobId, active);
    this.connectors.set(connectorId, {
      ...connector,
      activeJobId: active.jobId,
      lastSeenAt: leasedAt
    });

    return {
      id: active.jobId,
      connectorId,
      scanId: active.scanId,
      tacticId: active.tacticId,
      agentId: active.agentId,
      toolRun: {
        ...active.toolRun,
        connectorId,
        leasedAt,
        leaseExpiresAt
      },
      request: active.request,
      mode: active.mode,
      createdAt: active.createdAt,
      leasedAt,
      leaseExpiresAt
    };
  }

  heartbeat(connectorId: string, jobId: string): { leaseExpiresAt: string } {
    const active = this.activeJobs.get(jobId);
    if (!active || active.connectorId !== connectorId) {
      throw new Error(`No active job ${jobId} for connector ${connectorId}.`);
    }

    const leaseExpiresAt = new Date(Date.now() + defaultLeaseDurationMs).toISOString();
    this.activeJobs.set(jobId, {
      ...active,
      leaseExpiresAt
    });

    const connector = this.connectors.get(connectorId);
    if (connector) {
      this.connectors.set(connectorId, {
        ...connector,
        lastSeenAt: new Date().toISOString(),
        activeJobId: jobId
      });
    }

    return { leaseExpiresAt };
  }

  complete(connectorId: string, jobId: string, result: ConnectorExecutionResult): DispatchResolution {
    const active = this.activeJobs.get(jobId);
    if (!active || active.connectorId !== connectorId) {
      throw new Error(`No active job ${jobId} for connector ${connectorId}.`);
    }

    clearTimeout(active.timeout);
    this.activeJobs.delete(jobId);

    const connector = this.connectors.get(connectorId);
    if (connector) {
      this.connectors.set(connectorId, {
        ...connector,
        activeJobId: undefined,
        lastSeenAt: new Date().toISOString()
      });
    }

    const resolution: DispatchResolution = {
      result: {
        ...result,
        connectorId
      },
      connectorId,
      leasedAt: active.leasedAt,
      leaseExpiresAt: active.leaseExpiresAt,
      mode: active.mode
    };
    active.resolve(resolution);
    return resolution;
  }

  getStatus(): ConnectorStatusResponse {
    return {
      connectors: [...this.connectors.values()],
      queuedJobs: this.pendingJobs.length,
      activeJobs: this.activeJobs.size
    };
  }

  clear(): void {
    for (const job of this.pendingJobs) {
      clearTimeout(job.timeout);
      job.reject(new Error("Connector control plane reset."));
    }
    for (const active of this.activeJobs.values()) {
      clearTimeout(active.timeout);
      active.reject(new Error("Connector control plane reset."));
    }
    this.pendingJobs = [];
    this.activeJobs.clear();
    this.connectors.clear();
  }
}

export const connectorControlPlane = new ConnectorControlPlane();
