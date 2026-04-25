import type { WorkflowRun, WorkflowRunStatus } from "./resources.js";

export type WorkflowCompletionState = WorkflowRunStatus;

function toTimestamp(value: string | null) {
  return value ? Date.parse(value) : Number.NEGATIVE_INFINITY;
}

export function compareWorkflowRunRecency(left: WorkflowRun, right: WorkflowRun) {
  const startedAtDifference = toTimestamp(right.startedAt) - toTimestamp(left.startedAt);
  if (startedAtDifference !== 0) {
    return startedAtDifference;
  }

  const completedAtDifference = toTimestamp(right.completedAt) - toTimestamp(left.completedAt);
  if (completedAtDifference !== 0) {
    return completedAtDifference;
  }

  return right.id.localeCompare(left.id);
}

export function selectLatestWorkflowRun(runs: readonly WorkflowRun[]) {
  return runs.slice().sort(compareWorkflowRunRecency)[0] ?? null;
}

export function deriveWorkflowCompletionState(run: WorkflowRun | null): WorkflowCompletionState {
  return run?.status ?? "pending";
}

export function isWorkflowRunFinalized(run: WorkflowRun | null) {
  return run?.status === "completed" || run?.status === "failed";
}
