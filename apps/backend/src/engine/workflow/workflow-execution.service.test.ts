import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workflow, WorkflowRun, WorkflowTraceEvent } from "@synosec/contracts";
import { WorkflowExecutionService } from "./workflow-execution.service.js";
import { WorkflowRunStream } from "./workflow-run-stream.js";

const { streamTextMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn()
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: streamTextMock
  };
});

vi.mock("@/engine/scans/index.js", () => ({
  createScan: vi.fn(async () => undefined),
  getEnvironmentGraphForScan: vi.fn(async () => null),
  getScan: vi.fn(async () => null)
}));

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  const stage = {
    id: "70000000-0000-0000-0000-000000000001",
    label: "Pipeline",
    agentId: "30000000-0000-0000-0000-000000000001",
    ord: 0,
    objective: "Collect evidence and stop through system tools.",
    allowedToolIds: [],
    requiredEvidenceTypes: [],
    findingPolicy: { taxonomy: "typed-core-v1" as const, allowedTypes: ["other" as const] },
    completionRule: {
      requireStageResult: true,
      requireToolCall: false,
      allowEmptyResult: true,
      minFindings: 0
    },
    resultSchemaVersion: 1,
    handoffSchema: null
  };

  return {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Pipeline Workflow",
    status: "active",
    executionKind: "workflow",
    description: null,
    targetId: "20000000-0000-0000-0000-000000000001",
    agentId: stage.agentId,
    objective: stage.objective,
    allowedToolIds: stage.allowedToolIds,
    requiredEvidenceTypes: stage.requiredEvidenceTypes,
    findingPolicy: stage.findingPolicy,
    completionRule: stage.completionRule,
    resultSchemaVersion: 1,
    handoffSchema: null,
    stages: [stage],
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z",
    ...overrides
  };
}

