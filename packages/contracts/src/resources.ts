import { z } from "zod";
import { createPaginatedResponseSchema, executionKindSchema, jsonSchemaObjectSchema, paginatedMetaSchema, resourceListQuerySchema } from "./shared.js";
import { toolCapabilityTagSchema, toolCategorySchema, toolRiskTierSchema } from "./tooling.js";

export const targetEnvironmentSchema = z.enum(["production", "staging", "development"]);
export type TargetEnvironment = z.infer<typeof targetEnvironmentSchema>;

export const targetStatusSchema = z.enum(["active", "investigating", "archived"]);
export type TargetStatus = z.infer<typeof targetStatusSchema>;

export const applicationEnvironmentSchema = targetEnvironmentSchema;
export type ApplicationEnvironment = TargetEnvironment;

export const applicationStatusSchema = targetStatusSchema;
export type ApplicationStatus = TargetStatus;

export const executionConstraintKindSchema = z.enum(["provider_policy", "legal_scope", "workflow_gate"]);
export type ExecutionConstraintKind = z.infer<typeof executionConstraintKindSchema>;

const excludedPathsSchema = z.array(z.string().trim().min(1)).transform((paths) => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const path of paths) {
    if (!seen.has(path)) {
      seen.add(path);
      normalized.push(path);
    }
  }

  return normalized;
});

const documentationUrlsSchema = z.array(z.string().trim().url()).transform((urls) => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const url of urls) {
    if (!seen.has(url)) {
      seen.add(url);
      normalized.push(url);
    }
  }

  return normalized;
});

export const executionConstraintSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: executionConstraintKindSchema,
  provider: z.string().min(1).nullable(),
  version: z.number().int().min(1),
  description: z.string().nullable(),
  bypassForLocalTargets: z.boolean(),
  denyProviderOwnedTargets: z.boolean(),
  requireVerifiedOwnership: z.boolean(),
  allowActiveExploit: z.boolean(),
  requireRateLimitSupport: z.boolean(),
  rateLimitRps: z.number().int().min(1).nullable(),
  requireHostAllowlistSupport: z.boolean(),
  requirePathExclusionSupport: z.boolean(),
  documentationUrls: documentationUrlsSchema,
  excludedPaths: excludedPathsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ExecutionConstraint = z.infer<typeof executionConstraintSchema>;

export const executionConstraintsListQuerySchema = resourceListQuerySchema.extend({
  kind: executionConstraintKindSchema.optional(),
  provider: z.string().trim().min(1).optional(),
  sortBy: z.enum(["name", "kind", "provider", "version", "createdAt", "updatedAt"]).optional()
});
export type ExecutionConstraintsListQuery = z.infer<typeof executionConstraintsListQuerySchema>;

export const listExecutionConstraintsResponseSchema = paginatedMetaSchema.extend({
  constraints: z.array(executionConstraintSchema)
});
export type ListExecutionConstraintsResponse = z.infer<typeof listExecutionConstraintsResponseSchema>;

const executionConstraintBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  kind: executionConstraintKindSchema,
  provider: z.union([z.string().trim().min(1), z.literal(""), z.null()]).transform((value) => value || null),
  version: z.number().int().min(1),
  description: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  bypassForLocalTargets: z.boolean().default(false),
  denyProviderOwnedTargets: z.boolean().default(false),
  requireVerifiedOwnership: z.boolean().default(false),
  allowActiveExploit: z.boolean().default(false),
  requireRateLimitSupport: z.boolean().default(false),
  rateLimitRps: z.union([z.number().int().min(1), z.null()]).default(null),
  requireHostAllowlistSupport: z.boolean().default(false),
  requirePathExclusionSupport: z.boolean().default(false),
  documentationUrls: documentationUrlsSchema.default([]),
  excludedPaths: excludedPathsSchema.default([])
});

export const createExecutionConstraintBodySchema = executionConstraintBodyBaseSchema;
export type CreateExecutionConstraintBody = z.infer<typeof createExecutionConstraintBodySchema>;

export const updateExecutionConstraintBodySchema = executionConstraintBodyBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});
export type UpdateExecutionConstraintBody = z.infer<typeof updateExecutionConstraintBodySchema>;

export const applicationConstraintBindingSchema = z.object({
  constraintId: z.string().min(1),
  createdAt: z.string().datetime().optional(),
  constraint: executionConstraintSchema.optional()
});
export type ApplicationConstraintBinding = z.infer<typeof applicationConstraintBindingSchema>;

