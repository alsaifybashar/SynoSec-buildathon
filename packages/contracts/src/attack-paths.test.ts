import { describe, expect, it } from "vitest";
import type { WorkflowReportedFinding, WorkflowRun } from "./resources.js";
import { buildAttackPathSummary } from "./attack-paths.js";
import { buildWorkflowRunReport } from "./workflow-presentation.js";

function finding(input: Partial<WorkflowReportedFinding> & Pick<WorkflowReportedFinding, "id" | "title">): WorkflowReportedFinding {
  return {
    workflowRunId: "50000000-0000-4000-8000-000000000001",
    workflowStageId: null,
    type: "other",
    severity: "medium",
    confidence: 0.8,
    target: {
      host: "target.local",
      url: `https://target.local/${input.id.slice(0, 4)}`
    },
    evidence: [{ sourceTool: "httpx", quote: "evidence", toolRunRef: "tool-run-1" }],
    impact: `${input.title} impact`,
    recommendation: "Fix it.",
    validationStatus: "single_source",
    derivedFromFindingIds: [],
    relatedFindingIds: [],
    enablesFindingIds: [],
    tags: [],
    createdAt: "2026-04-25T12:00:00.000Z",
    ...input
  };
}

describe("buildAttackPathSummary", () => {
  it("builds a confirmed path from enables-only relationships", () => {
    const entry = finding({
      id: "10000000-0000-4000-8000-000000000001",
      title: "Admin surface exposed",
      severity: "high",
      enablesFindingIds: ["10000000-0000-4000-8000-000000000002"],
      explanationSummary: "The admin surface is reachable without a gateway.",
      confidenceReason: "A direct probe confirmed the route.",
      relationshipExplanations: {
        enables: "The exposed admin surface enables the follow-on privileged test."
      }
    });
    const pivot = finding({
      id: "10000000-0000-4000-8000-000000000002",
      title: "Privilege pivot confirmed",
      severity: "critical",
      validationStatus: "cross_validated",
      explanationSummary: "Credential reuse reaches a privileged path.",
      confidenceReason: "The follow-on validation succeeded immediately after the entrypoint was confirmed."
    });

    const result = buildAttackPathSummary({ findings: [entry, pivot] });

    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]?.findingIds).toEqual([entry.id, pivot.id]);
    expect(result.paths[0]?.status).toBe("confirmed");
    expect(result.paths[0]?.pathSeverity).toBe("critical");
  });

  it("marks a path as qualified when it depends on suspected findings and merges handoff copy", () => {
    const entry = finding({
      id: "20000000-0000-4000-8000-000000000001",
      title: "Legacy login exposed",
      relatedFindingIds: ["20000000-0000-4000-8000-000000000002"],
      explanationSummary: "The legacy login is reachable from the public edge.",
      confidenceReason: "The route is observable but not yet cross-validated.",
      relationshipExplanations: {
        relatedTo: "The login exposure correlates with the downstream token weakness."
      }
    });
    const token = finding({
      id: "20000000-0000-4000-8000-000000000002",
      title: "Token audience mismatch",
      validationStatus: "suspected",
      explanationSummary: "The token validator may accept the wrong audience.",
      confidenceReason: "The result is plausible but still needs a second validation source."
    });

    const result = buildAttackPathSummary({
      findings: [entry, token],
      handoff: {
        attackPaths: [{
          findingIds: [entry.id, token.id],
          title: "Legacy login to token pivot",
          summary: "Handoff enrichment should replace the default summary."
        }]
      }
    });

    expect(result.paths[0]?.status).toBe("qualified");
    expect(result.paths[0]?.title).toBe("Legacy login to token pivot");
    expect(result.paths[0]?.summary).toBe("Handoff enrichment should replace the default summary.");
  });

  it("marks a path as blocked when progression depends on blocked findings", () => {
    const entry = finding({
      id: "30000000-0000-4000-8000-000000000001",
      title: "Reachable admin endpoint",
      enablesFindingIds: ["30000000-0000-4000-8000-000000000002"],
      explanationSummary: "The endpoint is externally reachable.",
      confidenceReason: "A direct probe confirmed the endpoint.",
      relationshipExplanations: {
        enables: "The exposed route is required before privileged testing can proceed."
      }
    });
    const blocked = finding({
      id: "30000000-0000-4000-8000-000000000002",
      title: "Privilege escalation blocked",
      validationStatus: "blocked",
      explanationSummary: "The exploit path is plausible but blocked by tooling limits.",
      confidenceReason: "The route stopped at a provider-owned control boundary."
    });

    const result = buildAttackPathSummary({ findings: [entry, blocked] });

    expect(result.paths[0]?.status).toBe("blocked");
    expect(result.paths[0]?.blockedFindingIds).toContain(blocked.id);
  });
});

