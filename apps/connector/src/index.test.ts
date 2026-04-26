import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import type { ConnectorExecutionJob, OsiLayer, ToolRequest } from "@synosec/contracts";
import { SynoSecConnectorClient, executeConnectorJob } from "./index.js";

const seededToolDefinitions = [
  { id: "seed-http-recon", name: "HTTP Recon", capabilities: ["web-recon", "passive"], riskTier: "passive", sandboxProfile: "network-recon", privilegeProfile: "read-only-network", timeoutMs: 120000, executorType: "bash", bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'" },
  { id: "seed-web-crawl", name: "Web Crawl", capabilities: ["web-recon", "content-discovery", "passive"], riskTier: "passive", sandboxProfile: "network-recon", privilegeProfile: "read-only-network", timeoutMs: 180000, executorType: "bash", bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'" },
  { id: "seed-service-scan", name: "Service Scan", capabilities: ["network-recon", "passive"], riskTier: "passive", sandboxProfile: "network-recon", privilegeProfile: "read-only-network", timeoutMs: 180000, executorType: "bash", bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'" },
  { id: "seed-content-discovery", name: "Content Discovery", capabilities: ["content-discovery", "active-recon"], riskTier: "active", sandboxProfile: "active-recon", privilegeProfile: "active-network", timeoutMs: 30000, executorType: "bash", bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'" },
  { id: "seed-vuln-audit", name: "Vulnerability Audit", capabilities: ["vulnerability-audit", "active-recon"], riskTier: "active", sandboxProfile: "active-recon", privilegeProfile: "active-network", timeoutMs: 45000, executorType: "bash", bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'" },
  { id: "seed-sql-injection-check", name: "SQL Injection Check", capabilities: ["database-security", "controlled-exploit"], riskTier: "controlled-exploit", sandboxProfile: "controlled-exploit-lab", privilegeProfile: "controlled-exploit", timeoutMs: 45000, executorType: "bash", bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'" }
] as const;

function compileToolRequestFromDefinition(
  tool: typeof seededToolDefinitions[number],
  input: { target: string; layer: OsiLayer; justification: string; port?: number }
): ToolRequest {
  const baseUrl = `http://${input.target}${input.port ? `:${input.port}` : ""}`;
  return {
    toolId: tool.id,
    tool: tool.name,
    executorType: "bash",
    capabilities: [...tool.capabilities],
    target: input.target,
    ...(input.port == null ? {} : { port: input.port }),
    layer: input.layer,
    riskTier: tool.riskTier,
    justification: input.justification,
    sandboxProfile: tool.sandboxProfile,
    privilegeProfile: tool.privilegeProfile,
    parameters: {
      bashSource: tool.bashSource,
      commandPreview: `${tool.name} ${baseUrl}`,
      toolInput: {
        target: input.target,
        baseUrl,
        ...(input.port == null ? {} : { port: input.port })
      },
      timeoutMs: tool.timeoutMs
    }
  };
}

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
      toolId: "tool-1",
      executorType: "bash",
      capabilities: ["web-recon"],
      target: "example.com",
      status: "running",
      riskTier: "passive",
      justification: "Test connector polling.",
      commandPreview: "curl -I http://example.com",
      dispatchMode: "connector",
      startedAt: "2026-04-20T10:00:00.000Z"
    },
    request: {
      toolId: "tool-1",
      tool: "curl",
      executorType: "bash",
      capabilities: ["web-recon"],
      target: "example.com",
      layer: "L7",
      riskTier: "passive",
      justification: "Test connector polling.",
      sandboxProfile: "network-recon",
      privilegeProfile: "read-only-network",
      parameters: {
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
        commandPreview: "curl -I http://example.com",
        toolInput: { target: "example.com", baseUrl: "http://example.com" }
      }
    },
    ...overrides
  };
}

describe("connector client", () => {
  it("returns a dry-run result for allowed capabilities", async () => {
    const result = await executeConnectorJob(makeJob(), {
      allowedCapabilities: ["web-recon"],
      allowedSandboxProfiles: ["network-recon"],
      allowedPrivilegeProfiles: ["read-only-network"],
      installedBinaries: []
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("dry-run:");
  });

  it("rejects jobs for capabilities outside the connector allowlist", async () => {
    const result = await executeConnectorJob(
      makeJob({
        request: {
          ...makeJob().request,
          capabilities: ["network-recon"]
        },
        toolRun: {
          ...makeJob().toolRun,
          capabilities: ["network-recon"]
        }
      }),
      {
        allowedCapabilities: ["web-recon"],
        allowedSandboxProfiles: [],
        allowedPrivilegeProfiles: [],
        installedBinaries: []
      }
    );

    expect(result.exitCode).toBe(1);
    expect(result.statusReason).toContain("not allowed");
  });

  it("registers, polls, and submits results to the control plane", async () => {
    const binaryCheckedJob = makeJob({
      request: {
        ...makeJob().request,
        parameters: {
          ...makeJob().request.parameters,
          bashSource: "#!/usr/bin/env bash\nif ! command -v httpx >/dev/null 2>&1; then exit 127; fi\nprintf '%s\\n' '{\"output\":\"ok\"}'"
        }
      }
    });
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
          job: binaryCheckedJob
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
          allowedCapabilities: ["web-recon"],
          allowedSandboxProfiles: ["network-recon"],
          allowedPrivilegeProfiles: ["read-only-network"],
          installedBinaries: ["httpx"],
        runMode: "dry-run",
        concurrency: 1,
        capabilities: []
      }
    });

    const job = await client.runOnce();

    expect(job?.id).toBe("job-1");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
      exitCode: 0
    });
  });

  it("rejects bash tool jobs without sandbox and privilege profiles", async () => {
    const result = await executeConnectorJob(
      makeJob({
        mode: "execute",
        request: {
          ...makeJob().request,
          toolId: "tool-1",
          capabilities: ["web-recon"],
          sandboxProfile: undefined,
          privilegeProfile: undefined,
          parameters: {
            bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
            commandPreview: "echo hello",
            toolInput: {}
          }
        } as unknown as ConnectorExecutionJob["request"],
        toolRun: {
          ...makeJob().toolRun,
          tool: "tool-1"
        }
      }),
      {
        allowedCapabilities: ["web-recon"],
        allowedSandboxProfiles: ["network-recon"],
        allowedPrivilegeProfiles: ["read-only-network"],
        installedBinaries: []
      }
    );

    expect(result.exitCode).toBe(1);
    expect(result.statusReason?.toLowerCase()).toContain("sandbox");
  });

  it("executes bash tool jobs from structured source without a shell command string", async () => {
    const result = await executeConnectorJob(
      makeJob({
        mode: "execute",
        request: {
          ...makeJob().request,
          toolId: "tool-1",
          tool: "Structured Echo",
          capabilities: ["web-recon"],
          sandboxProfile: "network-recon",
          privilegeProfile: "read-only-network",
          parameters: {
            bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"hello\",\"observations\":[{\"key\":\"structured-echo\",\"title\":\"Structured echo\",\"summary\":\"Structured echo completed.\",\"severity\":\"info\",\"confidence\":0.5,\"evidence\":\"hello\",\"technique\":\"test\"}]}'",
            commandPreview: "structured-echo",
            toolInput: {}
          }
        },
        toolRun: {
          ...makeJob().toolRun,
          tool: "tool-1",
          commandPreview: "structured-echo"
        }
      }),
      {
        allowedCapabilities: ["web-recon"],
        allowedSandboxProfiles: ["network-recon"],
        allowedPrivilegeProfiles: ["read-only-network"],
        installedBinaries: []
      }
    );

    expect(result.exitCode).toBeGreaterThanOrEqual(0);
    expect(result.observations[0]).toMatchObject({
      scanId: "scan-1",
      tacticId: "tactic-1",
      toolRunId: "tool-run-1",
      tool: "Structured Echo",
      key: "structured-echo"
    });
  });

  it("accepts every executable seeded tool definition for connector execution policy", async () => {
    const executableTools = seededToolDefinitions.filter((tool) => tool.executorType === "bash");

    for (const tool of executableTools) {
      const request = compileToolRequestFromDefinition(tool, {
        target: "example.com",
        layer: "L7",
        justification: `Verify connector policy for ${tool.id}.`
      });

      const result = await executeConnectorJob(
        makeJob({
          mode: "simulate",
          request,
          toolRun: {
            ...makeJob().toolRun,
            tool: tool.id,
            toolId: request.toolId,
            executorType: "bash",
            capabilities: request.capabilities,
            commandPreview: String(request.parameters["commandPreview"])
          }
        }),
        {
          allowedCapabilities: ["web-recon", "network-recon", "content-discovery", "active-recon", "database-security", "controlled-exploit", "passive", "vulnerability-audit"],
          allowedSandboxProfiles: ["network-recon", "active-recon", "controlled-exploit-lab"],
          allowedPrivilegeProfiles: ["read-only-network", "active-network", "controlled-exploit"],
          installedBinaries: []
        }
      );

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("simulate:");
    }
  });

  it("runs the seeded HTTP recon tool through execute-mode sandbox when httpx is available", async () => {
    const commandResult = spawnSync("sh", ["-lc", "command -v httpx"], { encoding: "utf8" });
    if (commandResult.status !== 0) {
      return;
    }
    const helpResult = spawnSync("sh", ["-lc", "httpx -h 2>&1 || httpx --help 2>&1"], { encoding: "utf8" });
    if (!/ProjectDiscovery|tech-detect|status-code/.test(helpResult.stdout)) {
      return;
    }

    const tool = seededToolDefinitions.find((candidate) => candidate.id === "seed-http-recon");
    expect(tool).toBeDefined();
    if (!tool) {
      return;
    }

    const request = compileToolRequestFromDefinition(tool, {
      target: "example.com",
      layer: "L7",
      justification: "Verify the seeded HTTP recon tool executes through the sandbox."
    });

    const result = await executeConnectorJob(
      makeJob({
        mode: "execute",
        request,
        toolRun: {
          ...makeJob().toolRun,
          tool: tool.id,
          toolId: request.toolId,
          executorType: "bash",
          capabilities: request.capabilities,
          commandPreview: String(request.parameters["commandPreview"])
        }
      }),
      {
        allowedCapabilities: ["web-recon", "passive"],
        allowedSandboxProfiles: ["network-recon"],
        allowedPrivilegeProfiles: ["read-only-network"],
        installedBinaries: ["httpx"]
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.statusReason).toBeUndefined();
    expect(result.output.length).toBeGreaterThan(0);
  });
});
