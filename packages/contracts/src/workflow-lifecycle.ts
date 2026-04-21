import { z } from "zod";
import type { WorkflowRun, WorkflowRunStatus, WorkflowStage, WorkflowTraceEntry, WorkflowTraceEvent } from "./resources.js";

export const workflowStageLifecycleStateSchema = z.enum(["pending", "running", "completed", "failed"]);
export type WorkflowStageLifecycleState = z.infer<typeof workflowStageLifecycleStateSchema>;

export const workflowCompletionStateSchema = z.enum(["not_started", "running", "completed", "failed"]);
export type WorkflowCompletionState = z.infer<typeof workflowCompletionStateSchema>;

export const workflowStageBoundaryEventTypeSchema = z.enum(["stage_started", "stage_completed", "stage_failed"]);
export type WorkflowStageBoundaryEventType = z.infer<typeof workflowStageBoundaryEventTypeSchema>;

export type WorkflowStageExecutionContract = {
  stageId: string;
  stageOrd: number;
  state: WorkflowStageLifecycleState;
  hasStarted: boolean;
  startedAt: string | null;
  terminalAt: string | null;
  terminalEventType: Exclude<WorkflowStageBoundaryEventType, "stage_started"> | null;
  traceStatus: WorkflowTraceEntry["status"] | null;
  source: "none" | "boundary_event" | "trace_entry" | "run_record";
};