export const targetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  baseUrl: z.string().url().nullable(),
  executionBaseUrl: z.string().url().nullable().optional(),
  environment: targetEnvironmentSchema,
  status: targetStatusSchema,
  lastScannedAt: z.string().datetime().nullable(),
  constraintBindings: z.array(applicationConstraintBindingSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Target = z.infer<typeof targetSchema>;

export const targetsListQuerySchema = resourceListQuerySchema.extend({
  status: targetStatusSchema.optional(),
  environment: targetEnvironmentSchema.optional(),
  sortBy: z.enum(["name", "status", "environment", "lastScannedAt", "createdAt", "updatedAt"]).optional()
});
export type TargetsListQuery = z.infer<typeof targetsListQuerySchema>;

export const listTargetsResponseSchema = paginatedMetaSchema.extend({
  targets: z.array(targetSchema)
});
export type ListTargetsResponse = z.infer<typeof listTargetsResponseSchema>;

const targetBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  baseUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).transform((value) => value || null),
  executionBaseUrl: z.union([z.string().trim().url(), z.literal(""), z.null()]).transform((value) => value || null).optional(),
  environment: targetEnvironmentSchema,
  status: targetStatusSchema,
  lastScannedAt: z.union([z.string().datetime(), z.null()]),
  constraintIds: z.array(z.string().min(1)).optional()
});

export const createTargetBodySchema = targetBodyBaseSchema;
export type CreateTargetBody = z.infer<typeof createTargetBodySchema>;

export const updateTargetBodySchema = targetBodyBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});
export type UpdateTargetBody = z.infer<typeof updateTargetBodySchema>;

export const aiToolSourceSchema = z.enum(["system", "custom"]);
export type AiToolSource = z.infer<typeof aiToolSourceSchema>;

export const aiToolStatusSchema = z.enum(["active", "inactive", "missing", "manual"]);
export type AiToolStatus = z.infer<typeof aiToolStatusSchema>;

export const toolExecutorTypeSchema = z.enum(["bash", "builtin"]);
export type ToolExecutorType = z.infer<typeof toolExecutorTypeSchema>;

export const aiToolKindSchema = z.enum(["builtin-action", "semantic-family", "raw-adapter"]);
export type AiToolKind = z.infer<typeof aiToolKindSchema>;

export const aiToolSurfaceSchema = z.enum(["primary", "advanced", "raw"]);
export type AiToolSurface = z.infer<typeof aiToolSurfaceSchema>;

export const toolBuiltinActionKeySchema = z.enum([
  "log_progress",
  "report_finding",
  "report_attack_vector",
  "complete_run",
  "http_surface_assessment",
  "web_crawl_mapping",
  "content_discovery",
  "parameter_discovery",
  "web_vulnerability_audit",
  "sql_injection_validation",
  "xss_validation",
  "wordpress_assessment",
  "auth_flow_assessment",
  "token_analysis",
  "network_host_discovery",
  "network_service_enumeration",
  "tls_posture_audit",
  "network_topology_mapping",
  "subdomain_discovery",
  "dns_enumeration",
  "credential_format_identification",
  "online_credential_attack",
  "offline_password_cracking",
  "windows_enumeration",
  "windows_remote_access_validation",
  "windows_poisoning_and_capture",
  "controlled_exploitation",
  "cloud_posture_audit",
  "kubernetes_posture_audit",
  "binary_triage",
  "interactive_reverse_engineering",
  "artifact_metadata_extraction",
  "file_carving_and_bulk_extraction",
  "memory_forensics",
  "steganography_analysis",
  "local_shell_probe"
]);
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

export const toolConstraintTargetKindSchema = z.enum(["host", "domain", "url", "cidr"]);
export type ToolConstraintTargetKind = z.infer<typeof toolConstraintTargetKindSchema>;

export const toolConstraintNetworkBehaviorSchema = z.enum(["none", "outbound-read", "outbound-active"]);
export type ToolConstraintNetworkBehavior = z.infer<typeof toolConstraintNetworkBehaviorSchema>;

export const toolConstraintMutationClassSchema = z.enum(["none", "content-enumeration", "active-validation", "exploit"]);
export type ToolConstraintMutationClass = z.infer<typeof toolConstraintMutationClassSchema>;

