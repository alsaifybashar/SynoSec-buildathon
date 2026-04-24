import { z } from "zod";
import { createPaginatedResponseSchema, jsonSchemaObjectSchema, paginatedMetaSchema, resourceListQuerySchema } from "./shared.js";
import { toolCapabilityTagSchema, toolCategorySchema, toolRiskTierSchema } from "./tooling.js";

export const applicationEnvironmentSchema = z.enum(["production", "staging", "development"]);
export type ApplicationEnvironment = z.infer<typeof applicationEnvironmentSchema>;

export const applicationStatusSchema = z.enum(["active", "investigating", "archived"]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const applicationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  baseUrl: z.string().url().nullable(),
  environment: applicationEnvironmentSchema,
  status: applicationStatusSchema,
  lastScannedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Application = z.infer<typeof applicationSchema>;

export const applicationsListQuerySchema = resourceListQuerySchema.extend({
  status: applicationStatusSchema.optional(),
  environment: applicationEnvironmentSchema.optional(),
  sortBy: z.enum(["name", "status", "environment", "lastScannedAt", "createdAt", "updatedAt"]).optional()
});
export type ApplicationsListQuery = z.infer<typeof applicationsListQuerySchema>;

export const listApplicationsResponseSchema = paginatedMetaSchema.extend({
  applications: z.array(applicationSchema)
});
export type ListApplicationsResponse = z.infer<typeof listApplicationsResponseSchema>;

const applicationBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  baseUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).transform((value) => value || null),
  environment: applicationEnvironmentSchema,
  status: applicationStatusSchema,
  lastScannedAt: z.union([z.string().datetime(), z.null()])
});

export const createApplicationBodySchema = applicationBodyBaseSchema;
export type CreateApplicationBody = z.infer<typeof createApplicationBodySchema>;

export const updateApplicationBodySchema = applicationBodyBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});
export type UpdateApplicationBody = z.infer<typeof updateApplicationBodySchema>;

export const runtimeServiceTypeSchema = z.enum(["gateway", "api", "worker", "database", "queue", "storage", "other"]);
export type RuntimeServiceType = z.infer<typeof runtimeServiceTypeSchema>;

export const runtimeProviderSchema = z.enum(["aws", "gcp", "azure", "on-prem", "docker", "vercel", "other"]);
export type RuntimeProvider = z.infer<typeof runtimeProviderSchema>;

export const runtimeStatusSchema = z.enum(["healthy", "degraded", "retired"]);
export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;

export const runtimeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  serviceType: runtimeServiceTypeSchema,
  provider: runtimeProviderSchema,
  environment: applicationEnvironmentSchema,
  region: z.string().min(1),
  status: runtimeStatusSchema,
  applicationId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Runtime = z.infer<typeof runtimeSchema>;

export const runtimesListQuerySchema = resourceListQuerySchema.extend({
  status: runtimeStatusSchema.optional(),
  provider: runtimeProviderSchema.optional(),
  environment: applicationEnvironmentSchema.optional(),
  applicationId: z.string().uuid().optional(),
  sortBy: z.enum(["name", "serviceType", "status", "provider", "environment", "region", "applicationId", "createdAt", "updatedAt"]).optional()
});
export type RuntimesListQuery = z.infer<typeof runtimesListQuerySchema>;

export const listRuntimesResponseSchema = paginatedMetaSchema.extend({
  runtimes: z.array(runtimeSchema)
});
export type ListRuntimesResponse = z.infer<typeof listRuntimesResponseSchema>;

const runtimeBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  serviceType: runtimeServiceTypeSchema,
  provider: runtimeProviderSchema,
  environment: applicationEnvironmentSchema,
  region: z.string().trim().min(1),
  status: runtimeStatusSchema,
  applicationId: z.union([z.string().uuid(), z.literal(""), z.null()]).transform((value) => value || null)
});

export const createRuntimeBodySchema = runtimeBodyBaseSchema;
export type CreateRuntimeBody = z.infer<typeof createRuntimeBodySchema>;

export const updateRuntimeBodySchema = runtimeBodyBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});
export type UpdateRuntimeBody = z.infer<typeof updateRuntimeBodySchema>;

export const aiProviderKindSchema = z.enum(["local", "anthropic"]);
export type AiProviderKind = z.infer<typeof aiProviderKindSchema>;

