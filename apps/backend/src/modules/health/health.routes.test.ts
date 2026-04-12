import request from "supertest";
import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "@synosec/contracts";
import { createApp } from "../../app/create-app.js";
import { MemoryApplicationsRepository } from "../applications/memory-applications.repository.js";

describe("health routes", () => {
  it("returns a valid health payload", async () => {
    const app = createApp({
      applicationsRepository: new MemoryApplicationsRepository()
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(healthResponseSchema.safeParse(response.body).success).toBe(true);
  });
});
