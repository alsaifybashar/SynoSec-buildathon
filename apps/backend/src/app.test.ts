import request from "supertest";
import { describe, expect, it } from "vitest";
import { briefResponseSchema, demoResponseSchema, healthResponseSchema } from "@synosec/contracts";
import { createApp } from "./app.js";

describe("backend api", () => {
  const app = createApp();

  it("returns a valid health payload", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(healthResponseSchema.safeParse(response.body).success).toBe(true);
  });

  it("returns the typed demo payload", async () => {
    const response = await request(app).get("/api/demo");
    const parsed = demoResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(demoResponseSchema.safeParse(response.body).success).toBe(true);
    expect(parsed.scanMode).toBe("depth-first");
  });

  it("returns a typed brief payload", async () => {
    const response = await request(app).get("/api/brief");
    const parsed = briefResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed.actions.length).toBeGreaterThan(0);
  });
});