export const toolConstraintProfileSchema = z.object({
  enforced: z.boolean().default(false),
  targetKinds: z.array(toolConstraintTargetKindSchema).default([]),
  networkBehavior: toolConstraintNetworkBehaviorSchema.default("outbound-read"),
  mutationClass: toolConstraintMutationClassSchema.default("none"),
  supportsHostAllowlist: z.boolean().default(false),
  supportsPathExclusions: z.boolean().default(false),
  supportsRateLimit: z.boolean().default(false)
});
export type ToolConstraintProfile = z.infer<typeof toolConstraintProfileSchema>;

export const aiToolRuntimeStateSummarySchema = z.object({
  cataloged: z.boolean().default(false),
  installed: z.boolean().default(false),
  executable: z.boolean().default(false),
  granted: z.boolean().default(false)
});
export type AiToolRuntimeStateSummary = z.infer<typeof aiToolRuntimeStateSummarySchema>;

export const aiToolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: aiToolKindSchema.default("raw-adapter"),
  status: aiToolStatusSchema,
  source: aiToolSourceSchema,
  description: z.string().nullable(),
  executorType: toolExecutorTypeSchema.default("bash"),
  builtinActionKey: toolBuiltinActionKeySchema.nullable().optional(),
  bashSource: z.string().min(1).nullable(),
  capabilities: z.array(z.lazy(() => toolCapabilityTagSchema)).default([]),
  category: z.lazy(() => toolCategorySchema),
  riskTier: z.lazy(() => toolRiskTierSchema),
  timeoutMs: z.number().int().min(1000).max(300000),
  constraintProfile: toolConstraintProfileSchema.optional(),
  coveredToolIds: z.array(z.string().min(1)).default([]),
  candidateToolIds: z.array(z.string().min(1)).default([]),
  runtimeStateSummary: aiToolRuntimeStateSummarySchema.optional(),
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
  surface: aiToolSurfaceSchema.optional(),
  category: z.lazy(() => toolCategorySchema).optional(),
  sortBy: z.enum(["name", "kind", "source", "status", "category", "riskTier", "createdAt", "updatedAt"]).optional()
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
  executorType: z.literal("bash").default("bash"),
  bashSource: z.string().min(1),
  category: z.lazy(() => toolCategorySchema),
  riskTier: z.lazy(() => toolRiskTierSchema),
  timeoutMs: z.number().int().min(1000).max(300000),
  constraintProfile: toolConstraintProfileSchema.optional(),
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
  });
export type UpdateAiToolBody = z.infer<typeof updateAiToolBodySchema>;

export const aiAgentStatusSchema = z.enum(["draft", "active", "archived"]);
export type AiAgentStatus = z.infer<typeof aiAgentStatusSchema>;

export const aiAgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: aiAgentStatusSchema,
  description: z.string().nullable(),
  systemPrompt: z.string().min(1),
  toolIds: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type AiAgent = z.infer<typeof aiAgentSchema>;

export const aiAgentsListQuerySchema = resourceListQuerySchema.extend({
  status: aiAgentStatusSchema.optional(),
  sortBy: z.enum(["name", "status", "toolIds", "createdAt", "updatedAt"]).optional()
});
export type AiAgentsListQuery = z.infer<typeof aiAgentsListQuerySchema>;

export const listAiAgentsResponseSchema = createPaginatedResponseSchema("agents", aiAgentSchema);
export type ListAiAgentsResponse = z.infer<typeof listAiAgentsResponseSchema>;

const aiAgentBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  status: aiAgentStatusSchema,
  description: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  systemPrompt: z.string().min(1),
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
  artifactRef: z.string().min(1).optional(),
  observationRef: z.string().min(1).optional(),
  toolRunRef: z.string().min(1).optional(),
  traceEventId: z.string().uuid().optional(),
  externalUrl: z.string().url().optional()
}).refine((value) =>
  Boolean(
    value.artifactRef
    || value.observationRef
    || value.toolRunRef
    || value.traceEventId
    || value.externalUrl
  ), {
    message: "Workflow finding evidence requires at least one evidence reference."
  });
export type WorkflowFindingEvidence = z.infer<typeof workflowFindingEvidenceSchema>;

export const workflowFindingTargetSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().optional(),
  url: z.string().url().optional(),
  path: z.string().min(1).optional()
});
export type WorkflowFindingTarget = z.infer<typeof workflowFindingTargetSchema>;

export const workflowGraphRelationshipKindSchema = z.enum(["supports", "derived_from", "correlates_with", "enables"]);
export type WorkflowGraphRelationshipKind = z.infer<typeof workflowGraphRelationshipKindSchema>;

