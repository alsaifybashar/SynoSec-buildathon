import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  attackPathHandoffJsonSchema,
  defaultWorkflowExecutionContract,
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
import { getSeededWorkflowDefinitions } from "../../../prisma/seed-data/ai-builder-defaults.js";

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

async function submitGraphFinding(
  reportSystemGraphBatch: { execute: (input: unknown) => Promise<any> },
  input: {
    id: string;
    title: string;
    evidence: Array<Record<string, unknown>>;
    type?: string;
    severity?: string;
    confidence?: number | string;
    target?: string | { host: string; url?: string };
    impact?: string;
    recommendation?: string;
  }
) {
  const normalizedTarget = typeof input.target === "string"
    ? { host: input.target }
    : input.target ?? { host: "demo.local" };
  const resourceId = `resource:${normalizedTarget.host}`;
  const output = await reportSystemGraphBatch.execute({
    resources: [{
      id: resourceId,
      kind: "host",
      name: normalizedTarget.host
    }],
    findings: [{
      id: input.id,
      type: input.type,
      title: input.title,
      severity: input.severity,
      confidence: input.confidence,
      target: normalizedTarget,
      evidence: input.evidence,
      impact: input.impact,
      recommendation: input.recommendation,
      resourceIds: [resourceId]
    }]
  });

  return {
    accepted: true,
    findingId: output.findingIds[0],
    title: input.title,
    severity: input.severity ?? "medium",
    host: normalizedTarget.host
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
          summary: "Completed with the compatible tool set."
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
    const seededBashStagePrompt = getSeededWorkflowDefinitions().find((candidate) => candidate.name === "Bash Single-Tool PoC")
      ?.stages[0]?.stageSystemPrompt;

    streamTextMock.mockImplementationOnce((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
      fullStream: (async function* () {
        const bashResult = await options.tools.bash?.execute({
          command: "cat; printf '\\n%s\\n' \"$GREETING\"",
          stdin: "piped-input",
          env: { GREETING: "hello-from-env" },
          timeout_ms: 3000
        }) as { id: string; summary: string } | undefined;

        expect(typeof bashResult?.id).toBe("string");
        bashToolRawOutput = bashResult?.summary ?? "";

        await options.tools.complete_run.execute({
          summary: "Bash-only workflow completed."
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
          stageSystemPrompt: seededBashStagePrompt ?? defaultWorkflowStageSystemPrompt,
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
    expect(exposedToolNames).toContain("bash");
    expect(exposedToolNames).not.toContain("seed-agent-bash-command");
    expect(exposedToolNames).toContain("log_progress");
    expect(exposedToolNames).toContain("report_system_graph_batch");
    expect(exposedToolNames).not.toContain("report_finding");
    expect(exposedToolNames).toContain("complete_run");
    const toolContextEvent = createdRuns[0]!.events.find((event) => event.title === "Tool context");
    const toolContextBody = typeof toolContextEvent?.payload["body"] === "string"
      ? toolContextEvent.payload["body"]
      : toolContextEvent?.detail;
    expect(toolContextBody).toContain("installed binaries available in the execution environment");
    const systemPromptEvent = createdRuns[0]!.events.find((event) => event.title === "Rendered system prompt");
    expect(systemPromptEvent?.detail).toContain("derive the exact next request");
    expect(systemPromptEvent?.detail).toContain("Do not invent unsupported endpoint families such as `/promote` or `/validate`");
    expect(systemPromptEvent?.detail).toContain("Prefer one concrete transition validation over repeated fetches of already-seen pages");
    expect(systemPromptEvent?.detail).toContain("Stop probing unsupported routes after route-not-found style errors");
    expect(bashToolRawOutput).toContain("piped-input");
    expect(bashToolRawOutput).toContain("hello-from-env");
  });

  it("persists successful bash tool results with empty output", async () => {
    streamTextMock.mockImplementationOnce((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
      fullStream: (async function* () {
        yield {
          type: "tool-call",
          toolCallId: "call-empty-bash",
          toolName: "bash",
          input: {
            command: "true"
          }
        };
        const bashResult = await options.tools.bash?.execute({
          command: "true"
        });
        yield {
          type: "tool-result",
          toolCallId: "call-empty-bash",
          toolName: "bash",
          output: bashResult
        };
        await options.tools.complete_run.execute({
          summary: "Bash command completed with no output."
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
          ...makeWorkflow().stages[0]!,
          id: "70000000-0000-0000-0000-000000000052",
          allowedToolIds: ["seed-agent-bash-command"],
          completionRule: {
            requireStageResult: true,
            requireToolCall: true,
            allowEmptyResult: true,
            minFindings: 0,
            requireReachableSurface: false,
            requireEvidenceBackedWeakness: false,
            requireOsiCoverageStatus: false,
            requireChainedFindings: false
          }
        }
      ]
    });
    const { service, createdRuns } = createService({
      workflow,
      aiToolById: {
        "seed-agent-bash-command": makeSeededAgentBashCommandRuntimeTool()
      }
    });

    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const bashResultEvent = createdRuns[0]!.events.find((event) =>
      event.type === "tool_result" && event.payload["toolCallId"] === "call-empty-bash"
    );
    expect(bashResultEvent).toMatchObject({
      status: "completed",
      summary: "Agent Bash Command completed."
    });
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
            summary: "Stage one complete."
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

  it("recovers once when the model stream ends before complete_run", async () => {
    streamTextMock
      .mockImplementationOnce(() => ({
        fullStream: (async function* () {
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
          expect(Object.keys(options.tools)).toEqual(["complete_run"]);
          await options.tools.complete_run.execute({
            summary: "Recovered completion from prior evidence."
          });
          yield {
            type: "tool-call",
            toolCallId: "call-recovered-complete-run",
            toolName: "complete_run",
            input: {
              summary: "Recovered completion from prior evidence."
            }
          };
          yield {
            type: "finish",
            finishReason: "stop",
            rawFinishReason: "end_turn",
            totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
          };
        })()
      }));

    const { service, createdRuns } = createService();
    await service.startRun("10000000-0000-0000-0000-000000000001");

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion recovery requested")).toBe(true);
    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion accepted")).toBe(true);
    expect(createdRuns[0]!.events.some((event) =>
      event.type === "tool_result"
      && event.status === "completed"
      && event.payload["toolName"] === "complete_run"
      && event.payload["toolCallId"] === "call-recovered-complete-run"
    )).toBe(true);
    const recoveryEvent = createdRuns[0]!.events.find((event) => event.title === "Run completion recovery requested");
    expect(recoveryEvent?.detail).toContain("Required next action:");
    expect(recoveryEvent?.detail).toContain("- Call complete_run once as the final action.");
    expect(recoveryEvent?.detail).toContain("- Provide only `summary`.");
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
          summary: "Pipeline complete."
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
    expect(toolContextBody).toContain("Provide only `summary`.");
    expect(toolContextBody).toContain("report_system_graph_batch:");
    expect(toolContextBody).toContain("Prefer toolRunRef or observationRef");
    expect(toolContextBody).toContain("Use workflow enums for resource kinds and finding types instead of free-form labels.");
    expect(toolContextBody).not.toContain("report_attack_vector:");
    expect(toolContextBody).not.toContain("deep_analysis");

    const systemPromptEvent = createdRuns[0]!.events.find((event) => event.title === "Rendered system prompt");
    expect(systemPromptEvent?.detail).toContain("Role and goal:");
    expect(systemPromptEvent?.detail).toContain("Runtime target context:");
    expect(systemPromptEvent?.detail).toContain("Target: Demo Target");
    expect(systemPromptEvent?.detail).toContain("Operator URL: http://localhost:3000");
    expect(systemPromptEvent?.detail).toContain("Execution URL: http://localhost:3000/");
    expect(systemPromptEvent?.detail).toContain("Workflow execution contract:");
    expect(systemPromptEvent?.detail).toContain("Run evidence tools first, submit evidence-backed resources, findings, and relationships with report_system_graph_batch, and call complete_run last.");
    expect(systemPromptEvent?.detail).toContain("Evidence-backed submissions must use persisted evidence references from earlier tool runs");
    expect(systemPromptEvent?.detail).not.toContain("call report_attack_vector");
    expect(systemPromptEvent?.detail).toContain("complete_run accepts only `summary`.");
    expect(systemPromptEvent?.detail).toContain("complete_run closes the workflow run and does not create findings.");
    expect(systemPromptEvent?.detail).not.toContain("Available dependencies:");
    expect(systemPromptEvent?.payload["promptSourceLabel"]).toBe("Workflow-owned editable system prompt plus engine-generated target context and runtime contract.");
    expect(createdRuns[0]!.events.find((event) => event.title === "Rendered task prompt")).toBeUndefined();

    expect(createdRuns[0]!.events.some((event) => event.type === "tool_call" && event.payload?.["toolName"] === "log_progress")).toBe(false);
    expect(createdRuns[0]!.events.some((event) => event.type === "tool_result" && event.payload?.["toolName"] === "log_progress")).toBe(false);
    expect(createdRuns[0]!.events.some((event) => event.type === "run_completed")).toBe(true);
    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion accepted" && event.summary === "The agent finished the workflow run.")).toBe(true);
    const closeoutEvent = createdRuns[0]!.events.find((event) => event.type === "run_completed");
    expect(closeoutEvent?.summary).toBe("Pipeline complete.");

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

  it("does not append a duplicate execution contract when the workflow prompt already contains one", async () => {
    streamTextMock.mockImplementationOnce((options: { tools: Record<string, { execute: (input: unknown) => Promise<unknown> }> }) => ({
      fullStream: (async function* () {
        await options.tools.complete_run.execute({
          summary: "Pipeline complete."
        });
        yield {
          type: "finish",
          finishReason: "stop",
          rawFinishReason: "end_turn",
          totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
        };
      })()
    }));

    const stageSystemPrompt = `${defaultWorkflowStageSystemPrompt}\n\n${defaultWorkflowExecutionContract}`;
    const workflowWithOwnedContract = makeWorkflow({
      stageSystemPrompt,
      stages: [{
        ...makeWorkflow().stages[0]!,
        stageSystemPrompt
      }]
    });

    const { service, createdRuns } = createService({ workflow: workflowWithOwnedContract });
    await service.startRun("10000000-0000-0000-0000-000000000001");

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const systemPromptEvent = createdRuns[0]!.events.find((event) => event.title === "Rendered system prompt");
    expect(systemPromptEvent?.detail?.match(/Workflow execution contract:/g)).toHaveLength(1);
    expect(systemPromptEvent?.payload["promptSourceLabel"]).toBe("Workflow-owned editable system prompt including the workflow execution contract, plus engine-generated target context.");
  });

  it("accepts summary-only completion even when prior strict completion requirements are unmet", async () => {
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
        await expect(options.tools.complete_run.execute({
          summary: "Nothing to report."
        })).resolves.toEqual({ accepted: true });
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
      expect(createdRuns[0]?.status).toBe("completed");
    });
    expect(createdRuns[0]!.events.some((event) => event.title === "README coverage assertions")).toBe(false);
  });

  it("accepts completion without handoff when a stage handoff schema is configured", async () => {
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
        await expect(options.tools.complete_run.execute({
          summary: "Done."
        })).resolves.toEqual({ accepted: true });
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
      expect(createdRuns[0]?.status).toBe("completed");
    });
    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion accepted")).toBe(true);
  });

  it("rejects complete_run payloads that include deprecated blocked fields", async () => {
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
        await options.tools["custom-failing-proof"].execute({
          baseUrl: "http://localhost:3000"
        });
        await expect(options.tools.complete_run.execute({
          summary: "Assessment blocked by runtime reachability.",
          blocked: {
            reason: "The evidence tool could not reach the runtime target.",
            failedToolRunIds: ["tool-run-deprecated"],
            recommendedFix: "Set the target execution URL to a connector-reachable address.",
            operatorSummary: "The workflow was blocked before vulnerability assessment."
          }
        })).rejects.toThrow("Unrecognized key");
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
      expect(createdRuns[0]?.status).toBe("failed");
    });
  });

  it("rejects complete_run payloads that include deprecated handoff fields", async () => {
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
        await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-panel",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        await expect(options.tools.complete_run.execute({
          summary: "Bogus handoff should fail.",
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
        })).rejects.toThrow("Unrecognized key");
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
    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion rejected")).toBe(false);
  });

  it("completes summary-only even when older handoff-heavy workflows report findings first", async () => {
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
        await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-panel",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-auth",
          type: "auth_weakness",
          title: "Admin Exposure Enables Authentication Attack",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "The exposed admin panel can be chained with weak authentication checks.",
          recommendation: "Add authentication and network restrictions."
        });
        await options.tools.complete_run.execute({
          summary: "Valid summary-only completion accepted."
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

  it("accepts attack_vector submissions between existing graph-batch findings", async () => {
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
        const firstFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-panel",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        const secondFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-auth",
          type: "auth_weakness",
          title: "Weak Authentication on Admin Surface",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "Weak authentication can be exploited once the admin surface is reachable.",
          recommendation: "Harden authentication and protect the admin entry point."
        });
        const vectorSubmission = await options.tools.report_attack_vectors.execute({
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
              toolRunRef: toolOutput.id
            }]
          }]
        });
        expect(vectorSubmission).toMatchObject({
          accepted: true,
          attackVectorIds: [expect.any(String)]
        });
        await options.tools.complete_run.execute({
          summary: "Chained findings were validated with explicit attack vectors."
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
    expect(createdRuns[0]!.events.find((event) => event.title === "README coverage assertions")).toBeUndefined();
  });

  it("normalizes common reporting payload mistakes for evidence refs", async () => {
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
        const firstFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-panel",
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
        const secondFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-auth",
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
        const vectorSubmission = await options.tools.report_attack_vectors.execute({
          attackVectors: [{
            kind: "enables",
            sourceFindingId: firstFinding.findingId,
            destinationFindingId: secondFinding.findingId,
            summary: "Reachable admin panel enables direct authentication attacks.",
            impact: "Supports a chained compromise path.",
            confidence: 0.85,
            transitionEvidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel"
            }]
          }]
        });
        expect(vectorSubmission).toMatchObject({
          accepted: true,
          attackVectorIds: [expect.any(String)]
        });
        await options.tools.complete_run.execute({
          summary: "Normalized graph-batch payloads were accepted."
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

  it("accepts numeric strings in report_attack_vectors payloads", async () => {
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
        const firstFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-panel",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        const secondFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-auth",
          type: "auth_weakness",
          title: "Weak Authentication on Admin Surface",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "Weak authentication can be exploited once the admin surface is reachable.",
          recommendation: "Harden authentication and protect the admin entry point."
        });
        const vectorSubmission = await options.tools.report_attack_vectors.execute({
          attackVectors: [{
            kind: "enables",
            sourceFindingId: firstFinding.findingId,
            destinationFindingId: secondFinding.findingId,
            summary: "Reachable admin panel enables direct authentication attacks.",
            impact: "Supports a chained compromise path.",
            confidence: "0.85",
            transitionEvidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
              toolRunRef: toolOutput.id
            }]
          }]
        });
        expect(vectorSubmission).toMatchObject({
          accepted: true,
          attackVectorIds: [expect.any(String)]
        });
        await options.tools.complete_run.execute({
          summary: "Stringified numeric fields were accepted for workflow reporting tools."
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
    expect(createdRuns[0]!.events.filter((event) => event.type === "attack_vector_reported")).toHaveLength(1);
  });

  it("exposes report_attack_vectors and hides the singular compatibility name", async () => {
    const workflow = makeWorkflow({
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["custom-http-proof"]
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        expect(options.tools.report_attack_vector).toBeUndefined();
        expect(options.tools.report_attack_vectors).toBeDefined();
        const toolOutput = await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        const firstFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-panel",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        const secondFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-auth",
          type: "auth_weakness",
          title: "Weak Authentication on Admin Surface",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "Weak authentication can be exploited once the admin surface is reachable.",
          recommendation: "Harden authentication and protect the admin entry point."
        });
        const vectorSubmission = await options.tools.report_attack_vectors.execute({
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
              toolRunRef: toolOutput.id
            }]
          }]
        });
        expect(vectorSubmission).toMatchObject({
          accepted: true,
          attackVectorIds: [expect.any(String)]
        });
        await options.tools.complete_run.execute({
          summary: "Attack vectors are submitted through report_attack_vectors."
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
    expect(toolContextBody).not.toContain("report_attack_vector:");
  });

  it("rejects duplicate stable ids inside one report_system_graph_batch submission", async () => {
    const workflow = makeWorkflow({
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["custom-http-proof"]
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        await expect(options.tools.report_system_graph_batch.execute({
          resources: [
            { id: "resource-admin", kind: "host", name: "admin.demo.local" },
            { id: "resource-admin", kind: "service", name: "duplicate" }
          ]
        })).rejects.toMatchObject({
          status: 400
        });
        await options.tools.complete_run.execute({
          summary: "Duplicate ids were rejected before completion."
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
  });

  it("returns an actionable ambiguity error when sourceTool matches multiple executed results", async () => {
    const workflow = makeWorkflow({
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["custom-http-proof"]
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin?repeat=1"
        });
        await expect(options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "resource:demo.local",
            kind: "host",
            name: "demo.local"
          }],
          findings: [{
            id: "finding-admin-panel",
            title: "Admin Panel Reachable",
            resourceIds: ["resource:demo.local"],
            evidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel"
            }]
          }]
        })).rejects.toThrow(/matched multiple executed results|Replace sourceTool with toolRunRef or observationRef/);
        await options.tools.complete_run.execute({
          summary: "Ambiguous sourceTool evidence was rejected."
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
  });

  it("merges later report_system_graph_batch updates without discarding earlier fields", async () => {
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
        const firstBatch = await options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "resource-admin",
            kind: "host",
            name: "admin.demo.local",
            summary: "Initial summary."
          }],
          resourceRelationships: [{
            id: "rel-admin-http",
            kind: "exposes",
            sourceResourceId: "resource-admin",
            targetResourceId: "resource-admin",
            summary: "Initial relationship summary."
          }],
          findings: [{
            id: "11111111-1111-4111-8111-111111111111",
            title: "Admin Panel Reachable",
            severity: "medium",
            confidence: 0.95,
            resourceId: "resource-admin",
            resourceIds: ["resource-admin"],
            evidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200",
              toolRunRef: toolOutput.id
            }],
            impact: "The admin panel is reachable.",
            recommendation: "Restrict access."
          }],
          findingRelationships: [{
            id: "22222222-2222-4222-8222-222222222222",
            kind: "related",
            sourceFindingId: "11111111-1111-4111-8111-111111111111",
            targetFindingId: "11111111-1111-4111-8111-111111111111",
            summary: "Initial finding relationship summary."
          }],
          paths: [{
            id: "path-admin",
            title: "Admin path",
            summary: "Initial path summary.",
            resourceIds: ["resource-admin"],
            findingIds: ["11111111-1111-4111-8111-111111111111"]
          }]
        });
        expect(firstBatch.accepted).toBe(true);

        const secondBatch = await options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "resource-admin"
          }],
          resourceRelationships: [{
            id: "rel-admin-http"
          }],
          findings: [{
            id: "11111111-1111-4111-8111-111111111111",
            title: "Admin Panel Reachable",
            resourceId: "resource-admin",
            resourceIds: ["resource-admin"],
            evidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200",
              toolRunRef: toolOutput.id
            }],
            recommendation: "Restrict admin access and add authentication hardening."
          }],
          findingRelationships: [{
            id: "22222222-2222-4222-8222-222222222222"
          }],
          paths: [{
            id: "path-admin"
          }]
        });
        expect(secondBatch.accepted).toBe(true);

        await options.tools.complete_run.execute({
          summary: "Graph batches merged safely."
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

    const graphEvent = createdRuns[0]!.events
      .filter((event) => event.type === "system_graph_reported")
      .at(-1);
    const batch = graphEvent?.payload["batch"] as Record<string, unknown> | undefined;
    const resources = Array.isArray(batch?.["resources"]) ? batch["resources"] as Array<Record<string, unknown>> : [];
    const resourceRelationships = Array.isArray(batch?.["resourceRelationships"]) ? batch["resourceRelationships"] as Array<Record<string, unknown>> : [];
    const findings = Array.isArray(batch?.["findings"]) ? batch["findings"] as Array<Record<string, unknown>> : [];
    const findingRelationships = Array.isArray(batch?.["findingRelationships"]) ? batch["findingRelationships"] as Array<Record<string, unknown>> : [];
    const paths = Array.isArray(batch?.["paths"]) ? batch["paths"] as Array<Record<string, unknown>> : [];
    expect(resources[0]?.["summary"]).toBe("Initial summary.");
    expect(resources[0]?.["kind"]).toBe("host");
    expect(resources[0]?.["name"]).toBe("admin.demo.local");
    expect(resourceRelationships[0]?.["summary"]).toBe("Initial relationship summary.");
    expect(resourceRelationships[0]?.["kind"]).toBe("exposes");
    expect(findings[0]?.["impact"]).toBe("The admin panel is reachable.");
    expect(findings[0]?.["recommendation"]).toBe("Restrict admin access and add authentication hardening.");
    expect(findingRelationships[0]?.["summary"]).toBe("Initial finding relationship summary.");
    expect(paths[0]?.["title"]).toBe("Admin path");
    expect(paths[0]?.["summary"]).toBe("Initial path summary.");

    const findingEvents = createdRuns[0]!.events.filter((event) => event.type === "finding_reported");
    expect(findingEvents).toHaveLength(2);
    expect(findingEvents[0]?.payload["finding"]).toMatchObject({
      createdAt: expect.any(String)
    });
    expect(findingEvents[1]?.payload["finding"]).toMatchObject({
      createdAt: (findingEvents[0]?.payload["finding"] as Record<string, unknown>)["createdAt"]
    });
  });

  it("accepts non-uuid stable ids in report_system_graph_batch finding relationships", async () => {
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
        const result = await options.tools.report_system_graph_batch.execute({
          resources: [{ id: "res_admin", kind: "endpoint", name: "/admin" }],
          findings: [{
            id: "find_admin_authbypass",
            title: "Admin auth bypass",
            severity: "critical",
            confidence: 0.95,
            resourceId: "res_admin",
            resourceIds: ["res_admin"],
            evidence: [{
              sourceTool: "custom-http-proof",
              quote: "GET /admin returned 200",
              toolRunRef: toolOutput.id
            }]
          }],
          findingRelationships: [{
            id: "rel_admin_authbypass_related",
            kind: "related",
            sourceFindingId: "find_admin_authbypass",
            targetFindingId: "find_admin_authbypass",
            summary: "String stable ids should be accepted."
          }]
        });
        expect(result).toMatchObject({
          accepted: true,
          relationshipIds: ["rel_admin_authbypass_related"]
        });
        await options.tools.complete_run.execute({
          summary: "Stable ids accepted."
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
  });

  it("hydrates sourceTool from toolRunRef for system graph evidence and persists non-uuid graph ids", async () => {
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
        const result = await options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "res_target_portal",
            kind: "custom",
            customKind: "web_application",
            name: "CorpNet Internal Portal",
            evidence: [{
              quote: "URL: http://localhost:3000/admin\nStatus: 200",
              toolRunRef: toolOutput.id
            }]
          }],
          findings: [{
            id: "find_admin_authbypass",
            title: "Admin auth bypass",
            severity: "critical",
            confidence: 0.95,
            resourceId: "res_target_portal",
            resourceIds: ["res_target_portal"],
            evidence: [{
              quote: "URL: http://localhost:3000/admin\nStatus: 200",
              toolRunRef: toolOutput.id
            }]
          }],
          findingRelationships: [{
            id: "rel_admin_authbypass_related",
            kind: "related",
            sourceFindingId: "find_admin_authbypass",
            targetFindingId: "find_admin_authbypass",
            summary: "String stable ids should remain valid."
          }],
          paths: [{
            id: "path_admin_access",
            title: "Admin access",
            findingIds: ["find_admin_authbypass"],
            resourceIds: ["res_target_portal"]
          }]
        });
        expect(result).toMatchObject({
          accepted: true,
          resourceIds: ["res_target_portal"],
          findingIds: ["find_admin_authbypass"],
          relationshipIds: ["rel_admin_authbypass_related"],
          pathIds: ["path_admin_access"]
        });
        await options.tools.complete_run.execute({
          summary: "System graph batch accepted."
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

    const graphEvent = createdRuns[0]!.events.find((event) => event.type === "system_graph_reported");
    const batch = graphEvent?.payload["batch"] as Record<string, unknown> | undefined;
    const resources = Array.isArray(batch?.["resources"]) ? batch["resources"] as Array<Record<string, unknown>> : [];
    const findings = Array.isArray(batch?.["findings"]) ? batch["findings"] as Array<Record<string, unknown>> : [];
    expect((resources[0]?.["evidence"] as Array<Record<string, unknown>> | undefined)?.[0]?.["sourceTool"]).toBe("custom-http-proof");
    expect((findings[0]?.["evidence"] as Array<Record<string, unknown>> | undefined)?.[0]?.["sourceTool"]).toBe("custom-http-proof");

    const attackVectorEvent = createdRuns[0]!.events.find((event) => event.type === "attack_vector_reported");
    expect((attackVectorEvent?.payload["attackVector"] as Record<string, unknown> | undefined)?.["id"]).toBe("rel_admin_authbypass_related");
  });

  it("rejects finding relationship evidence that cannot be grounded to one executed result", async () => {
    const workflow = makeWorkflow({
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["custom-http-proof"]
      }]
    });

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        const firstToolOutput = await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/admin"
        });
        await options.tools["custom-http-proof"].execute({
          baseUrl: "http://localhost:3000/health"
        });
        await expect(options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "res_target_portal",
            kind: "custom",
            customKind: "web_application",
            name: "CorpNet Internal Portal"
          }],
          findings: [{
            id: "find_admin_authbypass",
            title: "Admin auth bypass",
            severity: "critical",
            confidence: 0.95,
            resourceId: "res_target_portal",
            resourceIds: ["res_target_portal"],
            evidence: [{
              quote: "URL: http://localhost:3000/admin\nStatus: 200",
              toolRunRef: firstToolOutput.id
            }]
          }],
          findingRelationships: [{
            id: "rel_admin_authbypass_enables",
            kind: "enables",
            sourceFindingId: "find_admin_authbypass",
            targetFindingId: "find_admin_authbypass",
            summary: "Ambiguous sourceTool should be rejected.",
            evidence: [{
              sourceTool: "custom-http-proof",
              quote: "Observed handoff evidence."
            }]
          }]
        })).rejects.toMatchObject({
          status: 400,
          message: expect.stringContaining("Finding relationship rel_admin_authbypass_enables evidence[0] could not be grounded"),
          userFriendlyMessage: expect.stringContaining("Add a persisted evidence reference")
        });
        await options.tools.complete_run.execute({
          summary: "Ungrounded relationship evidence was rejected."
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
  });

  it("returns actionable repair hints for invalid system graph batches", async () => {
    const workflow = makeWorkflow();

    streamTextMock.mockImplementation((options: { tools: Record<string, { execute: (input: unknown) => Promise<any> }> }) => ({
      fullStream: (async function* () {
        await expect(options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "res_db_creds",
            kind: "credential",
            name: "Database Credentials",
            evidence: [{
              sourceTool: "bash",
              quote: "DB credentials: admin:CorpNet@2019!"
            }]
          }],
          findings: [{
            id: "find_disclosure",
            type: "information_disclosure",
            title: "Sensitive data disclosure",
            evidence: [{
              sourceTool: "bash",
              quote: "passwordHash exposed"
            }]
          }]
        })).rejects.toMatchObject({
          status: 400,
          message: expect.stringContaining("resources.0.kind"),
          userFriendlyMessage: expect.stringContaining("resources.0.kind: use one of")
        });
        await expect(options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "res_db_creds",
            kind: "credential",
            name: "Database Credentials",
            evidence: [{
              sourceTool: "bash",
              quote: "DB credentials: admin:CorpNet@2019!"
            }]
          }],
          findings: [{
            id: "find_disclosure",
            type: "information_disclosure",
            title: "Sensitive data disclosure",
            evidence: [{
              sourceTool: "bash",
              quote: "passwordHash exposed"
            }]
          }]
        })).rejects.toMatchObject({
          userFriendlyMessage: expect.stringContaining("resources.0.evidence.0: add one persisted evidence reference")
        });
        await expect(options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "res_db_creds",
            kind: "credential",
            name: "Database Credentials",
            evidence: [{
              sourceTool: "bash",
              quote: "DB credentials: admin:CorpNet@2019!"
            }]
          }],
          findings: [{
            id: "find_disclosure",
            type: "information_disclosure",
            title: "Sensitive data disclosure",
            evidence: [{
              sourceTool: "bash",
              quote: "passwordHash exposed"
            }]
          }]
        })).rejects.toMatchObject({
          userFriendlyMessage: expect.stringContaining("findings.0.type: use one of")
        });
        await options.tools.complete_run.execute({
          summary: "Invalid system graph batch repair hints were returned."
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
      expect(createdRuns[0]?.status).toBe("completed");
    });
  });

  it("completes without emitting README coverage assertions even when evidence and chains exist", async () => {
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
        const firstFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-panel",
          type: "service_exposure",
          title: "Admin Panel Reachable",
          severity: "medium",
          confidence: 0.95,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "The admin panel is reachable from the assessed surface.",
          recommendation: "Restrict access to trusted operators."
        });
        const secondFinding = await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-auth",
          type: "auth_weakness",
          title: "Admin Exposure Enables Authentication Attack",
          severity: "high",
          confidence: 0.92,
          target: { host: "demo.local", url: "http://localhost:3000/admin" },
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "The exposed admin panel can be chained with weak authentication checks.",
          recommendation: "Add authentication and network restrictions."
        });
        await options.tools.report_attack_vectors.execute({
          attackVectors: [{
            kind: "enables",
            sourceFindingId: firstFinding.findingId,
            destinationFindingId: secondFinding.findingId,
            summary: "The reachable admin surface enables the follow-on authentication weakness.",
            impact: "This path supports a chained compromise narrative.",
            confidence: 0.85,
            transitionEvidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
              toolRunRef: toolOutput.id
            }]
          }]
        });
        await options.tools.complete_run.execute({
          summary: "All README coverage assertions are demonstrated."
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

    expect(createdRuns[0]!.events.find((event) => event.title === "README coverage assertions")).toBeUndefined();
  });

  it("emits a dedicated report_system_graph_batch tool result summary for one finding", async () => {
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
          toolCallId: "call-report-system-graph-batch",
          toolName: "report_system_graph_batch",
          input: {
            resources: [{
              id: "resource:demo.local",
              kind: "host",
              name: "demo.local"
            }],
            findings: [{
              id: "finding-auth-bypass",
              type: "other",
              title: "SQL Injection Authentication Bypass",
              severity: "high",
              confidence: 0.98,
              target: { host: "demo.local" },
              resourceIds: ["resource:demo.local"],
              evidence: [{
                sourceTool: "custom-http-proof",
                quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
                toolRunRef: toolOutput.id
              }],
              impact: "Authentication bypass is possible.",
              recommendation: "Parameterize the query."
            }]
          }
        };
        const output = await options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "resource:demo.local",
            kind: "host",
            name: "demo.local"
          }],
          findings: [{
            id: "finding-auth-bypass",
          type: "other",
          title: "SQL Injection Authentication Bypass",
          severity: "high",
          confidence: 0.98,
          target: { host: "demo.local" },
            resourceIds: ["resource:demo.local"],
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }],
          impact: "Authentication bypass is possible.",
          recommendation: "Parameterize the query."
          }]
        });
        yield {
          type: "tool-result",
          toolCallId: "call-report-system-graph-batch",
          toolName: "report_system_graph_batch",
          output
        };
        await options.tools.complete_run.execute({
          summary: "Finding recorded."
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

    const toolResult = createdRuns[0]!.events.find((event) => event.type === "tool_result" && event.payload["toolName"] === "report_system_graph_batch");
    expect(toolResult?.summary).toBe("Recorded HIGH finding: SQL Injection Authentication Bypass on demo.local.");
    expect(toolResult?.detail).toContain("\"title\": \"SQL Injection Authentication Bypass\"");
    expect(toolResult?.detail).toContain("\"host\": \"demo.local\"");
  });

  it("accepts sparse report_system_graph_batch finding payloads and summary-only completion", async () => {
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
        await submitGraphFinding(options.tools.report_system_graph_batch, {
          id: "finding-admin-panel",
          title: "Admin Panel Reachable",
          evidence: [{
            sourceTool: "custom-http-proof",
            quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
            toolRunRef: toolOutput.id
          }]
        });
        await expect(options.tools.complete_run.execute({
          summary: "Minimal finding recorded."
        })).resolves.toEqual({ accepted: true });
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
    await service.startRun("10000000-0000-0000-0000-000000000001");

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    const findingEvent = createdRuns[0]!.events.find((event) => event.type === "finding_reported");
    const finding = findingEvent?.payload["finding"] as Record<string, unknown> | undefined;
    expect(finding?.["title"]).toBe("Admin Panel Reachable");
    expect(finding?.["type"]).toBe("other");
    expect(finding?.["severity"]).toBe("medium");
    expect(finding?.["impact"]).toBe("Evidence indicates: Admin Panel Reachable");
    expect(finding?.["recommendation"]).toBe("Review and remediate the reported issue based on the supporting evidence.");
    expect(createdRuns[0]!.events.some((event) => event.title === "Run completion accepted")).toBe(true);
  });

  it("accepts JSON-string report_system_graph_batch payloads", async () => {
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
        const result = await options.tools.report_system_graph_batch.execute(JSON.stringify({
          resources: [{
            id: "resource:demo.local",
            kind: "host",
            name: "demo.local"
          }],
          findings: [{
            id: "finding-admin-panel",
            type: "content_discovery",
            title: "Admin Panel Reachable",
            severity: "medium",
            confidence: 0.9,
            target: { host: "demo.local", url: "http://localhost:3000/admin" },
            resourceIds: ["resource:demo.local"],
            evidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
              toolRunRef: toolOutput.id
            }],
            impact: "The admin panel is directly reachable.",
            recommendation: "Restrict access to trusted operators."
          }]
        }));
        expect(result).toMatchObject({
          accepted: true,
          findingIds: ["finding-admin-panel"]
        });
        await options.tools.complete_run.execute({
          summary: "Finding recorded from string payload."
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

  it("warns when complete_run summary mentions a finding that failed reporting", async () => {
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
        await expect(options.tools.report_system_graph_batch.execute({
          resources: [{
            id: "resource:demo.local",
            kind: "host",
            name: "demo.local"
          }],
          findings: [{
            id: "finding-sensitive-data",
            title: "Sensitive Data Exposure",
            severity: "medium",
            target: { host: "demo.local" },
            resourceIds: ["resource:demo.local"],
            evidence: [{
              sourceTool: "custom-http-proof",
              quote: "URL: http://localhost:3000/admin\nStatus: 200\nSnippet: Administrator Control Panel",
              toolRunRef: `${toolOutput.id}-missing`
            }]
          }]
        })).rejects.toThrow(/unknown toolRunRef/i);
        await options.tools.complete_run.execute({
          summary: "The assessment found Sensitive Data Exposure."
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

    const warningEvent = createdRuns[0]!.events.find((event) => event.title === "Completion summary warning");
    expect(warningEvent?.summary).toBe("Completion summary included unsupported finding claims.");
    expect(warningEvent?.detail).toContain("Sensitive Data Exposure");
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
          summary: "Completed after recording the tool failure."
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
