import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  aiProviderSchema,
  listAiProvidersResponseSchema,
  type AiProvider
} from "@synosec/contracts";
import { createApp } from "../../../platform/app/create-app.js";
import type { ApplicationsRepository } from "../applications/applications.repository.js";
import type { RuntimesRepository } from "../runtimes/runtimes.repository.js";
import { MemoryAiProvidersRepository } from "../ai-providers/memory-ai-providers.repository.js";
import { MemoryAiToolsRepository } from "../ai-tools/memory-ai-tools.repository.js";
import { MemoryAiAgentsRepository } from "../ai-agents/memory-ai-agents.repository.js";
import { MemoryWorkflowsRepository } from "../workflows/memory-workflows.repository.js";

const seedProviders: Array<AiProvider & { apiKey: string | null }> = [
  {
    id: "2ef12df8-fdf6-4ef0-89ce-01d34b4f3af7",
    name: "Primary Anthropic",
    kind: "anthropic",
    status: "active",
    description: "Default cloud provider",
    baseUrl: null,
    model: "claude-sonnet-4-5",
    apiKeyConfigured: true,
    apiKey: "secret-key",
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const applicationsRepository: ApplicationsRepository = {
  list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
  getById: async () => null,
  create: async () => {
    throw new Error("Not implemented in ai provider route tests.");
  },
  update: async () => null,
  remove: async () => false
};

const runtimesRepository: RuntimesRepository = {
  list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
  getById: async () => null,
  create: async () => {
    throw new Error("Not implemented in ai provider route tests.");
  },
  update: async () => null,
  remove: async () => false
};

function createTestApp() {
  const aiProvidersRepository = new MemoryAiProvidersRepository(seedProviders.map((provider) => ({ ...provider })));
  const aiToolsRepository = new MemoryAiToolsRepository();

  return createApp({
    applicationsRepository,
    runtimesRepository,
    aiProvidersRepository,
    aiAgentsRepository: new MemoryAiAgentsRepository(aiProvidersRepository, aiToolsRepository),
    aiToolsRepository,
    workflowsRepository: new MemoryWorkflowsRepository(applicationsRepository, runtimesRepository, new MemoryAiAgentsRepository(aiProvidersRepository, aiToolsRepository))
  });
}

describe("ai provider routes", () => {
  it("lists seeded providers without exposing secrets", async () => {
    const response = await request(createTestApp()).get("/api/ai-providers");
    const parsed = listAiProvidersResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed["providers"]).toHaveLength(1);
    expect(parsed["providers"]?.[0]?.name).toBe("Primary Anthropic");
    expect(parsed["providers"]?.[0]).not.toHaveProperty("apiKey");
  });

  it("returns a single provider", async () => {
    const response = await request(createTestApp()).get("/api/ai-providers/2ef12df8-fdf6-4ef0-89ce-01d34b4f3af7");

    expect(response.status).toBe(200);
    expect(aiProviderSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.apiKeyConfigured).toBe(true);
    expect(response.body).not.toHaveProperty("apiKey");
  });

  it("creates a provider", async () => {
    const response = await request(createTestApp()).post("/api/ai-providers").send({
      name: "Local Llama",
      kind: "local",
      status: "active",
      description: "Lab model",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3.1:8b"
    });

    expect(response.status).toBe(201);
    expect(aiProviderSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.kind).toBe("local");
    expect(response.body.apiKeyConfigured).toBe(false);
    expect(response.body).not.toHaveProperty("apiKey");
  });

  it("updates a provider without leaking the secret", async () => {
    const response = await request(createTestApp())
      .patch("/api/ai-providers/2ef12df8-fdf6-4ef0-89ce-01d34b4f3af7")
      .send({
        model: "claude-3-7-sonnet-latest"
      });

    expect(response.status).toBe(200);
    expect(response.body.model).toBe("claude-3-7-sonnet-latest");
    expect(response.body.apiKeyConfigured).toBe(true);
    expect(response.body).not.toHaveProperty("apiKey");
  });

  it("deletes a provider", async () => {
    const response = await request(createTestApp()).delete("/api/ai-providers/2ef12df8-fdf6-4ef0-89ce-01d34b4f3af7");
    expect(response.status).toBe(204);
  });
});
