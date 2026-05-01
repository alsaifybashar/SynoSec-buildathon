import { describe, expect, it, vi } from "vitest";
import {
  defaultWorkflowStageSystemPrompt,
  defaultWorkflowTaskPromptTemplate,
  type Workflow,
  type WorkflowRun
} from "@synosec/contracts";
import { WorkflowRunEvaluationService } from "@/modules/workflow-evals/workflow-run-evaluation.service.js";

const workflow: Workflow = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Workflow Eval",
  status: "active",
  description: null,
  executionKind: "workflow",
  preRunEvidenceEnabled: false,
  agentId: "50000000-0000-0000-0000-000000000001",
  objective: "Evaluate a run.",
  stageSystemPrompt: defaultWorkflowStageSystemPrompt,
  taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
  allowedToolIds: ["tool-1"],
  requiredEvidenceTypes: [],
  findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
  completionRule: { requireStageResult: false, requireToolCall: false, allowEmptyResult: true, minFindings: 0 },
  resultSchemaVersion: 1,
  handoffSchema: null,
  stages: [],
  createdAt: "2026-04-29T00:00:00.000Z",
  updatedAt: "2026-04-29T00:00:00.000Z"
};

function createRun(overrides?: Partial<WorkflowRun>): WorkflowRun {
  return {
    id: "60000000-0000-0000-0000-000000000001",
    workflowId: workflow.id,
    workflowLaunchId: "61000000-0000-0000-0000-000000000001",
    targetId: "20000000-0000-0000-0000-000000000001",
    preRunEvidenceEnabled: false,
    preRunEvidenceOverride: null,
    status: "completed",
    currentStepIndex: 1,
    startedAt: "2026-04-29T00:00:00.000Z",
    completedAt: "2026-04-29T00:01:00.000Z",
    tokenUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    trace: [],
    events: [],
    ...overrides
  };
}

function createService(input: {
  run?: WorkflowRun;
  targetBaseUrl?: string | null;
  report?: unknown;
  tools?: Array<{ id: string; name: string }>;
  workflowAllowedToolIds?: string[];
}) {
  const run = input.run ?? createRun();
  const targetBaseUrl = input.targetBaseUrl === undefined
    ? "http://localhost:8888"
    : input.targetBaseUrl;
  const tools = input.tools ?? [{ id: "tool-1", name: "Web Probe" }];
  return new WorkflowRunEvaluationService(
    {
      getRunById: vi.fn().mockResolvedValue(run),
      getById: vi.fn().mockResolvedValue({
        ...workflow,
        allowedToolIds: input.workflowAllowedToolIds ?? workflow.allowedToolIds,
        stages: (
          workflow.stages.length > 0
            ? workflow.stages
            : [{
                id: "stage-1",
                label: "Eval",
                agentId: workflow.agentId,
                ord: 0,
                objective: workflow.objective,
                stageSystemPrompt: defaultWorkflowStageSystemPrompt,
                taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
                allowedToolIds: [],
                requiredEvidenceTypes: [],
                findingPolicy: { taxonomy: "typed-core-v1", allowedTypes: ["other"] },
                completionRule: { requireStageResult: false, requireToolCall: false, allowEmptyResult: true, minFindings: 0 },
                resultSchemaVersion: 1,
                handoffSchema: null
              }]
        ).map((stage) => ({
          ...stage,
          allowedToolIds: input.workflowAllowedToolIds ?? stage.allowedToolIds
        }))
      })
    } as any,
    {
      getById: vi.fn().mockResolvedValue({
        id: run.targetId,
        name: "Demo Target",
        baseUrl: targetBaseUrl,
        executionBaseUrl: targetBaseUrl,
        environment: "development",
        status: "active",
        lastScannedAt: null,
        createdAt: "2026-04-29T00:00:00.000Z",
        updatedAt: "2026-04-29T00:00:00.000Z"
      })
    } as any,
    {
      list: vi.fn().mockResolvedValue({
        items: tools.map((tool) => ({
          id: tool.id,
          name: tool.name,
          kind: "raw-adapter",
          status: "active",
          source: "system",
          accessProfile: "standard",
          description: "Probe",
          executorType: "bash",
          builtinActionKey: null,
          bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' ok",
          capabilities: ["web-recon"],
          category: "web",
          riskTier: "passive",
          timeoutMs: 1000,
          coveredToolIds: [],
          candidateToolIds: [],
          inputSchema: { type: "object" },
          outputSchema: { type: "object" },
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z"
        })),
        page: 1,
        pageSize: 100,
        total: tools.length,
        totalPages: 1
      }),
      getById: vi.fn().mockImplementation(async (toolId: string) => {
        const tool = tools.find((entry) => entry.id === toolId);
        if (!tool) {
          return null;
        }
        return {
          id: tool.id,
          name: tool.name,
          kind: "raw-adapter",
          status: "active",
          source: "system",
          accessProfile: "standard",
          description: "Probe",
          executorType: "bash",
          builtinActionKey: null,
          bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' ok",
          capabilities: ["web-recon"],
          category: "web",
          riskTier: "passive",
          timeoutMs: 1000,
          coveredToolIds: [],
          candidateToolIds: [],
          inputSchema: { type: "object" },
          outputSchema: { type: "object" },
          createdAt: "2026-04-29T00:00:00.000Z",
          updatedAt: "2026-04-29T00:00:00.000Z"
        };
      })
    } as any,
    {
      list: vi.fn().mockResolvedValue({
        items: input.report ? [{ id: "report-1", executionId: run.id }] : [],
        page: 1,
        pageSize: 100,
        total: input.report ? 1 : 0,
        totalPages: input.report ? 1 : 0
      }),
      getById: vi.fn().mockResolvedValue(input.report ?? null)
    } as any
  );
}

