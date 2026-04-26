import {
  defaultWorkflowStageSystemPrompt,
  workflowStageCompletionRuleSchema,
  workflowStageFindingPolicySchema,
  type WorkflowStage
} from "@synosec/contracts";

type WorkflowStageContractFields = Pick<
  WorkflowStage,
  | "objective"
  | "stageSystemPrompt"
  | "allowedToolIds"
  | "requiredEvidenceTypes"
  | "findingPolicy"
  | "completionRule"
  | "resultSchemaVersion"
  | "handoffSchema"
>;

type WorkflowStageContractInput = {
  label: string;
  objective?: unknown;
  stageSystemPrompt?: unknown;
  allowedToolIds?: unknown;
  requiredEvidenceTypes?: unknown;
  findingPolicy?: unknown;
  completionRule?: unknown;
  resultSchemaVersion?: unknown;
  handoffSchema?: unknown;
};

export const defaultStageSystemPromptTemplate = defaultWorkflowStageSystemPrompt;

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0))];
}

export function createDefaultWorkflowStageContract(
  stage: Pick<WorkflowStage, "label">,
  fallbackToolIds: string[] = []
): WorkflowStageContractFields {
  return {
    objective: `Complete the ${stage.label} stage using allowed tools and structured reporting.`,
    stageSystemPrompt: defaultStageSystemPromptTemplate,
    allowedToolIds: normalizeStringArray(fallbackToolIds),
    requiredEvidenceTypes: [],
    findingPolicy: workflowStageFindingPolicySchema.parse({
      taxonomy: "typed-core-v1"
    }),
    completionRule: workflowStageCompletionRuleSchema.parse({
      requireStageResult: true,
      requireToolCall: false,
      allowEmptyResult: true,
      minFindings: 0
    }),
    resultSchemaVersion: 1,
    handoffSchema: null
  };
}

export function normalizeWorkflowStageContract(
  stage: WorkflowStageContractInput,
  fallbackToolIds: string[] = []
): WorkflowStageContractFields {
  const defaults = createDefaultWorkflowStageContract(stage, fallbackToolIds);

  return {
    objective: typeof stage.objective === "string" && stage.objective.trim().length > 0
      ? stage.objective
      : defaults.objective,
    stageSystemPrompt: typeof stage.stageSystemPrompt === "string" && stage.stageSystemPrompt.trim().length > 0
      ? stage.stageSystemPrompt
      : defaults.stageSystemPrompt,
    allowedToolIds: normalizeStringArray(stage.allowedToolIds ?? defaults.allowedToolIds),
    requiredEvidenceTypes: normalizeStringArray(stage.requiredEvidenceTypes ?? defaults.requiredEvidenceTypes),
    findingPolicy: workflowStageFindingPolicySchema.parse(stage.findingPolicy ?? defaults.findingPolicy),
    completionRule: workflowStageCompletionRuleSchema.parse(stage.completionRule ?? defaults.completionRule),
    resultSchemaVersion: typeof stage.resultSchemaVersion === "number" && Number.isInteger(stage.resultSchemaVersion) && stage.resultSchemaVersion > 0
      ? stage.resultSchemaVersion
      : defaults.resultSchemaVersion,
    handoffSchema: stage.handoffSchema && typeof stage.handoffSchema === "object" && !Array.isArray(stage.handoffSchema)
      ? stage.handoffSchema as Record<string, unknown>
      : defaults.handoffSchema
  };
}
