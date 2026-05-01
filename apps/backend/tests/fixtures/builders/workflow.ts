import {
  defaultWorkflowStageSystemPrompt,
  defaultWorkflowTaskPromptTemplate,
  type Workflow
} from "@synosec/contracts";

export function buildWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  const agentId = overrides.agentId ?? "30000000-0000-0000-0000-000000000001";
  const stage = {
    id: "70000000-0000-0000-0000-000000000001",
    label: "Pipeline",
    agentId,
    ord: 0,
    objective: "Collect evidence and stop through system tools.",
    stageSystemPrompt: defaultWorkflowStageSystemPrompt,
    taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
    allowedToolIds: [],
    requiredEvidenceTypes: [],
    findingPolicy: { taxonomy: "typed-core-v1" as const, allowedTypes: ["other" as const] },
    completionRule: {
      requireStageResult: true,
      requireToolCall: false,
      allowEmptyResult: true,
      minFindings: 0,
      requireReachableSurface: false,
      requireEvidenceBackedWeakness: false,
      requireOsiCoverageStatus: false,
      requireChainedFindings: false
    },
    resultSchemaVersion: 1,
    handoffSchema: null
  };

  return {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Pipeline Workflow",
    status: "active",
    executionKind: "workflow",
    preRunEvidenceEnabled: false,
    description: null,
    agentId,
    objective: stage.objective,
    stageSystemPrompt: stage.stageSystemPrompt,
    taskPromptTemplate: stage.taskPromptTemplate,
    allowedToolIds: stage.allowedToolIds,
    requiredEvidenceTypes: stage.requiredEvidenceTypes,
    findingPolicy: stage.findingPolicy,
    completionRule: stage.completionRule,
    resultSchemaVersion: 1,
    handoffSchema: null,
    stages: [stage],
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z",
    ...overrides
  };
}
