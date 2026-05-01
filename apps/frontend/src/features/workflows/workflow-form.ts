import {
  defaultWorkflowStageSystemPrompt,
  type CreateWorkflowBody,
  type ExecutionKind,
  type Workflow,
  type WorkflowStatus
} from "@synosec/contracts";

export type WorkflowStageFormValues = {
  id?: string;
  label: string;
  objective: string;
  systemPrompt: string;
  allowedToolIds: string[];
};

export type WorkflowFormValues = {
  name: string;
  status: WorkflowStatus;
  executionKind: ExecutionKind;
  preRunEvidenceEnabled: boolean;
  description: string;
  stages: WorkflowStageFormValues[];
};

function createStageObjective(label: string) {
  return `Complete the ${label} stage using allowed tools and structured reporting.`;
}

export function createEmptyStageFormValues(index: number): WorkflowStageFormValues {
  const label = `Stage ${index + 1}`;
  return {
    label,
    objective: createStageObjective(label),
    systemPrompt: defaultWorkflowStageSystemPrompt,
    allowedToolIds: []
  };
}

export function createEmptyFormValues(): WorkflowFormValues {
  return {
    name: "",
    status: "draft",
    executionKind: "workflow",
    preRunEvidenceEnabled: false,
    description: "",
    stages: [createEmptyStageFormValues(0)]
  };
}

export function toWorkflowFormValues(workflow: Workflow): WorkflowFormValues {
  return {
    name: workflow.name,
    status: workflow.status,
    executionKind: workflow.executionKind ?? "workflow",
    preRunEvidenceEnabled: workflow.preRunEvidenceEnabled,
    description: workflow.description ?? "",
    stages: workflow.stages
      .slice()
      .sort((left, right) => left.ord - right.ord)
      .map((stage) => ({
        id: stage.id,
        label: stage.label,
        objective: stage.objective,
        systemPrompt: stage.stageSystemPrompt,
        allowedToolIds: stage.allowedToolIds
      }))
  };
}

export function toWorkflowRequestBody(values: WorkflowFormValues): CreateWorkflowBody {
  return {
    name: values.name.trim(),
    status: values.status,
    executionKind: values.executionKind,
    preRunEvidenceEnabled: values.preRunEvidenceEnabled,
    description: values.description.trim() || null,
    stages: values.stages.map((stage, index) => ({
      ...(stage.id ? { id: stage.id } : {}),
      label: stage.label.trim() || `Stage ${index + 1}`,
      objective: stage.objective.trim() || createStageObjective(stage.label.trim() || `Stage ${index + 1}`),
      stageSystemPrompt: stage.systemPrompt.trim(),
      allowedToolIds: stage.allowedToolIds,
      requiredEvidenceTypes: [],
      findingPolicy: {
        taxonomy: "typed-core-v1",
        allowedTypes: [
          "service_exposure",
          "content_discovery",
          "missing_security_header",
          "tls_weakness",
          "injection_signal",
          "auth_weakness",
          "sensitive_data_exposure",
          "misconfiguration",
          "other"
        ]
      },
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
    }))
  };
}

export function validateWorkflowForm(values: WorkflowFormValues) {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors["name"] = "Name is required.";
  }
  if (values.stages.length === 0) {
    errors["stages"] = "At least one stage is required.";
  }

  values.stages.forEach((stage, index) => {
    if (!stage.label.trim()) {
      errors[`stages.${index}.label`] = "Stage label is required.";
    }
    if (!stage.objective.trim()) {
      errors[`stages.${index}.objective`] = "Stage objective is required.";
    }
    if (!stage.systemPrompt.trim()) {
      errors[`stages.${index}.systemPrompt`] = "System prompt is required.";
    }
  });

  return errors;
}

export function definedFieldError(value: string | undefined) {
  return value ? { error: value } : {};
}
