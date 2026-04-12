import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  listWorkflowsResponseSchema,
  workflowSchema
} from "@synosec/contracts";
import { createApp } from "../../app/create-app.js";
import { MemoryApplicationsRepository } from "../applications/memory-applications.repository.js";
import { MemoryRuntimesRepository } from "../runtimes/memory-runtimes.repository.js";
import { MemoryWorkflowsRepository } from "./memory-workflows.repository.js";

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

const seedWorkflows = [
  {
    id: "0adf35d4-ec20-429b-9a2d-08b3807ab7a1",
    name: "Nightly perimeter sweep",
    trigger: "schedule",
    status: "active",
    maxDepth: 4,
    targetMode: "application",
    applicationId: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  },
  {
    id: "4c1dbb07-a06c-4205-9048-0a9d9a1980cb",
    name: "Ad-hoc runtime validation",
    trigger: "manual",
    status: "draft",
    maxDepth: 2,
    targetMode: "runtime",
    applicationId: null,
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
] as const;

function createTestApp() {
  return createApp({
    applicationsRepository: new MemoryApplicationsRepository(seedApplications.map((application) => ({ ...application }))),
    runtimesRepository: new MemoryRuntimesRepository(),
    workflowsRepository: new MemoryWorkflowsRepository(seedWorkflows.map((workflow) => ({ ...workflow })))
  });
}

describe("workflow routes", () => {
  it("lists seeded workflows", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/workflows");
    const parsed = listWorkflowsResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed.workflows).toHaveLength(2);
    expect(parsed.workflows[0]?.name).toBe("Ad-hoc runtime validation");
  });

  it("returns a single workflow by id", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/workflows/0adf35d4-ec20-429b-9a2d-08b3807ab7a1");

    expect(response.status).toBe(200);
    expect(workflowSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.name).toBe("Nightly perimeter sweep");
  });

  it("creates a workflow", async () => {
    const app = createTestApp();
    const response = await request(app).post("/api/workflows").send({
      name: "Webhook expansion test",
      trigger: "event",
      status: "draft",
      maxDepth: 3,
      targetMode: "manual",
      applicationId: null
    });

    expect(response.status).toBe(201);
    expect(workflowSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.trigger).toBe("event");
  });

  it("updates a workflow", async () => {
    const app = createTestApp();
    const response = await request(app).patch("/api/workflows/4c1dbb07-a06c-4205-9048-0a9d9a1980cb").send({
      status: "paused",
      applicationId: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80"
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("paused");
    expect(response.body.applicationId).toBe("5ecf4a8e-df5f-4945-a7e1-230ef43eac80");
  });

  it("deletes a workflow", async () => {
    const app = createTestApp();
    const createResponse = await request(app).post("/api/workflows").send({
      name: "Disposable workflow",
      trigger: "manual",
      status: "draft",
      maxDepth: 1,
      targetMode: "manual",
      applicationId: null
    });

    const response = await request(app).delete(`/api/workflows/${createResponse.body.id}`);

    expect(response.status).toBe(204);
  });

  it("returns 404 for a missing workflow", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/workflows/11111111-1111-1111-1111-111111111111");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Workflow not found." });
  });

  it("returns 400 for invalid workflow payloads", async () => {
    const app = createTestApp();
    const response = await request(app).post("/api/workflows").send({
      name: "",
      trigger: "manual",
      status: "draft",
      maxDepth: 0,
      targetMode: "manual",
      applicationId: null
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBeTruthy();
  });
});
