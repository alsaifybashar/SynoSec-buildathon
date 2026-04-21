import { describe, expect, it } from "vitest";
import type {
  AiAgent,
  AiTool,
  AiProvider,
  Application,
  Runtime,
  Workflow,
  WorkflowRun,
  WorkflowTraceEvent
} from "@synosec/contracts";
import { WorkflowExecutionService } from "./workflow-execution.service.js";
import { WorkflowRunStream } from "./workflow-run-stream.js";

const workflow: Workflow = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Provider Workflow",
  status: "active",
  description: "Workflow execution provider test",
  applicationId: "20000000-0000-0000-0000-000000000001",
  runtimeId: "30000000-0000-0000-0000-000000000001",
  stages: [
    {
      id: "40000000-0000-0000-0000-000000000001",
      label: "Recon",
      agentId: "50000000-0000-0000-0000-000000000001",
      ord: 0,
      objective: "Complete the Recon stage using allowed tools and structured reporting.",
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
      handoffSchema: null
    }
  ],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const application: Application = {
  id: workflow.applicationId,
  name: "App",
  baseUrl: "http://localhost:8888",
  environment: "development",
  status: "active",
  lastScannedAt: null,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const runtime: Runtime = {
  id: workflow.runtimeId ?? "",
  name: "Runtime",
  serviceType: "api",
  provider: "docker",
  environment: "development",
  region: "local",
  status: "healthy",
  applicationId: workflow.applicationId,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const agent: AiAgent = {
  id: workflow.stages[0]?.agentId ?? "",
  name: "Provider Agent",
  status: "active",
  description: "Execution agent",
  providerId: "60000000-0000-0000-0000-000000000001",
  systemPrompt: "Test",
  modelOverride: null,
  toolIds: [],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

function createService(
  provider: AiProvider & { apiKey: string | null },
  overrides: {
    workflow?: Workflow;
    agent?: AiAgent;
    toolsById?: Record<string, AiTool | null>;
    appendRunEvent?: (run: WorkflowRun, event: WorkflowTraceEvent, patch?: Partial<WorkflowRun>) => Promise<WorkflowRun>;
    runWorkflowLinkedScan?: () => Promise<void>;
  } = {}
) {
  let createdRun: WorkflowRun | null = null;
  const currentWorkflow = overrides.workflow ?? workflow;
  const currentAgent = overrides.agent ?? agent;
  const toolsById = overrides.toolsById ?? {};

  const service = new WorkflowExecutionService(
    {
      list: async () => ({ items: [currentWorkflow], page: 1, pageSize: 10, total: 1, totalPages: 1 }),
      getById: async (id) => (id === currentWorkflow.id ? currentWorkflow : null),
      create: async () => currentWorkflow,
      update: async () => currentWorkflow,
      remove: async () => true,
      migrateWorkflowStageContracts: async () => currentWorkflow,
      createRun: async (workflowId) => {
        createdRun = {
          id: "70000000-0000-0000-0000-000000000001",
          workflowId,
          status: "running",
          currentStepIndex: 0,
          startedAt: "2026-04-21T00:00:00.000Z",
          completedAt: null,
          trace: [],
          events: []
        };
        return createdRun;
      },
      getRunById: async () => createdRun,
      getLatestRunByWorkflowId: async () => createdRun,
      appendRunEvent: async (_runId, event: WorkflowTraceEvent, patch = {}) => {
        if (!createdRun) {
          throw new Error("run not created");
        }
        if (overrides.appendRunEvent) {
          createdRun = await overrides.appendRunEvent(createdRun, event, patch);
          return createdRun;
        }
        createdRun = {
          ...createdRun,
          ...(patch.status === undefined ? {} : { status: patch.status }),
          ...(patch.currentStepIndex === undefined ? {} : { currentStepIndex: patch.currentStepIndex }),
          ...(patch.completedAt === undefined ? {} : { completedAt: patch.completedAt ?? null }),
          events: [...createdRun.events, event]
        };
        return createdRun;
      },
      appendTraceEntry: async () => {
        if (!createdRun) {
          throw new Error("run not created");
        }
        return createdRun;
      },
      updateRunState: async (_runId, patch) => {
        if (!createdRun) {
          throw new Error("run not created");
        }
        createdRun = {
          ...createdRun,
          ...(patch.status === undefined ? {} : { status: patch.status }),
          ...(patch.currentStepIndex === undefined ? {} : { currentStepIndex: patch.currentStepIndex }),
          ...(patch.completedAt === undefined ? {} : { completedAt: patch.completedAt ?? null })
        };
        return createdRun;
      },
      updateRun: async (run) => run
    },
    {
      getById: async () => application
    } as never,
    {
      getById: async () => runtime
    } as never,
    {
      getById: async () => currentAgent
    } as never,
    {
      list: async () => ({ items: [provider], page: 1, pageSize: 10, total: 1, totalPages: 1 }),
      getById: async () => provider,
      getStoredById: async () => provider,
      create: async () => provider,
      update: async () => provider,
      remove: async () => true
    },
    {
      list: async () => ({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 }),
      getById: async (id) => toolsById[id] ?? null,
      create: async () => {
        throw new Error("not used");
      },
      update: async () => null,
      remove: async () => true
    },
    new WorkflowRunStream(),
    {
      runWorkflowLinkedScan: async () => overrides.runWorkflowLinkedScan ? overrides.runWorkflowLinkedScan() : undefined
    } as never
  );

  return Object.assign(service, {
    __getCreatedRun: () => createdRun
  });
}

describe("WorkflowExecutionService startRun provider support", () => {
  it("starts a run when the stage agent uses a local provider with a base URL", async () => {
    const service = createService({
      id: agent.providerId,
      name: "Local",
      kind: "local",
      status: "active",
      description: "Local provider",
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen3:1.7b",
      apiKeyConfigured: false,
      apiKey: null,
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    });

    const run = await service.startRun(workflow.id);

    expect(run.status).toBe("running");
    expect(run.workflowId).toBe(workflow.id);
  });

  it("starts a run when the stage agent uses an anthropic provider with an api key", async () => {
    const service = createService({
      id: agent.providerId,
      name: "Anthropic",
      kind: "anthropic",
      status: "active",
      description: "Hosted provider",
      baseUrl: null,
      model: "claude-sonnet-4-6",
      apiKeyConfigured: true,
      apiKey: "test-key",
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    });

    const run = await service.startRun(workflow.id);

    expect(run.status).toBe("running");
    expect(run.workflowId).toBe(workflow.id);
  });

  it("fails the stage when the contract references unavailable tools", async () => {
    const degradedWorkflow: Workflow = {
      ...workflow,
      stages: workflow.stages.map((stage) => ({
        ...stage,
        allowedToolIds: ["missing-tool"]
      }))
    };
    const service = createService({
      id: agent.providerId,
      name: "Local",
      kind: "local",
      status: "active",
      description: "Local provider",
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen3:1.7b",
      apiKeyConfigured: false,
      apiKey: null,
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    }, {
      workflow: degradedWorkflow
    });
    (service as unknown as { ensureWorkflowScan: (run: WorkflowRun, target: { host: string }) => Promise<{ id: string; scope: { targets: string[]; exclusions: string[]; layers: ("L4" | "L7")[]; maxDepth: number; maxDurationMinutes: number; rateLimitRps: number; allowActiveExploits: boolean; graceEnabled: boolean; graceRoundInterval: number; cyberRangeMode: "live" }; status: "running"; currentRound: number; tacticsTotal: number; tacticsComplete: number; createdAt: string }> }).ensureWorkflowScan =
      async (run: WorkflowRun, target: { host: string }) => ({
        id: run.id,
        scope: {
          targets: [target.host],
          exclusions: [],
          layers: ["L4", "L7"],
          maxDepth: 3,
          maxDurationMinutes: 15,
          rateLimitRps: 5,
          allowActiveExploits: true,
          graceEnabled: true,
          graceRoundInterval: 3,
          cyberRangeMode: "live"
        },
        status: "running",
        currentRound: 0,
        tacticsTotal: 1,
        tacticsComplete: 0,
        createdAt: run.startedAt
      });

    const run = await service.startRun(degradedWorkflow.id);
    const stepped = await service.stepRun(run.id);

    expect(stepped.status).toBe("failed");
    expect(stepped.events.some((event) =>
      event.type === "stage_contract_validation_failed"
      && event.summary.includes("missing-tool")
    )).toBe(true);
  });

  it("does not fall back to the stale workflow when stage contract migration fails", async () => {
    const service = createService({
      id: agent.providerId,
      name: "Local",
      kind: "local",
      status: "active",
      description: "Local provider",
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen3:1.7b",
      apiKeyConfigured: false,
      apiKey: null,
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    });

    (
      service as unknown as {
        workflowsRepository: {
          migrateWorkflowStageContracts: (workflowId: string, fallbackToolIdsByAgentId?: Record<string, string[]>) => Promise<Workflow | null>;
        };
      }
    ).workflowsRepository.migrateWorkflowStageContracts = async () => null;

    await expect(service.startRun(workflow.id)).rejects.toMatchObject({
      status: 500,
      code: "WORKFLOW_MIGRATION_FAILED"
    });
  });

  it("marks a single-agent workflow run failed when background startup rejects before the stage try/catch", async () => {
    const singleAgentWorkflow: Workflow = {
      ...workflow,
      name: "OSI Single-Agent"
    };
    const service = createService({
      id: agent.providerId,
      name: "Local",
      kind: "local",
      status: "active",
      description: "Local provider",
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen3:1.7b",
      apiKeyConfigured: false,
      apiKey: null,
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z"
    }, {
      workflow: singleAgentWorkflow,
      appendRunEvent: async () => {
        throw new Error("event stream unavailable");
      }
    });

    const run = await service.startRun(singleAgentWorkflow.id);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const failedRun = service.__getCreatedRun();

    expect(failedRun?.status).toBe("failed");
    expect(failedRun?.completedAt).not.toBeNull();
  });
});
