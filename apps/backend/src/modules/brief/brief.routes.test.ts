import request from "supertest";
import { describe, expect, it } from "vitest";
import { briefResponseSchema } from "@synosec/contracts";
import { createApp } from "../../app/create-app.js";
import { MemoryApplicationsRepository } from "../applications/memory-applications.repository.js";

describe("brief routes", () => {
  it("returns a typed brief payload", async () => {
    const app = createApp({
      applicationsRepository: new MemoryApplicationsRepository()
    });

    const response = await request(app).get("/api/brief");
    const parsed = briefResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed.actions.length).toBeGreaterThan(0);
  });
});