export const workflowFindingValidationStatusSchema = z.enum([
  "unverified",
  "suspected",
  "single_source",
  "cross_validated",
  "reproduced",
  "blocked",
  "rejected"
]);
export type WorkflowFindingValidationStatus = z.infer<typeof workflowFindingValidationStatusSchema>;

export const workflowFindingReproductionSchema = z.object({
  commandPreview: z.string().min(1).optional(),
  steps: z.array(z.string().min(1)).min(1)
});
export type WorkflowFindingReproduction = z.infer<typeof workflowFindingReproductionSchema>;

export const workflowFindingChainSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  severity: z.enum(["info", "low", "medium", "high", "critical"]).optional()
});
export type WorkflowFindingChain = z.infer<typeof workflowFindingChainSchema>;

export const workflowFindingRelationshipExplanationsSchema = z.object({
  derivedFrom: z.string().min(1).optional(),
  relatedTo: z.string().min(1).optional(),
  enables: z.string().min(1).optional(),
  chainRole: z.string().min(1).optional()
});
export type WorkflowFindingRelationshipExplanations = z.infer<typeof workflowFindingRelationshipExplanationsSchema>;

export const workflowFindingSubmissionSchema = z.object({
  type: workflowFindingTypeSchema,
  title: z.string().min(1),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  target: workflowFindingTargetSchema,
  evidence: z.array(workflowFindingEvidenceSchema).min(1),
  impact: z.string().min(1),
  recommendation: z.string().min(1),
  validationStatus: workflowFindingValidationStatusSchema.default("unverified"),
  cwe: z.string().min(1).optional(),
  mitreId: z.string().min(1).optional(),
  owasp: z.string().min(1).optional(),
  reproduction: workflowFindingReproductionSchema.optional(),
  derivedFromFindingIds: z.array(z.string().uuid()).default([]),
  relatedFindingIds: z.array(z.string().uuid()).default([]),
  enablesFindingIds: z.array(z.string().uuid()).default([]),
  chain: workflowFindingChainSchema.optional(),
  explanationSummary: z.string().min(1).optional(),
  confidenceReason: z.string().min(1).optional(),
  relationshipExplanations: workflowFindingRelationshipExplanationsSchema.optional(),
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

export const workflowAttackVectorKindSchema = z.enum(["enables", "derived_from", "related", "lateral_movement"]);
export type WorkflowAttackVectorKind = z.infer<typeof workflowAttackVectorKindSchema>;

const workflowAttackVectorSubmissionBaseSchema = z.object({
  kind: workflowAttackVectorKindSchema,
  sourceFindingId: z.string().uuid(),
  destinationFindingId: z.string().uuid(),
  summary: z.string().min(1),
  preconditions: z.array(z.string().min(1)).default([]),
  impact: z.string().min(1),
  transitionEvidence: z.array(workflowFindingEvidenceSchema).default([]),
  confidence: z.number().min(0).max(1),
  validationStatus: workflowFindingValidationStatusSchema.default("unverified")
});

export const workflowAttackVectorSubmissionSchema = workflowAttackVectorSubmissionBaseSchema.superRefine((value, ctx) => {
  if (value.kind !== "related" && value.transitionEvidence.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Non-related attack vectors require transitionEvidence.",
      path: ["transitionEvidence"]
    });
  }
});
export type WorkflowAttackVectorSubmission = z.infer<typeof workflowAttackVectorSubmissionSchema>;

export const workflowReportFindingFindingModeSubmissionSchema = workflowFindingSubmissionSchema.extend({
  mode: z.literal("finding"),
  attackVectors: z.array(workflowAttackVectorSubmissionSchema).default([])
});
export type WorkflowReportFindingFindingModeSubmission = z.infer<typeof workflowReportFindingFindingModeSubmissionSchema>;

export const workflowReportFindingAttackVectorModeSubmissionSchema = z.object({
  mode: z.literal("attack_vector"),
  attackVectors: z.array(workflowAttackVectorSubmissionSchema).min(1)
});
export type WorkflowReportFindingAttackVectorModeSubmission = z.infer<typeof workflowReportFindingAttackVectorModeSubmissionSchema>;

export const workflowReportFindingSubmissionSchema = z.discriminatedUnion("mode", [
  workflowReportFindingFindingModeSubmissionSchema,
  workflowReportFindingAttackVectorModeSubmissionSchema
]);
export type WorkflowReportFindingSubmission = z.infer<typeof workflowReportFindingSubmissionSchema>;

