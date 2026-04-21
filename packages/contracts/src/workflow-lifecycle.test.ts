import { describe, expect, it } from "vitest";
import type { WorkflowRun } from "./resources.js";
import {
  deriveWorkflowCompletionState,
  deriveWorkflowRunExecutionContract,
  deriveWorkflowStageExecutionContract,
  deriveWorkflowStageLifecycleState,
  isWorkflowRunFinalized,
  isWorkflowRunTransitionAllowed,
  selectLatestWorkflowRun,
  workflowLifecycleModel
} from "./workflow-lifecycle.js";

function createRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    workflowId: "10000000-0000-0000-0000-000000000001",
    status: "running",
    currentStepIndex: 0,
    startedAt: "2026-04-21T00:00:00.000Z",
    completedAt: null,
    trace: [],
    events: [],
    ...overrides
  };
}

describe("workflow lifecycle model", () => {
  it("documents the authoritative source files for run status and latest run selection", () => {
    expect(workflowLifecycleModel.authoritativeSources.runStatus.sourceFiles).toContain("packages/contracts/src/resources.ts");
    expect(workflowLifecycleModel.authoritativeSources.latestRun.sourceFiles).toContain(
      "apps/backend/src/features/modules/workflows/prisma-workflows.repository.ts"
    );
    expect(workflowLifecycleModel.externalStateRelationships.map((item) => item.system)).toContain("Ralph PRD story status");
  });

  it("selects the latest run deterministically", () => {
    const older = createRun({
      id: "00000000-0000-0000-0000-000000000010",
      startedAt: "2026-04-20T23:59:00.000Z"
    });
    const sameStartLowerId = createRun({
      id: "00000000-0000-0000-0000-000000000011",
      startedAt: "2026-04-21T00:00:00.000Z",
      completedAt: "2026-04-21T00:05:00.000Z"
    });
    const sameStartHigherId = createRun({
      id: "00000000-0000-0000-0000-000000000012",
      startedAt: "2026-04-21T00:00:00.000Z",
      completedAt: "2026-04-21T00:05:00.000Z"
    });

    expect(selectLatestWorkflowRun([older, sameStartLowerId, sameStartHigherId])?.id).toBe(sameStartHigherId.id);
  });

  it("derives stage and completion state for a successful finalized run", () => {
    const run = createRun({
      status: "completed",
      currentStepIndex: 2,
      completedAt: "2026-04-21T00:06:00.000Z",
      trace: [
        {
          id: "20000000-0000-0000-0000-000000000001",
          workflowRunId: "00000000-0000-0000-0000-000000000001",
          workflowId: "10000000-0000-0000-0000-000000000001",
          workflowStageId: "30000000-0000-0000-0000-000000000001",
          stepIndex: 0,
          stageLabel: "Recon",
          agentId: "40000000-0000-0000-0000-000000000001",
          agentName: "Recon Agent",
          status: "completed",
          selectedToolIds: ["tool-a"],
          toolSelectionReason: "Best fit",
          targetSummary: "Target",
          evidenceHighlights: ["Evidence"],
          outputSummary: "Summary",
          createdAt: "2026-04-21T00:02:00.000Z"
        }
      ],
      events: [
        {
          id: "50000000-0000-0000-0000-000000000001",
          workflowRunId: "00000000-0000-0000-0000-000000000001",
          workflowId: "10000000-0000-0000-0000-000000000001",
          workflowStageId: "30000000-0000-0000-0000-000000000001",
          stepIndex: 0,
          ord: 0,
          type: "stage_started",
          status: "running",
          title: "Recon started",
          summary: "Started",
          detail: null,
          payload: {},
          createdAt: "2026-04-21T00:01:00.000Z"
        },
        {
          id: "50000000-0000-0000-0000-000000000002",
          workflowRunId: "00000000-0000-0000-0000-000000000001",
          workflowId: "10000000-0000-0000-0000-000000000001",
          workflowStageId: "30000000-0000-0000-0000-000000000001",
          stepIndex: 0,
          ord: 1,
          type: "stage_completed",
          status: "completed",
          title: "Recon completed",
          summary: "Completed",
          detail: null,
          payload: {},
          createdAt: "2026-04-21T00:03:00.000Z"
        }
      ]
    });
    const stages = [
      { id: "30000000-0000-0000-0000-000000000001", ord: 0 },
      { id: "30000000-0000-0000-0000-000000000002", ord: 1 }
    ] as const;
    const stageContract = deriveWorkflowStageExecutionContract(run, stages[0]);
    const runContract = deriveWorkflowRunExecutionContract(run, stages);

    expect(stageContract.state).toBe("completed");
    expect(stageContract.terminalEventType).toBe("stage_completed");
    expect(stageContract.source).toBe("boundary_event");
    expect(runContract.stages.map((stage) => stage.state)).toEqual(["completed", "completed"]);
    expect(runContract.completionState).toBe("completed");
    expect(runContract.isFinalized).toBe(true);
    expect(deriveWorkflowStageLifecycleState(run, stages[0])).toBe("completed");
    expect(deriveWorkflowCompletionState(run, 2)).toBe("completed");
    expect(isWorkflowRunFinalized(run, 2)).toBe(true);
  });

  it("marks an interrupted active stage as failed once the run is terminal", () => {
    const run = createRun({
      status: "failed",
      currentStepIndex: 1,
      completedAt: "2026-04-21T00:04:00.000Z",
      events: [
        {
          id: "50000000-0000-0000-0000-000000000003",
          workflowRunId: "00000000-0000-0000-0000-000000000001",
          workflowId: "10000000-0000-0000-0000-000000000001",
          workflowStageId: "30000000-0000-0000-0000-000000000002",
          stepIndex: 1,
          ord: 4,
          type: "stage_started",
          status: "running",
          title: "Exploit started",
          summary: "Started",
          detail: null,
          payload: {},
          createdAt: "2026-04-21T00:03:30.000Z"
        }
      ]
    });
    const stages = [
      { id: "30000000-0000-0000-0000-000000000001", ord: 0 },
      { id: "30000000-0000-0000-0000-000000000002", ord: 1 }
    ] as const;
    const stageContract = deriveWorkflowStageExecutionContract(run, stages[1]);
    const runContract = deriveWorkflowRunExecutionContract(run, stages);

    expect(stageContract.state).toBe("failed");
    expect(stageContract.source).toBe("boundary_event");
    expect(runContract.stages.map((stage) => stage.state)).toEqual(["completed", "failed"]);
    expect(runContract.completionState).toBe("failed");
    expect(deriveWorkflowCompletionState(run, 2)).toBe("failed");
    expect(isWorkflowRunTransitionAllowed("running", "failed", "interrupt_run")).toBe(true);
  });

  it("allows stale running recovery to terminate the run as failed", () => {
    expect(isWorkflowRunTransitionAllowed("running", "failed", "recover_stale_run")).toBe(true);
  });

  it("keeps incomplete completed runs from being treated as finalized", () => {
    const run = createRun({
      status: "completed",
      currentStepIndex: 1,
      completedAt: null
    });

    expect(deriveWorkflowCompletionState(run, 2)).toBe("running");
    expect(isWorkflowRunFinalized(run, 2)).toBe(false);
  });
});
