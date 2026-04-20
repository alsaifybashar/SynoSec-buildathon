import { describe, expect, it, vi } from "vitest";
import type { ConnectorExecutionJob } from "@synosec/contracts";
import { SynoSecConnectorClient, executeConnectorJob } from "./index.js";

function makeJob(overrides: Partial<ConnectorExecutionJob> = {}): ConnectorExecutionJob {
  return {
    id: "job-1",
    connectorId: "connector-1",
    scanId: "scan-1",
    tacticId: "tactic-1",
    agentId: "agent-1",
    mode: "dry-run",
    createdAt: "2026-04-20T10:00:00.000Z",
    leasedAt: "2026-04-20T10:00:00.000Z",
    leaseExpiresAt: "2026-04-20T10:00:15.000Z",
    toolRun: {
      id: "tool-run-1",
      scanId: "scan-1",
      tacticId: "tactic-1",
      agentId: "agent-1",
      tool: "curl",
      adapter: "http_probe",
      target: "example.com",
      status: "running",
      riskTier: "passive",
      justification: "Test connector polling.",
      commandPreview: "curl -I http://example.com",
      dispatchMode: "connector",
      startedAt: "2026-04-20T10:00:00.000Z"
    },
    request: {
      tool: "curl",
      adapter: "http_probe",
      target: "example.com",
      layer: "L7",
      riskTier: "passive",
      justification: "Test connector polling.",
      parameters: {}
    },
    ...overrides
  };
}

describe("connector client", () => {
  it("returns a dry-run result for allowed adapters", async () => {
    const result = await executeConnectorJob(makeJob(), {
      allowedAdapters: ["http_probe"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("dry-run:");
  });

  it("rejects jobs for adapters outside the connector allowlist", async () => {
    const result = await executeConnectorJob(
      makeJob({
        request: {
          ...makeJob().request,
          adapter: "service_scan"
        },
        toolRun: {
          ...makeJob().toolRun,
          adapter: "service_scan"
        }
      }),
      {
        allowedAdapters: ["http_probe"]
      }
    );

    expect(result.exitCode).toBe(1);
    expect(result.statusReason).toContain("not allowed");
  });

  it("registers, polls, and submits results to the control plane", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          connectorId: "connector-1",
          pollIntervalMs: 1000,
          leaseDurationMs: 15000,
          acceptedAt: "2026-04-20T10:00:00.000Z"
        }))
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          connectorId: "connector-1",
          job: makeJob()
        }))
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));

    const client = new SynoSecConnectorClient({
      baseUrl: "http://127.0.0.1:3001",
      token: "token",
      fetchImpl: fetchMock,
      registration: {
        name: "test-connector",
        version: "0.1.0",
        allowedAdapters: ["http_probe"],
        runMode: "dry-run",
        concurrency: 1,
        capabilities: []
      }
    });

    const job = await client.runOnce();

    expect(job?.id).toBe("job-1");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