export const workflowReportedAttackVectorSchema = workflowAttackVectorSubmissionBaseSchema.extend({
  id: z.string().uuid(),
  workflowRunId: z.string().uuid(),
  workflowStageId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime()
}).superRefine((value, ctx) => {
  if (value.kind !== "related" && value.transitionEvidence.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Non-related attack vectors require transitionEvidence.",
      path: ["transitionEvidence"]
    });
  }
});
export type WorkflowReportedAttackVector = z.infer<typeof workflowReportedAttackVectorSchema>;

export const defaultWorkflowStageSystemPrompt = [
  "Role and goal:",
  "Complete the current workflow stage using the approved capability surface for this run.",
  "",
  "Working style:",
  "Keep progress updates concise and action-oriented.",
  "",
  "Evidence expectations:",
  "Prefer concrete, evidence-backed findings over unsupported narrative.",
  "Use persisted tool-result quotes as evidence; do not invent evidence.",
  "Distinguish confirmed findings from weaker hypotheses when the evidence is incomplete.",
  "Do not describe an attack path as confirmed compromise, takeover, credential theft, or privilege escalation unless the final outcome was directly observed or the transition was validated end-to-end.",
  "If individual findings are confirmed but the full chain lacks replay, label the path as plausible or qualified and state the missing validation explicitly.",
  "When findings combine into an attack path, keep findings focused on weaknesses and represent transitions explicitly.",
  "Do not claim a chained path across multiple findings without explicit transition records, relationship fields, or chain metadata."
].join("\n");

export const defaultWorkflowTaskPromptTemplate = [
  "Workflow: {{workflow.name}}",
  "Stage: {{stage.label}}",
  "Target: {{target.name}}",
  "Target URL: {{target.url}}"
].join("\n");

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
  maxFindings: z.number().int().min(0).optional(),
  requireReachableSurface: z.boolean().default(false),
  requireEvidenceBackedWeakness: z.boolean().default(false),
  requireOsiCoverageStatus: z.boolean().default(false),
  requireChainedFindings: z.boolean().default(false)
});
export type WorkflowStageCompletionRule = z.infer<typeof workflowStageCompletionRuleSchema>;

export const workflowStageResultStatusSchema = z.enum(["completed", "blocked", "insufficient_evidence"]);
export type WorkflowStageResultStatus = z.infer<typeof workflowStageResultStatusSchema>;

export const workflowBlockedCompletionSchema = z.object({
  reason: z.string().min(1),
  failedToolRunIds: z.array(z.string().min(1)).min(1),
  recommendedFix: z.string().min(1),
  operatorSummary: z.string().min(1)
});
export type WorkflowBlockedCompletion = z.infer<typeof workflowBlockedCompletionSchema>;

export const workflowStageResultSubmissionSchema = z.object({
  status: workflowStageResultStatusSchema,
  summary: z.string().min(1),
  findingIds: z.array(z.string().uuid()).default([]),
  recommendedNextStep: z.string().min(1),
  residualRisk: z.string().min(1),
  handoff: z.union([jsonSchemaObjectSchema, z.null()]).default(null),
  blocked: workflowBlockedCompletionSchema.nullable().optional()
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
  stageSystemPrompt: z.string().min(1),
  taskPromptTemplate: z.string().min(1).optional(),
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
    minFindings: 0,
    requireReachableSurface: false,
    requireEvidenceBackedWeakness: false,
    requireOsiCoverageStatus: false,
    requireChainedFindings: false
  }),
  resultSchemaVersion: z.number().int().min(1).default(1),
  handoffSchema: z.union([jsonSchemaObjectSchema, z.null()]).default(null)
});
export type WorkflowStage = z.infer<typeof workflowStageSchema>;

export const workflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: workflowStatusSchema,
  executionKind: executionKindSchema.optional(),
  description: z.string().nullable(),
  agentId: z.string().uuid(),
  objective: z.string().min(1),
  stageSystemPrompt: z.string().min(1),
  taskPromptTemplate: z.string().min(1).optional(),
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
    minFindings: 0,
    requireReachableSurface: false,
    requireEvidenceBackedWeakness: false,
    requireOsiCoverageStatus: false,
    requireChainedFindings: false
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
  sortBy: z.enum(["name", "status", "agentId", "createdAt", "updatedAt"]).optional()
});
export type WorkflowsListQuery = z.infer<typeof workflowsListQuerySchema>;

