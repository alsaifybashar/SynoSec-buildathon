import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowRun, WorkflowTraceEvent } from "@synosec/contracts";
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
  getScan: vi.fn(async () => null)
}));

function createService(overrides: {
  workflow?: Record<string, unknown> | null;
  agent?: Record<string, unknown> | null;
  provider?: Record<string, unknown> | null;
  workflowRunStream?: WorkflowRunStream;
  orchestrator?: Record<string, unknown>;
  aiToolById?: Record<string, Record<string, unknown>>;
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
  const workflowRunStream = overrides.workflowRunStream ?? new WorkflowRunStream();

  const service = new WorkflowExecutionService(
    {
      list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
      getById: async () => workflow as any,
      create: async () => workflow as any,
      update: async () => workflow as any,
      remove: async () => true,
      migrateWorkflowStageContracts: async () => workflow as any,
      createRun: async (workflowId: string, targetAssetId: string | null) => {
        const run = {
          id: "50000000-0000-0000-0000-000000000001",
          workflowId,
          executionKind: (workflow as any).executionKind ?? "workflow",
          targetAssetId,
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
      appendRunEvent: async (_runId: string, event: WorkflowTraceEvent, patch: Partial<WorkflowRun> = {}) => ({
        ...(() => {
          const updated = {
            ...(createdRuns[0] as any),
            ...patch,
            events: [...(((createdRuns[0] as any)?.events ?? [])), event]
          };
          createdRuns[0] = updated;
          return updated;
        })()
      }),
      updateRunState: async (_runId: string, patch: Partial<WorkflowRun>) => {
        const updated = {
          ...(createdRuns[0] as any),
          ...patch
        };
        createdRuns[0] = updated;
        return updated;
      },
      updateRun: async (run: WorkflowRun) => run as any
    },
    {
      getById: async () => ({
        id: "20000000-0000-0000-0000-000000000001",
        name: "Demo App",
        baseUrl: "http://localhost:3000",
        environment: "development",
        status: "active",
        lastScannedAt: null,
        targetAssets: [
          {
            id: "60000000-0000-0000-0000-000000000001",
            applicationId: "20000000-0000-0000-0000-000000000001",
            label: "Local target",
            kind: "url",
            hostname: "localhost",
            baseUrl: "http://localhost:3000",
            ipAddress: "127.0.0.1",
            cidr: null,
            provider: "local",
            ownershipStatus: "verified",
            isDefault: true,
            metadata: null,
            createdAt: "2026-04-24T10:00:00.000Z",
            updatedAt: "2026-04-24T10:00:00.000Z"
          }
        ],
        constraintBindings: [],
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      }),
      list: async () => ({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 }),
      create: async () => { throw new Error("not implemented"); },
      update: async () => { throw new Error("not implemented"); },
      remove: async () => false
    } as any,
    {
      getById: async (id: string) => overrides.aiToolById?.[id] ?? null
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
    workflowRunStream,
    (overrides.orchestrator ?? {}) as any
  );

  return { service, createdRuns, workflowRunStream };
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

  it("rejects applications without registered target assets", async () => {
    const { service } = createService();
    (service as any).applicationsRepository.getById = async () => ({
      id: "20000000-0000-0000-0000-000000000001",
      name: "Demo App",
      baseUrl: "https://example.com",
      environment: "production",
      status: "active",
      lastScannedAt: null,
      targetAssets: [],
      constraintBindings: [],
      createdAt: "2026-04-24T10:00:00.000Z",
      updatedAt: "2026-04-24T10:00:00.000Z"
    });

    await expect(service.startRun("10000000-0000-0000-0000-000000000001")).rejects.toMatchObject({
      code: "WORKFLOW_TARGET_ASSET_REQUIRED"
    });
  });

  it("dispatches attack-map workflows without requiring an Anthropic provider", async () => {
    const { service } = createService({
      workflow: {
        id: "10000000-0000-0000-0000-000000000001",
        name: "Attack Map Workflow",
        status: "active",
        executionKind: "attack-map",
        description: null,
        applicationId: "20000000-0000-0000-0000-000000000001",
        runtimeId: null,
        agentId: "30000000-0000-0000-0000-000000000001",
        objective: "Run attack-map orchestration.",
        allowedToolIds: [],
        requiredEvidenceTypes: [],
        findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
        completionRule: { requireStageResult: true, requireToolCall: false, allowEmptyResult: true, minFindings: 0 },
        resultSchemaVersion: 1,
        handoffSchema: null,
        stages: [],
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      },
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
    (service as any).executeAttackMapWorkflowRun = () => Promise.resolve();

    const run = await service.startRun("10000000-0000-0000-0000-000000000001");

    expect(run.executionKind).toBe("attack-map");
  });

  it("emits explicit recon tool activity before the attack-map recon summary", async () => {
    const { service, createdRuns } = createService({
      workflow: {
        id: "10000000-0000-0000-0000-000000000001",
        name: "Attack Map Workflow",
        status: "active",
        executionKind: "attack-map",
        description: null,
        applicationId: "20000000-0000-0000-0000-000000000001",
        runtimeId: null,
        agentId: "30000000-0000-0000-0000-000000000001",
        objective: "Run attack-map orchestration.",
        allowedToolIds: ["tool:nikto"],
        requiredEvidenceTypes: [],
        findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
        completionRule: { requireStageResult: true, requireToolCall: false, allowEmptyResult: true, minFindings: 0 },
        resultSchemaVersion: 1,
        handoffSchema: null,
        stages: [],
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      },
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
      aiToolById: {
        "tool:nikto": {
          id: "tool:nikto",
          name: "Nikto",
          description: "Web server scanner for common misconfigurations.",
          source: "custom",
          executorType: "bash"
        }
      },
      orchestrator: {
        listOrchestratorRunnableTools: async () => [],
        runRecon: async () => ({
          openPorts: [{ port: 80, protocol: "tcp", service: "http", version: "Apache" }],
          technologies: ["Apache"],
          httpHeaders: { Server: "Apache" },
          serverInfo: { webServer: "Apache" },
          interestingPaths: [],
          probes: [
            {
              toolName: "cURL",
              command: "curl -sI --max-time 8 --connect-timeout 5 -L http://localhost:3000",
              output: "HTTP/1.1 200 OK",
              status: "completed"
            },
            {
              toolName: "Nmap",
              command: "nmap -sV --open -T4 --version-intensity 3 -p 21,22,25,80,443,3000,3306,4443,5432,6379,8080,8443,8888,27017 localhost",
              output: "80/tcp open http Apache",
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

    await service.startRun("10000000-0000-0000-0000-000000000001");

    await vi.waitFor(() => {
      expect((createdRuns[0] as any)?.events?.some((event: WorkflowTraceEvent) => event.title === "Recon completed")).toBe(true);
    });

    const events = ((createdRuns[0] as any)?.events ?? []) as WorkflowTraceEvent[];
    const curlResultIndex = events.findIndex((event) => event.type === "tool_result" && event.payload?.["toolName"] === "cURL");
    const nmapResultIndex = events.findIndex((event) => event.type === "tool_result" && event.payload?.["toolName"] === "Nmap");
    const reconSummaryIndex = events.findIndex((event) => event.title === "Recon completed");

    expect(curlResultIndex).toBeGreaterThan(-1);
    expect(nmapResultIndex).toBeGreaterThan(-1);
    expect(reconSummaryIndex).toBeGreaterThan(nmapResultIndex);
    expect(events[curlResultIndex]?.detail).toContain("HTTP/1.1 200 OK");
    expect(events[nmapResultIndex]?.detail).toContain("80/tcp open http Apache");
  });

  it("persists workflow tool context as name-description pairs", async () => {
    streamTextMock.mockReturnValue({
      fullStream: (async function* () {
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: {
            inputTokens: 1,
            outputTokens: 1,
            totalTokens: 2
          }
        };
      })()
    });

    const { service, createdRuns } = createService({
      workflow: {
        id: "10000000-0000-0000-0000-000000000001",
        name: "Pipeline Workflow",
        status: "active",
        description: null,
        applicationId: "20000000-0000-0000-0000-000000000001",
        runtimeId: null,
        agentId: "30000000-0000-0000-0000-000000000001",
        objective: "Collect evidence and stop through system tools.",
        allowedToolIds: ["tool:http-recon"],
        requiredEvidenceTypes: [],
        findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
        completionRule: { requireStageResult: true, requireToolCall: false, allowEmptyResult: true, minFindings: 0 },
        resultSchemaVersion: 1,
        handoffSchema: null,
        stages: [],
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:00:00.000Z"
      },
      aiToolById: {
        "tool:http-recon": {
          id: "tool:http-recon",
          name: "HTTP Recon",
          description: "Collect HTTP headers and response metadata.",
          source: "custom",
          executorType: "bash",
          category: "web",
          riskTier: "passive",
          capabilities: [],
          sandboxProfile: "network-recon",
          privilegeProfile: "unprivileged"
        }
      }
    });

    await service.startRun("10000000-0000-0000-0000-000000000001");

    await vi.waitFor(() => {
      expect((createdRuns[0] as any)?.events?.some((event: WorkflowTraceEvent) => event.title === "Tool context")).toBe(true);
    });

    const toolContextEvent = (((createdRuns[0] as any)?.events ?? []) as WorkflowTraceEvent[])
      .find((event) => event.title === "Tool context");

    const toolContextBody = typeof toolContextEvent?.payload?.["body"] === "string"
      ? toolContextEvent.payload["body"]
      : toolContextEvent?.detail;

    expect(toolContextBody).toContain("Built-in actions");
    expect(toolContextBody).toContain("log_progress: Persist one short operator-visible progress update for the workflow transcript.");
    expect(toolContextBody).toContain("report_finding: Persist one evidence-backed workflow finding.");
    expect(toolContextBody).toContain("complete_run: Finish the workflow pipeline successfully.");
    expect(toolContextBody).toContain("fail_run: Finish the workflow pipeline as failed.");
  });

  it("injects explicit visible narration instructions into the workflow system prompt", async () => {
    streamTextMock.mockReturnValue({
      fullStream: (async function* () {
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: {
            inputTokens: 1,
            outputTokens: 1,
            totalTokens: 2
          }
        };
      })()
    });

    const { service } = createService();

    await service.startRun("10000000-0000-0000-0000-000000000001");

    await vi.waitFor(() => {
      expect(streamTextMock).toHaveBeenCalledTimes(1);
    });
    const call = streamTextMock.mock.calls[0]?.[0] as { system?: string };
    expect(call.system).toContain("Call log_progress before any evidence tool call or tool burst");
    expect(call.system).toContain("Each log_progress update must be concise, operator-visible, and action-oriented.");
    expect(call.system).toContain("Do not expose hidden chain-of-thought or private reasoning.");
  });

  it("does not surface log_progress as a regular tool call in workflow events", async () => {
    async function* fullStream() {
      yield {
        type: "tool-call",
        toolCallId: "call-progress",
        toolName: "log_progress",
        input: {
          message: "Checking the HTTP surface before deeper validation."
        }
      };
      yield {
        type: "tool-result",
        toolCallId: "call-progress",
        toolName: "log_progress",
        output: {
          accepted: true
        }
      };
      yield {
        type: "finish",
        finishReason: "stop",
        rawFinishReason: "end_turn",
        totalUsage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2
        }
      };
    }

    streamTextMock.mockReturnValue({
      fullStream: fullStream()
    });

    const { service, createdRuns } = createService();

    await service.startRun("10000000-0000-0000-0000-000000000001");

    const events = (createdRuns[0]?.["events"] ?? []) as WorkflowTraceEvent[];
    expect(events.some((event) => event.type === "tool_call" && event.payload?.["toolName"] === "log_progress")).toBe(false);
    expect(events.some((event) => event.type === "tool_result" && event.payload?.["toolName"] === "log_progress")).toBe(false);
  });

  it("persists raw stream part types and publishes live model output from streamed workflow text", async () => {
    async function* fullStream() {
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
      yield {
        type: "finish-step",
        finishReason: "stop",
        rawFinishReason: "end_turn",
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2
        }
      };
      yield {
        type: "finish",
        finishReason: "stop",
        rawFinishReason: "end_turn",
        totalUsage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2
        }
      };
    }

    streamTextMock.mockReturnValue({
      fullStream: fullStream()
    });

    const messages: Array<Record<string, unknown>> = [];
    const workflowRunStream = new WorkflowRunStream();
    workflowRunStream.subscribe("50000000-0000-0000-0000-000000000001", (message) => {
      messages.push(message as Record<string, unknown>);
    });

    const { service, createdRuns } = createService({ workflowRunStream });

    await service.startRun("10000000-0000-0000-0000-000000000001");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const persistedEvents = (createdRuns[0]?.["events"] ?? []) as WorkflowTraceEvent[];
    const textEvents = persistedEvents.filter((event) => event.payload?.["rawStreamPartType"] === "text");
    const reasoningEvents = persistedEvents.filter((event) => event.payload?.["rawStreamPartType"] === "reasoning");
    expect(textEvents).toHaveLength(2);
    expect(reasoningEvents).toHaveLength(2);
    expect(textEvents[0]?.detail).toBe("Hello ");
    expect(textEvents[1]?.detail).toBe("world");

    const liveMessages = messages.filter((message) => message["type"] === "run_event" && message["liveModelOutput"]) as Array<{
      liveModelOutput: { text: string; reasoning: string | null; final: boolean };
    }>;
    expect(liveMessages.some((message) => message["liveModelOutput"].text === "Hello world")).toBe(true);
    expect(liveMessages.some((message) => message["liveModelOutput"].reasoning === "Think carefully")).toBe(true);
    expect(liveMessages.some((message) => message["liveModelOutput"].final)).toBe(true);
  });
});
