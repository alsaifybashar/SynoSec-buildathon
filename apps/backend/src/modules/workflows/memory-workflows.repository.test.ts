import { describe, expect, it } from "vitest";
import { MemoryWorkflowsRepository } from "./memory-workflows.repository.js";

describe("MemoryWorkflowsRepository", () => {
  it("stores workflows in the pipeline-oriented shape", async () => {
    const targetsRepository = {
      getById: async () => ({
        id: "10000000-0000-0000-0000-000000000001",
        name: "Demo Target",
        baseUrl: "http://localhost:3000",
        environment: "development",
        status: "active",
        lastScannedAt: null,
        constraintBindings: [],
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      })
    } as any;
    const aiAgentsRepository = {
      getById: async () => ({
      id: "20000000-0000-0000-0000-000000000001",
      name: "Pipeline Agent",
      status: "active",
      description: null,
      providerId: "30000000-0000-0000-0000-000000000001",
      systemPrompt: "Work the target.",
      modelOverride: null,
      toolIds: ["tool:http-recon"],
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:00.000Z"
      })
    } as any;
    const repository = new MemoryWorkflowsRepository(
      targetsRepository,
      aiAgentsRepository
    );

    const created = await repository.create({
      name: "Pipeline Workflow",
      status: "active",
      description: "Runs one transparent pipeline.",
      targetId: "10000000-0000-0000-0000-000000000001",
      agentId: "20000000-0000-0000-0000-000000000001",
      objective: "Collect evidence and stop through system tools.",
      allowedToolIds: ["tool:http-recon"],
      requiredEvidenceTypes: [],
      findingPolicy: {
        taxonomy: "typed-core-v1",
        allowedTypes: ["other"]
      },
      completionRule: {
        requireStageResult: true,
        requireToolCall: false,
        allowEmptyResult: true,
        minFindings: 0
      },
      resultSchemaVersion: 1,
      handoffSchema: null
    });

    expect(created.agentId).toBe("20000000-0000-0000-0000-000000000001");
    expect(created.objective).toContain("Collect evidence");
    expect(created.allowedToolIds).toEqual(["tool:http-recon"]);
    expect(created.stages).toHaveLength(1);
    expect(created.stages[0]?.label).toBe("Pipeline");
  });

  it("creates running workflow runs with an empty event stream", async () => {
    const targetsRepository = {
      getById: async () => ({
        id: "10000000-0000-0000-0000-000000000001",
        name: "Demo Target",
        baseUrl: "http://localhost:3000",
        environment: "development",
        status: "active",
        lastScannedAt: null,
        constraintBindings: [],
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      })
    } as any;
    const aiAgentsRepository = {
      getById: async () => ({
      id: "20000000-0000-0000-0000-000000000001",
      name: "Pipeline Agent",
      status: "active",
      description: null,
      providerId: "30000000-0000-0000-0000-000000000001",
      systemPrompt: "Work the target.",
      modelOverride: null,
      toolIds: [],
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:00.000Z"
      })
    } as any;
    const repository = new MemoryWorkflowsRepository(
      targetsRepository,
      aiAgentsRepository,
      [{
        id: "40000000-0000-0000-0000-000000000001",
        name: "Pipeline Workflow",
        status: "active",
        description: null,
        targetId: "10000000-0000-0000-0000-000000000001",
        agentId: "20000000-0000-0000-0000-000000000001",
        objective: "Collect evidence and stop through system tools.",
        allowedToolIds: [],
        requiredEvidenceTypes: [],
        findingPolicy: {
          taxonomy: "typed-core-v1",
          allowedTypes: ["other"]
        },
        completionRule: {
          requireStageResult: true,
          requireToolCall: false,
          allowEmptyResult: true,
          minFindings: 0
        },
        resultSchemaVersion: 1,
        handoffSchema: null,
        stages: [],
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      }]
    );

    const run = await repository.createRun("40000000-0000-0000-0000-000000000001");

    expect(run?.status).toBe("running");
    expect(run?.currentStepIndex).toBe(0);
    expect(run?.events).toEqual([]);
    expect(run?.trace).toEqual([]);
  });
});
