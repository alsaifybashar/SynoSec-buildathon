import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  applicationSchema,
  briefResponseSchema,
  demoResponseSchema,
  healthResponseSchema,
  listApplicationsResponseSchema
} from "@synosec/contracts";
import express from "express";
import { createApp, createErrorHandler } from "./app.js";
import { InMemoryApplicationStore } from "./applications/store.js";

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
  },
  {
    id: "ef7b823f-5f2e-4052-8276-4eb537f74fcb",
    name: "Report Builder",
    baseUrl: null,
    environment: "staging",
    status: "investigating",
    lastScannedAt: null,
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
] as const;

describe("backend api", () => {
  function createTestApp() {
    return createApp({
      applicationStore: new InMemoryApplicationStore(seedApplications.map((application) => ({ ...application })))
    });
  }

  it("returns a valid health payload", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(healthResponseSchema.safeParse(response.body).success).toBe(true);
  });

  it("returns the typed demo payload", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/demo");
    const parsed = demoResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(demoResponseSchema.safeParse(response.body).success).toBe(true);
    expect(parsed.scanMode).toBe("depth-first");
  });

  it("returns a typed brief payload", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/brief");
    const parsed = briefResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed.actions.length).toBeGreaterThan(0);
  });

  it("lists seeded applications", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/applications");
    const parsed = listApplicationsResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed.applications).toHaveLength(2);
    expect(parsed.applications[0]?.name).toBe("Operator Portal");
  });

  it("returns a single application by id", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/applications/5ecf4a8e-df5f-4945-a7e1-230ef43eac80");

    expect(response.status).toBe(200);
    expect(applicationSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.name).toBe("Operator Portal");
  });

  it("creates an application", async () => {
    const app = createTestApp();
    const response = await request(app).post("/api/applications").send({
      name: "Queue Reconciler",
      baseUrl: "https://queue.synosec.local",
      environment: "development",
      status: "active",
      lastScannedAt: null
    });

    expect(response.status).toBe(201);
    expect(applicationSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.baseUrl).toBe("https://queue.synosec.local");
  });

  it("updates an application", async () => {
    const app = createTestApp();
    const response = await request(app).patch("/api/applications/ef7b823f-5f2e-4052-8276-4eb537f74fcb").send({
      status: "archived"
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("archived");
  });

  it("deletes an application", async () => {
    const app = createTestApp();
    const createResponse = await request(app).post("/api/applications").send({
      name: "Disposable Target",
      baseUrl: "",
      environment: "staging",
      status: "investigating",
      lastScannedAt: null
    });

    const response = await request(app).delete(`/api/applications/${createResponse.body.id}`);

    expect(response.status).toBe(204);
  });

  it("returns 404 for a missing application", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/applications/11111111-1111-1111-1111-111111111111");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Application not found." });
  });

  it("returns 400 for invalid application payloads", async () => {
    const app = createTestApp();
    const response = await request(app).post("/api/applications").send({
      name: "",
      baseUrl: "not-a-url",
      environment: "production",
      status: "active",
      lastScannedAt: null
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBeTruthy();
  });

  it("returns a generic error payload in production", async () => {
    const errorApp = express();
    errorApp.get("/boom", () => {
      throw new Error("sensitive stack detail");
    });
    errorApp.use(createErrorHandler({ isProduction: true }));

    const response = await request(errorApp).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Something went wrong." });
  });

  it("returns the error message outside production", async () => {
    const errorApp = express();
    errorApp.get("/boom", () => {
      throw new Error("sensitive stack detail");
    });
    errorApp.use(createErrorHandler({ isProduction: false }));

    const response = await request(errorApp).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "sensitive stack detail" });
  });
});
