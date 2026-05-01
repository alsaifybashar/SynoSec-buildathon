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
    preRunEvidenceEnabled: workflow.preRunEvidenceEnabled,
    description: workflow.description,
    stages: workflow.stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      objective: stage.objective,
      stageSystemPrompt: stage.stageSystemPrompt,
      taskPromptTemplate: stage.taskPromptTemplate,
      allowedToolIds: stage.allowedToolIds,
      requiredEvidenceTypes: stage.requiredEvidenceTypes,
      findingPolicy: stage.findingPolicy,
      completionRule: stage.completionRule,
      resultSchemaVersion: stage.resultSchemaVersion,
      handoffSchema: stage.handoffSchema
    }))
  })
} satisfies ResourceTransferConfig<Workflow, CreateWorkflowBody>;
