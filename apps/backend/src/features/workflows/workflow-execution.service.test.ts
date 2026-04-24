import { describe, expect, it, vi } from "vitest";
import type {
  AiAgent,
  AiTool,
  AiProvider,
  Application,
  Runtime,
  Workflow,
  WorkflowRun,
  WorkflowTraceEntry,
  WorkflowTraceEvent
} from "@synosec/contracts";
import { WorkflowExecutionService } from "./workflow-execution.service.js";
import { WorkflowRunStream } from "./workflow-run-stream.js";

type WorkflowDebugEventInput = {
  type: WorkflowTraceEvent["type"];
  status?: WorkflowTraceEvent["status"];
  title: string;
  summary: string;
  detail?: string | null;
  payload?: Record<string, unknown>;
  createdAt?: string;
};

type WorkflowLinkedScanInput = {
  runId: string;
  applicationId: string;
  runtimeId: string | null;
  agentId: string;
  scope: {
    targets: string[];
    exclusions: string[];
    layers: ("L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7")[];
    maxDepth: number;
    maxDurationMinutes: number;
    rateLimitRps: number;
    allowActiveExploits: boolean;
    graceEnabled: boolean;
    graceRoundInterval: number;
    cyberRangeMode: "simulation";
  };
  onWorkflowEvent: (event: WorkflowDebugEventInput) => Promise<void>;
};

