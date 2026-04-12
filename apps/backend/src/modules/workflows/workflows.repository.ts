import type { CreateWorkflowBody, UpdateWorkflowBody, Workflow } from "@synosec/contracts";

export interface WorkflowsRepository {
  list(): Promise<Workflow[]>;
  getById(id: string): Promise<Workflow | null>;
  create(input: CreateWorkflowBody): Promise<Workflow>;
  update(id: string, input: UpdateWorkflowBody): Promise<Workflow | null>;
  remove(id: string): Promise<boolean>;
}
