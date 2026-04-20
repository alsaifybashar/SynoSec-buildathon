import type { Workflow, WorkflowRun, WorkflowStage, WorkflowTraceEntry } from "@synosec/contracts";
import type {
  Workflow as WorkflowRow,
  WorkflowRun as WorkflowRunRow,
  WorkflowStage as WorkflowStageRow,
  WorkflowTraceEntry as WorkflowTraceEntryRow
} from "../../../platform/generated/prisma/index.js";

export function mapWorkflowStageRow(row: WorkflowStageRow): WorkflowStage {
  return {
    id: row.id,
    label: row.label,
    agentId: row.agentId,
    ord: row.ord
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

export function mapWorkflowRunRow(
  row: WorkflowRunRow & {
    traceEntries: WorkflowTraceEntryRow[];
  }
): WorkflowRun {
  return {
    id: row.id,
    workflowId: row.workflowId,
    status: row.status,
    currentStepIndex: row.currentStepIndex,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    trace: row.traceEntries.sort((left, right) => left.stepIndex - right.stepIndex).map(mapWorkflowTraceEntryRow)
  };
}
