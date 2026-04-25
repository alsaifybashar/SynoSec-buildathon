import { describe, expect, it } from "vitest";
import type { AiTool, Application, ToolRequest } from "@synosec/contracts";
import {
  applyConstraintInputs,
  authorizeToolAgainstConstraints,
  resolveEffectiveExecutionConstraints,
  resolveTargetAsset
} from "./execution-constraints.js";

const application: Application = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Cloudflare app",
  baseUrl: "https://app.example.com",
  environment: "production",
  status: "active",
  lastScannedAt: null,
  targetAssets: [
    {
      id: "20000000-0000-0000-0000-000000000001",
      applicationId: "10000000-0000-0000-0000-000000000001",
      label: "Primary site",
      kind: "url",
      hostname: "app.example.com",
      baseUrl: "https://app.example.com",
      ipAddress: null,
      cidr: null,
      provider: "cloudflare",
      ownershipStatus: "verified",
      isDefault: true,
      metadata: null,
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z"
    }
  ],
  constraintBindings: [
    {
      constraintId: "seed-constraint-cloudflare-v1",
      createdAt: "2026-04-25T00:00:00.000Z",
      constraint: {
        id: "seed-constraint-cloudflare-v1",
        name: "Cloudflare",
        kind: "provider_policy",
        provider: "cloudflare",
        version: 1,
        description: null,
        denyProviderOwnedTargets: true,
        requireVerifiedOwnership: true,
        allowActiveExploit: false,
        requireRateLimitSupport: true,
        rateLimitRps: 3,
        requireHostAllowlistSupport: true,
        requirePathExclusionSupport: true,
        excludedPaths: ["/cdn-cgi/"],
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z"
      }
    }
  ],
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z"
};

const compatibleTool: AiTool = {
  id: "seed-httpx",
  name: "HTTPx",
  status: "active",
  source: "system",
  description: null,
  binary: "httpx",
  executorType: "bash",
  bashSource: "#!/usr/bin/env bash\ntrue",
  capabilities: ["web-recon"],
  category: "web",
  riskTier: "passive",
  notes: null,
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 30000,
  constraintProfile: {
    enforced: true,
    targetKinds: ["host", "domain", "url"],
    networkBehavior: "outbound-read",
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

const incompatibleTool: AiTool = {
  ...compatibleTool,
  id: "custom-tool",
  name: "Custom tool",
  source: "custom",
  constraintProfile: {
    enforced: false,
    targetKinds: [],
    networkBehavior: "outbound-active",
    mutationClass: "active-validation",
    supportsHostAllowlist: false,
    supportsPathExclusions: false,
    supportsRateLimit: false
  }
};

const request: ToolRequest = {
  toolId: compatibleTool.id,
  tool: compatibleTool.name,
  executorType: "bash",
  capabilities: compatibleTool.capabilities,
  target: "app.example.com",
  layer: "L7",
  riskTier: "passive",
  justification: "collect evidence",
  sandboxProfile: compatibleTool.sandboxProfile,
  privilegeProfile: compatibleTool.privilegeProfile,
  parameters: {
    bashSource: compatibleTool.bashSource ?? "",
    commandPreview: compatibleTool.name,
    toolInput: {
      target: "app.example.com",
      baseUrl: "https://app.example.com"
    }
  }
};

describe("execution constraints", () => {
  it("injects Cloudflare exclusions and throttling into compatible tools", () => {
    const targetAsset = resolveTargetAsset(application);
    const constraintSet = resolveEffectiveExecutionConstraints(application, targetAsset, 5);
    const decision = authorizeToolAgainstConstraints(constraintSet, compatibleTool, request);

    expect(decision.allowed).toBe(true);

    const scoped = applyConstraintInputs(request, constraintSet);
    const toolInput = scoped.parameters["toolInput"] as Record<string, unknown>;
    expect(toolInput["excludedPaths"]).toEqual(["/cdn-cgi/"]);
    expect(toolInput["rateLimitRps"]).toBe(3);
    expect(toolInput["allowedHosts"]).toEqual(["app.example.com"]);
  });

  it("fails closed for tools that cannot enforce the active constraints", () => {
    const targetAsset = resolveTargetAsset(application);
    const constraintSet = resolveEffectiveExecutionConstraints(application, targetAsset, 5);
    const decision = authorizeToolAgainstConstraints(constraintSet, incompatibleTool, {
      ...request,
      toolId: incompatibleTool.id,
      tool: incompatibleTool.name
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("not constraint-compatible");
  });
});
