import type { CreateWorkflowBody, Workflow, WorkflowStageBody, WorkflowStatus } from "@synosec/contracts";

export type WorkflowFormStage = {
  id: string;
  label: string;
  agentId: string;
  objective: string;
  allowedToolIds: string[];
};

export type WorkflowFormValues = {
  name: string;
  status: WorkflowStatus;
  description: string;
  applicationId: string;
  runtimeId: string;
  stages: WorkflowFormStage[];
};

function createLocalId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createStage(agentId = ""): WorkflowFormStage {
  return {
    id: createLocalId(),
    label: "",
    agentId,
    objective: "",
    allowedToolIds: []
  };
}

export function createEmptyFormValues(defaultApplicationId = "", defaultRuntimeId = "", defaultAgentId = ""): WorkflowFormValues {
  return {
    name: "",
    status: "draft",
    description: "",
    applicationId: defaultApplicationId,
    runtimeId: defaultRuntimeId,
    stages: [createStage(defaultAgentId)]
  };
}

export function toWorkflowFormValues(workflow: Workflow): WorkflowFormValues {
  return {
    name: workflow.name,
    status: workflow.status,
    description: workflow.description ?? "",
    applicationId: workflow.applicationId,
    runtimeId: workflow.runtimeId ?? "",
    stages: workflow.stages
      .slice()
      .sort((left, right) => left.ord - right.ord)
      .map((stage) => ({
        id: stage.id,
        label: stage.label,
        agentId: stage.agentId,
        objective: stage.objective,
        allowedToolIds: stage.allowedToolIds
      }))
  };
}

export function toWorkflowRequestBody(values: WorkflowFormValues): CreateWorkflowBody {
  return {
    name: values.name.trim(),
    status: values.status,
    description: values.description.trim() || null,
    applicationId: values.applicationId,
    runtimeId: values.runtimeId || null,
    stages: values.stages.map<WorkflowStageBody>((stage) => ({
      id: stage.id,
      label: stage.label.trim(),
      agentId: stage.agentId,
      objective: stage.objective.trim() || `Complete the ${stage.label.trim()} stage using allowed tools and structured reporting.`,
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
        minFindings: 0
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
  if (!values.applicationId) {
    errors["applicationId"] = "Application is required.";
  }
  if (values.stages.length === 0) {
    errors["stages"] = "At least one workflow stage is required.";
  }

  values.stages.forEach((stage, index) => {
    if (!stage.label.trim()) {
      errors[`stage-${index}-label`] = "Stage label is required.";
    }
    if (!stage.agentId) {
      errors[`stage-${index}-agentId`] = "Agent is required.";
    }
  });

  return errors;
}

export function definedFieldError(value: string | undefined) {
  return value ? { error: value } : {};
}
