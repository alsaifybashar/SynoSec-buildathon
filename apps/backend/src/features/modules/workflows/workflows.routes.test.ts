import http from "node:http";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  listWorkflowsResponseSchema,
  workflowRunSchema,
  workflowRunStreamMessageSchema,
  workflowSchema,
  type AiAgent,
  type AiProvider,
  type AiTool,
  type Application,
  type Runtime,
  type Workflow
} from "@synosec/contracts";
import { createApp } from "../../../platform/app/create-app.js";
import type { ApplicationsRepository } from "../applications/applications.repository.js";
import type { RuntimesRepository } from "../runtimes/runtimes.repository.js";
import { MemoryAiProvidersRepository } from "../ai-providers/memory-ai-providers.repository.js";
import { MemoryAiToolsRepository } from "../ai-tools/memory-ai-tools.repository.js";
import { MemoryAiAgentsRepository } from "../ai-agents/memory-ai-agents.repository.js";
import { MemoryWorkflowsRepository } from "./memory-workflows.repository.js";

const seedApplications: Application[] = [
  {
    id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
    name: "Local Vulnerable Target",
    baseUrl: "http://127.0.0.1:3000",
    environment: "development",
    status: "active",
    lastScannedAt: "2026-04-12T12:00:00.000Z",
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const seedRuntimes: Runtime[] = [
  {
    id: "6fd90dd7-6f27-47d0-ab24-6328bb2f3624",
    name: "Vulnerable Target Container",
    serviceType: "api",
    provider: "docker",
    environment: "development",
    region: "local-docker",
    status: "healthy",
    applicationId: seedApplications[0]?.id ?? "",
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const seedProviders: Array<AiProvider & { apiKey: string | null }> = [
  {
    id: "6fb18f09-f230-49df-b0ab-4f1bcedd230c",
    name: "Local",
    kind: "local",
    status: "active",
    description: "Local workflow provider",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3:1.7b",
    apiKeyConfigured: false,
    apiKey: null,
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const seedTools: AiTool[] = [
  {
    id: "seed-http-recon",
    name: "HTTP Recon",
    status: "active",
    source: "custom",
    description: "HTTP reconnaissance",
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
  }
];

const seedAgents: AiAgent[] = [
  {
    id: "fa1a0bfa-6b02-4948-8e1c-155f6b9a4ae7",
    name: "Local Orchestrator",
    status: "active",
    description: "Local orchestration agent",
    providerId: seedProviders[0]?.id ?? "",
    systemPrompt: "Coordinate the next best recon step.",
    modelOverride: null,
    toolIds: ["seed-http-recon"],
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const seedWorkflows: Workflow[] = [
  {
    id: "2a3761a0-c424-4634-83ad-5145fbd2697c",
    name: "Local Vulnerable App Walkthrough",
    status: "active",
    description: "Seeded local workflow",
    applicationId: seedApplications[0]?.id ?? "",
    runtimeId: seedRuntimes[0]?.id ?? null,
    stages: [
      {
        id: "ca089560-77ef-4b36-97f0-1d4d83cd3e2e",
        label: "Initial Recon",
        agentId: seedAgents[0]?.id ?? "",
        ord: 0
      }
    ],
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

const applicationsRepository: ApplicationsRepository = {
  list: async () => ({ items: seedApplications.map((application) => ({ ...application })), page: 1, pageSize: 25, total: 1, totalPages: 1 }),
  getById: async (id) => seedApplications.find((application) => application.id === id) ?? null,
  create: async () => {
    throw new Error("Not implemented in workflow route tests.");
  },
  update: async () => null,
  remove: async () => false
};

const runtimesRepository: RuntimesRepository = {
  list: async () => ({ items: seedRuntimes.map((runtime) => ({ ...runtime })), page: 1, pageSize: 25, total: 1, totalPages: 1 }),
  getById: async (id) => seedRuntimes.find((runtime) => runtime.id === id) ?? null,
  create: async () => {
    throw new Error("Not implemented in workflow route tests.");
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
  const workflowsRepository = new MemoryWorkflowsRepository(
    applicationsRepository,
    runtimesRepository,
    aiAgentsRepository,
    seedWorkflows.map((workflow) => ({ ...workflow }))
  );

  return createApp({
    applicationsRepository,
    runtimesRepository,
    aiProvidersRepository,
    aiAgentsRepository,
    aiToolsRepository,
    workflowsRepository
  });
}

describe("workflow routes", () => {
  it("lists seeded workflows", async () => {
    const response = await request(createTestApp()).get("/api/workflows");
    const parsed = listWorkflowsResponseSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(parsed["workflows"]).toHaveLength(1);
    expect(parsed["workflows"]?.[0]?.name).toBe("Local Vulnerable App Walkthrough");
  });

  it("returns a workflow detail", async () => {
    const response = await request(createTestApp()).get("/api/workflows/2a3761a0-c424-4634-83ad-5145fbd2697c");

    expect(response.status).toBe(200);
    expect(workflowSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.stages).toHaveLength(1);
  });

  it("creates a workflow", async () => {
    const response = await request(createTestApp()).post("/api/workflows").send({
      name: "Fresh Workflow",
      status: "draft",
      description: "Created in route test",
      applicationId: seedApplications[0]?.id,
      runtimeId: seedRuntimes[0]?.id,
      stages: [
        {
          label: "Review",
          agentId: seedAgents[0]?.id
        }
      ]
    });

    expect(response.status).toBe(201);
    expect(workflowSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.stages[0]?.label).toBe("Review");
  });

  it("starts a workflow run", async () => {
    const response = await request(createTestApp()).post("/api/workflows/2a3761a0-c424-4634-83ad-5145fbd2697c/runs");

    expect(response.status).toBe(201);
    expect(workflowRunSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.status).toBe("running");
  });

  it("returns the latest persisted workflow run", async () => {
    const app = createTestApp();
    const started = await request(app).post("/api/workflows/2a3761a0-c424-4634-83ad-5145fbd2697c/runs");
    const response = await request(app).get("/api/workflows/2a3761a0-c424-4634-83ad-5145fbd2697c/runs/latest");

    expect(started.status).toBe(201);
    expect(response.status).toBe(200);
    expect(workflowRunSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.id).toBe(started.body.id);
  });

  it("streams a workflow run snapshot over SSE", async () => {
    const app = createTestApp();
    const started = await request(app).post("/api/workflows/2a3761a0-c424-4634-83ad-5145fbd2697c/runs");
    const server = http.createServer(app);

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));

    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to resolve test server address.");
      }

      const controller = new AbortController();
      const response = await fetch(`http://127.0.0.1:${address.port}/api/workflow-runs/${started.body.id}/events`, {
        signal: controller.signal
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      const firstChunk = await reader?.read();
      const payload = new TextDecoder().decode(firstChunk?.value ?? new Uint8Array());
      const messageLine = payload
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice("data: ".length);

      expect(messageLine).toBeDefined();
      expect(workflowRunStreamMessageSchema.safeParse(JSON.parse(messageLine ?? "{}")).success).toBe(true);

      controller.abort();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
