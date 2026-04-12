import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  listRuntimesResponseSchema,
  runtimeSchema
} from "@synosec/contracts";
import { createApp } from "../../app/create-app.js";
import { MemoryApplicationsRepository } from "../applications/memory-applications.repository.js";
import { MemoryRuntimesRepository } from "./memory-runtimes.repository.js";
import { MemoryWorkflowsRepository } from "../workflows/memory-workflows.repository.js";

const seedApplications = [
  {
    id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
    name: "Operator Portal",
    baseUrl: "https://portal.synosec.local",
    environment: "production",
    status: "active",
    lastScannedAt: "2026-04-12T12:00:00.000Z",
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
] as const;

const seedRuntimes = [
  {
    id: "6fd90dd7-6f27-47d0-ab24-6328bb2f3624",
    name: "Edge Gateway",
    serviceType: "gateway",
    provider: "docker",
    environment: "production",
    region: "eu-north-1",
    status: "healthy",
    applicationId: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  },
  {
    id: "0c81cf58-3efb-4ddd-ac96-5f2ae8c1e316",
    name: "Queue Worker",
    serviceType: "worker",
    provider: "aws",
    environment: "staging",
    region: "eu-west-1",
    status: "degraded",
    applicationId: null,
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
] as const;

function createTestApp() {
  return createApp({
    applicationsRepository: new MemoryApplicationsRepository(seedApplications.map((application) => ({ ...application }))),
    runtimesRepository: new MemoryRuntimesRepository(seedRuntimes.map((runtime) => ({ ...runtime }))),
    workflowsRepository: new MemoryWorkflowsRepository()
  });
}

describe("runtime routes", () => {
  it("lists seeded runtimes", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/runtimes");
    const parsed = listRuntimesResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed.runtimes).toHaveLength(2);
    expect(parsed.runtimes[0]?.name).toBe("Edge Gateway");
  });

  it("returns a single runtime by id", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/runtimes/6fd90dd7-6f27-47d0-ab24-6328bb2f3624");

    expect(response.status).toBe(200);
    expect(runtimeSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.name).toBe("Edge Gateway");
  });

  it("creates a runtime", async () => {
    const app = createTestApp();
    const response = await request(app).post("/api/runtimes").send({
      name: "Primary API",
      serviceType: "api",
      provider: "on-prem",
      environment: "development",
      region: "lab-a",
      status: "healthy",
      applicationId: null
    });

    expect(response.status).toBe(201);
    expect(runtimeSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.provider).toBe("on-prem");
  });

  it("updates a runtime", async () => {
    const app = createTestApp();
    const response = await request(app).patch("/api/runtimes/0c81cf58-3efb-4ddd-ac96-5f2ae8c1e316").send({
      status: "retired"
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("retired");
  });

  it("deletes a runtime", async () => {
    const app = createTestApp();
    const createResponse = await request(app).post("/api/runtimes").send({
      name: "Disposable Runtime",
      serviceType: "other",
      provider: "docker",
      environment: "staging",
      region: "sandbox",
      status: "healthy",
      applicationId: null
    });

    const response = await request(app).delete(`/api/runtimes/${createResponse.body.id}`);

    expect(response.status).toBe(204);
  });

  it("returns 404 for a missing runtime", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/runtimes/11111111-1111-1111-1111-111111111111");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Runtime not found." });
  });

  it("returns 400 for invalid runtime payloads", async () => {
    const app = createTestApp();
    const response = await request(app).post("/api/runtimes").send({
      name: "",
      serviceType: "api",
      provider: "docker",
      environment: "production",
      region: "",
      status: "healthy",
      applicationId: null
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBeTruthy();
  });
});
