import { describe, expect, it } from "vitest";
import type { WorkflowLaunch, WorkflowReportedFinding } from "@synosec/contracts";
import { buildExecutionGraphFromWorkflowFindings, selectLatestWorkflowLaunchRun } from "@/features/workflows/workflow-graph";

describe("selectLatestWorkflowLaunchRun", () => {
  it("selects the newest run using completedAt and falls back to startedAt", () => {
    const launch: WorkflowLaunch = {
      id: "50000000-0000-4000-8000-000000000001",
      workflowId: "50000000-0000-4000-8000-000000000002",
      status: "completed",
      startedAt: "2026-04-25T10:00:00.000Z",
      completedAt: "2026-04-25T10:20:00.000Z",
      runs: [
        {
          targetId: "50000000-0000-4000-8000-000000000101",
          runId: "50000000-0000-4000-8000-000000000201",
          status: "completed",
          startedAt: "2026-04-25T10:00:00.000Z",
          completedAt: "2026-04-25T10:05:00.000Z",
          errorMessage: null
        },
        {
          targetId: "50000000-0000-4000-8000-000000000102",
          runId: "50000000-0000-4000-8000-000000000202",
          status: "running",
          startedAt: "2026-04-25T10:07:00.000Z",
          completedAt: null,
          errorMessage: null
        },
        {
          targetId: "50000000-0000-4000-8000-000000000103",
          runId: "50000000-0000-4000-8000-000000000203",
          status: "completed",
          startedAt: "2026-04-25T10:02:00.000Z",
          completedAt: "2026-04-25T10:12:00.000Z",
          errorMessage: null
        }
      ]
    };

    const latest = selectLatestWorkflowLaunchRun(launch);
    expect(latest?.runId).toBe("50000000-0000-4000-8000-000000000203");
  });
});

describe("buildExecutionGraphFromWorkflowFindings", () => {
  it("builds evidence/finding/attack-chain nodes without deriving finding relationship edges from findings alone", () => {
    const findings: WorkflowReportedFinding[] = [
      {
        id: "60000000-0000-4000-8000-000000000001",
        workflowRunId: "60000000-0000-4000-8000-000000000010",
        workflowStageId: "60000000-0000-4000-8000-000000000020",
        type: "service_exposure",
        title: "Admin endpoint exposed",
        severity: "high",
        confidence: 0.9,
        target: { host: "target.local", path: "/admin" },
        evidence: [{
          sourceTool: "httpx",
          quote: "GET /admin returned 200",
          toolRunRef: "tool-run-1"
        }],
        impact: "Exposed admin surface increases attack options.",
        recommendation: "Restrict access.",
        validationStatus: "single_source",
        derivedFromFindingIds: [],
        relatedFindingIds: [],
        enablesFindingIds: [],
        attackChain: {
          title: "Privilege escalation path",
          summary: "Exposure supports a broader chain.",
          severity: "high"
        },
        tags: [],
        createdAt: "2026-04-25T10:00:00.000Z"
      },
      {
        id: "60000000-0000-4000-8000-000000000002",
        workflowRunId: "60000000-0000-4000-8000-000000000010",
        workflowStageId: "60000000-0000-4000-8000-000000000020",
        type: "auth_weakness",
        title: "Credential reuse accepted",
        severity: "high",
        confidence: 0.92,
        target: { host: "target.local", path: "/admin/pivot" },
        evidence: [{
          sourceTool: "hydra",
          quote: "credential reuse succeeded",
          toolRunRef: "tool-run-2"
        }],
        impact: "Follow-on privilege pivot is possible.",
        recommendation: "Rotate credentials.",
        validationStatus: "cross_validated",
        derivedFromFindingIds: [],
        relatedFindingIds: [],
        enablesFindingIds: [],
        tags: [],
        createdAt: "2026-04-25T10:01:00.000Z"
      }
    ];

    const graph = buildExecutionGraphFromWorkflowFindings(findings);

    expect(graph.nodes.some((node) => node.kind === "finding" && node.id === findings[0]?.id)).toBe(true);
    expect(graph.nodes.some((node) => node.kind === "finding" && node.id === findings[1]?.id)).toBe(true);
    expect(graph.nodes.some((node) => node.kind === "evidence" && node.id === `${findings[0]?.id}:evidence:0`)).toBe(true);
    expect(graph.nodes.some((node) => node.kind === "attack_chain")).toBe(true);

    expect(graph.edges.some((edge) => edge.kind === "supports" && edge.target === findings[0]?.id)).toBe(true);
    expect(graph.edges.some((edge) => edge.kind === "derived_from")).toBe(false);
    expect(graph.edges.some((edge) => edge.kind === "correlates_with")).toBe(false);
  });
});
