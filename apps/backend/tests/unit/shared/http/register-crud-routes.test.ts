import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createErrorHandler } from "@/shared/http/error-handler.js";
import { registerCrudRoutes } from "@/shared/http/register-crud-routes.js";
import { RequestError } from "@/shared/http/request-error.js";

interface TestItem {
  id: string;
  name: string;
}

function createTestApp(overrides: Partial<{
  list: () => Promise<{ items: TestItem[]; page: number; pageSize: number; total: number; totalPages: number }>;
  getById: (id: string) => Promise<TestItem | null>;
  create: (input: { name: string }) => Promise<TestItem>;
  update: (id: string, input: { name?: string }) => Promise<TestItem | null>;
  remove: (id: string) => Promise<boolean>;
}> = {}) {
  const app = express();
  app.use(express.json());

  registerCrudRoutes(app, {
    resourcePath: "/items",
    repository: {
      list: overrides.list ?? (async () => ({
        items: [{ id: "item-1", name: "Alpha" }],
        page: 2,
        pageSize: 5,
        total: 1,
        totalPages: 1
      })),
      getById: overrides.getById ?? (async (id) => (id === "item-1" ? { id, name: "Alpha" } : null)),
      create: overrides.create ?? (async (input) => ({ id: "created-1", name: input.name })),
      update: overrides.update ?? (async (id, input) => (id === "item-1" ? { id, name: input.name ?? "Alpha" } : null)),
      remove: overrides.remove ?? (async (id) => id === "item-1")
    },
    querySchema: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(10)
    }),
    listResponseSchema: z.object({
      items: z.array(z.object({ id: z.string(), name: z.string() })),
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
      totalPages: z.number()
    }),
    listDataKey: "items",
    itemSchema: z.object({ id: z.string(), name: z.string() }),
    createBodySchema: z.object({ name: z.string().min(1) }),
    updateBodySchema: z.object({ name: z.string().min(1).optional() }).refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required."
    }),
    notFoundMessage: "Item not found."
  });

  app.use(createErrorHandler());
  return app;
}

describe("registerCrudRoutes", () => {
  it("returns paginated list responses using the configured data key", async () => {
    const load = vi.fn(async () => ({
      items: [{ id: "item-1", name: "Alpha" }],
      page: 2,
      pageSize: 5,
      total: 1,
      totalPages: 1
    }));
    const app = createTestApp({ list: load });

    const response = await request(app).get("/items?page=2&pageSize=5");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [{ id: "item-1", name: "Alpha" }],
      page: 2,
      pageSize: 5,
      total: 1,
      totalPages: 1
    });
    expect(load).toHaveBeenCalledWith({ page: 2, pageSize: 5 });
  });

  it("returns 400 for invalid query params and sanitizes the validation payload", async () => {
    const app = createTestApp();

    const response = await request(app).get("/items?page=0");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.message).toBe("Number must be greater than or equal to 1");
  });

  it("returns 201 for creates", async () => {
    const app = createTestApp();

    const response = await request(app).post("/items").send({ name: "Created" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: "created-1", name: "Created" });
  });

  it("returns 404 for missing resources on get, patch, and delete", async () => {
    const app = createTestApp();

    await request(app).get("/items/missing").expect(404, { code: "NOT_FOUND", message: "Item not found." });
    await request(app).patch("/items/missing").send({ name: "Updated" }).expect(404, { code: "NOT_FOUND", message: "Item not found." });
    await request(app).delete("/items/missing").expect(404, { code: "NOT_FOUND", message: "Item not found." });
  });

  it("maps RequestError instances through the shared error handler", async () => {
    const app = createTestApp({
      create: async () => {
        throw new RequestError(409, "Conflict.\n at service.ts:1:1", {
          code: "ITEM_CONFLICT",
          userFriendlyMessage: "Duplicate item."
        });
      }
    });

    const response = await request(app).post("/items").send({ name: "Alpha" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      code: "ITEM_CONFLICT",
      message: "Conflict.",
      userFriendlyMessage: "Duplicate item."
    });
  });
});
