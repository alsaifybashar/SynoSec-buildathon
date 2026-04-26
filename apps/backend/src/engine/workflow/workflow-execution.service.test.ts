import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  attackPathHandoffJsonSchema,
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
import { agentBashCommandTool } from "../../../prisma/seed-data/tools/utility/agent-bash-command.js";

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
      minFindings: 0,
      requireReachableSurface: false,
      requireEvidenceBackedWeakness: false,
      requireOsiCoverageStatus: false,
      requireChainedFindings: false
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
    executionBaseUrl: null,
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

function makeCustomHttpProofTool() {
  return {
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
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z"
  };
}

function makeFailingHttpProofTool() {
  return {
    ...makeCustomHttpProofTool(),
    id: "custom-failing-proof",
    name: "Custom Failing Proof",
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"Connection refused\",\"statusReason\":\"Target was unreachable during proof\"}'\nexit 64"
  };
}

function makeSeededAgentBashCommandRuntimeTool() {
  return {
    id: agentBashCommandTool.id,
    name: agentBashCommandTool.name,
    status: "active",
    source: "system",
    description: agentBashCommandTool.description,
    executorType: "bash" as const,
    builtinActionKey: null,
    bashSource: agentBashCommandTool.bashSource,
    capabilities: [...agentBashCommandTool.capabilities],
    category: agentBashCommandTool.category,
    riskTier: agentBashCommandTool.riskTier,
    timeoutMs: agentBashCommandTool.timeoutMs,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain"],
      networkBehavior: "outbound-active",
      mutationClass: "active-validation",
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    },
    inputSchema: {
      ...agentBashCommandTool.inputSchema
    },
    outputSchema: {
      ...agentBashCommandTool.outputSchema
    },
    createdAt: "2026-04-26T00:00:00.000Z",
    updatedAt: "2026-04-26T00:00:00.000Z"
  };
}

