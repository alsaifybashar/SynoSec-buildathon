import { describe, expect, it } from "vitest";
import { briefResponseSchema, healthResponseSchema } from "@synosec/contracts";
import { createApp } from "./app.js";

describe("backend api", () => {
  const app = createApp();

  it("creates an express app with a health handler", () => {
    expect(typeof app).toBe("function");
    expect(healthResponseSchema.safeParse({
      status: "ok",
      service: "synosec-backend",
      timestamp: new Date().toISOString()
    }).success).toBe(true);
  });

  it("accepts the typed brief payload shape", () => {
    const parsed = briefResponseSchema.parse({
      headline: "Manual backend fetch completed.",
      actions: [
        "Enumerate reachable hosts before deeper probing.",
        "Re-run high-severity services with authenticated checks."
      ],
      generatedAt: new Date().toISOString()
    });

    expect(parsed.actions.length).toBeGreaterThan(0);
  });
});
