import type { Workflow, WorkflowLaunch, WorkflowRun, WorkflowTraceEvent } from "@synosec/contracts";
import type {
  WorkflowLaunch as WorkflowLaunchRow,
  Workflow as WorkflowRow,
  WorkflowRun as WorkflowRunRow,
  WorkflowStage as WorkflowStageRow,
  WorkflowTraceEvent as WorkflowTraceEventRow
} from "@prisma/client";
import { normalizeWorkflowStageContract } from "./workflow-stage-contract.js";

function normalizeRequiredText(value: string | null, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeOptionalText(value: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWorkflowExecutionKind(value: string | null, id: string) {
  if (value === "workflow") {
    return value;
  }

  if (value === "attack-map") {
    throw new Error(`Workflow ${id} uses unsupported execution kind: attack-map`);
  }

  return undefined;
}

function mapWorkflowStageRow(row: WorkflowStageRow) {
  const persistedStageSystemPrompt = (row as WorkflowStageRow & { stageSystemPrompt?: string | null }).stageSystemPrompt;
  const contract = normalizeWorkflowStageContract({
    label: row.label,
    ...(row.objective ? { objective: row.objective } : {}),
    ...(persistedStageSystemPrompt ? { stageSystemPrompt: persistedStageSystemPrompt } : {}),
    ...(Array.isArray(row.allowedToolIds) ? { allowedToolIds: row.allowedToolIds.map(String) } : {}),
    ...(Array.isArray(row.requiredEvidenceTypes) ? { requiredEvidenceTypes: row.requiredEvidenceTypes.map(String) } : {}),
    ...(row.findingPolicy && typeof row.findingPolicy === "object" && !Array.isArray(row.findingPolicy)
      ? { findingPolicy: row.findingPolicy as Record<string, unknown> }
      : {}),
    ...(row.completionRule && typeof row.completionRule === "object" && !Array.isArray(row.completionRule)
      ? { completionRule: row.completionRule as Record<string, unknown> }
      : {}),
    resultSchemaVersion: row.resultSchemaVersion,
    ...(row.handoffSchema && typeof row.handoffSchema === "object" && !Array.isArray(row.handoffSchema)
      ? { handoffSchema: row.handoffSchema as Record<string, unknown> }
      : {})
  });

  return {
    id: row.id,
    label: row.label,
    agentId: row.agentId,
    ord: row.ord,
    ...contract
  };
}

export function mapWorkflowRow(
  row: WorkflowRow & {
    stages: WorkflowStageRow[];
  }
): Workflow {
  const orderedStages = row.stages.sort((left, right) => left.ord - right.ord);
  const primaryStage = orderedStages[0];
  if (!primaryStage) {
    throw new Error(`Workflow ${row.id} is missing a persisted stage contract.`);
  }

  const primaryContract = mapWorkflowStageRow(primaryStage);

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    executionKind: normalizeWorkflowExecutionKind(row.executionKind, row.id),
    description: row.description,
    agentId: primaryContract.agentId,
    objective: primaryContract.objective,
    stageSystemPrompt: primaryContract.stageSystemPrompt,
    allowedToolIds: primaryContract.allowedToolIds,
    requiredEvidenceTypes: primaryContract.requiredEvidenceTypes,
    findingPolicy: primaryContract.findingPolicy,
    completionRule: primaryContract.completionRule,
    resultSchemaVersion: primaryContract.resultSchemaVersion,
    handoffSchema: primaryContract.handoffSchema,
    stages: orderedStages.map(mapWorkflowStageRow),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function mapWorkflowTraceEventRow(row: WorkflowTraceEventRow): WorkflowTraceEvent {
  return {
    id: row.id,
    workflowRunId: row.workflowRunId,
    workflowId: row.workflowId,
    workflowStageId: row.workflowStageId,
    stepIndex: row.stepIndex,
    ord: row.ord,
    type: row.type,
    status: row.status,
    title: normalizeRequiredText(row.title, "Workflow event"),
    summary: normalizeRequiredText(row.summary, "Workflow event"),
    detail: normalizeOptionalText(row.detail),
    payload: (row.payload ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString()
  };
}

export function mapWorkflowRunRow(
  row: WorkflowRunRow & {
    traceEvents: WorkflowTraceEventRow[];
  }
): WorkflowRun {
  return {
    id: row.id,
    workflowId: row.workflowId,
    workflowLaunchId: row.workflowLaunchId,
    targetId: row.targetId,
    executionKind: normalizeWorkflowExecutionKind(row.executionKind, row.workflowId),
    status: row.status,
    currentStepIndex: row.currentStepIndex,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    trace: [],
    events: row.traceEvents.sort((left, right) => left.ord - right.ord).map(mapWorkflowTraceEventRow)
  };
}

export function mapWorkflowLaunchRow(
  row: WorkflowLaunchRow & {
    runs: Array<WorkflowRunRow & { traceEvents?: WorkflowTraceEventRow[] }>;
  }
): WorkflowLaunch {
  return {
    id: row.id,
    workflowId: row.workflowId,
    status: row.status as WorkflowLaunch["status"],
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    runs: row.runs
      .slice()
      .sort((left, right) => left.startedAt.getTime() - right.startedAt.getTime())
      .map((run) => ({
        targetId: run.targetId,
        runId: run.id,
        status: run.status as WorkflowLaunch["runs"][number]["status"],
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt ? run.completedAt.toISOString() : null,
        errorMessage: null
      }))
  };
}
