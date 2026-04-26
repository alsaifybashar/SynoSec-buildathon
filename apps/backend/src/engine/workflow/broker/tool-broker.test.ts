import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiTool, ExecutionConstraint, Scan, Target, ToolRequest } from "@synosec/contracts";
import { ToolBroker } from "./tool-broker.js";
import { resolveEffectiveExecutionConstraints } from "@/engine/workflow/execution-constraints.js";

const { createAuditEntryMock } = vi.hoisted(() => ({
  createAuditEntryMock: vi.fn(async () => undefined)
}));

vi.mock("@/engine/scans/index.js", () => ({
  createAuditEntry: createAuditEntryMock
}));

const cloudflareConstraint: ExecutionConstraint = {
  id: "seed-constraint-cloudflare-v1",
  name: "Cloudflare",
  kind: "provider_policy",
  provider: "cloudflare",
  version: 1,
  description: null,
  bypassForLocalTargets: false,
  denyProviderOwnedTargets: true,
  requireVerifiedOwnership: true,
  allowActiveExploit: false,
  requireRateLimitSupport: true,
  rateLimitRps: 3,
  requireHostAllowlistSupport: true,
  requirePathExclusionSupport: true,
  documentationUrls: [],
  excludedPaths: ["/cdn-cgi/"],
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z"
};

const constrainedTarget: Target = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Constrained app",
  kind: "url",
  status: "active",
  baseUrl: "https://app.example.com",
  hostname: "app.example.com",
  ipAddress: null,
  cidr: null,
  provider: "cloudflare",
  ownershipStatus: "verified",
  metadata: null,
  constraintBindings: [
    {
      constraintId: cloudflareConstraint.id,
      createdAt: "2026-04-25T00:00:00.000Z",
      constraint: cloudflareConstraint
    }
  ],
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z"
};

const scan: Scan = {
  id: "scan-1",
  scope: {
    targets: ["app.example.com"],
    exclusions: ["/cdn-cgi/"],
    layers: ["L4", "L7"],
    maxDepth: 3,
    maxDurationMinutes: 15,
    rateLimitRps: 3,
    allowActiveExploits: false,
    graceEnabled: true,
    graceRoundInterval: 3,
    cyberRangeMode: "live"
  },
  status: "running",
  currentRound: 0,
  tacticsTotal: 1,
  tacticsComplete: 0,
  createdAt: "2026-04-25T00:00:00.000Z"
};

const contentDiscoveryTool: AiTool = {
  id: "seed-content-discovery",
  name: "Content Discovery",
  status: "active",
  source: "system",
  description: "Controlled content discovery",
  builtinActionKey: null,
  category: "content",
  riskTier: "active",
  executorType: "bash",
  bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
  capabilities: ["semantic-family", "content-discovery", "active-recon"],
  timeoutMs: 30000,
  constraintProfile: {
    enforced: true,
    targetKinds: ["host", "domain", "url"],
    networkBehavior: "outbound-active",
    mutationClass: "content-enumeration",
    supportsHostAllowlist: true,
    supportsPathExclusions: true,
    supportsRateLimit: true
  },
  inputSchema: {},
  outputSchema: {},
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z"
};

const contentDiscoveryRequest: ToolRequest = {
  toolId: contentDiscoveryTool.id,
  tool: contentDiscoveryTool.name,
  executorType: "bash",
  capabilities: contentDiscoveryTool.capabilities,
  target: "app.example.com",
  layer: "L7",
  riskTier: "active",
  justification: "find reachable content while honoring provider policy",
  sandboxProfile: "active-recon",
  privilegeProfile: "active-network",
  parameters: {
    bashSource: contentDiscoveryTool.bashSource ?? "",
    commandPreview: contentDiscoveryTool.name,
    toolInput: {
      target: "app.example.com",
      baseUrl: "https://app.example.com"
    }
  }
};

describe("ToolBroker constraint handling", () => {
  beforeEach(() => {
    createAuditEntryMock.mockReset();
  });

  it("injects constrained-target inputs before executing compatible tools", async () => {
    const constraintSet = resolveEffectiveExecutionConstraints(constrainedTarget, 5);
    const transportExecute = vi.fn(async (input: { request: ToolRequest }) => {
      expect(input.request.parameters["toolInput"]).toMatchObject({
        target: "app.example.com",
        baseUrl: "https://app.example.com/",
        allowedHosts: ["app.example.com"],
        excludedPaths: ["/cdn-cgi/"],
        rateLimitRps: 3
      });

      return {
        output: "ok",
        exitCode: 0,
        observations: [],
        dispatchMode: "local" as const
      };
    });

    const broker = new ToolBroker({
      broadcast: () => undefined,
      transport: {
        dispatchMode: "local",
        execute: transportExecute
      }
    });

    const result = await broker.executeRequests({
      scan,
      tacticId: "tactic-1",
      agentId: "agent-1",
      requests: [contentDiscoveryRequest],
      constraintSet,
      toolLookup: {
        [contentDiscoveryTool.id]: contentDiscoveryTool
      }
    });

    expect(transportExecute).toHaveBeenCalledTimes(1);
    expect(result.toolRuns).toHaveLength(1);
    expect(result.toolRuns[0]?.status).toBe("completed");
  });
});
