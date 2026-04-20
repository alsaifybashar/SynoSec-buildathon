import { z } from "zod";
import type { WorkflowRun, WorkflowRunStatus, WorkflowStage } from "./resources.js";

export const workflowStageLifecycleStateSchema = z.enum(["pending", "running", "completed", "failed"]);
export type WorkflowStageLifecycleState = z.infer<typeof workflowStageLifecycleStateSchema>;

export const workflowCompletionStateSchema = z.enum(["not_started", "running", "completed", "failed"]);
export type WorkflowCompletionState = z.infer<typeof workflowCompletionStateSchema>;

export const workflowRunTransitionTriggerSchema = z.enum([
  "start_run",
  "append_non_terminal_event",
  "complete_run",
  "fail_run",
  "interrupt_run",
  "recover_stale_run",
  "final_completion"
]);
export type WorkflowRunTransitionTrigger = z.infer<typeof workflowRunTransitionTriggerSchema>;

export type WorkflowLifecycleAuthoritativeSource = {
  field: string;
  owner: string;
  sourceFiles: readonly string[];
  notes: string;
};

export type WorkflowLifecycleRelationship = {
  system: string;
  sourceFiles: readonly string[];
  relationship: string;
};

export type WorkflowRunTransitionRule = {
  from: WorkflowRunStatus;
  to: WorkflowRunStatus;
  trigger: WorkflowRunTransitionTrigger;
  notes: string;
};

export const workflowLifecycleModel = {
  authoritativeSources: {
    runStatus: {
      field: "WorkflowRun.status",
      owner: "Persisted workflow run record",
      sourceFiles: [
        "packages/contracts/src/resources.ts",
        "apps/backend/prisma/schema.prisma",
        "apps/backend/src/features/modules/workflows/workflows.repository.ts",
        "apps/backend/src/features/modules/workflows/workflow-execution.service.ts",
        "apps/backend/src/features/modules/workflows/workflows.mapper.ts"
      ],
      notes: "Persisted WorkflowRun.status is the only authoritative run-status field surfaced to API and UI consumers."
    },
    latestRun: {
      field: "WorkflowsRepository.getLatestRunByWorkflowId(workflowId)",
      owner: "Workflow repository selection helper",
      sourceFiles: [
        "packages/contracts/src/workflow-lifecycle.ts",
        "apps/backend/src/features/modules/workflows/memory-workflows.repository.ts",
        "apps/backend/src/features/modules/workflows/prisma-workflows.repository.ts",
        "apps/backend/src/features/modules/workflows/workflows.routes.ts"
      ],
      notes: "Latest run selection is deterministic: startedAt desc, then completedAt desc, then id desc."
    },
    stageState: {
      field: "deriveWorkflowStageLifecycleState(run, stage)",
      owner: "Shared lifecycle derivation helper",
      sourceFiles: [
        "packages/contracts/src/workflow-lifecycle.ts",
        "packages/contracts/src/resources.ts",
        "apps/frontend/src/pages/workflows-page.tsx"
      ],
      notes: "Per-stage state is derived from the run's authoritative events and trace, with currentStepIndex used only as an ordered fallback."
    },
    completionState: {
      field: "deriveWorkflowCompletionState(run, stageCount) and isWorkflowRunFinalized(run, stageCount)",
      owner: "Shared lifecycle derivation helper",
      sourceFiles: [
        "packages/contracts/src/workflow-lifecycle.ts",
        "packages/contracts/src/resources.ts",
        "apps/frontend/src/pages/workflows-page.tsx"
      ],
      notes: "Final completion is authoritative only when terminal run.status and completedAt agree with stage progress."
    }
  },
  externalStateRelationships: [
    {
      system: "Ralph PRD story status",
      sourceFiles: [".agents/tasks/prd-workflow-trust.json"],
      relationship: "Tracks delivery progress for PRD stories. It is not derived from WorkflowRun.status and must not overwrite workflow run lifecycle state."
    },
    {
      system: "Ralph progress output",
      sourceFiles: [".ralph/progress.md"],
      relationship: "Append-only operator log for completed work. It summarizes runs after execution and is not the source of truth for live workflow state."
    },
    {
      system: "Persisted workflow records",
      sourceFiles: [
        "apps/backend/prisma/schema.prisma",
        "apps/backend/src/features/modules/workflows/prisma-workflows.repository.ts",
        "apps/backend/src/features/modules/workflows/memory-workflows.repository.ts"
      ],
      relationship: "WorkflowRun.status, currentStepIndex, completedAt, events, and trace are the persisted workflow lifecycle source of truth."
    },
    {
      system: "Surfaced workflow run status",
      sourceFiles: [
        "packages/contracts/src/resources.ts",
        "apps/backend/src/features/modules/workflows/workflows.routes.ts",
        "apps/frontend/src/pages/workflows-page.tsx"
      ],
      relationship: "API and UI must render the persisted WorkflowRun fields directly or via shared lifecycle derivation helpers without inventing a conflicting status."
    }
  ],
  transitions: [
    {
      from: "pending",
      to: "running",
      trigger: "start_run",
      notes: "Run creation starts execution and clears completedAt."
    },
    {
      from: "running",
      to: "running",
      trigger: "append_non_terminal_event",
      notes: "Stage-start, agent-input, model-decision, and in-progress tool events keep the run active."
    },
    {
      from: "running",
      to: "completed",
      trigger: "complete_run",
      notes: "The final stage completed successfully and currentStepIndex advanced through every workflow stage."
    },
    {
      from: "running",
      to: "failed",
      trigger: "fail_run",
      notes: "A non-recoverable stage failure moves the run to a terminal failed state."
    },
    {
      from: "running",
      to: "failed",
      trigger: "interrupt_run",
      notes: "An interrupted active run becomes terminal failed so surfaced status cannot remain stale running."
    },
    {
      from: "running",
      to: "failed",
      trigger: "recover_stale_run",
      notes: "A stale in-progress run discovered during recovery is normalized to failed before any later run is surfaced."
    },
    {
      from: "completed",
      to: "completed",
      trigger: "final_completion",
      notes: "Completed is terminal and remains locked once completedAt and stage progress agree."
    },
    {
      from: "failed",
      to: "failed",
      trigger: "final_completion",
      notes: "Failed is terminal and remains locked once completedAt is recorded."
    }
  ]
} as const satisfies {
  authoritativeSources: Record<string, WorkflowLifecycleAuthoritativeSource>;
  externalStateRelationships: readonly WorkflowLifecycleRelationship[];
  transitions: readonly WorkflowRunTransitionRule[];
};