export type WorkflowRunExecutionContract = {
  completionState: WorkflowCompletionState;
  isFinalized: boolean;
  stages: WorkflowStageExecutionContract[];
};

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
      field: "deriveWorkflowStageExecutionContract(run, stage) and deriveWorkflowRunExecutionContract(run, stages)",
      owner: "Shared lifecycle execution contract",
      sourceFiles: [
        "packages/contracts/src/workflow-lifecycle.ts",
        "packages/contracts/src/resources.ts",
        "apps/frontend/src/pages/workflows-page.tsx"
      ],
      notes: "Per-stage state is derived from a single execution contract that prioritizes boundary events, then persisted trace, with currentStepIndex used only as a persisted fallback."
    },
    completionState: {
      field: "deriveWorkflowCompletionState(run, stages) and isWorkflowRunFinalized(run, stages)",
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

function compareWorkflowStepPosition(left: Pick<WorkflowTraceEntry, "stepIndex" | "createdAt">, right: Pick<WorkflowTraceEntry, "stepIndex" | "createdAt">) {
  const stepDifference = right.stepIndex - left.stepIndex;
  if (stepDifference !== 0) {
    return stepDifference;
  }

  return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
}

function isWorkflowStageBoundaryEvent(event: WorkflowTraceEvent): event is WorkflowTraceEvent & {
  type: WorkflowStageBoundaryEventType;
} {
  return event.type === "stage_started" || event.type === "stage_completed" || event.type === "stage_failed";
}

export function deriveWorkflowStageExecutionContract(
  run: WorkflowRun | null,
  stage: Pick<WorkflowStage, "id" | "ord">
): WorkflowStageExecutionContract {
  if (!run) {
    return {
      stageId: stage.id,
      stageOrd: stage.ord,
      state: "pending",
      hasStarted: false,
      startedAt: null,
      terminalAt: null,
      terminalEventType: null,
      traceStatus: null,
      source: "none"
    };
  }

  const stageBoundaryEvents = run.events
    .filter((event) => event.workflowStageId === stage.id)
    .filter(isWorkflowStageBoundaryEvent)
    .sort((left, right) => right.ord - left.ord);
  const latestBoundaryEvent = stageBoundaryEvents[0] ?? null;
  const startedEvent = stageBoundaryEvents.find((event) => event.type === "stage_started") ?? null;
  const latestTrace = run.trace
    .filter((entry) => entry.workflowStageId === stage.id)
    .sort(compareWorkflowStepPosition)[0] ?? null;

  if (latestBoundaryEvent?.type === "stage_failed") {
    return {
      stageId: stage.id,
      stageOrd: stage.ord,
      state: "failed",
      hasStarted: true,
      startedAt: startedEvent?.createdAt ?? latestBoundaryEvent.createdAt,
      terminalAt: latestBoundaryEvent.createdAt,
      terminalEventType: "stage_failed",
      traceStatus: latestTrace?.status ?? null,
      source: "boundary_event"
    };
  }
  if (latestBoundaryEvent?.type === "stage_completed") {
    return {
      stageId: stage.id,
      stageOrd: stage.ord,
      state: "completed",
      hasStarted: true,
      startedAt: startedEvent?.createdAt ?? latestBoundaryEvent.createdAt,
      terminalAt: latestBoundaryEvent.createdAt,
      terminalEventType: "stage_completed",
      traceStatus: latestTrace?.status ?? null,
      source: "boundary_event"
    };
  }
  if (latestTrace?.status === "failed") {
    return {
      stageId: stage.id,
      stageOrd: stage.ord,
      state: "failed",
      hasStarted: true,
      startedAt: startedEvent?.createdAt ?? latestTrace.createdAt,
      terminalAt: latestTrace.createdAt,
      terminalEventType: null,
      traceStatus: "failed",
      source: "trace_entry"
    };
  }
  if (latestTrace?.status === "completed") {
    return {
      stageId: stage.id,
      stageOrd: stage.ord,
      state: "completed",
      hasStarted: true,
      startedAt: startedEvent?.createdAt ?? latestTrace.createdAt,
      terminalAt: latestTrace.createdAt,
      terminalEventType: null,
      traceStatus: "completed",
      source: "trace_entry"
    };
  }
  if (startedEvent) {
    return {
      stageId: stage.id,
      stageOrd: stage.ord,
      state: run.status === "failed" && run.currentStepIndex === stage.ord ? "failed" : "running",
      hasStarted: true,
      startedAt: startedEvent.createdAt,
      terminalAt: null,
      terminalEventType: null,
      traceStatus: null,
      source: "boundary_event"
    };
  }

  if (run.status === "failed" && run.currentStepIndex === stage.ord) {
    return {
      stageId: stage.id,
      stageOrd: stage.ord,
      state: "failed",
      hasStarted: true,
      startedAt: null,
      terminalAt: run.completedAt,
      terminalEventType: null,
      traceStatus: null,
      source: "run_record"
    };
  }
  if (run.currentStepIndex > stage.ord || (run.status === "completed" && run.currentStepIndex >= stage.ord + 1)) {
    return {
      stageId: stage.id,
      stageOrd: stage.ord,
      state: "completed",
      hasStarted: true,
      startedAt: null,
      terminalAt: run.completedAt,
      terminalEventType: null,
      traceStatus: null,
      source: "run_record"
    };
  }

  return {
    stageId: stage.id,
    stageOrd: stage.ord,
    state: "pending",
    hasStarted: false,
    startedAt: null,
    terminalAt: null,
    terminalEventType: null,
    traceStatus: null,
    source: "none"
  };
}

export function deriveWorkflowStageLifecycleState(run: WorkflowRun | null, stage: Pick<WorkflowStage, "id" | "ord">): WorkflowStageLifecycleState {
  return deriveWorkflowStageExecutionContract(run, stage).state;
}

export function deriveWorkflowRunExecutionContract(
  run: WorkflowRun | null,
  stages: readonly Pick<WorkflowStage, "id" | "ord">[]
): WorkflowRunExecutionContract {
  const stageContracts = stages.map((stage) => deriveWorkflowStageExecutionContract(run, stage));
  if (!run) {
    return {
      completionState: "not_started",
      isFinalized: false,
      stages: stageContracts
    };
  }

  const hasRecordedStageEvidence = run.events.some((event) => event.workflowStageId !== null) || run.trace.length > 0;
  const allStagesCompleted =
    stageContracts.length > 0 && stageContracts.length === stages.length && stageContracts.every((stage) => stage.state === "completed");
  const anyStageFailed = stageContracts.some((stage) => stage.state === "failed");
  const completionState: WorkflowCompletionState =
    run.status === "failed" || anyStageFailed
      ? "failed"
      : run.status === "completed" &&
          run.completedAt !== null &&
          hasRecordedStageEvidence &&
          allStagesCompleted &&
          run.currentStepIndex >= stages.length
        ? "completed"
        : "running";

  return {
    completionState,
    isFinalized:
      completionState === "completed"
        ? run.completedAt !== null && hasRecordedStageEvidence && allStagesCompleted && run.currentStepIndex >= stages.length
        : completionState === "failed"
          ? run.completedAt !== null
          : false,
    stages: stageContracts
  };
}

type WorkflowStageRef = Pick<WorkflowStage, "id" | "ord">;

function toStageRefs(stageCountOrStages: number | readonly WorkflowStageRef[]): readonly WorkflowStageRef[] {
  if (typeof stageCountOrStages === "number") {
    return Array.from({ length: stageCountOrStages }, (_, index): WorkflowStageRef => ({
      id: `__unknown_stage_${index}`,
      ord: index
    }));
  }

  return stageCountOrStages;
}

export function deriveWorkflowCompletionState(
  run: WorkflowRun | null,
  stageCountOrStages: number | readonly WorkflowStageRef[]
): WorkflowCompletionState {
  if (!run) {
    return "not_started";
  }

  return deriveWorkflowRunExecutionContract(run, toStageRefs(stageCountOrStages)).completionState;
}

export function isWorkflowRunFinalized(
  run: WorkflowRun,
  stageCountOrStages: number | readonly WorkflowStageRef[]
) {
  return deriveWorkflowRunExecutionContract(run, toStageRefs(stageCountOrStages)).isFinalized;
}
