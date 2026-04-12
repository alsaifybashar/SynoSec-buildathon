import { describe, expect, it } from "vitest";
import { briefResponseSchema, demoResponseSchema, healthResponseSchema } from "./index.js";

describe("contracts", () => {
  it("accepts a valid health payload", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      service: "synosec-backend",
      timestamp: "2026-04-12T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid finding severity", () => {
    const result = demoResponseSchema.safeParse({
      scanMode: "depth-first",
      targetCount: 1,
      findings: [
        {
          id: "finding-1",
          target: "localhost",
          severity: "critical",
          summary: "Should fail"
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid brief payload", () => {
    const result = briefResponseSchema.safeParse({
      headline: "Manual scan trigger ready.",
      actions: ["Enumerate targets", "Prioritize high-risk findings"],
      generatedAt: "2026-04-12T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });
});
