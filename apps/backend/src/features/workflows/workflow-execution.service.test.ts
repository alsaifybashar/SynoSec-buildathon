import { describe, expect, it } from "vitest";
import { WorkflowExecutionService } from "./workflow-execution.service.js";
import { WorkflowRunStream } from "./workflow-run-stream.js";

function createService(overrides: {
  workflow?: Record<string, unknown> | null;
  agent?: Record<string, unknown> | null;
  provider?: Record<string, unknown> | null;
} = {}) {
  const workflow = overrides.workflow ?? {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Pipeline Workflow",
    status: "active",
    description: null,
    applicationId: "20000000-0000-0000-0000-000000000001",
    runtimeId: null,
    agentId: "30000000-0000-0000-0000-000000000001",
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
  };
  const agent = overrides.agent ?? {
    id: "30000000-0000-0000-0000-000000000001",
    name: "Pipeline Agent",
    status: "active",
    description: null,
    providerId: "40000000-0000-0000-0000-000000000001",
    systemPrompt: "Work the target.",
    modelOverride: null,
    toolIds: [],
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z"
  };
  const provider = overrides.provider ?? {
    id: "40000000-0000-0000-0000-000000000001",
    name: "Anthropic",
    kind: "anthropic",
    status: "active",
    description: null,
    baseUrl: null,
    model: "claude-sonnet-4-20250514",
    apiKey: "test-key",
    apiKeyConfigured: true,
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z"
  };
  const createdRuns: Array<Record<string, unknown>> = [];

  const service = new WorkflowExecutionService(
    {
      list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
      getById: async () => workflow as any,
      create: async () => workflow as any,
      update: async () => workflow as any,
      remove: async () => true,
      migrateWorkflowStageContracts: async () => workflow as any,
      createRun: async (workflowId: string) => {
        const run = {
          id: "50000000-0000-0000-0000-000000000001",
          workflowId,
          status: "running",
          currentStepIndex: 0,
          startedAt: "2026-04-24T10:00:00.000Z",
          completedAt: null,
          trace: [],
          events: []
        };
        createdRuns.push(run);
        return run as any;
      },
      getRunById: async () => createdRuns[0] as any,
      getLatestRunByWorkflowId: async () => createdRuns[0] as any,
      appendRunEvent: async (_runId, event, patch = {}) => ({
        ...(createdRuns[0] as any),
        ...patch,
        events: [...(((createdRuns[0] as any)?.events ?? [])), event]
      }),
      updateRunState: async (_runId, patch) => ({
        ...(createdRuns[0] as any),
        ...patch
      }),
      updateRun: async (run) => run as any
    },
    {
      getById: async () => ({
        id: "20000000-0000-0000-0000-000000000001",
        name: "Demo App",
        baseUrl: "http://localhost:3000",
        environment: "development",
        status: "active",
        lastScannedAt: null,
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      }),
      list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
      create: async () => { throw new Error("not implemented"); },
      update: async () => { throw new Error("not implemented"); },
      remove: async () => false
    } as any,
    {
      getById: async () => null
    } as any,
    {
      getById: async () => agent as any
    } as any,
    {
      getStoredById: async () => provider as any
    } as any,
    {
      getById: async () => null
    } as any,
    new WorkflowRunStream()
  );

  return { service };
}

describe("WorkflowExecutionService", () => {
  it("does not allow manual stepping for pipeline runs", async () => {
    const { service } = createService();

    await expect(service.stepRun("50000000-0000-0000-0000-000000000001")).rejects.toMatchObject({
      message: "Pipeline runs advance automatically after start."
    });
  });

  it("rejects non-anthropic providers", async () => {
    const { service } = createService({
      provider: {
        id: "40000000-0000-0000-0000-000000000001",
        name: "Local",
        kind: "local",
        status: "active",
        description: null,
        baseUrl: "http://localhost:11434",
        model: "qwen",
        apiKey: null,
        apiKeyConfigured: false,
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      }
    });

    await expect(service.startRun("10000000-0000-0000-0000-000000000001")).rejects.toMatchObject({
      message: "Workflow pipeline execution requires an Anthropic provider."
    });
  });
});
