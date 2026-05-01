import { describe, expect, it } from "vitest";
import { resolveToolExecutionFields } from "@/modules/ai-tools/tool-execution-config.js";

describe("resolveToolExecutionFields", () => {
  it("fails loudly when runtime config is missing, even for seeded tool ids", () => {
    expect(() => resolveToolExecutionFields({
      id: "seed-http-headers",
      name: "HTTP Headers",
      category: "web",
      riskTier: "passive"
    }, {
      type: "object",
      properties: {
        baseUrl: { type: "string" }
      }
    })).toThrow("missing required execution settings");
  });

  it("preserves an explicit runtime constraint profile without seeded fallback", () => {
    const result = resolveToolExecutionFields({
      id: "seed-http-recon",
      name: "HTTP Surface",
      category: "web",
      riskTier: "passive"
    }, {
      type: "object",
      properties: {
        baseUrl: { type: "string" }
      },
      required: ["baseUrl"],
      "x-synosec-runtime": {
        executorType: "bash",
        bashSource: "#!/usr/bin/env bash\nexit 0",
        sandboxProfile: "network-recon",
        privilegeProfile: "read-only-network",
        timeoutMs: 120000,
        capabilities: ["web", "http-surface", "passive"],
        constraintProfile: {
          enforced: true,
          targetKinds: ["host", "domain", "url"],
          networkBehavior: "outbound-read",
          mutationClass: "none",
          supportsHostAllowlist: true,
          supportsPathExclusions: true,
          supportsRateLimit: true
        }
      }
    });

    expect(result.executorType).toBe("bash");
    expect(result.timeoutMs).toBe(120000);
    expect(result.constraintProfile?.enforced).toBe(true);
    expect(result.constraintProfile?.supportsHostAllowlist).toBe(true);
    expect(result.constraintProfile?.supportsPathExclusions).toBe(true);
    expect(result.constraintProfile?.supportsRateLimit).toBe(true);
  });

  it("fails loudly for non-seeded tools without runtime config", () => {
    expect(() => resolveToolExecutionFields({
      id: "custom-tool",
      name: "Custom Tool",
      category: "utility",
      riskTier: "passive"
    }, {
      type: "object",
      properties: {
        target: { type: "string" }
      }
    })).toThrow("missing required execution settings");
  });
});
