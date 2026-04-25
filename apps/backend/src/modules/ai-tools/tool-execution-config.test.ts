import { describe, expect, it } from "vitest";
import { resolveToolExecutionFields } from "./tool-execution-config.js";

describe("resolveToolExecutionFields", () => {
  it("falls back to seeded execution config when runtime config is missing", () => {
    const result = resolveToolExecutionFields({
      id: "seed-http-headers",
      name: "HTTP Headers",
      binary: "curl",
      category: "web",
      riskTier: "passive"
    }, {
      type: "object",
      properties: {
        baseUrl: { type: "string" }
      }
    });

    expect(result.executorType).toBe("bash");
    expect(result.bashSource).toContain("curl");
    expect(result.sandboxProfile).toBe("network-recon");
    expect(result.timeoutMs).toBeGreaterThan(0);
    expect(result.constraintProfile?.enforced).toBe(true);
  });
});