export const aiProviderStatusSchema = z.enum(["active", "inactive", "error"]);
export type AiProviderStatus = z.infer<typeof aiProviderStatusSchema>;

export const aiProviderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  kind: aiProviderKindSchema,
  status: aiProviderStatusSchema,
  description: z.string().nullable(),
  baseUrl: z.string().url().nullable(),
  model: z.string().min(1),
  apiKeyConfigured: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type AiProvider = z.infer<typeof aiProviderSchema>;

export const aiProvidersListQuerySchema = resourceListQuerySchema.extend({
  status: aiProviderStatusSchema.optional(),
  kind: aiProviderKindSchema.optional(),
  sortBy: z.enum(["name", "kind", "status", "model", "apiKey", "createdAt", "updatedAt"]).optional()
});
export type AiProvidersListQuery = z.infer<typeof aiProvidersListQuerySchema>;

export const listAiProvidersResponseSchema = createPaginatedResponseSchema("providers", aiProviderSchema);
export type ListAiProvidersResponse = z.infer<typeof listAiProvidersResponseSchema>;

const aiProviderBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  kind: aiProviderKindSchema,
  status: aiProviderStatusSchema,
  description: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  baseUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).transform((value) => value || null),
  model: z.string().trim().min(1),
  apiKey: z.string().trim().min(1).optional()
});

const requireLocalAiProviderBaseUrl = <T extends { kind: "local" | "anthropic"; baseUrl: string | null }>(value: T, ctx: z.RefinementCtx) => {
  if (value.kind === "local" && !value.baseUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Base URL is required for local providers.",
      path: ["baseUrl"]
    });
  }
};

export const createAiProviderBodySchema = aiProviderBodyBaseSchema.superRefine(requireLocalAiProviderBaseUrl);
export type CreateAiProviderBody = z.infer<typeof createAiProviderBodySchema>;

export const updateAiProviderBodySchema = aiProviderBodyBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  })
  .superRefine((value, ctx) => {
    if (value.kind === "local" && !value.baseUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Base URL is required for local providers.",
        path: ["baseUrl"]
      });
    }
  });
export type UpdateAiProviderBody = z.infer<typeof updateAiProviderBodySchema>;

export const aiToolSourceSchema = z.enum(["system", "custom"]);
export type AiToolSource = z.infer<typeof aiToolSourceSchema>;

export const aiToolStatusSchema = z.enum(["active", "inactive", "missing", "manual"]);
export type AiToolStatus = z.infer<typeof aiToolStatusSchema>;

export const toolExecutorTypeSchema = z.enum(["bash", "builtin"]);
export type ToolExecutorType = z.infer<typeof toolExecutorTypeSchema>;

export const toolBuiltinActionKeySchema = z.enum(["report_finding", "report_vulnerability"]);
export type ToolBuiltinActionKey = z.infer<typeof toolBuiltinActionKeySchema>;

export const toolSandboxProfileSchema = z.enum([
  "network-recon",
  "read-only-parser",
  "active-recon",
  "controlled-exploit-lab"
]);
export type ToolSandboxProfile = z.infer<typeof toolSandboxProfileSchema>;

export const toolPrivilegeProfileSchema = z.enum([
  "read-only-network",
  "active-network",
  "controlled-exploit"
]);
export type ToolPrivilegeProfile = z.infer<typeof toolPrivilegeProfileSchema>;

export const aiToolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: aiToolStatusSchema,
  source: aiToolSourceSchema,
  description: z.string().nullable(),
  binary: z.string().nullable(),
  executorType: toolExecutorTypeSchema.default("bash"),
  builtinActionKey: toolBuiltinActionKeySchema.nullable().optional(),
  bashSource: z.string().min(1).nullable(),
  capabilities: z.array(z.lazy(() => toolCapabilityTagSchema)).default([]),
  category: z.lazy(() => toolCategorySchema),
  riskTier: z.lazy(() => toolRiskTierSchema),
  notes: z.string().nullable(),
  sandboxProfile: toolSandboxProfileSchema,
  privilegeProfile: toolPrivilegeProfileSchema,
  timeoutMs: z.number().int().min(1000).max(300000),
  inputSchema: z.lazy(() => jsonSchemaObjectSchema),
  outputSchema: z.lazy(() => jsonSchemaObjectSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).superRefine((value, ctx) => {
  if (value.executorType === "bash") {
    if (!value.bashSource?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bash source is required for bash tools.",
        path: ["bashSource"]
      });
    }

    return;
  }

  if (!value.builtinActionKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Built-in action key is required for builtin tools.",
      path: ["builtinActionKey"]
    });
  }
});
export type AiTool = z.infer<typeof aiToolSchema>;