export function isWorkflowRunTransitionAllowed(
  from: WorkflowRunStatus,
  to: WorkflowRunStatus,
  trigger: WorkflowRunTransitionTrigger
) {
  return workflowLifecycleModel.transitions.some((rule) => rule.from === from && rule.to === to && rule.trigger === trigger);
}

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

export function deriveWorkflowStageLifecycleState(run: WorkflowRun | null, stage: Pick<WorkflowStage, "id" | "ord">): WorkflowStageLifecycleState {
  if (!run) {
    return "pending";
  }

  const latestTrace = run.trace
    .filter((entry) => entry.workflowStageId === stage.id)
    .sort((left, right) => right.stepIndex - left.stepIndex)[0];
  if (latestTrace?.status === "failed") {
    return "failed";
  }
  if (latestTrace?.status === "completed") {
    return "completed";
  }

  const latestBoundaryEvent = run.events
    .filter((event) => event.workflowStageId === stage.id)
    .sort((left, right) => right.ord - left.ord)
    .find((event) => event.type === "stage_failed" || event.type === "stage_completed" || event.type === "stage_started");

  if (latestBoundaryEvent?.type === "stage_failed") {
    return "failed";
  }
  if (latestBoundaryEvent?.type === "stage_completed") {
    return "completed";
  }
  if (latestBoundaryEvent?.type === "stage_started") {
    return run.status === "failed" ? "failed" : "running";
  }

  if (run.status === "failed" && run.currentStepIndex === stage.ord) {
    return "failed";
  }
  if (run.currentStepIndex > stage.ord || run.status === "completed") {
    return "completed";
  }
  if (run.status === "running" && run.currentStepIndex === stage.ord) {
    return "pending";
  }

  return "pending";
}

export function deriveWorkflowCompletionState(run: WorkflowRun | null, stageCount: number): WorkflowCompletionState {
  if (!run) {
    return "not_started";
  }
  if (run.status === "failed") {
    return "failed";
  }
  if (run.status === "completed" && isWorkflowRunFinalized(run, stageCount)) {
    return "completed";
  }

  return "running";
}

export function isWorkflowRunFinalized(run: WorkflowRun, stageCount: number) {
  if (run.status === "completed") {
    return run.completedAt !== null && run.currentStepIndex >= stageCount;
  }

  if (run.status === "failed") {
    return run.completedAt !== null;
  }

  return false;
}
