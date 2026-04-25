import { afterEach, describe, expect, it } from "vitest";
import type { ToolRequest, ToolRun } from "@synosec/contracts";
import { connectorControlPlane } from "./control-plane.js";

function createRequest(overrides: Partial<ToolRequest> = {}): ToolRequest {
  return {
    toolId: "seed-http-recon",
    tool: "HTTP Recon",
    executorType: "bash",
    capabilities: ["web-recon", "passive"],
    target: "example.com",
    layer: "L7",
    riskTier: "passive",
    justification: "check support",
    sandboxProfile: "network-recon",
    privilegeProfile: "read-only-network",
    parameters: {
      bashSource: "#!/usr/bin/env bash\nif ! command -v httpx >/dev/null 2>&1; then exit 127; fi\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      commandPreview: "httpx https://example.com",
      toolInput: {
        target: "example.com",
        baseUrl: "https://example.com"
      }
    },
    ...overrides
  };
}

function createToolRun(request: ToolRequest): ToolRun {
  return {
    id: "tool-run-1",
    scanId: "scan-1",
    tacticId: "tactic-1",
    agentId: "agent-1",
    toolId: request.toolId,
    tool: request.tool,
    executorType: request.executorType,
    capabilities: request.capabilities,
    target: request.target,
    status: "running",
    riskTier: request.riskTier,
    justification: request.justification,
    commandPreview: String(request.parameters["commandPreview"]),
    dispatchMode: "connector",
    startedAt: "2026-04-25T00:00:00.000Z"
  };
}

afterEach(() => {
  connectorControlPlane.clear();
});

describe("connectorControlPlane", () => {
  it("derives supported seeded tools from installed binaries", () => {
    connectorControlPlane.register({
      name: "test-connector",
      version: "0.1.0",
      allowedCapabilities: ["web-recon", "network-recon", "content-discovery", "active-recon", "passive"],
      allowedSandboxProfiles: ["network-recon", "active-recon"],
      allowedPrivilegeProfiles: ["read-only-network", "active-network"],
      installedBinaries: ["httpx", "nmap", "curl", "katana"],
      runMode: "execute",
      concurrency: 1,
      capabilities: []
    });

    const status = connectorControlPlane.getStatus();
    expect(status.connectors).toHaveLength(1);
    expect(status.connectors[0]?.supportedToolIds).toContain("seed-http-recon");
    expect(status.connectors[0]?.supportedToolIds).toContain("seed-nmap-scan");
    expect(status.connectors[0]?.supportedToolIds).not.toContain("seed-dirb-scan");
  });

  it("rejects dispatch when no registered connector supports the exact tool", async () => {
    connectorControlPlane.register({
      name: "test-connector",
      version: "0.1.0",
      allowedCapabilities: ["web-recon", "passive"],
      allowedSandboxProfiles: ["network-recon"],
      allowedPrivilegeProfiles: ["read-only-network"],
      installedBinaries: [],
      runMode: "execute",
      concurrency: 1,
      capabilities: []
    });

    const request = createRequest();

    await expect(connectorControlPlane.dispatch({
      scanId: "scan-1",
      tacticId: "tactic-1",
      agentId: "agent-1",
      toolRun: createToolRun(request),
      request
    })).rejects.toThrow(/No registered connector supports tool/);
  });
});
