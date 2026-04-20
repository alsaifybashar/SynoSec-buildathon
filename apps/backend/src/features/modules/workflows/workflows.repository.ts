import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  Workflow,
  WorkflowRun,
  WorkflowsListQuery
} from "@synosec/contracts";
import type { PaginatedResult } from "../../../platform/core/pagination/paginated-result.js";

export interface WorkflowsRepository {
  list(query: WorkflowsListQuery): Promise<PaginatedResult<Workflow>>;
  getById(id: string): Promise<Workflow | null>;
  create(input: CreateWorkflowBody): Promise<Workflow>;
  update(id: string, input: UpdateWorkflowBody): Promise<Workflow | null>;
  remove(id: string): Promise<boolean>;
  createRun(workflowId: string): Promise<WorkflowRun | null>;
  getRunById(runId: string): Promise<WorkflowRun | null>;
  updateRun(run: WorkflowRun): Promise<WorkflowRun>;
}
