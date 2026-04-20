import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  aiAgentSchema,
  listAiAgentsResponseSchema,
  type AiAgent,
  type AiProvider,
  type AiTool
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
    id: "7de0a19a-7961-4964-bfd4-5203a3489dd5",
    name: "Primary Anthropic",
    kind: "anthropic",
    status: "active",
    description: null,
    baseUrl: null,
    model: "claude-sonnet-4-5",
    apiKeyConfigured: true,
    apiKey: "secret-key",
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const seedAgents: AiAgent[] = [
  {
    id: "67043e91-4017-47b8-ac3f-81eb19f51538",
    name: "Recon Agent",
    status: "active",
    description: "Primary recon worker",
    providerId: "7de0a19a-7961-4964-bfd4-5203a3489dd5",
    systemPrompt: "Enumerate the target and summarize the result.",
    modelOverride: null,
    toolIds: ["httpx", "katana"],
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const seedTools: AiTool[] = [
  {
    id: "httpx",
    name: "HTTPx",
    status: "active",
    source: "system",
    description: null,
    binary: "httpx",
    scriptPath: "scripts/tools/http-recon.sh",
    capabilities: ["web-recon", "passive"],
    category: "web",
    riskTier: "passive",
    notes: null,
    executionMode: "sandboxed",
    sandboxProfile: "network-recon",
    privilegeProfile: "read-only-network",
    defaultArgs: ["-silent", "-u", "{baseUrl}"],
    timeoutMs: 30000,
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object", properties: {} },
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  },
  {
    id: "katana",
    name: "Katana",
    status: "active",
    source: "system",
    description: null,
    binary: "katana",
    scriptPath: "scripts/tools/web-crawl.sh",
    capabilities: ["web-recon", "content-discovery", "passive"],
    category: "web",
    riskTier: "passive",
    notes: null,
    executionMode: "sandboxed",
    sandboxProfile: "network-recon",
    privilegeProfile: "read-only-network",
    defaultArgs: ["-u", "{baseUrl}", "-silent"],
    timeoutMs: 30000,
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object", properties: {} },
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const applicationsRepository: ApplicationsRepository = {
  list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
  getById: async () => null,
  create: async () => {
    throw new Error("Not implemented in ai agent route tests.");
  },
  update: async () => null,
  remove: async () => false
};

const runtimesRepository: RuntimesRepository = {
  list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
  getById: async () => null,
  create: async () => {
    throw new Error("Not implemented in ai agent route tests.");
  },
  update: async () => null,
  remove: async () => false
};

function createTestApp() {
  const aiProvidersRepository = new MemoryAiProvidersRepository(seedProviders.map((provider) => ({ ...provider })));
  const aiToolsRepository = new MemoryAiToolsRepository(seedTools.map((tool) => ({ ...tool })));
  const aiAgentsRepository = new MemoryAiAgentsRepository(
    aiProvidersRepository,
    aiToolsRepository,
    seedAgents.map((agent) => ({ ...agent }))
  );

  return createApp({
    applicationsRepository,
    runtimesRepository,
    aiProvidersRepository,
    aiAgentsRepository,
    aiToolsRepository,
    workflowsRepository: new MemoryWorkflowsRepository(applicationsRepository, runtimesRepository, aiAgentsRepository)
  });
}

describe("ai agent routes", () => {
  it("lists seeded agents", async () => {
    const response = await request(createTestApp()).get("/api/ai-agents");
    const parsed = listAiAgentsResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed["agents"]).toHaveLength(1);
    expect(parsed["agents"]?.[0]?.name).toBe("Recon Agent");
  });

  it("returns a single agent", async () => {
    const response = await request(createTestApp()).get("/api/ai-agents/67043e91-4017-47b8-ac3f-81eb19f51538");

    expect(response.status).toBe(200);
    expect(aiAgentSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.toolIds).toEqual(["httpx", "katana"]);
  });

  it("creates an agent", async () => {
    const response = await request(createTestApp()).post("/api/ai-agents").send({
      name: "Triage Agent",
      status: "draft",
      description: "Reviews findings",
      providerId: "7de0a19a-7961-4964-bfd4-5203a3489dd5",
      systemPrompt: "Review findings and prioritize issues.",
      modelOverride: "claude-3-7-sonnet-latest",
      toolIds: ["httpx"]
    });

    expect(response.status).toBe(201);
    expect(aiAgentSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.providerId).toBe("7de0a19a-7961-4964-bfd4-5203a3489dd5");
  });

  it("updates an agent", async () => {
    const response = await request(createTestApp())
      .patch("/api/ai-agents/67043e91-4017-47b8-ac3f-81eb19f51538")
      .send({
        status: "archived",
        toolIds: ["httpx"]
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("archived");
    expect(response.body.toolIds).toEqual(["httpx"]);
  });

  it("rejects missing provider references", async () => {
    const response = await request(createTestApp()).post("/api/ai-agents").send({
      name: "Broken Agent",
      status: "draft",
      description: "",
      providerId: "11111111-1111-1111-1111-111111111111",
      systemPrompt: "Broken",
      modelOverride: "",
      toolIds: ["httpx"]
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("AI provider not found.");
  });
});
