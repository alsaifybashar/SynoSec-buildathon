import {
  apiRoutes,
  createWorkflowBodySchema,
  type CreateWorkflowBody,
  type Workflow,
  workflowSchema
} from "@synosec/contracts";
import { type ResourceTransferConfig } from "@/shared/lib/resource-transfer";

export const workflowTransfer = {
  table: "workflows",
  route: apiRoutes.workflows,
  itemSchema: workflowSchema,
  createBodySchema: createWorkflowBodySchema,
  toCreateBody: (workflow: Workflow): CreateWorkflowBody => ({
    name: workflow.name,
    status: workflow.status,
    executionKind: workflow.executionKind,
    description: workflow.description,
    targetId: workflow.targetId,
    agentId: workflow.agentId,
    objective: workflow.objective,
    stageSystemPrompt: workflow.stageSystemPrompt,
    allowedToolIds: workflow.allowedToolIds,
    requiredEvidenceTypes: workflow.requiredEvidenceTypes,
    findingPolicy: workflow.findingPolicy,
    completionRule: workflow.completionRule,
    resultSchemaVersion: workflow.resultSchemaVersion,
    handoffSchema: workflow.handoffSchema
  })
} satisfies ResourceTransferConfig<Workflow, CreateWorkflowBody>;