function createService(overrides: {
  workflow?: Workflow | null;
  target?: Target;
  targets?: Target[];
  agentsById?: Record<string, Record<string, unknown>>;
  fixedRuntime?: Record<string, unknown>;
  workflowRunStream?: WorkflowRunStream;
  aiToolById?: Record<string, Record<string, unknown>>;
} = {}) {
  const workflow = overrides.workflow ?? makeWorkflow();
  const target = overrides.target ?? makeTarget();
  const targets = overrides.targets ?? [target];
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
      getById: async (id: string) => targets.find((candidate) => candidate.id === id) ?? null,
      list: async () => ({ items: targets, page: 1, pageSize: 25, total: targets.length, totalPages: targets.length === 0 ? 0 : 1 }),
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
          objective: "Assess the target with capability tools.",
          stageSystemPrompt: defaultWorkflowStageSystemPrompt,
          taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
          allowedToolIds: ["builtin-http-surface-assessment", "builtin-sql-injection-validation"],
          requiredEvidenceTypes: [],
          findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
          completionRule: {
            requireStageResult: true,
            requireToolCall: false,
            allowEmptyResult: true,
            minFindings: 0,
            requireReachableSurface: false,
            requireEvidenceBackedWeakness: false,
            requireOsiCoverageStatus: false,
            requireChainedFindings: false
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
        "builtin-http-surface-assessment": {
          id: "builtin-http-surface-assessment",
          name: "HTTP Surface",
          status: "active",
          source: "system",
          description: "Passive HTTP probe",
          builtinActionKey: "http_surface_assessment",
          category: "web",
          riskTier: "passive",
          executorType: "builtin",
          bashSource: null,
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
        "builtin-sql-injection-validation": {
          id: "builtin-sql-injection-validation",
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
    expect(streamTools).toContain("http_surface_assessment");
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
          allowedToolIds: ["builtin-sql-injection-validation"],
          requiredEvidenceTypes: [],
          findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
          completionRule: {
            requireStageResult: true,
            requireToolCall: false,
            allowEmptyResult: true,
            minFindings: 0,
            requireReachableSurface: false,
            requireEvidenceBackedWeakness: false,
            requireOsiCoverageStatus: false,
            requireChainedFindings: false
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
        "builtin-sql-injection-validation": {
          id: "builtin-sql-injection-validation",
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

  it("runs a workflow with only seed-agent-bash-command and completes using structured command input", async () => {
    let bashToolRawOutput = "";

    streamTextMock.mockImplementationOnce((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
      fullStream: (async function* () {
        const bashResult = await options.tools["seed-agent-bash-command"]?.execute({
          command: "cat; printf '\\n%s\\n' \"$GREETING\"",
          stdin: "piped-input",
          env: { GREETING: "hello-from-env" },
          timeout_ms: 3000
        }) as { rawOutput: string; status: string } | undefined;

        expect(bashResult?.status).toBe("completed");
        bashToolRawOutput = bashResult?.rawOutput ?? "";

        await options.tools.complete_run.execute({
          summary: "Bash-only workflow completed.",
          recommendedNextStep: "Review command output artifacts.",
          residualRisk: "Command execution remains bounded to configured tool policy."
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
        {
          id: "70000000-0000-0000-0000-000000000051",
          label: "Bash PoC",
          agentId: "30000000-0000-0000-0000-000000000001",
          ord: 0,
          objective: "Execute bash through structured command input and finish cleanly.",
          stageSystemPrompt: defaultWorkflowStageSystemPrompt,
          taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
          allowedToolIds: ["seed-agent-bash-command"],
          requiredEvidenceTypes: [],
          findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
          completionRule: {
            requireStageResult: true,
            requireToolCall: true,
            allowEmptyResult: true,
            minFindings: 0,
            requireReachableSurface: false,
            requireEvidenceBackedWeakness: false,
            requireOsiCoverageStatus: false,
            requireChainedFindings: false
          },
          resultSchemaVersion: 1,
          handoffSchema: null
        }
      ]
    });
    const { service, createdRuns } = createService({
      workflow,
      aiToolById: {
        "seed-agent-bash-command": makeSeededAgentBashCommandRuntimeTool()
      }
    });

    await expect(service.startRun(workflow.id)).resolves.toMatchObject({
      workflowId: workflow.id,
      status: "running"
    });

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const exposedToolNames = Object.keys(streamTextMock.mock.calls.at(-1)?.[0]?.tools ?? {});
    expect(exposedToolNames).toContain("seed-agent-bash-command");
    expect(exposedToolNames).toContain("log_progress");
    expect(exposedToolNames).toContain("report_finding");
    expect(exposedToolNames).toContain("complete_run");
    expect(bashToolRawOutput).toContain("piped-input");
    expect(bashToolRawOutput).toContain("hello-from-env");
  });

  it("launches only the selected target when local runtime is active", async () => {
    streamTextMock.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "start" };
      })()
    }));

    const service = createService({
      targets: [
        makeTarget(),
        makeTarget({
          id: "20000000-0000-0000-0000-000000000002",
          name: "Second Target",
          baseUrl: "http://localhost:8890",
          hostname: "localhost"
        })
      ],
      fixedRuntime: {
        provider: "local",
        providerName: "Ollama",
        model: "qwen3:1.7b",
        label: "Ollama · qwen3:1.7b",
        baseUrl: "http://localhost:11434/v1",
        apiKey: "ollama",
        apiMode: "chat"
      }
    });

    const launch = await service.service.startRun("10000000-0000-0000-0000-000000000001", {
      targetId: "20000000-0000-0000-0000-000000000002"
    });

    expect(launch.runs).toHaveLength(1);
    expect(launch.runs[0]).toMatchObject({
      targetId: "20000000-0000-0000-0000-000000000002"
    });
  });

  it("defaults to a single runnable target when the caller omits targetId", async () => {
    streamTextMock.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "start" };
      })()
    }));

    const service = createService({
      targets: [
        makeTarget(),
        makeTarget({
          id: "20000000-0000-0000-0000-000000000002",
          name: "Second Target",
          baseUrl: "http://localhost:8890",
          hostname: "localhost"
        })
      ],
      fixedRuntime: {
        provider: "anthropic",
        providerName: "Anthropic",
        model: "claude-sonnet-4-5",
        label: "Anthropic · claude-sonnet-4-5",
        apiKey: "test-key"
      }
    });

    const launch = await service.service.startRun("10000000-0000-0000-0000-000000000001");

    expect(launch.runs).toHaveLength(1);
    expect(launch.runs[0]).toMatchObject({
      targetId: "20000000-0000-0000-0000-000000000001"
    });
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
    expect(stageStartedLabels).toEqual(["Pipeline"]);
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
    expect(toolContextBody).toContain("complete_run: Finish the workflow run last");
    expect(toolContextBody).toContain("optional `handoff`");
    expect(toolContextBody).not.toContain("report_attack_vector");
    expect(toolContextBody).not.toContain("deep_analysis");

    const systemPromptEvent = createdRuns[0]!.events.find((event) => event.title === "Rendered system prompt");
    expect(systemPromptEvent?.detail).toContain("Role and goal:");
    expect(systemPromptEvent?.detail).toContain("Runtime target context:");
    expect(systemPromptEvent?.detail).toContain("Target: Demo Target");
    expect(systemPromptEvent?.detail).toContain("Operator URL: http://localhost:3000");
    expect(systemPromptEvent?.detail).toContain("Execution URL: http://localhost:3000/");
    expect(systemPromptEvent?.detail).toContain("Workflow execution contract:");
    expect(systemPromptEvent?.detail).toContain("Required action order: run evidence tools first, then call report_finding");
    expect(systemPromptEvent?.detail).toContain("report_finding mode `attack_vector`");
    expect(systemPromptEvent?.detail).not.toContain("call report_attack_vector");
    expect(systemPromptEvent?.detail).toContain("complete_run does not create findings");
    expect(systemPromptEvent?.detail).toContain("If complete_run is rejected, call the missing required actions");
    expect(systemPromptEvent?.detail).toContain("When requireChainedFindings is enabled");
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

  it("fails strict completion when complete_run has no handoff and no findings", async () => {
    const baseWorkflow = makeWorkflow();
    const workflow = makeWorkflow({
      stages: [{
        ...baseWorkflow.stages[0]!,
        completionRule: {
          requireStageResult: true,
          requireToolCall: true,
          allowEmptyResult: false,
          minFindings: 1,
          requireReachableSurface: true,
          requireEvidenceBackedWeakness: true,
          requireOsiCoverageStatus: true,
          requireChainedFindings: true
        }
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
      fullStream: (async function* () {
        const completion = await options.tools.complete_run.execute({
          summary: "Nothing to report.",
          recommendedNextStep: "Stop.",
          residualRisk: "Unknown."
        });
        expect(completion).toMatchObject({
          accepted: false,
          error: expect.stringContaining("Workflow completion assertions failed")
        });
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      })()
    }));

    const { service, createdRuns } = createService({ workflow });
    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("failed");
    });

    const assertionEvent = createdRuns[0]!.events.find((event) => event.title === "README coverage assertions");
    expect(assertionEvent).toMatchObject({
      status: "failed"
    });
    expect(assertionEvent?.summary).toContain("reachable surface");
    expect(assertionEvent?.payload["assertions"]).toMatchObject({
      evidenceBackedWeaknesses: {
        required: true,
        passed: false,
        findingCount: 0,
        requiredFindingCount: 1
      },
      chainedFindings: {
        required: true,
        passed: false,
        linkedFindingCount: 0
      }
    });
    expect(assertionEvent?.summary).toContain("reachable surface");
  });

  it("fails completion before assertions when a stage handoff schema is configured but handoff is missing", async () => {
    const baseWorkflow = makeWorkflow();
    const workflow = makeWorkflow({
      stages: [{
        ...baseWorkflow.stages[0]!,
        handoffSchema: attackPathHandoffJsonSchema,
        completionRule: {
          requireStageResult: true,
          requireToolCall: false,
          allowEmptyResult: true,
          minFindings: 0,
          requireReachableSurface: false,
          requireEvidenceBackedWeakness: false,
          requireOsiCoverageStatus: false,
          requireChainedFindings: false
        }
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
      fullStream: (async function* () {
        const completion = await options.tools.complete_run.execute({
          summary: "Done.",
          recommendedNextStep: "Review.",
          residualRisk: "Unknown."
        });
        expect(completion).toMatchObject({
          accepted: false,
          error: expect.stringContaining("requires a handoff")
        });
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      })()
    }));

    const { service, createdRuns } = createService({ workflow });
    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("failed");
    });
    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion rejected" && event.summary.includes("requires a handoff"))).toBe(true);
  });

  it("accepts blocked completion with failed tool run references without requiring attack-path handoff", async () => {
    const baseWorkflow = makeWorkflow();
    const workflow = makeWorkflow({
      stages: [{
        ...baseWorkflow.stages[0]!,
        allowedToolIds: ["custom-failing-proof"],
        handoffSchema: attackPathHandoffJsonSchema,
        completionRule: {
          requireStageResult: true,
          requireToolCall: true,
          allowEmptyResult: false,
          minFindings: 1,
          requireReachableSurface: true,
          requireEvidenceBackedWeakness: true,
          requireOsiCoverageStatus: true,
          requireChainedFindings: true
        }
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        const toolOutput = await options.tools["custom-failing-proof"].execute({
          baseUrl: "http://localhost:3000"
        });
        const completion = await options.tools.complete_run.execute({
          summary: "Assessment blocked by runtime reachability.",
          recommendedNextStep: "Fix the target execution URL and rerun.",
          residualRisk: "Application risk remains unknown because evidence collection could not reach the runtime target.",
          blocked: {
            reason: "The evidence tool could not reach the runtime target.",
            failedToolRunIds: [toolOutput.toolRunId],
            recommendedFix: "Set the target execution URL to a connector-reachable address.",
            operatorSummary: "The workflow was blocked before vulnerability assessment."
          }
        });
        expect(completion).toEqual({ accepted: true });
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
        "custom-failing-proof": makeFailingHttpProofTool()
      }
    });
    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });
    const stageResultEvent = createdRuns[0]!.events.find((event) => event.type === "stage_result_submitted");
    expect(stageResultEvent?.payload["stageResult"]).toMatchObject({
      status: "blocked",
      blocked: {
        reason: "The evidence tool could not reach the runtime target."
      }
    });
  });

  it("fails strict completion when attack-path handoff references bogus finding ids", async () => {
    const baseWorkflow = makeWorkflow();
    const workflow = makeWorkflow({
      stages: [{
        ...baseWorkflow.stages[0]!,
        allowedToolIds: ["custom-http-proof"],
        handoffSchema: attackPathHandoffJsonSchema,
        completionRule: {
          requireStageResult: true,
          requireToolCall: true,
          allowEmptyResult: false,
          minFindings: 1,
          requireReachableSurface: true,
          requireEvidenceBackedWeakness: true,
          requireOsiCoverageStatus: true,
          requireChainedFindings: true
        }
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        const toolOutput = await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        await options.tools.report_finding.execute({
          mode: "finding",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        const completion = await options.tools.complete_run.execute({
          summary: "Bogus handoff should fail.",
          recommendedNextStep: "Retry with real finding ids.",
          residualRisk: "Unknown.",
          handoff: {
            attackVenues: [{
              id: "venue-admin",
              label: "Admin panel",
              venueType: "web_surface",
              targetLabel: "http://localhost:3000/admin",
              summary: "Admin panel is reachable.",
              findingIds: ["90000000-0000-4000-8000-000000000001"]
            }],
            attackVectors: [{
              id: "vector-admin-auth",
              label: "Admin authentication path",
              sourceVenueId: "venue-admin",
              preconditions: ["Admin panel is reachable"],
              impact: "Enables follow-on authentication testing.",
              confidence: 0.8,
              findingIds: ["90000000-0000-4000-8000-000000000001"]
            }],
            attackPaths: [{
              id: "path-admin-auth",
              title: "Admin path",
              summary: "The path references bogus findings.",
              severity: "high",
              venueIds: ["venue-admin"],
              vectorIds: ["vector-admin-auth"],
              findingIds: [
                "90000000-0000-4000-8000-000000000001",
                "90000000-0000-4000-8000-000000000002"
              ]
            }]
          }
        });
        expect(completion).toMatchObject({
          accepted: false,
          error: expect.stringContaining("handoff reference validation failed")
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
        "custom-http-proof": makeCustomHttpProofTool()
      }
    });
    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("failed");
    });
    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion rejected" && event.summary.includes("handoff reference validation failed"))).toBe(true);
  });

  it("completes strict attack-path workflow with valid handoff references", async () => {
    const baseWorkflow = makeWorkflow();
    const workflow = makeWorkflow({
      stages: [{
        ...baseWorkflow.stages[0]!,
        allowedToolIds: ["custom-http-proof"],
        handoffSchema: attackPathHandoffJsonSchema,
        completionRule: {
          requireStageResult: true,
          requireToolCall: true,
          allowEmptyResult: false,
          minFindings: 1,
          requireReachableSurface: true,
          requireEvidenceBackedWeakness: true,
          requireOsiCoverageStatus: true,
          requireChainedFindings: true
        }
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        const toolOutput = await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        const firstFinding = await options.tools.report_finding.execute({
          mode: "finding",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        const secondFinding = await options.tools.report_finding.execute({
          mode: "finding",
          type: "auth_weakness",
          title: "Admin Exposure Enables Authentication Attack",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "The exposed admin panel can be chained with weak authentication checks.",
          recommendation: "Add authentication and network restrictions."
        });
        const rejectedCompletion = await options.tools.complete_run.execute({
          summary: "Invalid handoff should be corrected.",
          recommendedNextStep: "Retry with real refs.",
          residualRisk: "Unknown.",
          handoff: {
            attackVenues: [{
              id: "venue-admin",
              label: "Admin panel",
              venueType: "web_surface",
              targetLabel: "http://localhost:3000/admin",
              summary: "Admin panel is reachable.",
              findingIds: [firstFinding.findingId]
            }],
            attackVectors: [{
              id: "vector-admin-auth",
              label: "Admin authentication path",
              sourceVenueId: "venue-admin",
              preconditions: ["Admin panel is reachable"],
              impact: "Enables follow-on authentication testing.",
              confidence: 0.8,
              findingIds: [firstFinding.findingId, secondFinding.findingId]
            }],
            attackPaths: [{
              id: "path-admin-auth",
              title: "Admin path",
              summary: "The path references a missing vector.",
              severity: "high",
              venueIds: ["venue-admin"],
              vectorIds: ["vector-missing"],
              findingIds: [firstFinding.findingId, secondFinding.findingId]
            }]
          }
        });
        expect(rejectedCompletion).toMatchObject({
          accepted: false,
          error: expect.stringContaining("unknown vector id vector-missing")
        });
        await options.tools.complete_run.execute({
          summary: "Valid handoff accepted.",
          recommendedNextStep: "Review the attack path.",
          residualRisk: "Admin exposure remains until access is restricted.",
          handoff: {
            attackVenues: [{
              id: "venue-admin",
              label: "Admin panel",
              venueType: "web_surface",
              targetLabel: "http://localhost:3000/admin",
              summary: "Admin panel is reachable.",
              findingIds: [firstFinding.findingId]
            }],
            attackVectors: [{
              id: "vector-admin-auth",
              label: "Admin authentication path",
              sourceVenueId: "venue-admin",
              preconditions: ["Admin panel is reachable"],
              impact: "Enables follow-on authentication testing.",
              confidence: 0.8,
              findingIds: [firstFinding.findingId, secondFinding.findingId]
            }],
            attackPaths: [{
              id: "path-admin-auth",
              title: "Admin path",
              summary: "The reachable admin panel supports a follow-on path.",
              severity: "high",
              venueIds: ["venue-admin"],
              vectorIds: ["vector-admin-auth"],
              findingIds: [firstFinding.findingId, secondFinding.findingId]
            }]
          }
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
        "custom-http-proof": makeCustomHttpProofTool()
      }
    });
    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });
    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion accepted")).toBe(true);
  });

  it("accepts report_finding mode attack_vector submissions between existing findings", async () => {
    const baseWorkflow = makeWorkflow();
    const workflow = makeWorkflow({
      stages: [{
        ...baseWorkflow.stages[0]!,
        allowedToolIds: ["custom-http-proof"],
        completionRule: {
          requireStageResult: true,
          requireToolCall: true,
          allowEmptyResult: false,
          minFindings: 1,
          requireReachableSurface: true,
          requireEvidenceBackedWeakness: true,
          requireOsiCoverageStatus: true,
          requireChainedFindings: true
        }
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        const toolOutput = await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        const firstFinding = await options.tools.report_finding.execute({
          mode: "finding",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        const secondFinding = await options.tools.report_finding.execute({
          mode: "finding",
          type: "auth_weakness",
          title: "Weak Authentication on Admin Surface",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "Weak authentication can be exploited once the admin surface is reachable.",
          recommendation: "Harden authentication and protect the admin entry point."
        });
        const vectorSubmission = await options.tools.report_finding.execute({
          mode: "attack_vector",
          attackVectors: [{
            kind: "enables",
            sourceFindingId: firstFinding.findingId,
            destinationFindingId: secondFinding.findingId,
            summary: "Reachable admin panel enables direct authentication attacks.",
            impact: "Supports a chained compromise path.",
            confidence: 0.85,
            transitionEvidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
              toolRunRef: toolOutput.toolRunId
            }]
          }]
        });
        expect(vectorSubmission).toMatchObject({
          accepted: true,
          attackVectorIds: [expect.any(String)]
        });
        await options.tools.complete_run.execute({
          summary: "Chained findings were validated with explicit attack vectors.",
          recommendedNextStep: "Review and remediate the reachable admin path.",
          residualRisk: "Risk remains high until admin hardening is complete."
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
        "custom-http-proof": makeCustomHttpProofTool()
      }
    });
    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const attackVectorEvents = createdRuns[0]!.events.filter((event) => event.type === "attack_vector_reported");
    expect(attackVectorEvents).toHaveLength(1);
    const assertionEvent = createdRuns[0]!.events.find((event) => event.title === "README coverage assertions");
    expect(assertionEvent?.payload["assertions"]).toMatchObject({
      chainedFindings: {
        required: true,
        passed: true,
        attackVectorCount: 1
      }
    });
  });

  it("normalizes common report_finding payload mistakes for evidence refs and flat attack_vector mode", async () => {
    const workflow = makeWorkflow({
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["custom-http-proof"],
        completionRule: {
          requireStageResult: true,
          requireToolCall: true,
          allowEmptyResult: false,
          minFindings: 1,
          requireReachableSurface: true,
          requireEvidenceBackedWeakness: true,
          requireOsiCoverageStatus: true,
          requireChainedFindings: true
        }
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        const firstFinding = await options.tools.report_finding.execute({
          mode: "finding",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: "0.95",
          target: "demo.local",
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel"
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        const secondFinding = await options.tools.report_finding.execute({
          mode: "finding",
          type: "auth_weakness",
          title: "Weak Authentication on Admin Surface",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel"
          }],
          impact: "Weak authentication can be exploited once the admin surface is reachable.",
          recommendation: "Harden authentication and protect the admin entry point."
        });
        const vectorSubmission = await options.tools.report_finding.execute({
          mode: "attack_vector",
          kind: "enables",
          sourceFindingId: firstFinding.findingId,
          destinationFindingId: secondFinding.findingId,
          summary: "Reachable admin panel enables direct authentication attacks.",
          impact: "Supports a chained compromise path.",
          confidence: 0.85,
          transitionEvidence: JSON.stringify([{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel"
          }])
        });
        expect(vectorSubmission).toMatchObject({
          accepted: true,
          attackVectorIds: [expect.any(String)]
        });
        await options.tools.complete_run.execute({
          summary: "Normalized report_finding payloads were accepted.",
          recommendedNextStep: "Review and remediate the admin path findings.",
          residualRisk: "Risk remains high until controls are enforced."
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
        "custom-http-proof": makeCustomHttpProofTool()
      }
    });
    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });
    expect(createdRuns[0]!.events.filter((event) => event.type === "finding_reported")).toHaveLength(2);
    expect(createdRuns[0]!.events.filter((event) => event.type === "attack_vector_reported")).toHaveLength(1);
  });

  it("keeps report_attack_vector available as hidden compatibility", async () => {
    const workflow = makeWorkflow({
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["custom-http-proof"]
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        expect(options.tools.report_attack_vector).toBeDefined();
        const toolOutput = await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        const firstFinding = await options.tools.report_finding.execute({
          mode: "finding",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        const secondFinding = await options.tools.report_finding.execute({
          mode: "finding",
          type: "auth_weakness",
          title: "Weak Authentication on Admin Surface",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "Weak authentication can be exploited once the admin surface is reachable.",
          recommendation: "Harden authentication and protect the admin entry point."
        });
        const compatibilityVector = await options.tools.report_attack_vector.execute({
          kind: "enables",
          sourceFindingId: firstFinding.findingId,
          destinationFindingId: secondFinding.findingId,
          summary: "Reachable admin panel enables direct authentication attacks.",
          impact: "Supports a chained compromise path.",
          confidence: 0.85,
          transitionEvidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }]
        });
        expect(compatibilityVector).toMatchObject({
          attackVectorId: expect.any(String),
          sourceFindingId: firstFinding.findingId,
          destinationFindingId: secondFinding.findingId
        });
        await options.tools.complete_run.execute({
          summary: "Legacy attack-vector submissions remain accepted internally.",
          recommendedNextStep: "Switch to report_finding mode attack_vector for new runs.",
          residualRisk: "The admin chain remains until remediation is complete."
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
        "custom-http-proof": makeCustomHttpProofTool()
      }
    });
    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const toolContextEvent = createdRuns[0]!.events.find((event) => event.title === "Tool context");
    const toolContextBody = typeof toolContextEvent?.payload["body"] === "string"
      ? toolContextEvent.payload["body"]
      : toolContextEvent?.detail;
    expect(toolContextBody).not.toContain("report_attack_vector");
  });

  it("completes when README coverage assertions are demonstrated by evidence, coverage, and chained findings", async () => {
    const baseWorkflow = makeWorkflow();
    const workflow = makeWorkflow({
      stages: [{
        ...baseWorkflow.stages[0]!,
        allowedToolIds: ["custom-http-proof"],
        completionRule: {
          requireStageResult: true,
          requireToolCall: true,
          allowEmptyResult: false,
          minFindings: 1,
          requireReachableSurface: true,
          requireEvidenceBackedWeakness: true,
          requireOsiCoverageStatus: true,
          requireChainedFindings: true
        }
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        const toolOutput = await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        const firstFinding = await options.tools.report_finding.execute({
          mode: "finding",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        await options.tools.report_finding.execute({
          mode: "finding",
          type: "auth_weakness",
          title: "Admin Exposure Enables Authentication Attack",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "The exposed admin panel can be chained with weak authentication checks.",
          recommendation: "Add authentication and network restrictions.",
          relatedFindingIds: [firstFinding.findingId],
          explanationSummary: "The reachable admin surface provides the entry point for the authentication weakness.",
          confidenceReason: "Both findings are grounded in the same persisted admin-panel response.",
          relationshipExplanations: {
            relatedTo: "The authentication issue depends on the reachable admin venue."
          }
        });
        await options.tools.complete_run.execute({
          summary: "All README coverage assertions are demonstrated.",
          recommendedNextStep: "Review the chained admin-path findings.",
          residualRisk: "Admin exposure remains until access is restricted."
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

    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const assertionEvent = createdRuns[0]!.events.find((event) => event.title === "README coverage assertions");
    expect(assertionEvent).toMatchObject({
      status: "completed"
    });
    expect(assertionEvent?.payload["assertions"]).toMatchObject({
      reachableSurface: { passed: true },
      evidenceBackedWeaknesses: { passed: true },
      osiCoverageStatus: { passed: true },
      chainedFindings: { passed: true }
    });
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
            mode: "finding",
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
          mode: "finding",
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

  it("accepts JSON-string report_finding payloads", async () => {
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
        await options.tools.report_finding.execute(JSON.stringify({
          mode: "finding",
          type: "content_discovery",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.9,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.toolRunId
          }],
          impact: "The admin panel is directly reachable.",
          recommendation: "Restrict access to trusted operators."
        }));
        await options.tools.complete_run.execute({
          summary: "Finding recorded from string payload.",
          recommendedNextStep: "Review access controls.",
          residualRisk: "Admin surface is reachable."
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

    const findingEvent = createdRuns[0]!.events.find((event) => event.type === "finding_reported");
    expect(findingEvent).toBeDefined();
    const finding = findingEvent?.payload["finding"] as { title?: string } | undefined;
    expect(finding?.title).toBe("Admin Panel Reachable");
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
                      content: "Parameter Discovery failed while running Arjun. status=failed reason=Arjun returned no usable evidence."
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
    expect(failedResult?.summary).toContain("Parameter Discovery failed while running Arjun.");
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

  it("fails the workflow when the model stream stalls without a terminal event", async () => {
    const previousTimeout = process.env["WORKFLOW_MODEL_STREAM_IDLE_TIMEOUT_MS"];
    process.env["WORKFLOW_MODEL_STREAM_IDLE_TIMEOUT_MS"] = "25";
    streamTextMock.mockImplementationOnce(() => ({
      fullStream: (async function* () {
        yield {
          type: "text",
          text: "Reporting attack vectors linking exposed diagnostics data."
        };
        await new Promise(() => undefined);
      })()
    }));

    try {
      const { service, createdRuns, executionReportsService } = createService();

      await service.startRun("10000000-0000-0000-0000-000000000001");

      await vi.waitFor(() => {
        expect(createdRuns[0]?.status).toBe("failed");
      }, { timeout: 1_000 });

      expect(createdRuns[0]!.events.some((event) => event.type === "run_failed")).toBe(true);
      expect(createdRuns[0]!.events.some((event) => event.summary.includes("model stream produced no events"))).toBe(true);
      expect(executionReportsService.createForWorkflowRun).toHaveBeenCalledWith(createdRuns[0]!.id);
    } finally {
      if (previousTimeout === undefined) {
        delete process.env["WORKFLOW_MODEL_STREAM_IDLE_TIMEOUT_MS"];
      } else {
        process.env["WORKFLOW_MODEL_STREAM_IDLE_TIMEOUT_MS"] = previousTimeout;
      }
    }
  });
});
