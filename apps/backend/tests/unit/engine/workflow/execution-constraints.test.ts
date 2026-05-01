import { describe, expect, it } from "vitest";
import type { AiTool, ExecutionConstraint, Target, ToolRequest } from "@synosec/contracts";
import {
  applyConstraintInputs,
  authorizeToolAgainstConstraints,
  resolveEffectiveExecutionConstraints,
  resolveWorkflowTarget
} from "@/engine/workflow/execution-constraints.js";
import { derivePrivilegeProfile, deriveSandboxProfile } from "@/modules/ai-tools/tool-execution-config.js";

const target: Target = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Cloudflare app",
  baseUrl: "https://app.example.com",
  environment: "production",
  status: "active",
  lastScannedAt: null,
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
        bypassForLocalTargets: false,
        denyProviderOwnedTargets: true,
        requireVerifiedOwnership: true,
        allowActiveExploit: false,
        requireRateLimitSupport: true,
        rateLimitRps: 3,
        requireHostAllowlistSupport: true,
        requirePathExclusionSupport: true,
        documentationUrls: [
          "https://developers.cloudflare.com/fundamentals/reference/scans-penetration/"
        ],
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
  executorType: "bash",
  bashSource: "#!/usr/bin/env bash\ntrue",
  capabilities: ["web-recon"],
  category: "web",
  riskTier: "passive",
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

const passiveSingleTargetProbe: AiTool = {
  ...compatibleTool,
  id: "builtin-http-surface-assessment",
  name: "HTTP Surface",
  capabilities: ["semantic-family", "http-surface", "passive"],
  constraintProfile: {
    enforced: true,
    targetKinds: ["host", "domain", "url"],
    networkBehavior: "outbound-read",
    mutationClass: "none",
    supportsHostAllowlist: true,
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
  sandboxProfile: deriveSandboxProfile(compatibleTool.riskTier),
  privilegeProfile: derivePrivilegeProfile(compatibleTool.riskTier),
  parameters: {
    bashSource: compatibleTool.bashSource ?? "",
    commandPreview: compatibleTool.name,
    toolInput: {
      target: "app.example.com",
      baseUrl: "https://app.example.com"
    }
  }
};

const localTargetBypassConstraint: ExecutionConstraint = {
  id: "seed-constraint-local-target-bypass-v1",
  name: "Local Target Bypass Policy",
  kind: "workflow_gate",
  provider: null,
  version: 1,
  description: "Allows local and private development targets to bypass provider-governed execution constraints for approved lab workflows.",
  bypassForLocalTargets: true,
  denyProviderOwnedTargets: false,
  requireVerifiedOwnership: false,
  allowActiveExploit: true,
  requireRateLimitSupport: false,
  rateLimitRps: null,
  requireHostAllowlistSupport: false,
  requirePathExclusionSupport: false,
  documentationUrls: [],
  excludedPaths: [],
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z"
};

describe("execution constraints", () => {
  it("requires a base URL before workflow execution", () => {
    expect(() => resolveWorkflowTarget({ ...target, baseUrl: null })).toThrowError(/base URL/);
  });

  it("injects Cloudflare exclusions and throttling into compatible tools", () => {
    const constraintSet = resolveEffectiveExecutionConstraints(target, 5);
    const decision = authorizeToolAgainstConstraints(constraintSet, compatibleTool, request);

    expect(decision.allowed).toBe(true);

    const scoped = applyConstraintInputs(request, constraintSet);
    const toolInput = scoped.parameters["toolInput"] as Record<string, unknown>;
    expect(toolInput["excludedPaths"]).toEqual(["/cdn-cgi/"]);
    expect(toolInput["rateLimitRps"]).toBe(3);
    expect(toolInput["allowedHosts"]).toEqual(["app.example.com"]);
  });

  it("fails closed for tools that cannot enforce the active constraints", () => {
    const constraintSet = resolveEffectiveExecutionConstraints(target, 5);
    const decision = authorizeToolAgainstConstraints(constraintSet, incompatibleTool, {
      ...request,
      toolId: incompatibleTool.id,
      tool: incompatibleTool.name
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("not constraint-compatible");
  });

  it("allows passive single-target probes on constrained targets without path or throttle adapters", () => {
    const constraintSet = resolveEffectiveExecutionConstraints(target, 5);
    const decision = authorizeToolAgainstConstraints(constraintSet, passiveSingleTargetProbe, {
      ...request,
      toolId: passiveSingleTargetProbe.id,
      tool: passiveSingleTargetProbe.name
    });

    expect(decision.allowed).toBe(true);
  });

  it("allows local targets only when a bypass constraint is bound", () => {
    const localTarget: Target = {
      ...target,
      name: "Local target",
      baseUrl: "http://localhost:3000",
      constraintBindings: [
        {
          constraintId: localTargetBypassConstraint.id,
          createdAt: "2026-04-25T00:00:00.000Z",
          constraint: localTargetBypassConstraint
        }
      ]
    };

    const constraintSet = resolveEffectiveExecutionConstraints(localTarget, 5);
    const decision = authorizeToolAgainstConstraints(constraintSet, incompatibleTool, {
      ...request,
      toolId: incompatibleTool.id,
      tool: incompatibleTool.name,
      target: "localhost"
    });

    expect(constraintSet.localhostException).toBe(true);
    expect(constraintSet.constraints).toEqual([]);
    expect(constraintSet.allowActiveExploit).toBe(true);
    expect(decision.allowed).toBe(true);
    expect(applyConstraintInputs({
      ...request,
      target: "localhost"
    }, constraintSet)).toEqual({
      ...request,
      target: "localhost"
    });
  });

  it("does not auto-bypass local targets without the seeded bypass constraint", () => {
    const localTargetWithoutBypass: Target = {
      ...target,
      name: "Local target",
      baseUrl: "http://localhost:3000",
      constraintBindings: []
    };

    const constraintSet = resolveEffectiveExecutionConstraints(localTargetWithoutBypass, 5);
    const decision = authorizeToolAgainstConstraints(constraintSet, incompatibleTool, {
      ...request,
      toolId: incompatibleTool.id,
      tool: incompatibleTool.name,
      target: "localhost"
    });

    expect(constraintSet.localhostException).toBe(false);
    expect(decision.allowed).toBe(false);
  });
});
