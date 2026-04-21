import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  Workflow,
  WorkflowRun,
  WorkflowTraceEntry,
  WorkflowTraceEvent,
  WorkflowsListQuery
} from "@synosec/contracts";
import type { PaginatedResult } from "../../../core/pagination/paginated-result.js";

export interface WorkflowRunStatePatch {
  status?: WorkflowRun["status"];
  currentStepIndex?: WorkflowRun["currentStepIndex"];
  completedAt?: WorkflowRun["completedAt"];
}

export interface WorkflowsRepository {
  list(query: WorkflowsListQuery): Promise<PaginatedResult<Workflow>>;
  getById(id: string): Promise<Workflow | null>;
  create(input: CreateWorkflowBody): Promise<Workflow>;
  update(id: string, input: UpdateWorkflowBody): Promise<Workflow | null>;
  remove(id: string): Promise<boolean>;
  migrateWorkflowStageContracts(workflowId: string, fallbackToolIdsByAgentId?: Record<string, string[]>): Promise<Workflow | null>;
  createRun(workflowId: string): Promise<WorkflowRun | null>;
  getRunById(runId: string): Promise<WorkflowRun | null>;
  getLatestRunByWorkflowId(workflowId: string): Promise<WorkflowRun | null>;
  appendRunEvent(runId: string, event: WorkflowTraceEvent, patch?: WorkflowRunStatePatch): Promise<WorkflowRun>;
  appendTraceEntry(runId: string, traceEntry: WorkflowTraceEntry, patch?: WorkflowRunStatePatch): Promise<WorkflowRun>;
  updateRunState(runId: string, patch: WorkflowRunStatePatch): Promise<WorkflowRun>;
  updateRun(run: WorkflowRun): Promise<WorkflowRun>;
}
