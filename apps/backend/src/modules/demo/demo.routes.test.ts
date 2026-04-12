import request from "supertest";
import { describe, expect, it } from "vitest";
import { demoResponseSchema } from "@synosec/contracts";
import { createApp } from "../../app/create-app.js";
import { MemoryApplicationsRepository } from "../applications/memory-applications.repository.js";
import { MemoryRuntimesRepository } from "../runtimes/memory-runtimes.repository.js";
import { MemoryWorkflowsRepository } from "../workflows/memory-workflows.repository.js";

describe("demo routes", () => {
  it("returns the typed demo payload", async () => {
    const app = createApp({
      applicationsRepository: new MemoryApplicationsRepository(),
      runtimesRepository: new MemoryRuntimesRepository(),
      workflowsRepository: new MemoryWorkflowsRepository()
    });

    const response = await request(app).get("/api/demo");
    const parsed = demoResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(demoResponseSchema.safeParse(response.body).success).toBe(true);
    expect(parsed.scanMode).toBe("depth-first");
  });
});