describe("buildWorkflowRunReport", () => {
  it("includes attack-path payloads and executive summary in the workflow report", () => {
    const entry = finding({
      id: "40000000-0000-4000-8000-000000000001",
      title: "Admin surface exposed",
      enablesFindingIds: ["40000000-0000-4000-8000-000000000002"],
      explanationSummary: "The admin surface is reachable without a gateway.",
      confidenceReason: "A direct probe confirmed the route.",
      relationshipExplanations: {
        enables: "The entrypoint enables the follow-on pivot."
      }
    });
    const pivot = finding({
      id: "40000000-0000-4000-8000-000000000002",
      title: "Privilege pivot confirmed",
      severity: "high",
      explanationSummary: "Credential reuse reaches a privileged path.",
      confidenceReason: "The pivot was validated immediately after the exposed entrypoint."
    });

    const run: WorkflowRun = {
      id: "50000000-0000-4000-8000-000000000001",
      workflowId: "60000000-0000-4000-8000-000000000001",
      workflowLaunchId: "70000000-0000-4000-8000-000000000001",
      targetId: "80000000-0000-4000-8000-000000000001",
      executionKind: "workflow",
      status: "completed",
      currentStepIndex: 0,
      startedAt: "2026-04-25T12:00:00.000Z",
      completedAt: "2026-04-25T12:05:00.000Z",
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "event-1",
          workflowRunId: "50000000-0000-4000-8000-000000000001",
          workflowId: "60000000-0000-4000-8000-000000000001",
          workflowStageId: null,
          stepIndex: 0,
          ord: 1,
          type: "finding_reported",
          status: "completed",
          title: "Finding reported",
          summary: entry.title,
          detail: null,
          payload: { finding: entry },
          createdAt: "2026-04-25T12:01:00.000Z"
        },
        {
          id: "event-2",
          workflowRunId: "50000000-0000-4000-8000-000000000001",
          workflowId: "60000000-0000-4000-8000-000000000001",
          workflowStageId: null,
          stepIndex: 0,
          ord: 2,
          type: "finding_reported",
          status: "completed",
          title: "Finding reported",
          summary: pivot.title,
          detail: null,
          payload: { finding: pivot },
          createdAt: "2026-04-25T12:02:00.000Z"
        },
        {
          id: "event-3",
          workflowRunId: "50000000-0000-4000-8000-000000000001",
          workflowId: "60000000-0000-4000-8000-000000000001",
          workflowStageId: null,
          stepIndex: 0,
          ord: 3,
          type: "run_completed",
          status: "completed",
          title: "Run completed",
          summary: "The workflow completed.",
          detail: null,
          payload: {
            summary: "The workflow completed with a correlated path."
          },
          createdAt: "2026-04-25T12:05:00.000Z"
        }
      ]
    };

    const report = buildWorkflowRunReport(run);

    expect(report?.attackPaths.paths).toHaveLength(1);
    expect(report?.attackPathExecutiveSummary).toContain("Top path reaches");
  });
});
