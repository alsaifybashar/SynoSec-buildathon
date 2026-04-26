import { defaultWorkflowStageSystemPrompt, defaultWorkflowTaskPromptTemplate } from "@synosec/contracts";
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
      systemPrompt: "Work the target.",
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
      agentId: "20000000-0000-0000-0000-000000000001",
      objective: "Collect evidence and stop through system tools.",
      stageSystemPrompt: defaultWorkflowStageSystemPrompt,
      taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
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
      systemPrompt: "Work the target.",
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
        agentId: "20000000-0000-0000-0000-000000000001",
        objective: "Collect evidence and stop through system tools.",
        stageSystemPrompt: defaultWorkflowStageSystemPrompt,
        taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
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

    const launch = await repository.createLaunch("40000000-0000-0000-0000-000000000001");
    const run = await repository.createRun(
      "40000000-0000-0000-0000-000000000001",
      launch!.id,
      "10000000-0000-0000-0000-000000000001"
    );

    expect(run?.status).toBe("running");
    expect(run?.currentStepIndex).toBe(0);
    expect(run?.events).toEqual([]);
    expect(run?.trace).toEqual([]);
  });

  it("fails loudly when a workflow event is appended out of order", async () => {
    const repository = new MemoryWorkflowsRepository({ getById: async () => null } as any, { getById: async () => null } as any, [], [{
      id: "10000000-0000-0000-0000-000000000001",
      workflowId: "20000000-0000-0000-0000-000000000001",
      workflowLaunchId: "30000000-0000-0000-0000-000000000001",
      targetId: "40000000-0000-0000-0000-000000000001",
      executionKind: "workflow",
      status: "running",
      currentStepIndex: 0,
      startedAt: "2026-04-24T10:00:00.000Z",
      completedAt: null,
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: []
    }]);

    await expect(repository.appendRunEvent("10000000-0000-0000-0000-000000000001", {
      id: "50000000-0000-0000-0000-000000000001",
      workflowRunId: "10000000-0000-0000-0000-000000000001",
      workflowId: "20000000-0000-0000-0000-000000000001",
      workflowStageId: null,
      stepIndex: 0,
      ord: 2,
      type: "text",
      status: "completed",
      title: "Bad event",
      summary: "Out of order.",
      detail: null,
      payload: {},
      createdAt: "2026-04-24T10:00:01.000Z"
    })).rejects.toThrow(/out of sequence/i);
  });

  it("does not mark a launch completed when a child run lacks a terminal run_completed event", async () => {
    const targetsRepository = {
      getById: async () => ({
        id: "50000000-0000-0000-0000-000000000001",
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
    const aiAgentsRepository = { getById: async () => null } as any;
    const repository = new MemoryWorkflowsRepository(
      targetsRepository,
      aiAgentsRepository,
      [{
        id: "20000000-0000-0000-0000-000000000001",
        name: "Pipeline Workflow",
        status: "active",
        description: null,
        agentId: "30000000-0000-0000-0000-000000000001",
        objective: "Collect evidence and stop through system tools.",
        stageSystemPrompt: defaultWorkflowStageSystemPrompt,
        taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
        allowedToolIds: [],
        requiredEvidenceTypes: [],
        findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
        completionRule: { requireStageResult: true, requireToolCall: false, allowEmptyResult: true, minFindings: 0 },
        resultSchemaVersion: 1,
        handoffSchema: null,
        stages: [],
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      }]
    );
    const launch = await repository.createLaunch("20000000-0000-0000-0000-000000000001");
    const run = await repository.createRun(
      "20000000-0000-0000-0000-000000000001",
      launch!.id,
      "50000000-0000-0000-0000-000000000001"
    );
    await repository.updateRun({
      ...run!,
      status: "completed",
      completedAt: "2026-04-24T10:01:00.000Z",
      events: [{
        id: "60000000-0000-0000-0000-000000000001",
        workflowRunId: run!.id,
        workflowId: "20000000-0000-0000-0000-000000000001",
        workflowStageId: null,
        stepIndex: 0,
        ord: 0,
        type: "stage_completed",
        status: "completed",
        title: "Stage completed",
        summary: "Done.",
        detail: null,
        payload: {},
        createdAt: "2026-04-24T10:01:00.000Z"
      }]
    });

    const hydratedLaunch = await repository.getLaunchById(launch!.id);
    expect(hydratedLaunch?.status).not.toBe("completed");
  });
});