describe("WorkflowRunEvaluationService", () => {
  it("scores the vulnerable-app target from documented weakness evidence", async () => {
    const run = createRun({
      events: [{
        id: "event-1",
        workflowRunId: "60000000-0000-0000-0000-000000000001",
        workflowId: workflow.id,
        workflowStageId: null,
        stepIndex: 0,
        ord: 0,
        type: "agent_summary",
        status: "completed",
        title: "Summary",
        summary: "Validated /login SQL injection, /admin access, /api/users leakage, /files listing, and reflected XSS on /search.",
        detail: null,
        payload: {},
        createdAt: "2026-04-29T00:00:30.000Z"
      }]
    });

    const service = createService({ run });
    const result = await service.evaluateRun(run.id);

    expect(result.status).toBe("available");
    expect(result.status === "available" ? result.targetPack : null).toBe("vulnerable-app");
    expect(result.status === "available" ? result.score : 0).toBe(90);
  });

  it("scores the full-stack target from attack-track progression", async () => {
    const run = createRun({
      events: [{
        id: "event-1",
        workflowRunId: "60000000-0000-0000-0000-000000000001",
        workflowId: workflow.id,
        workflowStageId: null,
        stepIndex: 0,
        ord: 0,
        type: "agent_summary",
        status: "completed",
        title: "Summary",
        summary: "Observed /vendors, /api/vendors/acme/invoices/123, /api/finance/export with approval, /support/search?q=recovery, /api/support/cases/42, and /api/auth/recover issuing a finance-manager session.",
        detail: null,
        payload: {},
        createdAt: "2026-04-29T00:00:30.000Z"
      }]
    });

    const service = createService({ run, targetBaseUrl: "http://localhost:8891" });
    const result = await service.evaluateRun(run.id);

    expect(result.status).toBe("available");
    expect(result.status === "available" ? result.targetPack : null).toBe("full-stack-target");
    expect(result.status === "available" ? result.score : 0).toBeGreaterThanOrEqual(80);
  });

  it("scores vulnerable-app preamble route evidence from pre-run artifacts when enabled", async () => {
    const run = createRun({
      preRunEvidenceEnabled: true,
      events: [{
        id: "pre-run-1",
        workflowRunId: "60000000-0000-0000-0000-000000000001",
        workflowId: workflow.id,
        workflowStageId: null,
        stepIndex: 0,
        ord: 0,
        type: "system_message",
        status: "completed",
        title: "Scan preamble summary",
        summary: "Prepared 1 automatic scan result for the first model turn.",
        detail: "Scan preamble:\n- Observation: /login is reachable.\n- Observation: /admin redirects to /login.\n- Observation: /api/users leaks records.\n- Observation: /files exposes directory listings.\n- Observation: /search reflects user input.",
        payload: {
          phase: "pre_run",
          title: "Scan preamble summary",
          body: "Scan preamble:\n- Observation: /login is reachable.\n- Observation: /admin redirects to /login.\n- Observation: /api/users leaks records.\n- Observation: /files exposes directory listings.\n- Observation: /search reflects user input."
        },
        createdAt: "2026-04-29T00:00:20.000Z"
      }]
    });

    const service = createService({ run });
    const result = await service.evaluateRun(run.id);

    expect(result.status).toBe("available");
    expect(result.status === "available" ? result.subscores.find((item) => item.key === "evidence-coverage")?.score : 0).toBe(10);
    expect(result.status === "available" ? result.explanation[2] : "").toContain("Scan preamble route evidence");
  });

  it("penalizes partial full-stack coverage and failed execution steps", async () => {
    const run = createRun({
      events: [
        {
          id: "event-1",
          workflowRunId: "60000000-0000-0000-0000-000000000001",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 0,
          type: "agent_summary",
          status: "completed",
          title: "Summary",
          summary: "Observed /vendors, /support/search?q=recovery, /api/support/cases/case-8842, and /api/auth/recover issuing a session token for finance-manager.",
          detail: null,
          payload: {},
          createdAt: "2026-04-29T00:00:30.000Z"
        },
        {
          id: "event-2",
          workflowRunId: "60000000-0000-0000-0000-000000000001",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 1,
          type: "tool_result",
          status: "failed",
          title: "bash returned",
          summary: "Command exited with code 1.",
          detail: null,
          payload: {},
          createdAt: "2026-04-29T00:00:40.000Z"
        },
        {
          id: "event-3",
          workflowRunId: "60000000-0000-0000-0000-000000000001",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 2,
          type: "tool_result",
          status: "failed",
          title: "report_system_graph_batch failed",
          summary: "Evidence item 1 references unknown observationRef.",
          detail: null,
          payload: {},
          createdAt: "2026-04-29T00:00:50.000Z"
        }
      ]
    });

    const report = {
      findings: [
        { title: "Support case leak", summary: "GET /api/support/cases/case-8842 returns a recovery token." },
        { title: "Weak recovery flow", summary: "/api/auth/recover issues a session token." }
      ],
      toolActivity: [],
      attackPaths: [],
      graph: {
        attackVectors: [
          { summary: "Recovery token obtained from case API can be used with exposed email to obtain session token" }
        ]
      }
    };

    const service = createService({ run, report, targetBaseUrl: "http://localhost:8891" });
    const result = await service.evaluateRun(run.id);

    expect(result.status).toBe("available");
    expect(result.status === "available" ? result.targetPack : null).toBe("full-stack-target");
    expect(result.status === "available" ? result.score : 0).toBe(77);
  });

  it("scores the Juice Shop target from challenge evidence and truncates unmet expectations", async () => {
    const run = createRun({
      events: [{
        id: "event-1",
        workflowRunId: "60000000-0000-0000-0000-000000000001",
        workflowId: workflow.id,
        workflowStageId: null,
        stepIndex: 0,
        ord: 0,
        type: "agent_summary",
        status: "completed",
        title: "Summary",
        summary: "Solved Login Admin, Password Hash Leak, Admin Section, Score Board, and Access Log. Reached /rest/user/whoami and /#/administration while verifying access log exposure.",
        detail: null,
        payload: {},
        createdAt: "2026-04-29T00:00:30.000Z"
      }]
    });

    const service = createService({ run, targetBaseUrl: "http://localhost:3000" });
    const result = await service.evaluateRun(run.id);

    expect(result.status).toBe("available");
    expect(result.status === "available" ? result.targetPack : null).toBe("juice-shop");
    expect(result.status === "available" ? result.totalExpectations : 0).toBe(111);
    expect(result.status === "available" ? result.matchedExpectations.length : 0).toBeGreaterThanOrEqual(4);
    expect(result.status === "available" ? result.unmetExpectations.length : 0).toBeLessThanOrEqual(25);
    expect(result.status === "available" ? result.unmetExpectationsTruncatedCount : 0).toBeGreaterThan(0);
    expect(result.status === "available" ? result.explanation.join(" ") : "").toContain("capped to 25 entries");
  });

  it("resolves Juice Shop via the internal execution URL", async () => {
    const run = createRun({
      events: [{
        id: "event-1",
        workflowRunId: "60000000-0000-0000-0000-000000000001",
        workflowId: workflow.id,
        workflowStageId: null,
        stepIndex: 0,
        ord: 0,
        type: "agent_summary",
        status: "completed",
        title: "Summary",
        summary: "Observed the Score Board and Admin Section challenge surfaces.",
        detail: null,
        payload: {},
        createdAt: "2026-04-29T00:00:30.000Z"
      }]
    });

    const service = createService({ run, targetBaseUrl: "http://synosec-juice-shop-target:3000" });
    const result = await service.evaluateRun(run.id);

    expect(result.status).toBe("available");
    expect(result.status === "available" ? result.targetPack : null).toBe("juice-shop");
  });

  it("scores auth-lab runs when the workflow uses only auth probe tools", async () => {
    const run = createRun({
      events: [{
        id: "event-auth-1",
        workflowRunId: "60000000-0000-0000-0000-000000000001",
        workflowId: workflow.id,
        workflowStageId: null,
        stepIndex: 0,
        ord: 0,
        type: "agent_summary",
        status: "completed",
        title: "Summary",
        summary: "Ran one preflight request for csrf and session state. Rate-limit check found throttling. Oracle check stayed similar for known-user versus unknown-user. Artifact validation used stable baseline comparison. Explicit success hints matched dashboard-ready.",
        detail: null,
        payload: {},
        createdAt: "2026-04-29T00:00:30.000Z"
      }]
    });

    const service = createService({
      run,
      targetBaseUrl: null,
      tools: [
        { id: "native-auth-login-probe", name: "Login Security Probe" },
        { id: "native-auth-artifact-validation", name: "Auth Artifact Validator" }
      ],
      workflowAllowedToolIds: ["native-auth-login-probe", "native-auth-artifact-validation"]
    });
    const result = await service.evaluateRun(run.id);

    expect(result.status).toBe("available");
    expect(result.status === "available" ? result.targetPack : null).toBe("auth-lab");
    expect(result.status === "available" ? result.score : 0).toBeGreaterThanOrEqual(80);
  });

  it("returns unavailable for unsupported targets", async () => {
    const service = createService({ targetBaseUrl: "http://localhost:9999" });
    const result = await service.evaluateRun("60000000-0000-0000-0000-000000000001");

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "unsupported_target",
      label: "Not available"
    });
  });

  it("returns unavailable when target context is missing", async () => {
    const service = createService({ targetBaseUrl: null });
    const result = await service.evaluateRun("60000000-0000-0000-0000-000000000001");

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "missing_target_context",
      label: "Not available"
    });
  });
});
