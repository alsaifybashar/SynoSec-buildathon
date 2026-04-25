import type { CreateWorkflowBody, ExecutionKind, Workflow, WorkflowStatus } from "@synosec/contracts";

export type WorkflowFormValues = {
  name: string;
  status: WorkflowStatus;
  executionKind: ExecutionKind;
  description: string;
  targetId: string;
  agentId: string;
  objective: string;
  allowedToolIds: string[];
};

export function createEmptyFormValues(defaultTargetId = "", defaultAgentId = ""): WorkflowFormValues {
  return {
    name: "",
    status: "draft",
    executionKind: "workflow",
    description: "",
    targetId: defaultTargetId,
    agentId: defaultAgentId,
    objective: "",
    allowedToolIds: []
  };
}

export function toWorkflowFormValues(workflow: Workflow): WorkflowFormValues {
  return {
    name: workflow.name,
    status: workflow.status,
    executionKind: workflow.executionKind ?? "workflow",
    description: workflow.description ?? "",
    targetId: workflow.targetId,
    agentId: workflow.agentId,
    objective: workflow.objective,
    allowedToolIds: workflow.allowedToolIds
  };
}

export function toWorkflowRequestBody(values: WorkflowFormValues): CreateWorkflowBody {
  return {
    name: values.name.trim(),
    status: values.status,
    executionKind: values.executionKind,
    description: values.description.trim() || null,
    targetId: values.targetId,
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
  if (!values.targetId) {
    errors["targetId"] = "Target is required.";
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
