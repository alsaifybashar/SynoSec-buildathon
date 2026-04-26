import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkflowStageSystemPrompt,
  defaultWorkflowTaskPromptTemplate,
  type ExecutionConstraint,
  type Target,
  type Workflow,
  type WorkflowRun,
  type WorkflowTraceEvent
} from "@synosec/contracts";
import { createToolRuntime } from "@/modules/ai-tools/tool-runtime.js";
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
  createAuditEntry: vi.fn(async () => undefined),
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
    stageSystemPrompt: defaultWorkflowStageSystemPrompt,
    taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
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
    agentId: stage.agentId,
    objective: stage.objective,
    stageSystemPrompt: stage.stageSystemPrompt,
    taskPromptTemplate: stage.taskPromptTemplate,
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

function makeTarget(overrides: Partial<Target> = {}): Target {
  return {
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
    constraintBindings: [],
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z",
    ...overrides
  };
}

function createService(overrides: {
  workflow?: Workflow | null;
  target?: Target;
  agentsById?: Record<string, Record<string, unknown>>;
  fixedRuntime?: Record<string, unknown>;
  workflowRunStream?: WorkflowRunStream;
  aiToolById?: Record<string, Record<string, unknown>>;
} = {}) {
  const workflow = overrides.workflow ?? makeWorkflow();
  const target = overrides.target ?? makeTarget();
  const agentsById = overrides.agentsById ?? {
    "30000000-0000-0000-0000-000000000001": {
      id: "30000000-0000-0000-0000-000000000001",
      name: "Pipeline Agent",
      status: "active",
      description: null,
      systemPrompt: "Work the target.",
      toolIds: [],
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:00.000Z"
    }
  };
  const fixedRuntime = overrides.fixedRuntime ?? {
    provider: "anthropic",
    providerName: "Anthropic",
    model: "claude-haiku-4-5",
    label: "Anthropic · claude-haiku-4-5",
    apiKey: "test-key"
  };
  const workflowRunStream = overrides.workflowRunStream ?? new WorkflowRunStream();
  const createdRuns: WorkflowRun[] = [];
  const createdLaunch = {
    id: "60000000-0000-0000-0000-000000000001",
    workflowId: workflow?.id ?? "10000000-0000-0000-0000-000000000001",
    status: "running" as const,
    startedAt: "2026-04-24T10:00:00.000Z",
    completedAt: null,
    runs: [] as Array<{
      targetId: string;
      runId: string;
      status: "pending" | "running" | "completed" | "failed";
      startedAt: string;
      completedAt: string | null;
      errorMessage: string | null;
    }>
  };
  const executionReportsService = {
    createForWorkflowRun: vi.fn(async () => undefined)
  };
  const aiToolsRepository = {
    getById: async (id: string) => overrides.aiToolById?.[id] ?? null,
    list: async () => ({ items: [], page: 1, pageSize: 1000, total: 0, totalPages: 0 })
  } as any;

  const service = new WorkflowExecutionService({
    workflowsRepository: {
      list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
      getById: async () => workflow as any,
      create: async () => workflow as any,
      update: async () => workflow as any,
      remove: async () => true,
      migrateWorkflowStageContracts: async () => workflow as any,
      createLaunch: async (workflowId: string) => ({
        ...createdLaunch,
        workflowId,
        runs: createdLaunch.runs.slice()
      }),
      getLaunchById: async () => ({
        ...createdLaunch,
        runs: createdLaunch.runs.slice()
      }),
      getLatestLaunchByWorkflowId: async () => ({
        ...createdLaunch,
        runs: createdLaunch.runs.slice()
      }),
      createRun: async (workflowId: string, workflowLaunchId: string, targetId: string) => {
        const run: WorkflowRun = {
          id: "50000000-0000-0000-0000-000000000001",
          workflowId,
          workflowLaunchId,
          targetId,
          executionKind: workflow?.executionKind,
          status: "running",
          currentStepIndex: 0,
          startedAt: "2026-04-24T10:00:00.000Z",
          completedAt: null,
          tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          trace: [],
          events: []
        };
        createdRuns[0] = run;
        createdLaunch.runs[0] = {
          targetId,
          runId: run.id,
          status: "running",
          startedAt: run.startedAt,
          completedAt: null,
          errorMessage: null
        };
        return run;
      },
      getRunById: async () => createdRuns[0] ?? null,
      appendRunEvent: async (_runId: string, event: WorkflowTraceEvent, patch: Partial<WorkflowRun> = {}) => {
        const current = createdRuns[0]!;
        const updated: WorkflowRun = {
          ...current,
          ...patch,
          tokenUsage: current.tokenUsage,
          trace: current.trace.slice(),
          events: [...current.events, event]
        };
        createdRuns[0] = updated;
        createdLaunch.runs[0] = {
          ...createdLaunch.runs[0],
          status: updated.status,
          completedAt: updated.completedAt
        };
        return updated;
      },
      updateRunState: async (_runId: string, patch: Partial<WorkflowRun>) => {
        const current = createdRuns[0]!;
        const updated: WorkflowRun = {
          ...current,
          ...patch,
          tokenUsage: current.tokenUsage,
          trace: current.trace.slice(),
          events: current.events.slice()
        };
        createdRuns[0] = updated;
        createdLaunch.runs[0] = {
          ...createdLaunch.runs[0],
          status: updated.status,
          completedAt: updated.completedAt
        };
        return updated;
      },
      updateRun: async (run: WorkflowRun) => run
    },
    targetsRepository: {
      getById: async () => target,
      list: async () => ({ items: [target], page: 1, pageSize: 25, total: 1, totalPages: 1 }),
      create: async () => { throw new Error("not implemented"); },
      update: async () => { throw new Error("not implemented"); },
      remove: async () => false
    } as any,
    aiAgentsRepository: {
      getById: async (id: string) => agentsById[id] ?? null
    } as any,
    aiToolsRepository,
    toolRuntime: createToolRuntime(aiToolsRepository),
    workflowRunStream,
    executionReportsService: executionReportsService as any,
    fixedAiRuntime: fixedRuntime as any
  });

  return { service, createdRuns, createdLaunch, workflowRunStream, executionReportsService };
}

