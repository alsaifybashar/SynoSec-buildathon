import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiTool, ExecutionConstraint, Scan, Target, ToolRequest } from "@synosec/contracts";
import { ToolBroker } from "@/engine/workflow/broker/tool-broker.js";
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

const nativeAuthFlowProbeTool: AiTool = {
  id: "native-auth-flow-probe",
  name: "Legacy Auth Probe",
  status: "active",
  source: "system",
  description: "Backend-native auth probe",
  builtinActionKey: null,
  category: "auth",
  riskTier: "active",
  executorType: "native-ts",
  bashSource: null,
  capabilities: ["auth", "login"],
  timeoutMs: 60000,
  constraintProfile: {
    enforced: true,
    targetKinds: ["host", "domain", "url"],
    networkBehavior: "outbound-active",
    mutationClass: "active-validation",
    supportsHostAllowlist: true,
    supportsPathExclusions: false,
    supportsRateLimit: false
  },
  inputSchema: {},
  outputSchema: {},
  createdAt: "2026-04-30T00:00:00.000Z",
  updatedAt: "2026-04-30T00:00:00.000Z"
};

const nativeAuthFlowProbeRequest: ToolRequest = {
  toolId: nativeAuthFlowProbeTool.id,
  tool: nativeAuthFlowProbeTool.name,
  executorType: "native-ts",
  capabilities: nativeAuthFlowProbeTool.capabilities,
  target: "app.example.com",
  layer: "L7",
  riskTier: "active",
  justification: "probe auth flow",
  sandboxProfile: "active-recon",
  privilegeProfile: "active-network",
  parameters: {
    commandPreview: "native-auth-flow-probe POST /login x15 bounded requests",
    toolInput: {
      mode: "login-probe",
      targetUrl: "https://app.example.com",
      targetKind: "app-base",
      knownUser: "admin"
    },
    actionBatch: {
      actions: [
        ...Array.from({ length: 6 }, (_, index) => ({
          kind: "http_request" as const,
          id: `rate-limit-${index + 1}`,
          url: "https://app.example.com/login",
          method: "POST" as const,
          headers: {},
          query: {},
          formBody: { username: "admin", password: `wrong-password-${index}` },
          timeoutMs: 2500,
          maxResponseBytes: 32768,
          followRedirects: true,
          captureBody: true,
          captureHeaders: true
        })),
        ...Array.from({ length: 3 }, (_, index) => ({
          kind: "http_request" as const,
          id: `known-user-${index + 1}`,
          url: "https://app.example.com/login",
          method: "POST" as const,
          headers: {},
          query: {},
          formBody: { username: "admin", password: `wrong-known-${index}` },
          timeoutMs: 2500,
          maxResponseBytes: 32768,
          followRedirects: true,
          captureBody: true,
          captureHeaders: true
        })),
        ...Array.from({ length: 3 }, (_, index) => ({
          kind: "http_request" as const,
          id: `unknown-user-${index + 1}`,
          url: "https://app.example.com/login",
          method: "POST" as const,
          headers: {},
          query: {},
          formBody: { username: "ghost", password: `wrong-unknown-${index}` },
          timeoutMs: 2500,
          maxResponseBytes: 32768,
          followRedirects: true,
          captureBody: true,
          captureHeaders: true
        })),
        ...["password", "Password123", "12345678"].map((candidate, index) => ({
          kind: "http_request" as const,
          id: `weak-password-${index + 1}`,
          url: "https://app.example.com/login",
          method: "POST" as const,
          headers: {},
          query: {},
          formBody: { username: "admin", password: candidate },
          timeoutMs: 2500,
          maxResponseBytes: 32768,
          followRedirects: true,
          captureBody: true,
          captureHeaders: true
        }))
      ]
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

  it("parses native action results into persisted observations", async () => {
    const broker = new ToolBroker({
      broadcast: () => undefined,
      transport: {
        dispatchMode: "local",
        execute: vi.fn(async () => ({
          output: "rate-limit-1 http_request status=401 durationMs=10 bodyBytes=19",
          exitCode: 0,
          observations: [],
          actionResults: [
            ...Array.from({ length: 6 }, (_, index) => ({
              kind: "http_request" as const,
              actionId: `rate-limit-${index + 1}`,
              ok: false,
              statusCode: 401,
              headers: {},
              body: "invalid credentials",
              durationMs: 10
            })),
            ...Array.from({ length: 3 }, (_, index) => ({
              kind: "http_request" as const,
              actionId: `known-user-${index + 1}`,
              ok: false,
              statusCode: 401,
              headers: {},
              body: "known invalid password",
              durationMs: 250
            })),
            ...Array.from({ length: 3 }, (_, index) => ({
              kind: "http_request" as const,
              actionId: `unknown-user-${index + 1}`,
              ok: false,
              statusCode: 404,
              headers: {},
              body: "user missing",
              durationMs: 20
            })),
            {
              kind: "http_request" as const,
              actionId: "weak-password-1",
              ok: true,
              statusCode: 200,
              headers: {},
              body: "welcome authenticated",
              durationMs: 5
            },
            ...Array.from({ length: 2 }, (_, index) => ({
              kind: "http_request" as const,
              actionId: `weak-password-${index + 2}`,
              ok: false,
              statusCode: 401,
              headers: {},
              body: "invalid credentials",
              durationMs: 5
            }))
          ],
          dispatchMode: "local" as const
        }))
      }
    });

    const result = await broker.executeRequests({
      scan,
      tacticId: "tactic-1",
      agentId: "agent-1",
      requests: [nativeAuthFlowProbeRequest],
      toolLookup: {
        [nativeAuthFlowProbeTool.id]: nativeAuthFlowProbeTool
      }
    });

    expect(result.toolRuns[0]?.status).toBe("completed");
    expect(result.observations.map((observation) => observation.key)).toEqual([
      "auth-flow:https://app.example.com/login:rate-limit",
      "auth-flow:https://app.example.com/login:oracle",
      "auth-flow:https://app.example.com/login:weak-password"
    ]);
  });
});