export const aiToolsListQuerySchema = resourceListQuerySchema.extend({
  status: aiToolStatusSchema.optional(),
  source: aiToolSourceSchema.optional(),
  category: z.lazy(() => toolCategorySchema).optional(),
  sortBy: z.enum(["name", "source", "status", "category", "riskTier", "createdAt", "updatedAt"]).optional()
});
export type AiToolsListQuery = z.infer<typeof aiToolsListQuerySchema>;

export const listAiToolsResponseSchema = createPaginatedResponseSchema("tools", aiToolSchema);
export type ListAiToolsResponse = z.infer<typeof listAiToolsResponseSchema>;

export const aiToolRunObservationSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  evidence: z.string().min(1),
  technique: z.string().min(1),
  port: z.number().int().optional(),
  relatedKeys: z.array(z.string().min(1)).default([])
});
export type AiToolRunObservation = z.infer<typeof aiToolRunObservationSchema>;

export const aiToolRunBodySchema = z.object({
  input: jsonSchemaObjectSchema
});
export type AiToolRunBody = z.infer<typeof aiToolRunBodySchema>;

export const aiToolRunResultSchema = z.object({
  toolId: z.string().min(1),
  toolName: z.string().min(1),
  toolInput: jsonSchemaObjectSchema,
  commandPreview: z.string().min(1),
  target: z.string().min(1),
  port: z.number().int().nullable(),
  output: z.string(),
  statusReason: z.string().nullable(),
  exitCode: z.number().int(),
  durationMs: z.number().int().nonnegative(),
  observations: z.array(aiToolRunObservationSchema)
});
export type AiToolRunResult = z.infer<typeof aiToolRunResultSchema>;

const aiToolBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  status: aiToolStatusSchema,
  source: aiToolSourceSchema,
  description: z.string().trim().min(1),
  binary: z.union([z.string().trim().min(1), z.literal(""), z.null()]).transform((value) => value || null).optional(),
  executorType: z.literal("bash").default("bash"),
  bashSource: z.string().min(1),
  capabilities: z.array(z.lazy(() => toolCapabilityTagSchema)).default([]),
  category: z.lazy(() => toolCategorySchema),
  riskTier: z.lazy(() => toolRiskTierSchema),
  notes: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  sandboxProfile: z.lazy(() => toolSandboxProfileSchema),
  privilegeProfile: z.lazy(() => toolPrivilegeProfileSchema),
  timeoutMs: z.number().int().min(1000).max(300000),
  inputSchema: z.lazy(() => jsonSchemaObjectSchema),
  outputSchema: z.lazy(() => jsonSchemaObjectSchema)
});

export const createAiToolBodySchema = aiToolBodyBaseSchema.superRefine((value, ctx) => {
  if (value.source === "system") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "System tools are synchronized from the backend catalog and cannot be created manually.",
      path: ["source"]
    });
  }
  if (value.capabilities.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one capability is required for bash tools.",
      path: ["capabilities"]
    });
  }
  if (!value.bashSource.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bash source is required.",
      path: ["bashSource"]
    });
  }
});
export type CreateAiToolBody = z.infer<typeof createAiToolBodySchema>;

export const updateAiToolBodySchema = aiToolBodyBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  })
  .superRefine((value, ctx) => {
    if ("name" in value && !value.name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name is required.",
        path: ["name"]
      });
    }
    if ("description" in value && !value.description?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Description is required.",
        path: ["description"]
      });
    }
    if ("bashSource" in value && !value.bashSource?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bash source is required.",
        path: ["bashSource"]
      });
    }
    if ("capabilities" in value && value.capabilities?.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one capability is required for bash tools.",
        path: ["capabilities"]
      });
    }
  });
export type UpdateAiToolBody = z.infer<typeof updateAiToolBodySchema>;

export const aiAgentStatusSchema = z.enum(["draft", "active", "archived"]);
export type AiAgentStatus = z.infer<typeof aiAgentStatusSchema>;

