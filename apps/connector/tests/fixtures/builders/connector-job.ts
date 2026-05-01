import type { ConnectorExecutionJob } from "@synosec/contracts";

export function buildConnectorExecutionJob(overrides: Partial<ConnectorExecutionJob> = {}): ConnectorExecutionJob {
  return {
    id: "job-1",
    connectorId: "connector-1",
    scanId: "scan-1",
    tacticId: "tactic-1",
    agentId: "agent-1",
    mode: "execute",
    createdAt: "2026-04-20T10:00:00.000Z",
    leasedAt: "2026-04-20T10:00:00.000Z",
    leaseExpiresAt: "2026-04-20T10:00:15.000Z",
    toolRun: {
      id: "tool-run-1",
      scanId: "scan-1",
      tacticId: "tactic-1",
      agentId: "agent-1",
      tool: "Structured Echo",
      toolId: "tool-1",
      executorType: "bash",
      capabilities: ["web-recon"],
      target: "example.com",
      status: "running",
      riskTier: "passive",
      justification: "Test connector execution.",
      commandPreview: "structured-echo",
      dispatchMode: "connector",
      startedAt: "2026-04-20T10:00:00.000Z"
    },
    request: {
      toolId: "tool-1",
      tool: "Structured Echo",
      executorType: "bash",
      capabilities: ["web-recon"],
      target: "example.com",
      layer: "L7",
      riskTier: "passive",
      justification: "Test connector execution.",
      sandboxProfile: "network-recon",
      privilegeProfile: "read-only-network",
      parameters: {
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
        commandPreview: "structured-echo",
        toolInput: { target: "example.com", baseUrl: "http://example.com" }
      }
    },
    ...overrides
  };
}