function createService(overrides: {
  workflow?: Workflow | null;
  agentsById?: Record<string, Record<string, unknown>>;
  provider?: Record<string, unknown> | null;
  workflowRunStream?: WorkflowRunStream;
  orchestrator?: Record<string, unknown>;
  aiToolById?: Record<string, Record<string, unknown>>;
} = {}) {
  const workflow = overrides.workflow ?? makeWorkflow();
  const agentsById = overrides.agentsById ?? {
    "30000000-0000-0000-0000-000000000001": {
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
    }
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
  const workflowRunStream = overrides.workflowRunStream ?? new WorkflowRunStream();
  const createdRuns: WorkflowRun[] = [];
  const executionReportsService = {
    createForWorkflowRun: vi.fn(async () => undefined)
  };

  const service = new WorkflowExecutionService({
    workflowsRepository: {
      list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
      getById: async () => workflow as any,
      create: async () => workflow as any,
      update: async () => workflow as any,
      remove: async () => true,
      migrateWorkflowStageContracts: async () => workflow as any,
      createRun: async (workflowId: string) => {
        const run: WorkflowRun = {
          id: "50000000-0000-0000-0000-000000000001",
          workflowId,
          executionKind: workflow?.executionKind,
          status: "running",
          currentStepIndex: 0,
          startedAt: "2026-04-24T10:00:00.000Z",
          completedAt: null,
          trace: [],
          events: []
        };
        createdRuns[0] = run;
        return run;
      },
      getRunById: async () => createdRuns[0] ?? null,
      getLatestRunByWorkflowId: async () => createdRuns[0] ?? null,
      appendRunEvent: async (_runId: string, event: WorkflowTraceEvent, patch: Partial<WorkflowRun> = {}) => {
        const current = createdRuns[0]!;
        const updated: WorkflowRun = {
          ...current,
          ...patch,
          trace: current.trace.slice(),
          events: [...current.events, event]
        };
        createdRuns[0] = updated;
        return updated;
      },
      updateRunState: async (_runId: string, patch: Partial<WorkflowRun>) => {
        const current = createdRuns[0]!;
        const updated: WorkflowRun = {
          ...current,
          ...patch,
          trace: current.trace.slice(),
          events: current.events.slice()
        };
        createdRuns[0] = updated;
        return updated;
      },
      updateRun: async (run: WorkflowRun) => run
    },
    targetsRepository: {
      getById: async () => ({
        id: "20000000-0000-0000-0000-000000000001",
        name: "Demo Target",
        kind: "url",
        status: "active",
        baseUrl: "http://localhost:3000",
        hostname: "localhost",
        ipAddress: "127.0.0.1",
        cidr: null,
        provider: "local",
        ownershipStatus: "verified",
        metadata: null,
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      }),
      list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
      create: async () => { throw new Error("not implemented"); },
      update: async () => { throw new Error("not implemented"); },
      remove: async () => false
    } as any,
    aiAgentsRepository: {
      getById: async (id: string) => agentsById[id] ?? null
    } as any,
    aiProvidersRepository: {
      getStoredById: async () => provider as any
    } as any,
    aiToolsRepository: {
      getById: async (id: string) => overrides.aiToolById?.[id] ?? null
    } as any,
    workflowRunStream,
    orchestratorExecutionEngine: (overrides.orchestrator ?? {}) as any,
    executionReportsService: executionReportsService as any
  });

  return { service, createdRuns, workflowRunStream, executionReportsService };
}

describe("WorkflowExecutionService", () => {
  beforeEach(() => {
    streamTextMock.mockReset();
  });

  it("does not allow manual stepping for pipeline runs", async () => {
    const { service } = createService();

    await expect(service.stepRun("50000000-0000-0000-0000-000000000001")).rejects.toMatchObject({
      message: "Pipeline runs advance automatically after start."
    });
  });

  it("fails loudly before run creation when a workflow stage provider is unsupported", async () => {
    const { service, createdRuns } = createService({
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
    expect(createdRuns).toHaveLength(0);
  });

  it("dispatches attack-map workflows through the attack-map handler and preserves tool activity ordering", async () => {
    const workflow = makeWorkflow({
      executionKind: "attack-map",
      name: "Attack Map Workflow"
    });
    const { service, createdRuns, executionReportsService } = createService({
      workflow,
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
      },
      orchestrator: {
        runRecon: async () => ({
          openPorts: [{ port: 80, protocol: "tcp", service: "http", version: "Apache" }],
          technologies: ["Apache"],
          httpHeaders: { Server: "Apache" },
          serverInfo: { webServer: "Apache" },
          interestingPaths: [],
          probes: [
            {
              toolName: "cURL",
              command: "curl -sI http://localhost:3000",
              output: "HTTP/1.1 200 OK",
              status: "completed"
            }
          ],
          rawNmap: "80/tcp open http Apache",
          rawCurl: "HTTP/1.1 200 OK"
        }),
        createPlan: async () => ({
          phases: [],
          overallRisk: "low" as const,
          summary: "Attack plan generated."
        }),
        executePhase: async () => ({
          findings: [],
          probeCommand: "",
          probeOutput: "",
          toolAttempts: []
        }),
        deepDiveFinding: async () => [],
        correlateAttackChains: async () => []
      }
    });

    const run = await service.startRun(workflow.id);
    expect(run.executionKind).toBe("attack-map");

    await vi.waitFor(() => {
      expect(createdRuns[0]?.events.some((event) => event.title === "Recon completed")).toBe(true);
    });

    const events = createdRuns[0]!.events;
    const toolResultIndex = events.findIndex((event) => event.type === "tool_result" && event.payload?.["toolName"] === "cURL");
    const reconSummaryIndex = events.findIndex((event) => event.title === "Recon completed");
    expect(toolResultIndex).toBeGreaterThan(-1);
    expect(reconSummaryIndex).toBeGreaterThan(toolResultIndex);
    expect(executionReportsService.createForWorkflowRun).toHaveBeenCalledWith(createdRuns[0]!.id);
  });

  it("executes workflow stages in order and stops when a later stage fails", async () => {
    streamTextMock
      .mockImplementationOnce((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
        fullStream: (async function* () {
          await options.tools.log_progress.execute({ message: "Recon in progress." });
          await options.tools.complete_run.execute({
            summary: "Stage one complete.",
            recommendedNextStep: "Move to validation.",
            residualRisk: "Residual risk remains manageable."
          });
          yield {
            type: "finish",
            finishReason: "stop",
            rawFinishReason: "end_turn",
            totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
          };
        })()
      }))
      .mockImplementationOnce((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
        fullStream: (async function* () {
          await options.tools.fail_run.execute({
            reason: "Validation could not confirm the expected behavior.",
            summary: "Stage two failed."
          });
          yield {
            type: "finish",
            finishReason: "stop",
            rawFinishReason: "end_turn",
            totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
          };
        })()
      }));

    const workflow = makeWorkflow({
      stages: [
        makeWorkflow().stages[0]!,
        {
          ...makeWorkflow().stages[0]!,
          id: "70000000-0000-0000-0000-000000000002",
          label: "Validation",
          ord: 1
        }
      ]
    });
    const { service, createdRuns, executionReportsService } = createService({ workflow });

    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("failed");
    });

    const stageStartedLabels = createdRuns[0]!.events
      .filter((event) => event.type === "stage_started")
      .map((event) => String(event.payload["stageLabel"]));
    expect(stageStartedLabels).toEqual(["Pipeline", "Validation"]);
    expect(createdRuns[0]!.events.some((event) => event.type === "stage_completed" && event.workflowStageId === workflow.stages[0]!.id)).toBe(true);
    expect(createdRuns[0]!.events.some((event) => event.type === "stage_failed" && event.workflowStageId === workflow.stages[1]!.id)).toBe(true);
    expect(createdRuns[0]!.events.some((event) => event.type === "run_failed")).toBe(true);
    expect(executionReportsService.createForWorkflowRun).toHaveBeenCalledWith(createdRuns[0]!.id);
  });

  it("persists tool context, hides log_progress tool calls, and publishes live model output", async () => {
    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
      fullStream: (async function* () {
        yield {
          type: "start-step",
          request: { body: { messages: [] } },
          warnings: []
        };
        yield {
          type: "text",
          text: "Hello "
        };
        yield {
          type: "text",
          text: "world"
        };
        yield {
          type: "reasoning",
          text: "Think "
        };
        yield {
          type: "reasoning",
          text: "carefully"
        };
        await options.tools.log_progress.execute({
          message: "Checking the HTTP surface before deeper validation."
        });
        await options.tools.complete_run.execute({
          summary: "Pipeline complete.",
          recommendedNextStep: "Review the evidence.",
          residualRisk: "Residual risk remains low."
        });
        yield {
          type: "finish-step",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      })()
    }));

    const messages: Array<Record<string, unknown>> = [];
    const workflowRunStream = new WorkflowRunStream();
    workflowRunStream.subscribe("50000000-0000-0000-0000-000000000001", (message) => {
      messages.push(message as Record<string, unknown>);
    });

    const { service, createdRuns } = createService({ workflowRunStream });
    await service.startRun("10000000-0000-0000-0000-000000000001");

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const toolContextEvent = createdRuns[0]!.events.find((event) => event.title === "Tool context");
    const toolContextBody = typeof toolContextEvent?.payload["body"] === "string"
      ? toolContextEvent.payload["body"]
      : toolContextEvent?.detail;
    expect(toolContextBody).toContain("Built-in actions");
    expect(toolContextBody).toContain("complete_run: Submit the current workflow stage result.");

    expect(createdRuns[0]!.events.some((event) => event.type === "tool_call" && event.payload?.["toolName"] === "log_progress")).toBe(false);
    expect(createdRuns[0]!.events.some((event) => event.type === "tool_result" && event.payload?.["toolName"] === "log_progress")).toBe(false);

    const liveMessages = messages.filter((message) => message["type"] === "run_event" && message["liveModelOutput"]) as Array<{
      liveModelOutput: { text: string; reasoning: string | null; final: boolean };
    }>;
    expect(liveMessages.some((message) => message.liveModelOutput.text === "Hello world")).toBe(true);
    expect(liveMessages.some((message) => message.liveModelOutput.reasoning === "Think carefully")).toBe(true);
    expect(liveMessages.some((message) => message.liveModelOutput.final)).toBe(true);
  });
});