const workflow: Workflow = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Provider Workflow",
  status: "active",
  description: "Workflow execution provider test",
  applicationId: "20000000-0000-0000-0000-000000000001",
  runtimeId: "30000000-0000-0000-0000-000000000001",
  agentId: "50000000-0000-0000-0000-000000000001",
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
  handoffSchema: null,
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
    runWorkflowLinkedScan?: (input: WorkflowLinkedScanInput) => Promise<void>;
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
      appendTraceEntry: async (_runId, traceEntry: WorkflowTraceEntry) => {
        if (!createdRun) {
          throw new Error("run not created");
        }
        createdRun = {
          ...createdRun,
          trace: [...createdRun.trace, traceEntry]
        };
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
      runWorkflowLinkedScan: async (input: WorkflowLinkedScanInput) => overrides.runWorkflowLinkedScan ? overrides.runWorkflowLinkedScan(input) : undefined
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

  it("continues with runnable tools when some configured stage tools are unavailable", async () => {
    const mixedWorkflow: Workflow = {
      ...workflow,
      stages: workflow.stages.map((stage) => ({
        ...stage,
        allowedToolIds: ["missing-tool", "present-tool"],
        completionRule: {
          ...stage.completionRule,
          requireToolCall: true
        }
      }))
    };
    const executableTool: AiTool = {
      id: "present-tool",
      name: "Present Tool",
      status: "active",
      source: "system",
      description: "Runnable test tool",
      binary: null,
      category: "web",
      riskTier: "passive",
      executorType: "bash",
      capabilities: ["http"],
      notes: null,
      sandboxProfile: "read-only-parser",
      privilegeProfile: "read-only-network",
      inputSchema: {
        type: "object",
        properties: {
          target: { type: "string" }
        }
      },
      outputSchema: {
        type: "object",
        properties: {}
      },
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\",\"observations\":[]}'",
      timeoutMs: 5_000,
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "call_tool",
              toolId: "present-tool",
              input: {
                target: "localhost"
              },
              reasoning: "Use the available runnable tool first."
            })
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              action: "submit_stage_result",
              result: {
                status: "completed",
                summary: "Executed the runnable tool and completed the stage.",
                recommendedNextStep: "Review the collected output.",
                residualRisk: "Unavailable tools still limit evidence breadth.",
                findingIds: []
              },
              reasoning: "The required tool call has completed."
            })
          }
        })
      });
    vi.stubGlobal("fetch", fetchMock);

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
      workflow: mixedWorkflow,
      toolsById: {
        "present-tool": executableTool
      }
    });
    (service as unknown as {
      ensureWorkflowScan: (run: WorkflowRun, target: { host: string }) => Promise<{
        id: string;
        scope: {
          targets: string[];
          exclusions: string[];
          layers: ("L4" | "L7")[];
          maxDepth: number;
          maxDurationMinutes: number;
          rateLimitRps: number;
          allowActiveExploits: boolean;
          graceEnabled: boolean;
          graceRoundInterval: number;
          cyberRangeMode: "live";
        };
        status: "running";
        currentRound: number;
        tacticsTotal: number;
        tacticsComplete: number;
        createdAt: string;
      }>;
      broker: {
        executeRequests: typeof service["broker"]["executeRequests"];
      };
    }).ensureWorkflowScan = async (run: WorkflowRun, target: { host: string }) => ({
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
    (service as unknown as {
      broker: {
        executeRequests: (input: { requests: Array<{ toolId?: string; tool: string; target: string }> }) => Promise<{
          toolRuns: Array<{
            id: string;
            scanId: string;
            tacticId: string;
            agentId: string;
            toolId?: string;
            tool: string;
            executorType: "bash";
            capabilities: string[];
            target: string;
            status: "completed";
            riskTier: "passive";
            justification: string;
            commandPreview: string;
            dispatchMode: "local";
            startedAt: string;
            completedAt: string;
            output: string;
            exitCode: number;
          }>;
          observations: [];
          findings: [];
        }>;
      };
    }).broker.executeRequests = async (input) => ({
      toolRuns: [{
        id: "tool-run-1",
        scanId: "scan-1",
        tacticId: "tactic-1",
        agentId: agent.id,
        ...(input.requests[0]?.toolId ? { toolId: input.requests[0].toolId } : {}),
        tool: input.requests[0]?.tool ?? "Present Tool",
        executorType: "bash",
        capabilities: [],
        target: input.requests[0]?.target ?? "localhost",
        status: "completed",
        riskTier: "passive",
        justification: "test",
        commandPreview: "present-tool localhost",
        dispatchMode: "local",
        startedAt: "2026-04-21T00:00:00.000Z",
        completedAt: "2026-04-21T00:00:01.000Z",
        output: "ok",
        exitCode: 0
      }],
      observations: [],
      findings: []
    });

    const run = await service.startRun(mixedWorkflow.id);
    const stepped = await service.stepRun(run.id);

    expect(stepped.status).toBe("completed");
    expect(stepped.events.some((event) =>
      event.type === "model_decision"
      && Array.isArray(event.payload["selectedToolIds"])
      && event.payload["selectedToolIds"].includes("present-tool")
    )).toBe(true);
    expect(stepped.events.some((event) =>
      event.type === "stage_completed"
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

  it("completes the OSI single-agent workflow and persists the emitted workflow transcript", async () => {
    const singleAgentWorkflow: Workflow = {
      ...workflow,
      name: "OSI Single-Agent",
      allowedToolIds: ["seed-service-scan"],
      stages: workflow.stages.map((stage) => ({
        ...stage,
        allowedToolIds: ["seed-service-scan"]
      }))
    };
    const singleAgentAgent: AiAgent = {
      ...agent,
      name: "Single-Agent Security Runner",
      toolIds: ["seed-service-scan", "seed-http-recon"]
    };
    let receivedScanInput: WorkflowLinkedScanInput | null = null;
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
      agent: singleAgentAgent,
      runWorkflowLinkedScan: async (input) => {
        receivedScanInput = input;
        await input.onWorkflowEvent({
          type: "system_message",
          status: "completed",
          title: "Rendered system prompt",
          summary: "Persisted the exact system instruction payload used to drive the single-agent loop.",
          detail: "System prompt body",
          payload: {
            prompt: "System prompt body"
          }
        });
        await input.onWorkflowEvent({
          type: "tool_call",
          status: "running",
          title: "Service Scan invoked",
          summary: "The agent requested Service Scan for transport evidence.",
          detail: null,
          payload: {
            toolId: "seed-service-scan",
            toolName: "Service Scan"
          }
        });
        await input.onWorkflowEvent({
          type: "agent_summary",
          status: "completed",
          title: "Single-agent closeout submitted",
          summary: "The agent submitted the final structured closeout.",
          detail: "Completed the scan.",
          payload: {
            summary: "Completed the scan.",
            stopReason: "no_further_material_progress"
          }
        });
      }
    });

    await service.startRun(singleAgentWorkflow.id);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const completedRun = service.__getCreatedRun();

    expect(receivedScanInput).not.toBeNull();
    expect(receivedScanInput).toMatchObject({
      applicationId: application.id,
      runtimeId: runtime.id,
      agentId: singleAgentAgent.id,
      scope: {
        targets: [application.baseUrl],
        layers: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"],
        maxDepth: 8,
        maxDurationMinutes: 20,
        allowActiveExploits: false
      }
    });
    expect(completedRun?.status).toBe("completed");
    expect(completedRun?.currentStepIndex).toBe(1);
    expect(completedRun?.completedAt).not.toBeNull();
    expect(completedRun?.events.map((event) => event.type)).toEqual([
      "stage_started",
      "system_message",
      "tool_call",
      "agent_summary",
      "stage_completed"
    ]);
    expect(completedRun?.trace).toHaveLength(1);
    expect(completedRun?.trace[0]).toMatchObject({
      agentName: "Single-Agent Security Runner",
      selectedToolIds: ["seed-service-scan"],
      status: "completed"
    });
  });
});
