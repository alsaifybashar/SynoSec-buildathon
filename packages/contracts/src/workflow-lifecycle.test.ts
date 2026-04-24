import { describe, expect, it } from "vitest";
import {
  compareWorkflowRunRecency,
  deriveWorkflowCompletionState,
  isWorkflowRunFinalized,
  selectLatestWorkflowRun
} from "./workflow-lifecycle.js";
import type { WorkflowRun } from "./resources.js";

function createRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: "10000000-0000-0000-0000-000000000001",
    workflowId: "20000000-0000-0000-0000-000000000001",
    status: "running",
    currentStepIndex: 0,
    startedAt: "2026-04-24T10:00:00.000Z",
    completedAt: null,
    trace: [],
    events: [],
    ...overrides
  };
}

describe("workflow lifecycle helpers", () => {
  it("sorts runs by recency", () => {
    const older = createRun({
      id: "10000000-0000-0000-0000-000000000001",
      startedAt: "2026-04-24T10:00:00.000Z"
    });
    const newer = createRun({
      id: "10000000-0000-0000-0000-000000000002",
      startedAt: "2026-04-24T10:05:00.000Z"
    });

    expect(compareWorkflowRunRecency(older, newer)).toBeGreaterThan(0);
    expect(selectLatestWorkflowRun([older, newer])?.id).toBe(newer.id);
  });

  it("derives completion state directly from the run status", () => {
    expect(deriveWorkflowCompletionState(createRun({ status: "running" }))).toBe("running");
    expect(deriveWorkflowCompletionState(createRun({ status: "completed" }))).toBe("completed");
    expect(deriveWorkflowCompletionState(createRun({ status: "failed" }))).toBe("failed");
  });

  it("treats completed and failed runs as finalized", () => {
    expect(isWorkflowRunFinalized(createRun({ status: "completed" }))).toBe(true);
    expect(isWorkflowRunFinalized(createRun({ status: "failed" }))).toBe(true);
    expect(isWorkflowRunFinalized(createRun({ status: "running" }))).toBe(false);
  });
});
