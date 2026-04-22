import type { CreateWorkflowBody, Workflow, WorkflowStatus } from "@synosec/contracts";

export type WorkflowFormValues = {
  name: string;
  status: WorkflowStatus;
  description: string;
  applicationId: string;
  runtimeId: string;
  agentId: string;
  objective: string;
  allowedToolIds: string[];
};

export function createEmptyFormValues(defaultApplicationId = "", defaultRuntimeId = "", defaultAgentId = ""): WorkflowFormValues {
  return {
    name: "",
    status: "draft",
    description: "",
    applicationId: defaultApplicationId,
    runtimeId: defaultRuntimeId,
    agentId: defaultAgentId,
    objective: "",
    allowedToolIds: []
  };
}

export function toWorkflowFormValues(workflow: Workflow): WorkflowFormValues {
  const fallbackStage = workflow.stages[0];

  return {
    name: workflow.name,
    status: workflow.status,
    description: workflow.description ?? "",
    applicationId: workflow.applicationId,
    runtimeId: workflow.runtimeId ?? "",
    agentId: workflow.agentId ?? fallbackStage?.agentId ?? "",
    objective: workflow.objective ?? fallbackStage?.objective ?? "",
    allowedToolIds: workflow.allowedToolIds ?? fallbackStage?.allowedToolIds ?? []
  };
}

export function toWorkflowRequestBody(values: WorkflowFormValues): CreateWorkflowBody {
  return {
    name: values.name.trim(),
    status: values.status,
    description: values.description.trim() || null,
    applicationId: values.applicationId,
    runtimeId: values.runtimeId || null,
    agentId: values.agentId,
    objective: values.objective.trim() || "Run the configured workflow using the linked agent, allowed tools, and structured reporting.",
    allowedToolIds: values.allowedToolIds,
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
  if (!values.agentId) {
    errors["agentId"] = "Agent is required.";
  }
  if (!values.objective.trim()) {
    errors["objective"] = "Objective is required.";
  }

  return errors;
}

export function definedFieldError(value: string | undefined) {
  return value ? { error: value } : {};
}
