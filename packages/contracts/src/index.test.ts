import { describe, expect, it } from "vitest";
import {
  applicationSchema,
  briefResponseSchema,
  createApplicationBodySchema,
  demoResponseSchema,
  healthResponseSchema,
  updateApplicationBodySchema
} from "./index.js";

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

  it("accepts a valid application payload", () => {
    const result = applicationSchema.safeParse({
      id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      name: "Operator Portal",
      baseUrl: "https://portal.synosec.local",
      environment: "production",
      status: "active",
      lastScannedAt: "2026-04-12T12:00:00.000Z",
      createdAt: "2026-04-12T12:00:00.000Z",
      updatedAt: "2026-04-12T12:00:00.000Z"
    });

    expect(result.success).toBe(true);
  });

  it("normalizes empty create payload values", () => {
    const result = createApplicationBodySchema.safeParse({
      name: "Report Builder",
      baseUrl: "",
      environment: "staging",
      status: "investigating",
      lastScannedAt: null
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.baseUrl).toBeNull();
    }
  });

  it("rejects an empty update payload", () => {
    const result = updateApplicationBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
