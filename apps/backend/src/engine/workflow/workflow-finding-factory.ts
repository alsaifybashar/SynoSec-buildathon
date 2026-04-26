import { randomUUID } from "node:crypto";
import {
  workflowReportedFindingSchema,
  type WorkflowFindingSubmission,
  type WorkflowReportedFinding
} from "@synosec/contracts";

export function severityConfidence(severity: WorkflowReportedFinding["severity"]) {
  switch (severity) {
    case "critical":
      return 0.95;
    case "high":
      return 0.85;
    case "medium":
      return 0.72;
    case "low":
      return 0.58;
    case "info":
    default:
      return 0.45;
  }
}

export function classifyWorkflowFindingType(input: { title: string; description: string; vector: string }): WorkflowReportedFinding["type"] {
  const text = `${input.title} ${input.description} ${input.vector}`.toLowerCase();
  if (/sql|sqli|xss|inject|template injection|ssti|command injection|deserialization/.test(text)) {
    return "injection_signal";
  }
  if (/header|csp|hsts|x-frame-options|content-security-policy/.test(text)) {
    return "missing_security_header";
  }
  if (/tls|ssl|certificate|cipher/.test(text)) {
    return "tls_weakness";
  }
  if (/auth|login|session|admin|credential|password|access control/.test(text)) {
    return "auth_weakness";
  }
  if (/sensitive|pii|ssn|secret|token|leak|exposed data/.test(text)) {
    return "sensitive_data_exposure";
  }
  if (/path|endpoint|directory|route|content discovery|hidden page/.test(text)) {
    return "content_discovery";
  }
  if (/port|service|exposed|open service/.test(text)) {
    return "service_exposure";
  }
  if (/config|misconfig|default|insecure setting/.test(text)) {
    return "misconfiguration";
  }
  return "other";
}

export function createWorkflowReportedFinding(input: {
  runId: string;
  submission: WorkflowFindingSubmission;
  id?: string;
  createdAt?: string;
}): WorkflowReportedFinding {
  return workflowReportedFindingSchema.parse({
    id: input.id ?? randomUUID(),
    workflowRunId: input.runId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input.submission
  });
}

export function createAttackMapFindingSubmission(input: {
  target: { baseUrl: string; host: string; port?: number };
  title: string;
  severity: WorkflowReportedFinding["severity"];
  description: string;
  vector: string;
  evidence: WorkflowFindingSubmission["evidence"];
  toolCommandPreview?: string | null;
  tags?: string[];
}): WorkflowFindingSubmission {
  return {
    type: classifyWorkflowFindingType(input),
    title: input.title,
    severity: input.severity,
    confidence: severityConfidence(input.severity),
    validationStatus: "unverified",
    target: {
      host: input.target.host,
      ...(input.target.port === undefined ? {} : { port: input.target.port }),
      url: input.target.baseUrl
    },
    evidence: input.evidence,
    impact: input.description,
    recommendation: `Investigate and remediate the attack path associated with "${input.title}" before additional chaining increases impact.`,
    derivedFromFindingIds: [],
    relatedFindingIds: [],
    enablesFindingIds: [],
    ...(input.toolCommandPreview
      ? {
          reproduction: {
            commandPreview: input.toolCommandPreview,
            steps: [
              `Review the evidence gathered for ${input.title}.`,
              "Re-run the captured tool command against the same in-scope target.",
              "Confirm that the observed behavior is still reproducible."
            ]
          }
        }
      : {}),
    tags: input.tags ?? ["attack-map", "workflow-orchestrator"]
  };
}