export const aiAgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: aiAgentStatusSchema,
  description: z.string().nullable(),
  providerId: z.string().uuid(),
  systemPrompt: z.string().min(1),
  modelOverride: z.string().nullable(),
  toolIds: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type AiAgent = z.infer<typeof aiAgentSchema>;

export const aiAgentsListQuerySchema = resourceListQuerySchema.extend({
  status: aiAgentStatusSchema.optional(),
  providerId: z.string().uuid().optional(),
  sortBy: z.enum(["name", "status", "providerId", "toolIds", "createdAt", "updatedAt"]).optional()
});
export type AiAgentsListQuery = z.infer<typeof aiAgentsListQuerySchema>;

export const listAiAgentsResponseSchema = createPaginatedResponseSchema("agents", aiAgentSchema);
export type ListAiAgentsResponse = z.infer<typeof listAiAgentsResponseSchema>;

const aiAgentBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  status: aiAgentStatusSchema,
  description: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  providerId: z.string().uuid(),
  systemPrompt: z.string().min(1),
  modelOverride: z.union([z.string().trim().min(1), z.literal(""), z.null()]).transform((value) => value || null),
  toolIds: z.array(z.string().min(1)).default([])
});

export const createAiAgentBodySchema = aiAgentBodyBaseSchema;
export type CreateAiAgentBody = z.infer<typeof createAiAgentBodySchema>;

export const updateAiAgentBodySchema = aiAgentBodyBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});
export type UpdateAiAgentBody = z.infer<typeof updateAiAgentBodySchema>;

export const workflowStatusSchema = z.enum(["draft", "active", "archived"]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

export const workflowFindingTypeSchema = z.enum([
  "service_exposure",
  "content_discovery",
  "missing_security_header",
  "tls_weakness",
  "injection_signal",
  "auth_weakness",
  "sensitive_data_exposure",
  "misconfiguration",
  "other"
]);
export type WorkflowFindingType = z.infer<typeof workflowFindingTypeSchema>;

export const workflowFindingEvidenceSchema = z.object({
  sourceTool: z.string().min(1),
  quote: z.string().min(1),
  artifactRef: z.string().min(1).optional()
});
export type WorkflowFindingEvidence = z.infer<typeof workflowFindingEvidenceSchema>;

export const workflowFindingTargetSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().optional(),
  url: z.string().url().optional(),
  path: z.string().min(1).optional()
});
export type WorkflowFindingTarget = z.infer<typeof workflowFindingTargetSchema>;

export const workflowFindingSubmissionSchema = z.object({
  type: workflowFindingTypeSchema,
  title: z.string().min(1),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  target: workflowFindingTargetSchema,
  evidence: z.array(workflowFindingEvidenceSchema).min(1),
  impact: z.string().min(1),
  recommendation: z.string().min(1),
  cwe: z.string().min(1).optional(),
  owasp: z.string().min(1).optional(),
  reproduction: z.object({
    commandPreview: z.string().min(1).optional(),
    steps: z.array(z.string().min(1)).min(1)
  }).optional(),
  tags: z.array(z.string().min(1)).default([])
});
export type WorkflowFindingSubmission = z.infer<typeof workflowFindingSubmissionSchema>;

export const workflowReportedFindingSchema = workflowFindingSubmissionSchema.extend({
  id: z.string().uuid(),
  workflowRunId: z.string().uuid(),
  workflowStageId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime()
});
export type WorkflowReportedFinding = z.infer<typeof workflowReportedFindingSchema>;

const allWorkflowFindingTypes = workflowFindingTypeSchema.options;

export const workflowStageFindingPolicySchema = z.object({
  taxonomy: z.literal("typed-core-v1").default("typed-core-v1"),
  allowedTypes: z.array(workflowFindingTypeSchema).min(1).default(allWorkflowFindingTypes)
});
export type WorkflowStageFindingPolicy = z.infer<typeof workflowStageFindingPolicySchema>;

export const workflowStageCompletionRuleSchema = z.object({
  requireStageResult: z.boolean().default(true),
  requireToolCall: z.boolean().default(false),
  allowEmptyResult: z.boolean().default(true),
  minFindings: z.number().int().min(0).default(0),
  maxFindings: z.number().int().min(0).optional()
});
export type WorkflowStageCompletionRule = z.infer<typeof workflowStageCompletionRuleSchema>;