describe("WorkflowExecutionService", () => {
  beforeEach(() => {
    streamTextMock.mockReset();
    streamTextMock.mockImplementation(() => ({
      fullStream: (async function* () {
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      })()
    }));
  });

  it("does not allow manual stepping for pipeline runs", async () => {
    const { service } = createService();

    await expect(service.stepRun("50000000-0000-0000-0000-000000000001")).rejects.toMatchObject({
      message: "Pipeline runs advance automatically after start."
    });
  });

  it("filters incompatible tools per constrained target run and continues with the compatible set", async () => {
    streamTextMock.mockImplementationOnce((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
      fullStream: (async function* () {
        await options.tools.complete_run.execute({
          summary: "Completed with the compatible tool set.",
          recommendedNextStep: "Review the scoped evidence.",
          residualRisk: "Residual risk remains bounded by target policy."
        });
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      })()
    }));

    const cloudflareConstraint: ExecutionConstraint = {
      id: "seed-constraint-cloudflare-v1",
      name: "Cloudflare Owned Asset Policy",
      kind: "provider_policy",
      provider: "cloudflare",
      version: 1,
      description: null,
      bypassForLocalTargets: false,
      denyProviderOwnedTargets: true,
      requireVerifiedOwnership: true,
      allowActiveExploit: false,
      requireRateLimitSupport: true,
      rateLimitRps: 3,
      requireHostAllowlistSupport: true,
      requirePathExclusionSupport: true,
      documentationUrls: [],
      excludedPaths: ["/cdn-cgi/"],
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z"
    };
    const constrainedTarget = makeTarget({
      id: "20000000-0000-0000-0000-000000000009",
      name: "Constrained Portfolio",
      baseUrl: "https://portfolio.example.com",
      hostname: "portfolio.example.com",
      ipAddress: null,
      provider: "cloudflare",
      constraintBindings: [
        {
          constraintId: cloudflareConstraint.id,
          createdAt: "2026-04-25T00:00:00.000Z",
          constraint: cloudflareConstraint
        }
      ]
    });
    const workflow = makeWorkflow({
      stages: [
        {
          id: "70000000-0000-0000-0000-000000000009",
          label: "Portfolio Assessment",
          agentId: "30000000-0000-0000-0000-000000000001",
          ord: 0,
          objective: "Assess the target with family tools.",
          stageSystemPrompt: defaultWorkflowStageSystemPrompt,
          taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
          allowedToolIds: ["seed-family-http-surface", "seed-family-sql-injection-validation"],
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
    const { service, createdRuns } = createService({
      workflow,
      target: constrainedTarget,
      aiToolById: {
        "seed-family-http-surface": {
          id: "seed-family-http-surface",
          name: "HTTP Surface",
          status: "active",
          source: "system",
          description: "Passive HTTP probe",
          builtinActionKey: null,
          category: "web",
          riskTier: "passive",
          executorType: "bash",
          bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
          capabilities: ["semantic-family", "http-surface", "passive"],
          timeoutMs: 120000,
          constraintProfile: {
            enforced: true,
            targetKinds: ["host", "domain", "url"],
            networkBehavior: "outbound-read",
            mutationClass: "none",
            supportsHostAllowlist: true,
            supportsPathExclusions: true,
            supportsRateLimit: true
          },
          inputSchema: {
            type: "object",
            properties: {
              target: { type: "string" },
              baseUrl: { type: "string" }
            },
            required: ["baseUrl"]
          },
          outputSchema: {
            type: "object",
            properties: {
              output: { type: "string" }
            },
            required: ["output"]
          },
          createdAt: "2026-04-25T00:00:00.000Z",
          updatedAt: "2026-04-25T00:00:00.000Z"
        },
        "seed-family-sql-injection-validation": {
          id: "seed-family-sql-injection-validation",
          name: "SQL Injection Validation",
          status: "active",
          source: "system",
          description: "Controlled SQL injection validation",
          builtinActionKey: "sql_injection_validation",
          category: "web",
          riskTier: "controlled-exploit",
          executorType: "builtin",
          bashSource: null,
          capabilities: ["semantic-family", "sqli", "controlled-exploit"],
          timeoutMs: 120000,
          constraintProfile: {
            enforced: true,
            targetKinds: ["host", "domain", "url"],
            networkBehavior: "outbound-active",
            mutationClass: "exploit",
            supportsHostAllowlist: true,
            supportsPathExclusions: true,
            supportsRateLimit: true
          },
          inputSchema: {
            type: "object",
            properties: {
              target: { type: "string" },
              baseUrl: { type: "string" }
            },
            required: ["baseUrl"]
          },
          outputSchema: {
            type: "object",
            properties: {
              output: { type: "string" }
            },
            required: ["output"]
          },
          createdAt: "2026-04-25T00:00:00.000Z",
          updatedAt: "2026-04-25T00:00:00.000Z"
        }
      }
    });

    await expect(service.startRun(workflow.id)).resolves.toMatchObject({
      workflowId: workflow.id,
      status: "running"
    });

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const streamTools = Object.keys(streamTextMock.mock.calls.at(-1)?.[0]?.tools ?? {});
    expect(streamTools).toContain("seed-family-http-surface");
    expect(streamTools).not.toContain("sql_injection_validation");
    expect(createdRuns[0]!.events.some((event) => event.title === "Policy-filtered tools")).toBe(true);
  });

  it("fails a constrained target run when every allowed tool is filtered out by target policy", async () => {
    const cloudflareConstraint: ExecutionConstraint = {
      id: "seed-constraint-cloudflare-v1",
      name: "Cloudflare Owned Asset Policy",
      kind: "provider_policy",
      provider: "cloudflare",
      version: 1,
      description: null,
      bypassForLocalTargets: false,
      denyProviderOwnedTargets: true,
      requireVerifiedOwnership: true,
      allowActiveExploit: false,
      requireRateLimitSupport: true,
      rateLimitRps: 3,
      requireHostAllowlistSupport: true,
      requirePathExclusionSupport: true,
      documentationUrls: [],
      excludedPaths: ["/cdn-cgi/"],
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z"
    };
    const constrainedTarget = makeTarget({
      id: "20000000-0000-0000-0000-000000000010",
      name: "Constrained Validation Target",
      baseUrl: "https://validation.example.com",
      hostname: "validation.example.com",
      ipAddress: null,
      provider: "cloudflare",
      constraintBindings: [
        {
          constraintId: cloudflareConstraint.id,
          createdAt: "2026-04-25T00:00:00.000Z",
          constraint: cloudflareConstraint
        }
      ]
    });
    const workflow = makeWorkflow({
      stages: [
        {
          id: "70000000-0000-0000-0000-000000000010",
          label: "Validation",
          agentId: "30000000-0000-0000-0000-000000000001",
          ord: 0,
          objective: "Validate the target with exploit-grade tooling.",
          stageSystemPrompt: defaultWorkflowStageSystemPrompt,
          taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
          allowedToolIds: ["seed-family-sql-injection-validation"],
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
    const { service, createdRuns } = createService({
      workflow,
      target: constrainedTarget,
      aiToolById: {
        "seed-family-sql-injection-validation": {
          id: "seed-family-sql-injection-validation",
          name: "SQL Injection Validation",
          status: "active",
          source: "system",
          description: "Controlled SQL injection validation",
          builtinActionKey: "sql_injection_validation",
          category: "web",
          riskTier: "controlled-exploit",
          executorType: "builtin",
          bashSource: null,
          capabilities: ["semantic-family", "sqli", "controlled-exploit"],
          timeoutMs: 120000,
          constraintProfile: {
            enforced: true,
            targetKinds: ["host", "domain", "url"],
            networkBehavior: "outbound-active",
            mutationClass: "exploit",
            supportsHostAllowlist: true,
            supportsPathExclusions: true,
            supportsRateLimit: true
          },
          inputSchema: {
            type: "object",
            properties: {
              target: { type: "string" },
              baseUrl: { type: "string" }
            },
            required: ["baseUrl"]
          },
          outputSchema: {
            type: "object",
            properties: {
              output: { type: "string" }
            },
            required: ["output"]
          },
          createdAt: "2026-04-25T00:00:00.000Z",
          updatedAt: "2026-04-25T00:00:00.000Z"
        }
      }
    });

    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("failed");
    });

    expect(createdRuns[0]!.events.at(-1)?.summary ?? "").toContain("no allowed tools are compatible");
  });

  it("fails the workflow when a later stage never submits complete_run", async () => {
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
    expect(createdRuns[0]!.events.some((event) => event.summary.includes("without calling complete_run"))).toBe(true);
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
    expect(toolContextBody).not.toContain("deep_analysis");

    const systemPromptEvent = createdRuns[0]!.events.find((event) => event.title === "Rendered system prompt");
    expect(systemPromptEvent?.detail).toContain("Role and goal:");
    expect(systemPromptEvent?.detail).toContain("Runtime target context:");
    expect(systemPromptEvent?.detail).toContain("Target: Demo Target");
    expect(systemPromptEvent?.detail).toContain("Target URL: http://localhost:3000/");
    expect(systemPromptEvent?.detail).toContain("Workflow execution contract:");
    expect(systemPromptEvent?.payload["promptSourceLabel"]).toBe("Workflow-owned editable system prompt plus engine-generated target context and runtime contract.");
    expect(createdRuns[0]!.events.find((event) => event.title === "Rendered task prompt")).toBeUndefined();

    expect(createdRuns[0]!.events.some((event) => event.type === "tool_call" && event.payload?.["toolName"] === "log_progress")).toBe(false);
    expect(createdRuns[0]!.events.some((event) => event.type === "tool_result" && event.payload?.["toolName"] === "log_progress")).toBe(false);
    expect(createdRuns[0]!.events.some((event) => event.type === "run_completed")).toBe(true);
    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion accepted" && event.summary === "The agent finished pen testing.")).toBe(true);
    const closeoutEvent = createdRuns[0]!.events.find((event) => event.type === "run_completed");
    expect(closeoutEvent?.detail).toContain("Recommended next step: Review the evidence.");
    expect(closeoutEvent?.detail).toContain("Residual risk: Residual risk remains low.");

    const liveMessages = messages.filter((message) => message["type"] === "run_event" && message["liveModelOutput"]) as Array<{
      liveModelOutput: { text: string; reasoning: string | null; final: boolean };
    }>;
    expect(liveMessages.some((message) => message.liveModelOutput.text === "Hello world")).toBe(true);
    expect(liveMessages.some((message) => message.liveModelOutput.reasoning === "Think carefully")).toBe(true);
    expect(liveMessages.some((message) => message.liveModelOutput.final)).toBe(true);
    expect(streamTextMock).toHaveBeenCalledWith(expect.objectContaining({
      system: expect.any(String),
      prompt: "Proceed."
    }));
  });

  it("emits a dedicated report_finding tool result summary", async () => {
    const workflow = makeWorkflow({
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["custom-http-proof"]
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        const toolOutput = await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        yield {
          type: "tool-call",
          toolCallId: "call-report-finding",
          toolName: "report_finding",
          input: {
            type: "other",
            title: "SQL Injection Authentication Bypass",
            severity: "high",
            confidence: 0.98,
            target: { host: "demo.local" },
            evidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
              toolRunRef: toolOutput.toolRunId
            }],
            impact: "Authentication bypass is possible.",
            recommendation: "Parameterize the query."
          }
        };
        const output = await options.tools.report_finding.execute({
          type: "other",
          title: "SQL Injection Authentication Bypass",
          severity: "high",
          confidence: 0.98,
          target: { host: "demo.local" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "Authentication bypass is possible.",
          recommendation: "Parameterize the query."
        });
        yield {
          type: "tool-result",
          toolCallId: "call-report-finding",
          toolName: "report_finding",
          output
        };
        await options.tools.complete_run.execute({
          summary: "Finding recorded.",
          recommendedNextStep: "Review the SQLi evidence.",
          residualRisk: "Residual risk remains high."
        });
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      })()
    }));

    const { service, createdRuns } = createService({
      workflow,
      aiToolById: {
        "custom-http-proof": {
          id: "custom-http-proof",
          name: "Custom HTTP Proof",
          status: "active",
          source: "system",
          description: "Return a deterministic proof snippet.",
          executorType: "bash",
          builtinActionKey: null,
          bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"URL: http://localhost:3000/admin\\nStatus: 200\\nSnippet: Administrator Control Panel\",\"observations\":[{\"key\":\"http-proof:admin\",\"title\":\"Admin proof\",\"summary\":\"Admin panel responded with 200.\",\"severity\":\"high\",\"confidence\":0.96,\"evidence\":\"URL: http://localhost:3000/admin\\nStatus: 200\\nSnippet: Administrator Control Panel\",\"technique\":\"deterministic http proof\"}],\"commandPreview\":\"custom-http-proof http://localhost:3000/admin\"}'",
          capabilities: ["http", "proof"],
          category: "web",
          riskTier: "passive",
          timeoutMs: 30000,
          constraintProfile: {
            enforced: true,
            targetKinds: ["host", "domain", "url"],
            networkBehavior: "outbound-read",
            mutationClass: "none",
            supportsHostAllowlist: true,
            supportsPathExclusions: true,
            supportsRateLimit: false
          },
          inputSchema: {
            type: "object",
            properties: {
              baseUrl: { type: "string" }
            },
            required: ["baseUrl"]
          },
          outputSchema: {
            type: "object",
            properties: {
              output: { type: "string" }
            },
            required: ["output"]
          },
          createdAt: "2026-04-25T00:00:00.000Z",
          updatedAt: "2026-04-25T00:00:00.000Z"
        }
      }
    });
    await service.startRun("10000000-0000-0000-0000-000000000001");

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const toolResult = createdRuns[0]!.events.find((event) => event.type === "tool_result" && event.payload["toolName"] === "report_finding");
    expect(toolResult?.summary).toBe("Recorded HIGH finding: SQL Injection Authentication Bypass on demo.local.");
    expect(toolResult?.detail).toContain("\"title\": \"SQL Injection Authentication Bypass\"");
    expect(toolResult?.detail).toContain("\"host\": \"demo.local\"");
  });

  it("persists failed tool results that only appear in the next model step transcript", async () => {
    streamTextMock.mockImplementationOnce((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
      fullStream: (async function* () {
        yield {
          type: "start-step",
          request: {
            body: {
              messages: []
            }
          },
          warnings: []
        };
        yield {
          type: "tool-call",
          toolCallId: "call-parameter-discovery",
          toolName: "parameter_discovery",
          input: {
            target_url: "http://localhost:3000/"
          }
        };
        yield {
          type: "start-step",
          request: {
            body: {
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: "call-parameter-discovery",
                      is_error: true,
                      content: "Parameter Discovery failed across all seeded candidates. Arjun returned no usable evidence."
                    }
                  ]
                }
              ]
            }
          },
          warnings: []
        };
        await options.tools.complete_run.execute({
          summary: "Completed after recording the tool failure.",
          recommendedNextStep: "Inspect the failed tool output.",
          residualRisk: "Residual risk remains because parameter discovery failed."
        });
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      })()
    }));

    const baseWorkflow = makeWorkflow();
    const workflow = {
      ...baseWorkflow,
      stages: [
        {
          ...baseWorkflow.stages[0]!,
          allowedToolIds: ["builtin-parameter-discovery"]
        }
      ]
    };
    const { service, createdRuns } = createService({
      workflow,
      aiToolById: {
        "builtin-parameter-discovery": {
          id: "builtin-parameter-discovery",
          name: "Parameter Discovery",
          status: "active",
          source: "system",
          description: "Discover likely parameters.",
          builtinActionKey: "parameter_discovery",
          category: "web",
          riskTier: "active",
          executorType: "builtin",
          bashSource: null,
          capabilities: ["semantic-family", "parameter-discovery"],
          timeoutMs: 120000,
          constraintProfile: {
            enforced: true,
            targetKinds: ["host", "domain", "url"],
            networkBehavior: "outbound-read",
            mutationClass: "content-enumeration",
            supportsHostAllowlist: true,
            supportsPathExclusions: true,
            supportsRateLimit: true
          },
          inputSchema: {
            type: "object",
            properties: {
              baseUrl: { type: "string" }
            }
          },
          outputSchema: {
            type: "object",
            properties: {
              output: { type: "string" }
            },
            required: ["output"]
          },
          createdAt: "2026-04-25T00:00:00.000Z",
          updatedAt: "2026-04-25T00:00:00.000Z"
        }
      }
    });

    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const failedResult = createdRuns[0]!.events.find((event) =>
      event.type === "tool_result" && event.payload["toolCallId"] === "call-parameter-discovery"
    );
    expect(failedResult).toMatchObject({
      status: "failed",
      title: "parameter_discovery returned"
    });
    expect(failedResult?.summary).toContain("Parameter Discovery failed across all seeded candidates.");
    expect(failedResult?.payload["toolId"]).toBe("builtin-parameter-discovery");
  });

  it("fails loudly when a persisted workflow prompt template contains an unsupported token", async () => {
    const baseWorkflow = makeWorkflow();
    const invalidStage = {
      ...baseWorkflow.stages[0]!,
      stageSystemPrompt: "Unsupported token {{target.baseUrl}}"
    };
    const workflow = {
      ...baseWorkflow,
      stageSystemPrompt: invalidStage.stageSystemPrompt,
      stages: [invalidStage]
    };
    const { service, createdRuns } = createService({ workflow });

    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("failed");
    });

    expect(createdRuns[0]!.events.some((event) => event.type === "run_failed")).toBe(true);
    const failureEvent = createdRuns[0]!.events.find((event) => event.type === "run_failed");
    expect(failureEvent?.summary ?? failureEvent?.detail).toContain("Unsupported workflow prompt token");
  });
});
