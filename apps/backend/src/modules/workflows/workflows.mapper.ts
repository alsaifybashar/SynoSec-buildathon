import type { Workflow, WorkflowRun, WorkflowTraceEvent } from "@synosec/contracts";
import type {
  Workflow as WorkflowRow,
  WorkflowRun as WorkflowRunRow,
  WorkflowStage as WorkflowStageRow,
  WorkflowTraceEvent as WorkflowTraceEventRow
} from "@prisma/client";
import { normalizeWorkflowStageContract } from "./workflow-stage-contract.js";

function mapWorkflowStageRow(row: WorkflowStageRow) {
  const contract = normalizeWorkflowStageContract({
    label: row.label,
    ...(row.objective ? { objective: row.objective } : {}),
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
    executionKind: row.executionKind as Workflow["executionKind"],
    description: row.description,
    applicationId: row.applicationId,
    runtimeId: row.runtimeId,
    agentId: primaryContract.agentId,
    objective: primaryContract.objective,
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
    title: row.title,
    summary: row.summary,
    detail: row.detail,
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
    executionKind: row.executionKind as WorkflowRun["executionKind"],
    targetAssetId: row.targetAssetId,
    status: row.status,
    currentStepIndex: row.currentStepIndex,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    trace: [],
    events: row.traceEvents.sort((left, right) => left.ord - right.ord).map(mapWorkflowTraceEventRow)
  };
}