export const workflowStageResultStatusSchema = z.enum(["completed", "blocked", "insufficient_evidence"]);
export type WorkflowStageResultStatus = z.infer<typeof workflowStageResultStatusSchema>;

export const workflowStageResultSubmissionSchema = z.object({
  status: workflowStageResultStatusSchema,
  summary: z.string().min(1),
  findingIds: z.array(z.string().uuid()).default([]),
  recommendedNextStep: z.string().min(1),
  residualRisk: z.string().min(1),
  handoff: z.union([jsonSchemaObjectSchema, z.null()]).default(null)
});
export type WorkflowStageResultSubmission = z.infer<typeof workflowStageResultSubmissionSchema>;

export const workflowStageResultSchema = workflowStageResultSubmissionSchema.extend({
  submittedAt: z.string().datetime()
});
export type WorkflowStageResult = z.infer<typeof workflowStageResultSchema>;

export const workflowStageSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  agentId: z.string().uuid(),
  ord: z.number().int().min(0),
  objective: z.string().min(1),
  allowedToolIds: z.array(z.string().min(1)).default([]),
  requiredEvidenceTypes: z.array(z.string().min(1)).default([]),
  findingPolicy: workflowStageFindingPolicySchema.default({
    taxonomy: "typed-core-v1",
    allowedTypes: allWorkflowFindingTypes
  }),
  completionRule: workflowStageCompletionRuleSchema.default({
    requireStageResult: true,
    requireToolCall: false,
    allowEmptyResult: true,
    minFindings: 0
  }),
  resultSchemaVersion: z.number().int().min(1).default(1),
  handoffSchema: z.union([jsonSchemaObjectSchema, z.null()]).default(null)
});
export type WorkflowStage = z.infer<typeof workflowStageSchema>;

export const workflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: workflowStatusSchema,
  description: z.string().nullable(),
  applicationId: z.string().uuid(),
  runtimeId: z.string().uuid().nullable(),
  agentId: z.string().uuid(),
  objective: z.string().min(1),
  allowedToolIds: z.array(z.string().min(1)).default([]),
  requiredEvidenceTypes: z.array(z.string().min(1)).default([]),
  findingPolicy: workflowStageFindingPolicySchema.default({
    taxonomy: "typed-core-v1",
    allowedTypes: allWorkflowFindingTypes
  }),
  completionRule: workflowStageCompletionRuleSchema.default({
    requireStageResult: true,
    requireToolCall: false,
    allowEmptyResult: true,
    minFindings: 0
  }),
  resultSchemaVersion: z.number().int().min(1).default(1),
  handoffSchema: z.union([jsonSchemaObjectSchema, z.null()]).default(null),
  stages: z.array(workflowStageSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Workflow = z.infer<typeof workflowSchema>;

export const workflowsListQuerySchema = resourceListQuerySchema.extend({
  status: workflowStatusSchema.optional(),
  applicationId: z.string().uuid().optional(),
  sortBy: z.enum(["name", "status", "applicationId", "agentId", "createdAt", "updatedAt"]).optional()
});
export type WorkflowsListQuery = z.infer<typeof workflowsListQuerySchema>;

export const listWorkflowsResponseSchema = createPaginatedResponseSchema("workflows", workflowSchema);
export type ListWorkflowsResponse = z.infer<typeof listWorkflowsResponseSchema>;

const workflowStageBodySchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1),
  agentId: z.string().uuid(),
  objective: z.string().trim().min(1),
  allowedToolIds: z.array(z.string().min(1)).default([]),
  requiredEvidenceTypes: z.array(z.string().min(1)).default([]),
  findingPolicy: workflowStageFindingPolicySchema.default({
    taxonomy: "typed-core-v1",
    allowedTypes: allWorkflowFindingTypes
  }),
  completionRule: workflowStageCompletionRuleSchema.default({
    requireStageResult: true,
    requireToolCall: false,
    allowEmptyResult: true,
    minFindings: 0
  }),
  resultSchemaVersion: z.number().int().min(1).default(1),
  handoffSchema: z.union([jsonSchemaObjectSchema, z.null()]).default(null)
});
export type WorkflowStageBody = z.infer<typeof workflowStageBodySchema>;

const workflowBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  status: workflowStatusSchema,
  description: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  applicationId: z.string().uuid(),
  runtimeId: z.union([z.string().uuid(), z.literal(""), z.null()]).transform((value) => value || null),
  agentId: z.string().uuid(),
  objective: z.string().trim().min(1),
  allowedToolIds: z.array(z.string().min(1)).default([]),
  requiredEvidenceTypes: z.array(z.string().min(1)).default([]),
  findingPolicy: workflowStageFindingPolicySchema.default({
    taxonomy: "typed-core-v1",
    allowedTypes: allWorkflowFindingTypes
  }),
  completionRule: workflowStageCompletionRuleSchema.default({
    requireStageResult: true,
    requireToolCall: false,
    allowEmptyResult: true,
    minFindings: 0
  }),
  resultSchemaVersion: z.number().int().min(1).default(1),
  handoffSchema: z.union([jsonSchemaObjectSchema, z.null()]).default(null)
});

export const createWorkflowBodySchema = workflowBodyBaseSchema;
export type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;

export const updateWorkflowBodySchema = workflowBodyBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});
export type UpdateWorkflowBody = z.infer<typeof updateWorkflowBodySchema>;

export const workflowRunStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
export type WorkflowRunStatus = z.infer<typeof workflowRunStatusSchema>;

export const workflowTraceEntryStatusSchema = z.enum(["completed", "failed"]);
export type WorkflowTraceEntryStatus = z.infer<typeof workflowTraceEntryStatusSchema>;

export const workflowTraceEventTypeSchema = z.enum([
  "stage_started",
  "system_message",
  "agent_input",
  "model_decision",
  "start",
  "start-step",
  "text",
  "reasoning",
  "tool_call",
  "tool_call_streaming_start",
  "tool_call_delta",
  "tool_result",
  "verification",
  "finding_reported",
  "stage_result_submitted",
  "stage_contract_validation_failed",
  "agent_summary",
  "finish-step",
  "finish",
  "stage_completed",
  "stage_failed",
  "run_completed",
  "run_failed",
  "error",
  "abort"
]);
export type WorkflowTraceEventType = z.infer<typeof workflowTraceEventTypeSchema>;

export const workflowTraceEventStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
export type WorkflowTraceEventStatus = z.infer<typeof workflowTraceEventStatusSchema>;

export const workflowTraceEventSchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string().uuid(),
  workflowId: z.string().uuid(),
  workflowStageId: z.string().uuid().nullable().default(null),
  stepIndex: z.number().int().min(0).default(0),
  ord: z.number().int().min(0),
  type: workflowTraceEventTypeSchema,
  status: workflowTraceEventStatusSchema,
  title: z.string().min(1).default("Workflow event"),
  summary: z.string().min(1).default("Workflow event"),
  detail: z.string().nullable().default(null),
  payload: jsonSchemaObjectSchema,
  createdAt: z.string().datetime()
});
export type WorkflowTraceEvent = z.infer<typeof workflowTraceEventSchema>;

export const workflowTraceEntrySchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string().uuid(),
  workflowId: z.string().uuid(),
  workflowStageId: z.string().uuid().nullable().default(null),
  stepIndex: z.number().int().min(0).default(0),
  stageLabel: z.string().min(1),
  agentId: z.string().uuid(),
  agentName: z.string().min(1),
  status: workflowTraceEntryStatusSchema,
  selectedToolIds: z.array(z.string().min(1)),
  toolSelectionReason: z.string().min(1),
  targetSummary: z.string().min(1),
  evidenceHighlights: z.array(z.string().min(1)),
  outputSummary: z.string().min(1),
  createdAt: z.string().datetime()
});
export type WorkflowTraceEntry = z.infer<typeof workflowTraceEntrySchema>;

export const workflowRunSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  status: workflowRunStatusSchema,
  currentStepIndex: z.number().int().min(0).default(0),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  trace: z.array(workflowTraceEntrySchema).default([]),
  events: z.array(workflowTraceEventSchema).default([])
});
export type WorkflowRun = z.infer<typeof workflowRunSchema>;

export const workflowRunStreamMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("snapshot"),
    run: workflowRunSchema
  }),
  z.object({
    type: z.literal("run_event"),
    run: workflowRunSchema,
    event: workflowTraceEventSchema
  })
]);
export type WorkflowRunStreamMessage = z.infer<typeof workflowRunStreamMessageSchema>;
