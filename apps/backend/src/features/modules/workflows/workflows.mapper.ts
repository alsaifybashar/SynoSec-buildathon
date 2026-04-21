import type { Workflow, WorkflowRun, WorkflowStage, WorkflowTraceEntry, WorkflowTraceEvent } from "@synosec/contracts";
import type {
  Workflow as WorkflowRow,
  WorkflowRun as WorkflowRunRow,
  WorkflowStage as WorkflowStageRow,
  WorkflowTraceEntry as WorkflowTraceEntryRow,
  WorkflowTraceEvent as WorkflowTraceEventRow
} from "@prisma/client";
import { normalizeWorkflowStageContract } from "./workflow-stage-contract.js";

export function mapWorkflowStageRow(row: WorkflowStageRow): WorkflowStage {
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
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    description: row.description,
    applicationId: row.applicationId,
    runtimeId: row.runtimeId,
    stages: row.stages.sort((left, right) => left.ord - right.ord).map(mapWorkflowStageRow),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function mapWorkflowTraceEntryRow(row: WorkflowTraceEntryRow): WorkflowTraceEntry {
  return {
    id: row.id,
    workflowRunId: row.workflowRunId,
    workflowId: row.workflowId,
    workflowStageId: row.workflowStageId,
    stepIndex: row.stepIndex,
    stageLabel: row.stageLabel,
    agentId: row.agentId,
    agentName: row.agentName,
    status: row.status,
    selectedToolIds: Array.isArray(row.selectedToolIds) ? row.selectedToolIds.map(String) : [],
    toolSelectionReason: row.toolSelectionReason,
    targetSummary: row.targetSummary,
    evidenceHighlights: Array.isArray(row.evidenceHighlights) ? row.evidenceHighlights.map(String) : [],
    outputSummary: row.outputSummary,
    createdAt: row.createdAt.toISOString()
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
    traceEntries: WorkflowTraceEntryRow[];
    traceEvents: WorkflowTraceEventRow[];
  }
): WorkflowRun {
  return {
    id: row.id,
    workflowId: row.workflowId,
    status: row.status,
    currentStepIndex: row.currentStepIndex,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    trace: row.traceEntries.sort((left, right) => left.stepIndex - right.stepIndex).map(mapWorkflowTraceEntryRow),
    events: row.traceEvents.sort((left, right) => left.ord - right.ord).map(mapWorkflowTraceEventRow)
  };
}
