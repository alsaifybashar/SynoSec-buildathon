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
  orchestrator?: Record<string, unknown>;
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
    providerName: "Anthropic",
    model: "claude-sonnet-4-6",
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
    orchestratorExecutionEngine: (overrides.orchestrator ?? {}) as any,
    executionReportsService: executionReportsService as any,
    fixedAnthropicRuntime: fixedRuntime as any
  });

  return { service, createdRuns, createdLaunch, workflowRunStream, executionReportsService };
}

function parseAttackMapPromptFindings(prompt: string) {
  const match = prompt.match(/Confirmed findings:\n([\s\S]*?)\n\nReview the confirmed findings\./);
  if (!match?.[1]) {
    throw new Error("Attack-map analysis prompt did not include serialized findings.");
  }

  return JSON.parse(match[1]) as Array<{
    id: string;
    title: string;
    severity: string;
    description: string;
    vector: string;
  }>;
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

  it("dispatches attack-map workflows through the attack-map handler and preserves tool activity ordering", async () => {
    const workflow = makeWorkflow({
      executionKind: "attack-map",
      name: "Attack Map Workflow"
    });
    const { service, createdRuns, executionReportsService } = createService({
      workflow,
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
        adaptAttackPlan: async (
          _targetUrl: string,
          plan: Record<string, unknown>
        ) => plan,
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

    const launch = await service.startRun(workflow.id);
    expect(launch.status).toBe("running");

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

  it("updates attack-map workflow plans after each completed phase and executes adaptive additions", async () => {
    const workflow = makeWorkflow({
      executionKind: "attack-map",
      name: "Adaptive Attack Map Workflow",
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["tool-nuclei"]
      }]
    });
    const createPlan = vi.fn(async (
      _targetUrl: string,
      _recon: unknown,
      plannerTools: Array<{ tool: { id: string; name: string; description: string | null } }>
    ) => {
      expect(plannerTools).toHaveLength(1);
      expect(plannerTools[0]?.tool.name).toBe("Nuclei");
      return {
        phases: [{
          id: "phase-1",
          name: "Initial Web Probe",
          priority: "high" as const,
          rationale: "HTTPS service discovered.",
          targetService: "https",
          tools: ["Nuclei"],
          status: "pending" as const
        }],
        overallRisk: "medium" as const,
        summary: "Initial plan."
      };
    });
    const adaptAttackPlan = vi
      .fn()
      .mockImplementationOnce(async (
        _targetUrl: string,
        plan: { phases: Array<Record<string, unknown>>; overallRisk: string; summary: string }
      ) => ({
        ...plan,
        phases: [
          ...plan.phases,
          {
            id: "phase-2",
            name: "Targeted Validation",
            priority: "high",
            rationale: "Follow up the confirmed exposure.",
            targetService: "https",
            tools: ["Nuclei"],
            status: "pending"
          },
          {
            id: "phase-3",
            name: "Session Hardening Check",
            priority: "medium",
            rationale: "Confirm whether the exposure can be chained further.",
            targetService: "https",
            tools: ["Nuclei"],
            status: "pending"
          }
        ],
        overallRisk: "high",
        summary: "Plan adapted after initial validation."
      }))
      .mockImplementationOnce(async (
        _targetUrl: string,
        plan: { phases: Array<Record<string, unknown>>; overallRisk: string; summary: string }
      ) => ({
        ...plan,
        phases: [
          ...plan.phases.map((phase) => phase.id === "phase-2" ? { ...phase, status: "completed" } : phase),
          {
            id: "phase-4",
            name: "Post-Exposure Verification",
            priority: "medium",
            rationale: "Validate the final attack path after follow-up checks.",
            targetService: "https",
            tools: ["Nuclei"],
            status: "pending"
          }
        ],
        overallRisk: "medium",
        summary: "Plan stabilized after targeted validation."
      }))
      .mockImplementation(async (
        _targetUrl: string,
        plan: { phases: Array<Record<string, unknown>>; overallRisk: string; summary: string }
      ) => plan);
    const executePhase = vi
      .fn()
      .mockImplementationOnce(async () => ({
        findings: [{
          title: "Exposed admin surface",
          severity: "high",
          description: "Admin route is reachable without gating.",
          vector: "/admin"
        }],
        probeCommand: "nuclei -u https://localhost:3000",
        probeOutput: "admin surface discovered",
        toolAttempts: [{
          toolRunId: "tool-run-1",
          toolName: "Nuclei",
          output: "admin surface discovered"
        }]
      }))
      .mockImplementationOnce(async () => ({
        findings: [],
        probeCommand: "nuclei -u https://localhost:3000 -tags auth",
        probeOutput: "targeted validation complete",
        toolAttempts: [{
          toolRunId: "tool-run-2",
          toolName: "Nuclei",
          output: "targeted validation complete"
        }]
      }))
      .mockImplementationOnce(async () => ({
        findings: [],
        probeCommand: "nuclei -u https://localhost:3000 -tags session",
        probeOutput: "session checks complete",
        toolAttempts: [{
          toolRunId: "tool-run-3",
          toolName: "Nuclei",
          output: "session checks complete"
        }]
      }))
      .mockImplementationOnce(async () => ({
        findings: [],
        probeCommand: "nuclei -u https://localhost:3000 -tags post-exposure",
        probeOutput: "post exposure verification complete",
        toolAttempts: [{
          toolRunId: "tool-run-4",
          toolName: "Nuclei",
          output: "post exposure verification complete"
        }]
      }));

    const { service, createdRuns } = createService({
      workflow,
      orchestrator: {
        runRecon: async () => ({
          openPorts: [{ port: 443, protocol: "tcp", service: "https", version: "nginx" }],
          technologies: ["nginx"],
          httpHeaders: { Server: "nginx" },
          serverInfo: { webServer: "nginx" },
          interestingPaths: [],
          probes: [],
          rawNmap: "443/tcp open https nginx",
          rawCurl: "HTTP/1.1 200 OK"
        }),
        createPlan,
        adaptAttackPlan,
        executePhase,
        deepDiveFinding: async () => [],
        correlateAttackChains: async () => []
      },
      aiToolById: {
        "tool-nuclei": {
          id: "tool-nuclei",
          name: "Nuclei",
          status: "active",
          source: "system",
          description: "Template-driven web validation.",
          builtinActionKey: null,
          executorType: "bash",
          bashSource: "nuclei -u {{baseUrl}}",
          category: "web",
          riskTier: "passive",
          capabilities: ["semantic-family", "http-surface", "passive"],
          timeoutMs: 60_000,
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

    const events = createdRuns[0]!.events;
    expect(createPlan).toHaveBeenCalledTimes(1);
    expect(executePhase).toHaveBeenCalledTimes(4);
    expect(events.filter((event) => event.title === "Attack plan updated")).toHaveLength(4);
    expect(adaptAttackPlan).toHaveBeenCalledTimes(4);
    expect(events.some((event) => event.type === "finding_reported" && event.payload?.["phase"] === "Initial Web Probe")).toBe(true);
    expect(events.find((event) => event.type === "run_completed")?.summary).toContain("4 phases executed, 0 phases skipped");
  });

  it("completes attack-map workflows when optional orchestrator transcript fields are missing", async () => {
    const workflow = makeWorkflow({
      executionKind: "attack-map",
      name: "Attack Map Workflow",
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["tool-nuclei"]
      }]
    });

    const { service, createdRuns } = createService({
      workflow,
      orchestrator: {
        runRecon: async () => ({
          openPorts: [{ port: 443, protocol: "tcp", service: "https", version: "nginx" }],
          technologies: ["nginx"],
          httpHeaders: { Server: "nginx" },
          serverInfo: { webServer: "nginx" },
          interestingPaths: [],
          probes: [],
          rawNmap: "443/tcp open https nginx",
          rawCurl: undefined
        }),
        createPlan: async () => ({
          phases: [{
            id: "phase-1",
            name: "Initial Web Probe",
            priority: "high" as const,
            rationale: "HTTPS service discovered.",
            targetService: "https",
            tools: ["Nuclei"],
            status: "pending" as const
          }],
          overallRisk: "medium" as const,
          summary: "Initial plan."
        }),
        adaptAttackPlan: async (
          _targetUrl: string,
          plan: { phases: Array<Record<string, unknown>>; overallRisk: string; summary: string }
        ) => plan,
        executePhase: async () => ({
          findings: [{
            title: "Exposed admin surface",
            severity: "high",
            description: "Admin route is reachable without gating.",
            vector: "/admin",
            rawEvidence: undefined
          }],
          probeCommand: "nuclei -u https://localhost:3000",
          probeOutput: undefined,
          toolAttempts: [{
            toolRunId: "tool-run-1",
            toolName: "Nuclei",
            output: undefined
          }]
        }),
        deepDiveFinding: async () => [],
        correlateAttackChains: async () => []
      },
      aiToolById: {
        "tool-nuclei": {
          id: "tool-nuclei",
          name: "Nuclei",
          status: "active",
          source: "system",
          description: "Template-driven web validation.",
          builtinActionKey: null,
          executorType: "bash",
          bashSource: "nuclei -u {{baseUrl}}",
          category: "web",
          riskTier: "passive",
          capabilities: ["semantic-family", "http-surface", "passive"],
          timeoutMs: 60_000,
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

    expect(createdRuns[0]!.events.some((event) => event.type === "run_completed")).toBe(true);
  });

  it("runs deep analysis and attack chain correlation only when the attack-map model explicitly calls the built-ins", async () => {
    const deepDiveFinding = vi.fn(async () => [{
      id: "child-finding-node",
      type: "finding" as const,
      label: "Reachable privileged console",
      status: "vulnerable" as const,
      severity: "critical" as const,
      data: {
        description: "The confirmed admin surface leads to a reachable privileged console.",
        vector: "Post-auth privileged console"
      }
    }]);
    const correlateAttackChains = vi.fn(async (findings: Array<{ id: string }>) => [{
      title: "Admin Surface To Privileged Console",
      description: "The exposed admin route can be chained into a privileged console.",
      severity: "critical" as const,
      findingIds: findings.map((finding) => finding.id).slice(0, 2),
      exploitation: "Reach the admin surface, then pivot into the privileged console.",
      impact: "Attacker gains privileged application control."
    }]);

    streamTextMock.mockImplementation((options: {
      prompt: string;
      tools: Record<string, { execute: (input: unknown) => Promise<unknown> }>;
    }) => {
      if (!("deep_analysis" in options.tools)) {
        return {
          fullStream: (async function* () {
            yield {
              type: "finish",
              finishReason: "stop",
              rawFinishReason: "end_turn",
              totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
            };
          })()
        };
      }

      return {
        fullStream: (async function* () {
          const findings = parseAttackMapPromptFindings(options.prompt);
          const parentFinding = findings[0]!;
          yield {
            type: "tool-call",
            toolCallId: "call-deep-analysis",
            toolName: "deep_analysis",
            input: parentFinding
          };
          const deepResult = await options.tools.deep_analysis.execute({
            findingId: parentFinding.id,
            title: parentFinding.title,
            severity: parentFinding.severity,
            description: parentFinding.description,
            vector: parentFinding.vector
          }) as { findings: Array<{ findingId: string }> };
          yield {
            type: "tool-result",
            toolCallId: "call-deep-analysis",
            toolName: "deep_analysis",
            output: deepResult
          };
          yield {
            type: "tool-call",
            toolCallId: "call-correlation",
            toolName: "attack_chain_correlation",
            input: {
              findings: [
                { id: parentFinding.id },
                { id: deepResult.findings[0]!.findingId }
              ]
            }
          };
          const chainResult = await options.tools.attack_chain_correlation.execute({
            findings: [
              { id: parentFinding.id },
              { id: deepResult.findings[0]!.findingId }
            ]
          });
          yield {
            type: "tool-result",
            toolCallId: "call-correlation",
            toolName: "attack_chain_correlation",
            output: chainResult
          };
          yield {
            type: "finish",
            finishReason: "stop",
            rawFinishReason: "end_turn",
            totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }
          };
        })()
      };
    });

    const workflow = makeWorkflow({
      executionKind: "attack-map",
      name: "Attack Map Workflow",
      stages: [{
        ...makeWorkflow().stages[0]!,
        allowedToolIds: ["tool-nuclei"]
      }]
    });
    const { service, createdRuns } = createService({
      workflow,
      orchestrator: {
        runRecon: async () => ({
          openPorts: [{ port: 443, protocol: "tcp", service: "https", version: "nginx" }],
          technologies: ["nginx"],
          httpHeaders: { Server: "nginx" },
          serverInfo: { webServer: "nginx" },
          interestingPaths: [],
          probes: [],
          rawNmap: "443/tcp open https nginx",
          rawCurl: "HTTP/1.1 200 OK"
        }),
        createPlan: async () => ({
          phases: [{
            id: "phase-1",
            name: "Initial Web Probe",
            priority: "high" as const,
            rationale: "HTTPS service discovered.",
            targetService: "https",
            tools: ["Nuclei"],
            status: "pending" as const
          }],
          overallRisk: "medium" as const,
          summary: "Initial plan."
        }),
        adaptAttackPlan: async (
          _targetUrl: string,
          plan: { phases: Array<Record<string, unknown>>; overallRisk: string; summary: string }
        ) => plan,
        executePhase: async () => ({
          findings: [{
            title: "Exposed admin surface",
            severity: "high",
            description: "Admin route is reachable without gating.",
            vector: "/admin"
          }],
          probeCommand: "nuclei -u https://localhost:3000",
          probeOutput: "admin surface discovered",
          toolAttempts: [{
            toolRunId: "tool-run-1",
            toolName: "Nuclei",
            output: "admin surface discovered"
          }]
        }),
        deepDiveFinding,
        correlateAttackChains
      },
      aiToolById: {
        "tool-nuclei": {
          id: "tool-nuclei",
          name: "Nuclei",
          status: "active",
          source: "system",
          description: "Template-driven web validation.",
          builtinActionKey: null,
          executorType: "bash",
          bashSource: "nuclei -u {{baseUrl}}",
          category: "web",
          riskTier: "passive",
          capabilities: ["semantic-family", "http-surface", "passive"],
          timeoutMs: 60_000,
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
        }
      }
    });

    await service.startRun(workflow.id);

    await vi.waitFor(() => {
      expect(createdRuns[0]?.status).toBe("completed");
    });

    expect(deepDiveFinding).toHaveBeenCalledTimes(1);
    expect(correlateAttackChains).toHaveBeenCalledTimes(1);
    expect(createdRuns[0]!.events.some((event) => event.type === "tool_call" && event.payload?.["toolName"] === "deep_analysis")).toBe(true);
    expect(createdRuns[0]!.events.some((event) => event.type === "tool_call" && event.payload?.["toolName"] === "attack_chain_correlation")).toBe(true);
    expect(createdRuns[0]!.events.some((event) => event.title === "Built-in tool context")).toBe(true);
    expect(createdRuns[0]!.events.some((event) => event.type === "finding_reported" && event.payload?.["phase"] === "deep_analysis")).toBe(true);
    expect(createdRuns[0]!.events.find((event) => event.type === "run_completed")?.summary).toContain("2 findings reported, 1 attack chains identified");
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
    expect(toolContextBody).not.toContain("deep_analysis");

    const systemPromptEvent = createdRuns[0]!.events.find((event) => event.title === "Rendered system prompt");
    expect(systemPromptEvent?.detail).toContain("You are executing the \"Pipeline\" stage of the workflow \"Pipeline Workflow\".");
    expect(systemPromptEvent?.detail).toContain("Runtime target context:");
    expect(systemPromptEvent?.detail).toContain("Target: Demo Target");
    expect(systemPromptEvent?.detail).toContain("Target URL: http://localhost:3000/");
    expect(systemPromptEvent?.detail).toContain("Workflow execution contract:");
    expect(systemPromptEvent?.payload["promptSourceLabel"]).toBe("Workflow-owned editable system prompt plus engine-generated target context and runtime contract.");
    expect(createdRuns[0]!.events.find((event) => event.title === "Rendered task prompt")).toBeUndefined();

    expect(createdRuns[0]!.events.some((event) => event.type === "tool_call" && event.payload?.["toolName"] === "log_progress")).toBe(false);
    expect(createdRuns[0]!.events.some((event) => event.type === "tool_result" && event.payload?.["toolName"] === "log_progress")).toBe(false);
    expect(createdRuns[0]!.events.some((event) => event.type === "run_completed")).toBe(true);

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
