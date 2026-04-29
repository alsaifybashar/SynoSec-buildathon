import { describe, expect, it, vi } from "vitest";
import {
  defaultWorkflowStageSystemPrompt,
  defaultWorkflowTaskPromptTemplate,
  type Workflow,
  type WorkflowRun
} from "@synosec/contracts";
import { WorkflowRunEvaluationService } from "./workflow-run-evaluation.service.js";

const workflow: Workflow = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Workflow Eval",
  status: "active",
  description: null,
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
}) {
  const run = input.run ?? createRun();
  const targetBaseUrl = input.targetBaseUrl === undefined
    ? "http://localhost:8888"
    : input.targetBaseUrl;
  return new WorkflowRunEvaluationService(
    {
      getRunById: vi.fn().mockResolvedValue(run),
      getById: vi.fn().mockResolvedValue(workflow)
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
      getById: vi.fn().mockResolvedValue({
        id: workflow.agentId,
        name: "Agent",
        status: "active",
        description: null,
        systemPrompt: "Be precise.",
        toolAccessMode: "system",
        createdAt: "2026-04-29T00:00:00.000Z",
        updatedAt: "2026-04-29T00:00:00.000Z"
      })
    } as any,
    {
      list: vi.fn().mockResolvedValue({
        items: [{
          id: "tool-1",
          name: "Web Probe",
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
        }],
        page: 1,
        pageSize: 100,
        total: 1,
        totalPages: 1
      }),
      getById: vi.fn().mockResolvedValue({
        id: "tool-1",
        name: "Web Probe",
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
