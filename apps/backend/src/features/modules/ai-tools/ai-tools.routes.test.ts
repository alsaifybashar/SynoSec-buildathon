import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  aiToolSchema,
  listAiToolsResponseSchema,
  type AiTool
} from "@synosec/contracts";
import { createApp } from "../../../platform/app/create-app.js";
import type { ApplicationsRepository } from "../applications/applications.repository.js";
import type { RuntimesRepository } from "../runtimes/runtimes.repository.js";
import { MemoryAiProvidersRepository } from "../ai-providers/memory-ai-providers.repository.js";
import { MemoryAiAgentsRepository } from "../ai-agents/memory-ai-agents.repository.js";
import { MemoryAiToolsRepository } from "../ai-tools/memory-ai-tools.repository.js";

const seedCustomTools: AiTool[] = [
  {
    id: "custom-browser-tool",
    name: "Browser MCP",
    status: "active",
    source: "custom",
    description: "Internal browser automation bridge",
    adapter: "external_tool",
    binary: null,
    category: "utility",
    riskTier: "passive",
    notes: "Wraps an MCP bridge",
    inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    outputSchema: { type: "object", properties: { html: { type: "string" } } },
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const applicationsRepository: ApplicationsRepository = {
  list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
  getById: async () => null,
  create: async () => {
    throw new Error("Not implemented in ai tool route tests.");
  },
  update: async () => null,
  remove: async () => false
};

const runtimesRepository: RuntimesRepository = {
  list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
  getById: async () => null,
  create: async () => {
    throw new Error("Not implemented in ai tool route tests.");
  },
  update: async () => null,
  remove: async () => false
};

function createTestApp() {
  const aiProvidersRepository = new MemoryAiProvidersRepository();
  const aiToolsRepository = new MemoryAiToolsRepository(seedCustomTools.map((tool) => ({ ...tool })));

  return createApp({
    applicationsRepository,
    runtimesRepository,
    aiProvidersRepository,
    aiAgentsRepository: new MemoryAiAgentsRepository(aiProvidersRepository, aiToolsRepository),
    aiToolsRepository
  });
}

describe("ai tool routes", () => {
  it("lists configured tools", async () => {
    const response = await request(createTestApp()).get("/api/ai-tools");
    const parsed = listAiToolsResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed["tools"]).toHaveLength(1);
    expect(parsed["tools"]?.some((tool) => tool.id === "custom-browser-tool")).toBe(true);
  });

  it("returns a single custom tool", async () => {
    const response = await request(createTestApp()).get("/api/ai-tools/custom-browser-tool");

    expect(response.status).toBe(200);
    expect(aiToolSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.name).toBe("Browser MCP");
  });

  it("creates a custom tool", async () => {
    const response = await request(createTestApp()).post("/api/ai-tools").send({
      name: "Webhook Tool",
      status: "active",
      source: "custom",
      description: "Calls an internal webhook",
      adapter: "external_tool",
      binary: "",
      category: "utility",
      riskTier: "passive",
      notes: "",
      inputSchema: { type: "object", properties: { payload: { type: "string" } } },
      outputSchema: { type: "object", properties: { ok: { type: "boolean" } } }
    });

    expect(response.status).toBe(201);
    expect(aiToolSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.source).toBe("custom");
  });

  it("updates a custom tool", async () => {
    const response = await request(createTestApp()).patch("/api/ai-tools/custom-browser-tool").send({
      notes: "Updated notes"
    });

    expect(response.status).toBe(200);
    expect(response.body.notes).toBe("Updated notes");
  });

  it("deletes a configured tool", async () => {
    const response = await request(createTestApp()).delete("/api/ai-tools/custom-browser-tool");
    expect(response.status).toBe(204);
  });
});
