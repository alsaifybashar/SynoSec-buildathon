import { describe, expect, it } from "vitest";
import type {
  AiAgent,
  Application,
  Runtime,
  WorkflowRun
} from "@synosec/contracts";
import { MemoryWorkflowsRepository } from "./memory-workflows.repository.js";

const application: Application = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "App",
  baseUrl: "https://app.test",
  environment: "development",
  status: "active",
  lastScannedAt: null,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const runtime: Runtime = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Runtime",
  serviceType: "api",
  provider: "docker",
  environment: "development",
  region: "eu-north-1",
  status: "healthy",
  applicationId: application.id,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const agent: AiAgent = {
  id: "33333333-3333-3333-3333-333333333333",
  name: "Agent",
  status: "active",
  description: "Workflow agent",
  providerId: "77777777-7777-7777-7777-777777777777",
  systemPrompt: "Test agent",
  modelOverride: null,
  toolIds: [],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

function createRepository(seedRuns: WorkflowRun[] = []) {
  return new MemoryWorkflowsRepository(
    {
      list: async () => ({ items: [application], page: 1, pageSize: 10, total: 1, totalPages: 1 }),
      getById: async (id) => (id === application.id ? application : null),
      create: async () => application,
      update: async () => application,
      remove: async () => true
    },
    {
      list: async () => ({ items: [runtime], page: 1, pageSize: 10, total: 1, totalPages: 1 }),
      getById: async (id) => (id === runtime.id ? runtime : null),
      create: async () => runtime,
      update: async () => runtime,
      remove: async () => true
    },
    {
      list: async () => ({ items: [agent], page: 1, pageSize: 10, total: 1, totalPages: 1 }),
      getById: async (id) => (id === agent.id ? agent : null),
      create: async () => agent,
      update: async () => agent,
      remove: async () => true
    },
    [],
    seedRuns
  );
}

describe("MemoryWorkflowsRepository", () => {
  it("creates workflows with normalized stage contracts and ordinal positions", async () => {
    const repository = createRepository();

    const workflow = await repository.create({
      name: "Workflow",
      status: "draft",
      description: null,
      applicationId: application.id,
      runtimeId: runtime.id,
      stages: [
        {
          label: "Recon",
          agentId: agent.id,
          objective: "   ",
          allowedToolIds: ["tool-a", "tool-a", ""],
          requiredEvidenceTypes: ["http", "http", ""],
          findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
          completionRule: {
            requireStageResult: true,
            requireToolCall: false,
            allowEmptyResult: true,
            minFindings: 0
          },
          resultSchemaVersion: 0,
          handoffSchema: null
        },
        {
          label: "Validate",
          agentId: agent.id,
          objective: "Validate findings",
          allowedToolIds: [],
          requiredEvidenceTypes: [],
          findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
          completionRule: {
            requireStageResult: true,
            requireToolCall: false,
            allowEmptyResult: true,
            minFindings: 0
          },
          resultSchemaVersion: 1,
          handoffSchema: null
        }
      ]
    });

    expect(workflow.stages.map((stage) => stage.ord)).toEqual([0, 1]);
    expect(workflow.stages[0]).toMatchObject({
      objective: "Complete the Recon stage using allowed tools and structured reporting.",
      allowedToolIds: ["tool-a"],
      requiredEvidenceTypes: ["http"],
      resultSchemaVersion: 1
    });
  });

  it("rejects missing referenced records", async () => {
    const repository = createRepository();

    await expect(repository.create({
      name: "Workflow",
      status: "draft",
      description: null,
      applicationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      runtimeId: runtime.id,
      stages: [{
        label: "Recon",
        agentId: agent.id,
        objective: "Objective",
        allowedToolIds: [],
        requiredEvidenceTypes: [],
        findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
        completionRule: {
          requireStageResult: true,
          requireToolCall: false,
          allowEmptyResult: true,
          minFindings: 0
        },
        resultSchemaVersion: 1,
        handoffSchema: null
      }]
    })).rejects.toMatchObject({
      status: 400,
      message: "Application not found."
    });
  });

  it("returns the latest run for a workflow", async () => {
    const repository = createRepository([
      {
        id: "44444444-4444-4444-4444-444444444444",
        workflowId: "55555555-5555-5555-5555-555555555555",
        status: "completed",
        currentStepIndex: 0,
        startedAt: "2026-04-20T00:00:00.000Z",
        completedAt: "2026-04-20T00:01:00.000Z",
        trace: [],
        events: []
      },
      {
        id: "66666666-6666-6666-6666-666666666666",
        workflowId: "55555555-5555-5555-5555-555555555555",
        status: "running",
        currentStepIndex: 1,
        startedAt: "2026-04-21T00:00:00.000Z",
        completedAt: null,
        trace: [],
        events: []
      }
    ]);

    const latest = await repository.getLatestRunByWorkflowId("55555555-5555-5555-5555-555555555555");

    expect(latest?.id).toBe("66666666-6666-6666-6666-666666666666");
  });
});