export const listWorkflowsResponseSchema = createPaginatedResponseSchema("workflows", workflowSchema);
export type ListWorkflowsResponse = z.infer<typeof listWorkflowsResponseSchema>;

const workflowStageBodySchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1),
  agentId: z.string().uuid(),
  objective: z.string().trim().min(1),
  stageSystemPrompt: z.string().trim().min(1),
  taskPromptTemplate: z.string().trim().min(1).optional(),
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
    minFindings: 0,
    requireReachableSurface: false,
    requireEvidenceBackedWeakness: false,
    requireOsiCoverageStatus: false,
    requireChainedFindings: false
  }),
  resultSchemaVersion: z.number().int().min(1).default(1),
  handoffSchema: z.union([jsonSchemaObjectSchema, z.null()]).default(null)
});
export type WorkflowStageBody = z.infer<typeof workflowStageBodySchema>;

const workflowBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  status: workflowStatusSchema,
  executionKind: executionKindSchema.optional(),
  description: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  agentId: z.string().uuid(),
  objective: z.string().trim().min(1),
  stageSystemPrompt: z.string().trim().min(1),
  taskPromptTemplate: z.string().trim().min(1).optional(),
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
    minFindings: 0,
    requireReachableSurface: false,
    requireEvidenceBackedWeakness: false,
    requireOsiCoverageStatus: false,
    requireChainedFindings: false
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

export const startWorkflowRunBodySchema = z.object({
  targetId: z.string().uuid().optional()
});
export type StartWorkflowRunBody = z.infer<typeof startWorkflowRunBodySchema>;

export const workflowRunTokenUsageSchema = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0)
});
export type WorkflowRunTokenUsage = z.infer<typeof workflowRunTokenUsageSchema>;

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
  "attack_vector_reported",
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
  workflowLaunchId: z.string().uuid(),
  targetId: z.string().uuid(),
  executionKind: executionKindSchema.optional(),
  status: workflowRunStatusSchema,
  currentStepIndex: z.number().int().min(0).default(0),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  tokenUsage: workflowRunTokenUsageSchema,
  trace: z.array(workflowTraceEntrySchema).default([]),
  events: z.array(workflowTraceEventSchema).default([])
});
export type WorkflowRun = z.infer<typeof workflowRunSchema>;

export const workflowRunStreamStateSchema = workflowRunSchema.omit({
  trace: true,
  events: true
});
export type WorkflowRunStreamState = z.infer<typeof workflowRunStreamStateSchema>;

export const workflowLaunchStatusSchema = z.enum(["pending", "running", "completed", "failed", "partial"]);
export type WorkflowLaunchStatus = z.infer<typeof workflowLaunchStatusSchema>;

export const workflowLaunchTargetStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
export type WorkflowLaunchTargetStatus = z.infer<typeof workflowLaunchTargetStatusSchema>;

export const workflowLaunchTargetRunSchema = z.object({
  targetId: z.string().uuid(),
  runId: z.string().uuid(),
  status: workflowLaunchTargetStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  errorMessage: z.string().nullable().default(null)
});
export type WorkflowLaunchTargetRun = z.infer<typeof workflowLaunchTargetRunSchema>;

export const workflowLaunchSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  status: workflowLaunchStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  runs: z.array(workflowLaunchTargetRunSchema).default([])
});
export type WorkflowLaunch = z.infer<typeof workflowLaunchSchema>;

export const liveModelOutputSchema = z.object({
  runId: z.string().uuid(),
  source: z.enum(["local", "hosted"]),
  text: z.string(),
  reasoning: z.string().nullable().default(null),
  final: z.boolean().default(false),
  createdAt: z.string().datetime()
});
export type LiveModelOutput = z.infer<typeof liveModelOutputSchema>;

export const workflowLiveModelOutputSchema = liveModelOutputSchema;
export type WorkflowLiveModelOutput = LiveModelOutput;

export const workflowRunStreamMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("snapshot"),
    run: workflowRunSchema,
    liveModelOutput: liveModelOutputSchema.nullable().optional()
  }),
  z.object({
    type: z.literal("run_event"),
    run: workflowRunStreamStateSchema,
    event: workflowTraceEventSchema,
    liveModelOutput: liveModelOutputSchema.nullable().optional()
  })
]);
export type WorkflowRunStreamMessage = z.infer<typeof workflowRunStreamMessageSchema>;
