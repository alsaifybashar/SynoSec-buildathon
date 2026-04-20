import { z } from "zod";

export const apiRoutes = {
  health: "/api/health",
  demo: "/api/demo",
  brief: "/api/brief",
  applications: "/api/applications",
  runtimes: "/api/runtimes",
  aiProviders: "/api/ai-providers",
  aiAgents: "/api/ai-agents",
  aiTools: "/api/ai-tools",
  workflows: "/api/workflows",
  workflowRuns: "/api/workflow-runs",
  toolCapabilities: "/api/tools/capabilities",
  connectorRegister: "/api/connectors/register",
  connectorPoll: "/api/connectors/:connectorId/poll",
  connectorHeartbeat: "/api/connectors/:connectorId/jobs/:jobId/heartbeat",
  connectorResult: "/api/connectors/:connectorId/jobs/:jobId/result",
  connectorTestDispatch: "/api/connectors/test-dispatch",
  connectorStatus: "/api/connectors/status"
} as const;

export const localDemoTargetDefaults = {
  internalHost: "synosec-target",
  port: 8888,
  internalTarget: "synosec-target:8888",
  internalUrl: "http://synosec-target:8888",
  hostUrl: "http://localhost:8888",
  hostGatewayTarget: "host.docker.internal:8888"
} as const;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("synosec-backend"),
  timestamp: z.string().datetime()
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const demoFindingSchema = z.object({
  id: z.string().min(1),
  target: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
  summary: z.string().min(1)
});

export const demoResponseSchema = z.object({
  scanMode: z.literal("depth-first"),
  targetCount: z.number().int().nonnegative(),
  findings: z.array(demoFindingSchema).min(1)
});
export type DemoResponse = z.infer<typeof demoResponseSchema>;

export const briefResponseSchema = z.object({
  headline: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
  generatedAt: z.string().datetime()
});
export type BriefResponse = z.infer<typeof briefResponseSchema>;

export const sortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

export const pageSchema = z.coerce.number().int().min(1).default(1);
export const pageSizeSchema = z.coerce.number().int().refine((value) => [10, 25, 50, 100].includes(value), {
  message: "Page size must be one of 10, 25, 50, or 100."
}).default(25);
export const paginatedMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0)
});
export type PaginatedMeta = z.infer<typeof paginatedMetaSchema>;

export const resourceListQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  q: z.string().trim().optional(),
  sortBy: z.string().trim().min(1).optional(),
  sortDirection: sortDirectionSchema.default("asc")
});
export type ResourceListQuery = z.infer<typeof resourceListQuerySchema>;

export function createPaginatedResponseSchema<ItemSchema extends z.ZodTypeAny>(
  key: string,
  itemSchema: ItemSchema
) {
  return paginatedMetaSchema.extend({
    [key]: z.array(itemSchema)
  });
}

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
  sortBy: z.enum(["name", "status", "provider", "environment", "region", "createdAt", "updatedAt"]).optional()
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
  sortBy: z.enum(["name", "kind", "status", "model", "createdAt", "updatedAt"]).optional()
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

export const aiToolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: aiToolStatusSchema,
  source: aiToolSourceSchema,
  description: z.string().nullable(),
  adapter: z.lazy(() => toolAdapterSchema).optional(),
  binary: z.string().nullable(),
  category: z.lazy(() => toolCategorySchema),
  riskTier: z.lazy(() => toolRiskTierSchema),
  notes: z.string().nullable(),
  inputSchema: z.lazy(() => jsonSchemaObjectSchema),
  outputSchema: z.lazy(() => jsonSchemaObjectSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
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

const aiToolBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  status: aiToolStatusSchema,
  source: aiToolSourceSchema,
  description: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  adapter: z.lazy(() => toolAdapterSchema).optional(),
  binary: z.union([z.string().trim().min(1), z.literal(""), z.null()]).transform((value) => value || null).optional(),
  category: z.lazy(() => toolCategorySchema),
  riskTier: z.lazy(() => toolRiskTierSchema),
  notes: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
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
});
export type CreateAiToolBody = z.infer<typeof createAiToolBodySchema>;

export const updateAiToolBodySchema = aiToolBodyBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
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
  sortBy: z.enum(["name", "status", "providerId", "createdAt", "updatedAt"]).optional()
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

export const workflowStageSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  agentId: z.string().uuid(),
  ord: z.number().int().min(0)
});
export type WorkflowStage = z.infer<typeof workflowStageSchema>;

export const workflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: workflowStatusSchema,
  description: z.string().nullable(),
  applicationId: z.string().uuid(),
  runtimeId: z.string().uuid().nullable(),
  stages: z.array(workflowStageSchema).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Workflow = z.infer<typeof workflowSchema>;

export const workflowsListQuerySchema = resourceListQuerySchema.extend({
  status: workflowStatusSchema.optional(),
  applicationId: z.string().uuid().optional(),
  sortBy: z.enum(["name", "status", "createdAt", "updatedAt"]).optional()
});
export type WorkflowsListQuery = z.infer<typeof workflowsListQuerySchema>;

export const listWorkflowsResponseSchema = createPaginatedResponseSchema("workflows", workflowSchema);
export type ListWorkflowsResponse = z.infer<typeof listWorkflowsResponseSchema>;

const workflowStageBodySchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1),
  agentId: z.string().uuid()
});
export type WorkflowStageBody = z.infer<typeof workflowStageBodySchema>;

const workflowBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  status: workflowStatusSchema,
  description: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  applicationId: z.string().uuid(),
  runtimeId: z.union([z.string().uuid(), z.literal(""), z.null()]).transform((value) => value || null),
  stages: z.array(workflowStageBodySchema).min(1)
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

export const workflowTraceEntrySchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string().uuid(),
  workflowId: z.string().uuid(),
  workflowStageId: z.string().uuid(),
  stepIndex: z.number().int().min(0),
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
  currentStepIndex: z.number().int().min(0),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  trace: z.array(workflowTraceEntrySchema)
});
export type WorkflowRun = z.infer<typeof workflowRunSchema>;

export const templateProviderSchema = z.enum(["local", "sonnet"]);
export type TemplateProvider = z.infer<typeof templateProviderSchema>;

export const templateVariableSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  required: z.boolean().default(false)
});
export type TemplateVariable = z.infer<typeof templateVariableSchema>;

export const jsonSchemaObjectSchema = z.record(z.unknown());
export type JsonSchemaObject = z.infer<typeof jsonSchemaObjectSchema>;

export const templateAgentBlockSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  systemPrompt: z.string().min(1),
  provider: templateProviderSchema,
  model: z.string().trim().min(1),
  allowedTools: z.array(z.string().trim().min(1)).default([]),
  inputSchema: jsonSchemaObjectSchema,
  outputSchema: jsonSchemaObjectSchema
});
export type TemplateAgentBlock = z.infer<typeof templateAgentBlockSchema>;

export const osiLayerSchema = z.enum(["L2", "L3", "L4", "L5", "L6", "L7"]);
export type OsiLayer = z.infer<typeof osiLayerSchema>;

export const osiLayerLabels: Record<OsiLayer, string> = {
  L2: "Data Link",
  L3: "Network",
  L4: "Transport",
  L5: "Session",
  L6: "Presentation",
  L7: "Application"
};

export const scanScopeSchema = z.object({
  targets: z.array(z.string().min(1)).min(1).max(20),
  exclusions: z.array(z.string()).default([]),
  layers: z.array(osiLayerSchema).min(1).default(["L4", "L6", "L7"]),
  maxDepth: z.number().int().min(1).max(8).default(3),
  maxDurationMinutes: z.number().int().min(1).max(60).default(10),
  rateLimitRps: z.number().int().min(1).max(50).default(5),
  allowActiveExploits: z.boolean().default(false),
  graceEnabled: z.boolean().default(true),
  graceRoundInterval: z.number().int().min(1).max(10).default(3),
  cyberRangeMode: z.enum(["simulation", "live"]).default("simulation")
});
export type ScanScope = z.infer<typeof scanScopeSchema>;

export const llmProviderSchema = z.enum(["anthropic", "local"]);
export type LlmProvider = z.infer<typeof llmProviderSchema>;

export const scanLlmConfigSchema = z.object({
  provider: llmProviderSchema.default("anthropic"),
  model: z.string().trim().min(1).optional(),
  baseUrl: z.string().trim().url().optional(),
  apiPath: z.string().trim().min(1).optional()
});
export type ScanLlmConfig = z.infer<typeof scanLlmConfigSchema>;

export const tacticStatusSchema = z.enum(["pending", "in-progress", "complete", "skipped"]);
export type TacticStatus = z.infer<typeof tacticStatusSchema>;

export const scanTacticSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  target: z.string(),
  layer: osiLayerSchema,
  service: z.string().optional(),
  port: z.number().int().optional(),
  riskScore: z.number().min(0).max(1),
  status: tacticStatusSchema,
  parentTacticId: z.string().nullable(),
  depth: z.number().int().min(0),
  createdAt: z.string().datetime()
});
export type ScanTactic = z.infer<typeof scanTacticSchema>;

export const severitySchema = z.enum(["info", "low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof severitySchema>;

export const severityOrder: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export const validationStatusSchema = z.enum([
  "unverified",
  "single_source",
  "cross_validated",
  "reproduced",
  "rejected"
]);
export type ValidationStatus = z.infer<typeof validationStatusSchema>;

export const findingSchema = z.object({
  id: z.string(),
  tacticId: z.string(),
  scanId: z.string(),
  agentId: z.string(),
  severity: severitySchema,
  confidence: z.number().min(0).max(1),
  title: z.string(),
  description: z.string(),
  evidence: z.string(),
  technique: z.string(),
  reproduceCommand: z.string().optional(),
  validated: z.boolean().default(false),
  validationStatus: validationStatusSchema.optional(),
  evidenceRefs: z.array(z.string()).optional(),
  sourceToolRuns: z.array(z.string()).optional(),
  confidenceReason: z.string().optional(),
  createdAt: z.string().datetime()
});
export type Finding = z.infer<typeof findingSchema>;

// ---------------------------------------------------------------------------
// Strategy Analysis
// ---------------------------------------------------------------------------

export const techniqueNodeSchema = z.object({
  id: z.string(),
  mitreId: z.string(),
  name: z.string(),
  tactic: z.string()
});
export type TechniqueNode = z.infer<typeof techniqueNodeSchema>;

export const escalationRouteLinkSchema = z.object({
  fromFindingId: z.string(),
  toFindingId: z.string(),
  probability: z.number().min(0).max(1),
  order: z.number().int().min(0)
});
export type EscalationRouteLink = z.infer<typeof escalationRouteLinkSchema>;

export const escalationRouteSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  title: z.string(),
  compositeRisk: z.number().min(0).max(1),
  technique: z.string(),
  findingIds: z.array(z.string()),
  links: z.array(escalationRouteLinkSchema),
  startTarget: z.string(),
  endTarget: z.string(),
  chainLength: z.number().int().min(1),
  confidence: z.number().min(0).max(1),
  narrative: z.string().optional(),
  createdAt: z.string().datetime()
});
export type EscalationRoute = z.infer<typeof escalationRouteSchema>;

export const strategyAnalysisContextSchema = z.object({
  detectedRoutes: z.array(escalationRouteSchema),
  prioritizedTargets: z.array(z.string()),
  knownOpenPorts: z.record(z.array(z.number().int())),
  confirmedServices: z.record(z.array(z.string()))
});
export type StrategyAnalysisContext = z.infer<typeof strategyAnalysisContextSchema>;

export const escalationRouteDetectionSchema = z.object({
  startTarget: z.string(),
  trigger: z.string(),
  endTarget: z.string(),
  impact: z.string(),
  routeConfidence: z.number().min(0).max(1)
});
export type EscalationRouteDetection = z.infer<typeof escalationRouteDetectionSchema>;

export const strategyAnalysisSchema = z.object({
  scanId: z.string(),
  detectedRoutes: z.array(escalationRouteSchema),
  routeDetections: z.array(escalationRouteDetectionSchema),
  prioritizedTargets: z.array(z.string()),
  orphanedHighRiskFindingIds: z.array(z.string()),
  generatedAt: z.string().datetime()
});
export type StrategyAnalysis = z.infer<typeof strategyAnalysisSchema>;

// ---------------------------------------------------------------------------
// Tool execution + evidence
// ---------------------------------------------------------------------------

export const toolRiskTierSchema = z.enum(["passive", "active", "controlled-exploit"]);
export type ToolRiskTier = z.infer<typeof toolRiskTierSchema>;

export const toolAdapterSchema = z.enum([
  "network_scan",
  "service_scan",
  "session_audit",
  "tls_audit",
  "http_probe",
  "web_fingerprint",
  "db_injection_check",
  "content_discovery",
  "subdomain_enum",
  "httpx_probe",
  "web_crawl",
  "historical_urls",
  "feroxbuster_scan",
  "nikto_scan",
  "nuclei_scan",
  "vuln_check",
  "external_tool"
]);
export type ToolAdapter = z.infer<typeof toolAdapterSchema>;

export const toolCategorySchema = z.enum([
  "network",
  "web",
  "content",
  "dns",
  "subdomain",
  "password",
  "cloud",
  "kubernetes",
  "windows",
  "forensics",
  "reversing",
  "exploitation",
  "utility"
]);
export type ToolCategory = z.infer<typeof toolCategorySchema>;

export const toolCapabilityStatusSchema = z.enum(["installed", "missing", "manual"]);
export type ToolCapabilityStatus = z.infer<typeof toolCapabilityStatusSchema>;

export const toolCapabilitySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  binary: z.string().nullable(),
  category: toolCategorySchema,
  status: toolCapabilityStatusSchema,
  available: z.boolean(),
  implementedAdapter: toolAdapterSchema.optional(),
  notes: z.string().optional()
});
export type ToolCapability = z.infer<typeof toolCapabilitySchema>;

export const toolCapabilitiesResponseSchema = z.object({
  capabilities: z.array(toolCapabilitySchema)
});
export type ToolCapabilitiesResponse = z.infer<typeof toolCapabilitiesResponseSchema>;

export const toolRunStatusSchema = z.enum(["pending", "running", "completed", "failed", "denied"]);
export type ToolRunStatus = z.infer<typeof toolRunStatusSchema>;

export const toolRequestSchema = z.object({
  tool: z.string().min(1),
  adapter: toolAdapterSchema,
  target: z.string().min(1),
  port: z.number().int().optional(),
  service: z.string().optional(),
  layer: osiLayerSchema,
  riskTier: toolRiskTierSchema,
  justification: z.string().min(1),
  parameters: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({})
});
export type ToolRequest = z.infer<typeof toolRequestSchema>;

export const toolRunSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  tacticId: z.string(),
  agentId: z.string(),
  adapter: toolAdapterSchema,
  tool: z.string(),
  target: z.string(),
  port: z.number().int().optional(),
  status: toolRunStatusSchema,
  riskTier: toolRiskTierSchema,
  justification: z.string(),
  commandPreview: z.string(),
  dispatchMode: z.enum(["local", "connector"]).default("local"),
  connectorId: z.string().optional(),
  startedAt: z.string().datetime(),
  leasedAt: z.string().datetime().optional(),
  leaseExpiresAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  statusReason: z.string().optional(),
  output: z.string().optional(),
  exitCode: z.number().int().optional()
});
export type ToolRun = z.infer<typeof toolRunSchema>;

export const connectorRunModeSchema = z.enum(["execute", "dry-run", "simulate"]);
export type ConnectorRunMode = z.infer<typeof connectorRunModeSchema>;

export const connectorCapabilitySchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1)
});
export type ConnectorCapability = z.infer<typeof connectorCapabilitySchema>;

export const connectorRegistrationRequestSchema = z.object({
  name: z.string().trim().min(1),
  version: z.string().trim().min(1),
  allowedAdapters: z.array(toolAdapterSchema).min(1),
  runMode: connectorRunModeSchema.default("dry-run"),
  concurrency: z.number().int().min(1).max(10).default(1),
  capabilities: z.array(connectorCapabilitySchema).default([])
});
export type ConnectorRegistrationRequest = z.infer<typeof connectorRegistrationRequestSchema>;

export const connectorRegistrationResponseSchema = z.object({
  connectorId: z.string().min(1),
  pollIntervalMs: z.number().int().min(250),
  leaseDurationMs: z.number().int().min(1000),
  acceptedAt: z.string().datetime()
});
export type ConnectorRegistrationResponse = z.infer<typeof connectorRegistrationResponseSchema>;

export const connectorDescriptorSchema = z.object({
  connectorId: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  allowedAdapters: z.array(toolAdapterSchema).min(1),
  runMode: connectorRunModeSchema,
  concurrency: z.number().int().min(1).max(10),
  capabilities: z.array(connectorCapabilitySchema).default([]),
  lastSeenAt: z.string().datetime(),
  registeredAt: z.string().datetime(),
  activeJobId: z.string().optional()
});
export type ConnectorDescriptor = z.infer<typeof connectorDescriptorSchema>;

export const connectorExecutionJobSchema = z.object({
  id: z.string().min(1),
  connectorId: z.string().min(1),
  scanId: z.string().min(1),
  tacticId: z.string().min(1),
  agentId: z.string().min(1),
  toolRun: toolRunSchema,
  request: toolRequestSchema,
  mode: connectorRunModeSchema,
  createdAt: z.string().datetime(),
  leasedAt: z.string().datetime(),
  leaseExpiresAt: z.string().datetime()
});
export type ConnectorExecutionJob = z.infer<typeof connectorExecutionJobSchema>;

export const connectorPollResponseSchema = z.object({
  connectorId: z.string().min(1),
  job: connectorExecutionJobSchema.optional()
});
export type ConnectorPollResponse = z.infer<typeof connectorPollResponseSchema>;

export const connectorHeartbeatResponseSchema = z.object({
  ok: z.literal(true),
  connectorId: z.string().min(1),
  jobId: z.string().min(1),
  leaseExpiresAt: z.string().datetime()
});
export type ConnectorHeartbeatResponse = z.infer<typeof connectorHeartbeatResponseSchema>;

export const connectorExecutionResultSchema = z.object({
  output: z.string(),
  exitCode: z.number().int(),
  observations: z.array(z.lazy(() => observationSchema)).default([]),
  statusReason: z.string().optional(),
  connectorId: z.string().optional()
});
export type ConnectorExecutionResult = z.infer<typeof connectorExecutionResultSchema>;

export const connectorStatusResponseSchema = z.object({
  connectors: z.array(connectorDescriptorSchema),
  queuedJobs: z.number().int().min(0),
  activeJobs: z.number().int().min(0)
});
export type ConnectorStatusResponse = z.infer<typeof connectorStatusResponseSchema>;

export const connectorTestDispatchRequestSchema = z.object({
  scope: scanScopeSchema,
  request: toolRequestSchema,
  agentId: z.string().min(1).default("connector-test-agent"),
  tacticId: z.string().uuid().default("22222222-2222-4222-8222-222222222222"),
  scanId: z.string().uuid().default("11111111-1111-4111-8111-111111111111")
});
export type ConnectorTestDispatchRequest = z.infer<typeof connectorTestDispatchRequestSchema>;

export const connectorTestDispatchResponseSchema = z.object({
  toolRuns: z.array(toolRunSchema),
  observations: z.array(z.lazy(() => observationSchema)),
  findings: z.array(findingSchema.omit({ id: true, createdAt: true })),
  dispatchMode: z.enum(["local", "connector"])
});
export type ConnectorTestDispatchResponse = z.infer<typeof connectorTestDispatchResponseSchema>;

export const observationSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  tacticId: z.string(),
  toolRunId: z.string(),
  adapter: toolAdapterSchema,
  target: z.string(),
  port: z.number().int().optional(),
  key: z.string(),
  title: z.string(),
  summary: z.string(),
  severity: severitySchema,
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
  technique: z.string(),
  relatedKeys: z.array(z.string()).default([]),
  createdAt: z.string().datetime()
});
export type Observation = z.infer<typeof observationSchema>;

export const agentNoteStageSchema = z.enum(["plan", "execution", "analysis", "finding"]);
export type AgentNoteStage = z.infer<typeof agentNoteStageSchema>;

export const agentNoteSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  agentId: z.string(),
  tacticId: z.string().optional(),
  toolRunId: z.string().optional(),
  findingId: z.string().optional(),
  stage: agentNoteStageSchema,
  title: z.string(),
  summary: z.string(),
  detail: z.string().optional(),
  createdAt: z.string().datetime()
});
export type AgentNote = z.infer<typeof agentNoteSchema>;

export const evidenceResponseSchema = z.object({
  toolRuns: z.array(toolRunSchema),
  observations: z.array(observationSchema),
  agentNotes: z.array(agentNoteSchema).default([]),
  prioritizedTargets: z.array(z.string()).default([])
});
export type EvidenceResponse = z.infer<typeof evidenceResponseSchema>;

// ---------------------------------------------------------------------------
// Defensive iteration loop contract
// ---------------------------------------------------------------------------

export const defensiveLoopStageSchema = z.enum(["intake", "prioritize", "act", "verify", "record", "handoff"]);
export type DefensiveLoopStage = z.infer<typeof defensiveLoopStageSchema>;

export const defensiveLoopStages = [
  "intake",
  "prioritize",
  "act",
  "verify",
  "record",
  "handoff"
] as const satisfies readonly DefensiveLoopStage[];

export const defensiveTargetKindSchema = z.enum(["application", "runtime", "service", "host", "repository", "manual"]);
export type DefensiveTargetKind = z.infer<typeof defensiveTargetKindSchema>;

export const defensiveAssetCriticalitySchema = z.enum(["low", "moderate", "high", "critical"]);
export type DefensiveAssetCriticality = z.infer<typeof defensiveAssetCriticalitySchema>;

export const defensiveIterationFindingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: severitySchema,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  evidence: z.string().min(1),
  source: z.string().min(1)
});
export type DefensiveIterationFinding = z.infer<typeof defensiveIterationFindingSchema>;

export const defensiveTargetIdentitySchema = z.object({
  kind: defensiveTargetKindSchema,
  id: z.string().min(1),
  displayName: z.string().min(1),
  environment: applicationEnvironmentSchema.optional(),
  locator: z.string().min(1).optional()
});
export type DefensiveTargetIdentity = z.infer<typeof defensiveTargetIdentitySchema>;

export const defensiveAssetContextSchema = z.object({
  assetId: z.string().min(1),
  assetName: z.string().min(1),
  criticality: defensiveAssetCriticalitySchema,
  internetExposed: z.boolean(),
  containsSensitiveData: z.boolean(),
  notes: z.array(z.string().min(1)).default([])
});
export type DefensiveAssetContext = z.infer<typeof defensiveAssetContextSchema>;

export const priorIterationStateSchema = z.object({
  iterationId: z.string().min(1),
  summary: z.string().min(1),
  residualRisk: z.string().min(1),
  outstandingFindingIds: z.array(z.string().min(1)).default([]),
  recommendedNextStep: z.string().min(1).optional()
});
export type PriorIterationState = z.infer<typeof priorIterationStateSchema>;

export const defensiveIterationObservationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: severitySchema,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  evidence: z.string().min(1),
  source: z.string().min(1)
});
export type DefensiveIterationObservation = z.infer<typeof defensiveIterationObservationSchema>;

export const defensiveIssueDispositionSchema = z.enum(["fixed", "mitigated", "unverified", "skipped"]);
export type DefensiveIssueDisposition = z.infer<typeof defensiveIssueDispositionSchema>;

export const defensiveIterationInputSchema = z.object({
  findings: z.array(defensiveIterationFindingSchema).min(1),
  target: defensiveTargetIdentitySchema,
  assetContext: defensiveAssetContextSchema,
  priorIteration: priorIterationStateSchema.optional()
});
export type DefensiveIterationInput = z.infer<typeof defensiveIterationInputSchema>;

export const defensiveActionTypeSchema = z.enum([
  "patch",
  "configuration_change",
  "access_restriction",
  "monitoring",
  "manual_investigation",
  "defer"
]);
export type DefensiveActionType = z.infer<typeof defensiveActionTypeSchema>;

export const defensiveChosenActionSchema = z.object({
  type: defensiveActionTypeSchema,
  summary: z.string().min(1),
  rationale: z.string().min(1),
  scope: z.string().min(1),
  bounded: z.boolean(),
  safetyChecks: z.array(z.string().min(1)).min(1)
});
export type DefensiveChosenAction = z.infer<typeof defensiveChosenActionSchema>;

export const defensiveVerificationSchema = z.object({
  outcome: z.enum(["verified", "partial", "blocked"]),
  summary: z.string().min(1),
  checks: z.array(z.string().min(1)).min(1)
});
export type DefensiveVerification = z.infer<typeof defensiveVerificationSchema>;

export const defensiveEvidenceArtifactSchema = z.object({
  type: z.enum(["command_output", "config_diff", "test_result", "review_note", "ticket"]),
  summary: z.string().min(1),
  reference: z.string().min(1).optional()
});
export type DefensiveEvidenceArtifact = z.infer<typeof defensiveEvidenceArtifactSchema>;

export const defensiveResidualRiskSchema = z.object({
  level: severitySchema,
  summary: z.string().min(1),
  remainingFindingIds: z.array(z.string().min(1)).default([]),
  needsHumanReview: z.boolean()
});
export type DefensiveResidualRisk = z.infer<typeof defensiveResidualRiskSchema>;

export const defensiveNextStepSchema = z.object({
  summary: z.string().min(1),
  rationale: z.string().min(1),
  continueLoop: z.boolean()
});
export type DefensiveNextStep = z.infer<typeof defensiveNextStepSchema>;

export const defensiveClosureSummarySchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  evidenceHighlights: z.array(z.string().min(1)).min(1).max(3),
  nextStep: z.string().min(1),
  continueLoop: z.boolean()
});
export type DefensiveClosureSummary = z.infer<typeof defensiveClosureSummarySchema>;

export const defensiveFinalOutcomeSchema = z.object({
  status: z.enum(["fixed", "mitigated", "blocked"]),
  summary: z.string().min(1),
  changeApplied: z.boolean()
});
export type DefensiveFinalOutcome = z.infer<typeof defensiveFinalOutcomeSchema>;

export const defensiveMitigationChangeSchema = z.object({
  summary: z.string().min(1),
  scopeRef: z.string().min(1),
  rolloutRef: z.string().min(1),
  reversibleIntent: z.boolean(),
  affectsMultipleComponents: z.boolean().default(false),
  destructive: z.boolean().default(false)
});
export type DefensiveMitigationChange = z.infer<typeof defensiveMitigationChangeSchema>;

export const defensiveVerificationPlanSchema = z.object({
  successCriteria: z.string().min(1),
  checks: z.array(z.string().min(1)).min(1).max(5)
});
export type DefensiveVerificationPlan = z.infer<typeof defensiveVerificationPlanSchema>;

export const defensiveExecutionRequestSchema = z.object({
  iterationId: z.string().min(1),
  input: defensiveIterationInputSchema,
  observations: z.array(defensiveIterationObservationSchema).default([]),
  change: defensiveMitigationChangeSchema,
  verificationPlan: defensiveVerificationPlanSchema,
  evidence: z.array(defensiveEvidenceArtifactSchema).min(1),
  outcomeSummary: z.string().min(1)
});
export type DefensiveExecutionRequest = z.infer<typeof defensiveExecutionRequestSchema>;

export const defensivePrioritizationSourceKindSchema = z.enum(["finding", "observation"]);
export type DefensivePrioritizationSourceKind = z.infer<typeof defensivePrioritizationSourceKindSchema>;

export const defensiveIssueOutcomeSchema = z.object({
  sourceId: z.string().min(1),
  sourceKind: defensivePrioritizationSourceKindSchema,
  title: z.string().min(1),
  severity: severitySchema,
  disposition: defensiveIssueDispositionSchema,
  summary: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  carryForward: z.boolean()
});
export type DefensiveIssueOutcome = z.infer<typeof defensiveIssueOutcomeSchema>;

export const defensiveCarryForwardStateSchema = z.object({
  iterationId: z.string().min(1),
  summary: z.string().min(1),
  target: defensiveTargetIdentitySchema,
  assetContext: defensiveAssetContextSchema,
  resolvedIssues: z.array(defensiveIssueOutcomeSchema).default([]),
  outstandingIssues: z.array(defensiveIssueOutcomeSchema).default([]),
  residualRisk: defensiveResidualRiskSchema,
  recommendedNextStep: defensiveNextStepSchema
});
export type DefensiveCarryForwardState = z.infer<typeof defensiveCarryForwardStateSchema>;

export const defensivePrioritizationInputSchema = z
  .object({
    findings: z.array(defensiveIterationFindingSchema).default([]),
    observations: z.array(defensiveIterationObservationSchema).default([]),
    target: defensiveTargetIdentitySchema,
    assetContext: defensiveAssetContextSchema,
    priorIteration: priorIterationStateSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (value.findings.length === 0 && value.observations.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one finding or observation for prioritization.",
        path: ["findings"]
      });
    }
  });
export type DefensivePrioritizationInput = z.infer<typeof defensivePrioritizationInputSchema>;

export const defensivePrioritizationFactorSchema = z.object({
  severity: z.number().min(0).max(1),
  exploitability: z.number().min(0).max(1),
  exposure: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  implementationSafety: z.number().min(0).max(1)
});
export type DefensivePrioritizationFactor = z.infer<typeof defensivePrioritizationFactorSchema>;

export const defensivePrioritizationWeightsSchema = z.object({
  severity: z.number().positive(),
  exploitability: z.number().positive(),
  exposure: z.number().positive(),
  confidence: z.number().positive(),
  implementationSafety: z.number().positive()
});
export type DefensivePrioritizationWeights = z.infer<typeof defensivePrioritizationWeightsSchema>;

export const defensivePrioritizationWeights = defensivePrioritizationWeightsSchema.parse({
  severity: 0.3,
  exploitability: 0.25,
  exposure: 0.2,
  confidence: 0.15,
  implementationSafety: 0.1
});

export const defensiveCandidateDecisionSchema = z.enum(["selected", "not_selected"]);
export type DefensiveCandidateDecision = z.infer<typeof defensiveCandidateDecisionSchema>;

export const defensiveConfidenceDispositionSchema = z.enum(["confirmed_risk", "follow_up_required"]);
export type DefensiveConfidenceDisposition = z.infer<typeof defensiveConfidenceDispositionSchema>;

export const defensivePrioritizedActionSchema = z.object({
  candidateId: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceKinds: z.array(defensivePrioritizationSourceKindSchema).min(1),
  action: defensiveChosenActionSchema,
  factorScores: defensivePrioritizationFactorSchema,
  priorityScore: z.number().min(0).max(100),
  confidenceDisposition: defensiveConfidenceDispositionSchema,
  decision: defensiveCandidateDecisionSchema,
  decisionReason: z.string().min(1)
});
export type DefensivePrioritizedAction = z.infer<typeof defensivePrioritizedActionSchema>;

export const defensiveFollowUpItemSchema = z.object({
  sourceId: z.string().min(1),
  sourceKind: defensivePrioritizationSourceKindSchema,
  title: z.string().min(1),
  reason: z.string().min(1),
  recommendedAction: z.string().min(1)
});
export type DefensiveFollowUpItem = z.infer<typeof defensiveFollowUpItemSchema>;

export const defensivePrioritizationSchema = z
  .object({
    modelVersion: z.literal("1.0"),
    summary: z.string().min(1),
    selectedAction: defensivePrioritizedActionSchema.extend({
      decision: z.literal("selected")
    }),
    rankedActions: z.array(defensivePrioritizedActionSchema).min(1),
    followUp: z.array(defensiveFollowUpItemSchema).default([]),
    weights: defensivePrioritizationWeightsSchema
  })
  .superRefine((value, ctx) => {
    const selected = value.rankedActions.filter((action) => action.decision === "selected");

    if (selected.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prioritization must contain exactly one selected action.",
        path: ["rankedActions"]
      });
    }

    if (selected.length === 1 && selected[0]!.candidateId !== value.selectedAction.candidateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selected action must match the ranked action marked as selected.",
        path: ["selectedAction"]
      });
    }
  });
export type DefensivePrioritization = z.infer<typeof defensivePrioritizationSchema>;

type DefensivePrioritizationSource = {
  id: string;
  title: string;
  severity: Severity;
  confidence: number;
  summary: string;
  evidence: string;
  source: string;
  kind: DefensivePrioritizationSourceKind;
};

const defensiveLowConfidenceThreshold = 0.75;
const defensiveUnverifiablePattern = /\b(unverified|single report|single-source|suspected|possible|maybe|unclear|ambiguous)\b/i;

const normalizeSeverity = (severity: Severity): number => severityOrder[severity] / severityOrder.critical;

const normalizeCriticality = (criticality: DefensiveAssetCriticality): number => {
  switch (criticality) {
    case "critical":
      return 1;
    case "high":
      return 0.85;
    case "moderate":
      return 0.6;
    case "low":
      return 0.35;
  }
};

const roundPriorityScore = (value: number): number => Math.round(value * 10) / 10;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const inferExploitability = (source: DefensivePrioritizationSource): number => {
  const text = `${source.title} ${source.summary} ${source.evidence}`.toLowerCase();

  if (/(unauthenticated|publicly reachable|internet|public|exposed|default credential|rce|remote code|ssrf|sql injection|open admin|reachable)/.test(text)) {
    return 0.95;
  }

  if (/(credential|privilege|admin|token|session|lateral movement)/.test(text)) {
    return 0.8;
  }

  return clamp01((normalizeSeverity(source.severity) * 0.7) + (source.confidence * 0.3));
};

const inferExposure = (
  source: DefensivePrioritizationSource,
  assetContext: DefensiveAssetContext
): number => {
  let exposure = normalizeCriticality(assetContext.criticality) * 0.45;

  if (assetContext.internetExposed) {
    exposure += 0.3;
  }

  if (assetContext.containsSensitiveData) {
    exposure += 0.2;
  }

  if (/(public|internet|external|anonymous|admin|credential|production)/i.test(`${source.title} ${source.summary}`)) {
    exposure += 0.1;
  }

  return clamp01(exposure);
};

const inferActionType = (
  source: DefensivePrioritizationSource,
  assetContext: DefensiveAssetContext
): DefensiveActionType => {
  const text = `${source.title} ${source.summary} ${source.evidence}`.toLowerCase();

  if (/(public|internet|exposed|reachable|cidr|ingress|firewall|port|anonymous|open admin)/.test(text)) {
    return "access_restriction";
  }

  if (/(patch|upgrade|outdated|cve|dependency|version)/.test(text)) {
    return "patch";
  }

  if (/(missing log|missing alert|telemetry|monitor|visibility|detection)/.test(text)) {
    return "monitoring";
  }

  if (assetContext.internetExposed || assetContext.containsSensitiveData) {
    return "configuration_change";
  }

  return "configuration_change";
};

const implementationSafetyScores: Record<DefensiveActionType, number> = {
  access_restriction: 0.95,
  configuration_change: 0.85,
  monitoring: 0.8,
  patch: 0.7,
  manual_investigation: 1,
  defer: 1
};

const buildActionSummary = (
  actionType: DefensiveActionType,
  source: DefensivePrioritizationSource,
  target: DefensiveTargetIdentity
): string => {
  switch (actionType) {
    case "access_restriction":
      return `Reduce external exposure for ${target.displayName} based on ${source.title.toLowerCase()}.`;
    case "patch":
      return `Patch the affected component on ${target.displayName} to remove ${source.title.toLowerCase()}.`;
    case "monitoring":
      return `Add targeted monitoring for ${target.displayName} to validate ${source.title.toLowerCase()}.`;
    case "configuration_change":
      return `Harden ${target.displayName} configuration to address ${source.title.toLowerCase()}.`;
    case "manual_investigation":
      return `Reproduce and validate ${source.title.toLowerCase()} before any production change.`;
    case "defer":
      return `Defer changes for ${target.displayName} until ${source.title.toLowerCase()} is better understood.`;
  }
};

const buildActionRationale = (
  source: DefensivePrioritizationSource,
  factors: DefensivePrioritizationFactor
): string => {
  return `Prioritized because severity (${roundPriorityScore(factors.severity * 100) / 100}), exploitability (${roundPriorityScore(factors.exploitability * 100) / 100}), and exposure (${roundPriorityScore(factors.exposure * 100) / 100}) are high enough to justify action with confidence ${roundPriorityScore(factors.confidence * 100) / 100}.`;
};

const buildActionScope = (
  actionType: DefensiveActionType,
  target: DefensiveTargetIdentity
): string => {
  switch (actionType) {
    case "access_restriction":
      return `${target.displayName} access boundary only; no application logic changes.`;
    case "patch":
      return `${target.displayName} dependency or package update only.`;
    case "monitoring":
      return `${target.displayName} logging and alerting controls only.`;
    case "configuration_change":
      return `${target.displayName} configuration only; no schema or data migration.`;
    case "manual_investigation":
      return `Evidence gathering for ${target.displayName} only; no production change.`;
    case "defer":
      return `No change until ${target.displayName} scope and evidence are clarified.`;
  }
};

const buildSafetyChecks = (
  actionType: DefensiveActionType,
  target: DefensiveTargetIdentity,
  source: DefensivePrioritizationSource
): string[] => {
  const baseChecks = [`Confirm ${target.displayName} ownership and rollback path before execution.`];

  switch (actionType) {
    case "access_restriction":
      return [...baseChecks, "Limit the change to the exposed route, listener, or network policy.", `Verify approved access paths for ${source.title.toLowerCase()}.`];
    case "patch":
      return [...baseChecks, "Pin the update to the affected component only.", "Verify compatibility before rollout."];
    case "monitoring":
      return [...baseChecks, "Avoid collecting new sensitive payload data.", "Scope alerts to the affected control only."];
    case "configuration_change":
      return [...baseChecks, "Apply the change only to the impacted service or environment.", "Confirm behavior with a focused smoke test."];
    case "manual_investigation":
      return [...baseChecks, "Do not treat the issue as confirmed until reproduced.", "Record the evidence source and reproduction steps."];
    case "defer":
      return [...baseChecks, "Document why the issue is deferred.", "Require stronger evidence before the next iteration."];
  }
};

const createCandidateAction = (
  source: DefensivePrioritizationSource,
  input: DefensivePrioritizationInput
): DefensivePrioritizedAction => {
  const actionType = inferActionType(source, input.assetContext);
  const factorScores = defensivePrioritizationFactorSchema.parse({
    severity: normalizeSeverity(source.severity),
    exploitability: inferExploitability(source),
    exposure: inferExposure(source, input.assetContext),
    confidence: source.confidence,
    implementationSafety: implementationSafetyScores[actionType]
  });
  const weightedScore = (
    factorScores.severity * defensivePrioritizationWeights.severity
    + factorScores.exploitability * defensivePrioritizationWeights.exploitability
    + factorScores.exposure * defensivePrioritizationWeights.exposure
    + factorScores.confidence * defensivePrioritizationWeights.confidence
    + factorScores.implementationSafety * defensivePrioritizationWeights.implementationSafety
  ) * 100;

  return defensivePrioritizedActionSchema.parse({
    candidateId: `candidate-${source.kind}-${source.id}`,
    sourceIds: [source.id],
    sourceKinds: [source.kind],
    action: {
      type: actionType,
      summary: buildActionSummary(actionType, source, input.target),
      rationale: buildActionRationale(source, factorScores),
      scope: buildActionScope(actionType, input.target),
      bounded: true,
      safetyChecks: buildSafetyChecks(actionType, input.target, source)
    },
    factorScores,
    priorityScore: roundPriorityScore(weightedScore),
    confidenceDisposition: "confirmed_risk",
    decision: "not_selected",
    decisionReason: "Awaiting ranking."
  });
};

const buildComparisonReason = (
  candidate: DefensivePrioritizedAction,
  selected: DefensivePrioritizedAction
): string => {
  if (candidate.priorityScore === selected.priorityScore) {
    return `Tied on score, but ${selected.action.type} was chosen first by deterministic source ordering.`;
  }

  if (candidate.factorScores.exposure < selected.factorScores.exposure) {
    return `Not selected because it reduces less immediate exposure than ${selected.action.summary.toLowerCase()}.`;
  }

  if (candidate.factorScores.confidence < selected.factorScores.confidence) {
    return `Not selected because the evidence is weaker than the selected action.`;
  }

  return `Not selected because its weighted priority score (${candidate.priorityScore}) is lower than the selected action (${selected.priorityScore}).`;
};

const matchesSelectedScope = (
  selectedAction: DefensiveChosenAction,
  change: DefensiveMitigationChange
): boolean => {
  const selectedScope = selectedAction.scope.toLowerCase();
  const changeScope = `${change.summary} ${change.scopeRef}`.toLowerCase();

  if (selectedScope.includes("access boundary")) {
    return /(route|listener|policy|firewall|ingress|network|cidr|allowlist)/.test(changeScope);
  }

  if (selectedScope.includes("configuration")) {
    return /(config|setting|flag|policy|env)/.test(changeScope);
  }

  if (selectedScope.includes("dependency") || selectedScope.includes("package")) {
    return /(package|dependency|version|image)/.test(changeScope);
  }

  if (selectedScope.includes("logging") || selectedScope.includes("alerting")) {
    return /(log|alert|telemetry|monitor)/.test(changeScope);
  }

  return true;
};

const deriveCompletionResidualRisk = (
  prioritization: DefensivePrioritization,
  input: DefensiveIterationInput
): DefensiveResidualRisk => {
  const highestDeferredSeverity = prioritization.followUp
    .map((item) => {
      const finding = input.findings.find((candidate) => candidate.id === item.sourceId);

      return finding?.severity ?? "info";
    })
    .sort((left, right) => severityOrder[right] - severityOrder[left])[0];

  const baseLevel = input.assetContext.internetExposed && prioritization.selectedAction.action.type === "access_restriction"
    ? "medium"
    : "low";
  const level = highestDeferredSeverity && severityOrder[highestDeferredSeverity] > severityOrder[baseLevel]
    ? highestDeferredSeverity
    : baseLevel;

  return defensiveResidualRiskSchema.parse({
    level,
    summary: prioritization.followUp.length > 0
      ? `The selected mitigation completed, but ${prioritization.followUp.length} deferred item${prioritization.followUp.length === 1 ? "" : "s"} still require stronger evidence.`
      : "The selected mitigation completed and no additional deferred issues were introduced in this iteration.",
    remainingFindingIds: prioritization.followUp.map((item) => item.sourceId),
    needsHumanReview: prioritization.followUp.length > 0
  });
};

const buildCompletedNextStep = (prioritization: DefensivePrioritization): DefensiveNextStep => {
  if (prioritization.followUp.length > 0) {
    return defensiveNextStepSchema.parse({
      summary: "Validate the deferred item with stronger evidence before expanding the hardening scope.",
      rationale: "The current iteration applied one safe mitigation and should not broaden scope until the follow-up evidence improves.",
      continueLoop: true
    });
  }

  return defensiveNextStepSchema.parse({
    summary: "Review the next-highest ranked defensive action before starting another bounded iteration.",
    rationale: "Only one mitigation should land per iteration, even when other candidate actions remain.",
    continueLoop: true
  });
};

const buildIssueOutcomes = (
  input: DefensiveIterationInput,
  observations: DefensiveIterationObservation[],
  prioritization: DefensivePrioritization,
  evidence: DefensiveEvidenceArtifact[],
  outcome: "completed" | "blocked",
  failure?: DefensiveFailureState
): DefensiveIssueOutcome[] => {
  const sourceIndex = new Map<string, DefensivePrioritizationSource>(
    [
      ...input.findings.map((finding) => ({ ...finding, kind: "finding" as const })),
      ...observations.map((observation) => ({ ...observation, kind: "observation" as const }))
    ].map((source) => [`${source.kind}:${source.id}`, source])
  );
  const followUpKeys = new Set(prioritization.followUp.map((item) => `${item.sourceKind}:${item.sourceId}`));
  const selectedKeys = new Set(
    prioritization.selectedAction.sourceIds.map((sourceId, index) => {
      const sourceKind = prioritization.selectedAction.sourceKinds[index] ?? prioritization.selectedAction.sourceKinds[0];
      return `${sourceKind}:${sourceId}`;
    })
  );
  const evidenceRefs = evidence
    .map((artifact) => artifact.reference)
    .filter((reference): reference is string => typeof reference === "string" && reference.length > 0);

  return Array.from(sourceIndex.entries())
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, source]) => {
      const sourceKey = `${source.kind}:${source.id}`;

      if (followUpKeys.has(sourceKey)) {
        return defensiveIssueOutcomeSchema.parse({
          sourceId: source.id,
          sourceKind: source.kind,
          title: source.title,
          severity: source.severity,
          disposition: "unverified",
          summary: "Moved to follow-up because the evidence is not strong enough to support a confirmed remediation claim in this iteration.",
          evidenceRefs,
          carryForward: true
        });
      }

      if (selectedKeys.has(sourceKey)) {
        if (outcome === "completed") {
          const disposition = prioritization.selectedAction.action.type === "patch" ? "fixed" : "mitigated";

          return defensiveIssueOutcomeSchema.parse({
            sourceId: source.id,
            sourceKind: source.kind,
            title: source.title,
            severity: source.severity,
            disposition,
            summary: disposition === "fixed"
              ? "The selected bounded change removed the issue and verification evidence supports closing it for this iteration."
              : "The selected bounded change reduced the issue exposure, but some residual risk may remain for a later iteration.",
            evidenceRefs,
            carryForward: disposition !== "fixed"
          });
        }

        const disposition = failure?.reason === "ambiguous_scope"
          && prioritization.selectedAction.confidenceDisposition !== "confirmed_risk"
          ? "unverified"
          : "skipped";

        return defensiveIssueOutcomeSchema.parse({
          sourceId: source.id,
          sourceKind: source.kind,
          title: source.title,
          severity: source.severity,
          disposition,
          summary: disposition === "unverified"
            ? "Autonomous mitigation was blocked because the evidence was not strong enough to confirm the issue safely."
            : "The issue was intentionally skipped for this iteration because the proposed action could not be executed safely within the bounded scope.",
          evidenceRefs,
          carryForward: true
        });
      }

      return defensiveIssueOutcomeSchema.parse({
        sourceId: source.id,
        sourceKind: source.kind,
        title: source.title,
        severity: source.severity,
        disposition: "skipped",
        summary: "The issue was intentionally left for a later iteration because another action ranked higher for immediate risk reduction.",
        evidenceRefs,
        carryForward: true
      });
    });
};

const buildCarryForwardState = (
  iterationId: string,
  input: DefensiveIterationInput,
  issueOutcomes: DefensiveIssueOutcome[],
  residualRisk: DefensiveResidualRisk,
  recommendedNextStep: DefensiveNextStep
): DefensiveCarryForwardState =>
  defensiveCarryForwardStateSchema.parse({
    iterationId,
    summary: `${issueOutcomes.filter((issue) => issue.disposition === "fixed" || issue.disposition === "mitigated").length} issue(s) changed state and ${issueOutcomes.filter((issue) => issue.carryForward).length} item(s) carry forward into the next iteration.`,
    target: input.target,
    assetContext: input.assetContext,
    resolvedIssues: issueOutcomes.filter((issue) => !issue.carryForward),
    outstandingIssues: issueOutcomes.filter((issue) => issue.carryForward),
    residualRisk,
    recommendedNextStep
  });

const buildClosureSummary = (
  selectedAction: DefensiveChosenAction,
  evidence: DefensiveEvidenceArtifact[],
  residualRisk: DefensiveResidualRisk,
  recommendedNextStep: DefensiveNextStep,
  status: "completed" | "blocked"
): DefensiveClosureSummary => {
  const evidenceHighlights = evidence
    .map((artifact) => artifact.summary.trim())
    .filter((summary) => summary.length > 0)
    .slice(0, 3);

  const fallbackEvidence = status === "completed"
    ? "The bounded change and verification checks are recorded for review."
    : "The available review evidence is recorded before any autonomous change.";

  return defensiveClosureSummarySchema.parse({
    headline: status === "completed"
      ? "Defensive iteration complete: one bounded risk reduction landed."
      : "Defensive iteration blocked: no unsupported remediation was applied.",
    summary: status === "completed"
      ? `${selectedAction.summary} Evidence supports the risk reduction claim, and remaining risk is: ${residualRisk.summary}`
      : `${selectedAction.summary} The loop stopped before making a change. Remaining risk is: ${residualRisk.summary}`,
    evidenceHighlights: evidenceHighlights.length > 0 ? evidenceHighlights : [fallbackEvidence],
    nextStep: recommendedNextStep.summary,
    continueLoop: recommendedNextStep.continueLoop
  });
};

const buildFinalOutcome = (
  selectedAction: DefensiveChosenAction,
  verificationSummary: string,
  status: "completed" | "blocked"
): DefensiveFinalOutcome =>
  defensiveFinalOutcomeSchema.parse({
    status: status === "blocked"
      ? "blocked"
      : selectedAction.type === "patch"
        ? "fixed"
        : "mitigated",
    summary: verificationSummary,
    changeApplied: status === "completed"
  });

const blockDefensiveIteration = (
  request: DefensiveExecutionRequest,
  prioritization: DefensivePrioritization,
  failure: DefensiveFailureState
): DefensiveIterationRecord => {
  const selectedAction = prioritization.selectedAction.action;
  const residualRisk = defensiveResidualRiskSchema.parse({
    level: request.input.findings
      .map((finding) => finding.severity)
      .sort((left, right) => severityOrder[right] - severityOrder[left])[0] ?? "info",
    summary: "The hardening iteration was blocked, so the selected risk remains in place until scope or evidence improves.",
    remainingFindingIds: prioritization.selectedAction.sourceIds,
    needsHumanReview: true
  });
  const recommendedNextStep = defensiveNextStepSchema.parse({
    summary: failure.operatorAction,
    rationale: failure.summary,
    continueLoop: false
  });
  const issueOutcomes = buildIssueOutcomes(
    request.input,
    request.observations,
    prioritization,
    request.evidence,
    "blocked",
    failure
  );
  const finalOutcome = buildFinalOutcome(selectedAction, failure.summary, "blocked");
  const carryForward = buildCarryForwardState(
    request.iterationId,
    request.input,
    issueOutcomes,
    residualRisk,
    recommendedNextStep
  );
  const closureSummary = buildClosureSummary(
    selectedAction,
    request.evidence,
    residualRisk,
    recommendedNextStep,
    "blocked"
  );

  return defensiveIterationRecordSchema.parse({
    iterationId: request.iterationId,
    stages: defensiveLoopStages,
    status: "blocked",
    input: request.input,
    prioritization,
    chosenAction: selectedAction,
    verification: {
      outcome: "blocked",
      summary: failure.summary,
      checks: request.verificationPlan.checks
    },
    evidence: request.evidence,
    finalOutcome,
    issueOutcomes,
    residualRisk,
    recommendedNextStep,
    carryForward,
    closureSummary,
    handoffSummary: `${failure.summary} No change was applied.`,
    failure
  });
};

export const prioritizeDefensiveAction = (
  rawInput: DefensivePrioritizationInput
): DefensivePrioritization => {
  const input = defensivePrioritizationInputSchema.parse(rawInput);
  const sources: DefensivePrioritizationSource[] = [
    ...input.findings.map((finding) => ({ ...finding, kind: "finding" as const })),
    ...input.observations.map((observation) => ({ ...observation, kind: "observation" as const }))
  ];

  const followUp = sources
    .filter((source) => source.confidence < defensiveLowConfidenceThreshold || defensiveUnverifiablePattern.test(`${source.summary} ${source.evidence}`))
    .map((source) =>
      defensiveFollowUpItemSchema.parse({
        sourceId: source.id,
        sourceKind: source.kind,
        title: source.title,
        reason: source.confidence < defensiveLowConfidenceThreshold
          ? `Confidence ${roundPriorityScore(source.confidence)} is below the ${defensiveLowConfidenceThreshold} threshold.`
          : "Evidence is ambiguous or unverifiable.",
        recommendedAction: `Reproduce ${source.title.toLowerCase()} with stronger evidence before treating it as confirmed risk.`
      })
    );

  const confirmedSources = sources.filter(
    (source) => !followUp.some((item) => item.sourceId === source.id && item.sourceKind === source.kind)
  );

  let rankedActions: DefensivePrioritizedAction[];

  if (confirmedSources.length === 0) {
    const source = sources
      .slice()
      .sort((left, right) => (
        severityOrder[right.severity] - severityOrder[left.severity]
        || right.confidence - left.confidence
        || left.id.localeCompare(right.id)
      ))[0];

    if (!source) {
      throw new Error("Prioritization requires at least one finding or observation.");
    }

    const manualInvestigation = defensivePrioritizedActionSchema.parse({
      candidateId: `candidate-follow-up-${source.kind}-${source.id}`,
      sourceIds: [source.id],
      sourceKinds: [source.kind],
      action: {
        type: "manual_investigation",
        summary: buildActionSummary("manual_investigation", source, input.target),
        rationale: "No finding has sufficient confidence for autonomous remediation, so the bounded next step is to gather stronger evidence.",
        scope: buildActionScope("manual_investigation", input.target),
        bounded: true,
        safetyChecks: buildSafetyChecks("manual_investigation", input.target, source)
      },
      factorScores: {
        severity: normalizeSeverity(source.severity),
        exploitability: inferExploitability(source),
        exposure: inferExposure(source, input.assetContext),
        confidence: source.confidence,
        implementationSafety: implementationSafetyScores.manual_investigation
      },
      priorityScore: roundPriorityScore((
        normalizeSeverity(source.severity) * defensivePrioritizationWeights.severity
        + inferExploitability(source) * defensivePrioritizationWeights.exploitability
        + inferExposure(source, input.assetContext) * defensivePrioritizationWeights.exposure
        + source.confidence * defensivePrioritizationWeights.confidence
        + implementationSafetyScores.manual_investigation * defensivePrioritizationWeights.implementationSafety
      ) * 100),
      confidenceDisposition: "follow_up_required",
      decision: "selected",
      decisionReason: "Selected because no issue is strong enough for a production-facing change."
    });

    rankedActions = [manualInvestigation];
  } else {
    rankedActions = confirmedSources
      .map((source) => createCandidateAction(source, input))
      .sort((left, right) => (
        right.priorityScore - left.priorityScore
        || right.factorScores.exposure - left.factorScores.exposure
        || right.factorScores.confidence - left.factorScores.confidence
        || left.candidateId.localeCompare(right.candidateId)
      ))
      .map((candidate, index, array) => ({
        ...candidate,
        decision: index === 0 ? "selected" : "not_selected",
        decisionReason: index === 0
          ? "Selected because it has the highest weighted score and reduces the most immediate exposure safely."
          : buildComparisonReason(candidate, array[0] as DefensivePrioritizedAction)
      }));
  }

  const selectedAction = rankedActions[0] as DefensivePrioritizedAction;
  const selectedSummary = `${selectedAction.action.summary} Selected using severity, exploitability, exposure, confidence, and implementation safety weights.`;
  const followUpSummary = followUp.length > 0
    ? ` ${followUp.length} low-confidence item${followUp.length === 1 ? "" : "s"} moved to follow-up instead of confirmed risk.`
    : "";

  return defensivePrioritizationSchema.parse({
    modelVersion: "1.0",
    summary: `${selectedSummary}${followUpSummary}`,
    selectedAction,
    rankedActions,
    followUp,
    weights: defensivePrioritizationWeights
  });
};

export const executeDefensiveIteration = (
  rawRequest: DefensiveExecutionRequest
): DefensiveIterationRecord => {
  const request = defensiveExecutionRequestSchema.parse(rawRequest);
  const prioritization = prioritizeDefensiveAction({
    findings: request.input.findings,
    observations: request.observations,
    target: request.input.target,
    assetContext: request.input.assetContext,
    priorIteration: request.input.priorIteration
  });
  const selectedAction = prioritization.selectedAction.action;

  if (prioritization.selectedAction.confidenceDisposition !== "confirmed_risk") {
    return blockDefensiveIteration(request, prioritization, {
      reason: "ambiguous_scope",
      blockedStage: "act",
      summary: "The selected action is not supported by high-confidence evidence, so autonomous hardening is blocked.",
      operatorAction: "Reproduce the finding with stronger evidence before applying any mitigation."
    });
  }

  if (!selectedAction.bounded || request.change.affectsMultipleComponents || request.change.destructive || !request.change.reversibleIntent) {
    return blockDefensiveIteration(request, prioritization, {
      reason: "unsafe_action",
      blockedStage: "act",
      summary: "The proposed change is broader than one reversible mitigation, so the iteration stops before execution.",
      operatorAction: "Reduce the change to one reversible control update with a clear rollback path."
    });
  }

  if (!matchesSelectedScope(selectedAction, request.change)) {
    return blockDefensiveIteration(request, prioritization, {
      reason: "ambiguous_scope",
      blockedStage: "act",
      summary: "The proposed change does not clearly match the selected action scope, so the iteration remains blocked.",
      operatorAction: "Align the implementation to the selected mitigation scope before retrying."
    });
  }

  const hasVerificationEvidence = request.evidence.some((artifact) => artifact.type === "test_result" || artifact.type === "command_output");

  if (!hasVerificationEvidence) {
    return blockDefensiveIteration(request, prioritization, {
      reason: "missing_evidence",
      blockedStage: "verify",
      summary: "Verification evidence is missing, so the loop cannot claim the mitigation completed safely.",
      operatorAction: "Capture focused verification output for the selected mitigation before recording completion."
    });
  }

  const residualRisk = deriveCompletionResidualRisk(prioritization, request.input);
  const recommendedNextStep = buildCompletedNextStep(prioritization);
  const issueOutcomes = buildIssueOutcomes(
    request.input,
    request.observations,
    prioritization,
    request.evidence,
    "completed"
  );
  const finalOutcome = buildFinalOutcome(selectedAction, request.outcomeSummary, "completed");
  const carryForward = buildCarryForwardState(
    request.iterationId,
    request.input,
    issueOutcomes,
    residualRisk,
    recommendedNextStep
  );
  const closureSummary = buildClosureSummary(
    selectedAction,
    request.evidence,
    residualRisk,
    recommendedNextStep,
    "completed"
  );

  return defensiveIterationRecordSchema.parse({
    iterationId: request.iterationId,
    stages: defensiveLoopStages,
    status: "completed",
    input: request.input,
    prioritization,
    chosenAction: selectedAction,
    verification: {
      outcome: "verified",
      summary: request.outcomeSummary,
      checks: request.verificationPlan.checks
    },
    evidence: request.evidence,
    finalOutcome,
    issueOutcomes,
    residualRisk,
    recommendedNextStep,
    carryForward,
    closureSummary,
    handoffSummary: `${request.change.summary} completed. ${recommendedNextStep.summary}`
  });
};

export const defensiveFailureReasonSchema = z.enum(["missing_evidence", "ambiguous_scope", "unsafe_action"]);
export type DefensiveFailureReason = z.infer<typeof defensiveFailureReasonSchema>;

export const defensiveFailureStateSchema = z.object({
  reason: defensiveFailureReasonSchema,
  blockedStage: defensiveLoopStageSchema,
  summary: z.string().min(1),
  operatorAction: z.string().min(1)
});
export type DefensiveFailureState = z.infer<typeof defensiveFailureStateSchema>;

export const defensiveIterationRecordSchema = z
  .object({
    iterationId: z.string().min(1),
    stages: z.tuple([
      z.literal("intake"),
      z.literal("prioritize"),
      z.literal("act"),
      z.literal("verify"),
      z.literal("record"),
      z.literal("handoff")
    ]),
    status: z.enum(["completed", "blocked"]),
    input: defensiveIterationInputSchema,
    prioritization: defensivePrioritizationSchema,
    chosenAction: defensiveChosenActionSchema,
    verification: defensiveVerificationSchema,
    evidence: z.array(defensiveEvidenceArtifactSchema).min(1),
    finalOutcome: defensiveFinalOutcomeSchema,
    issueOutcomes: z.array(defensiveIssueOutcomeSchema).min(1),
    residualRisk: defensiveResidualRiskSchema,
    recommendedNextStep: defensiveNextStepSchema,
    carryForward: defensiveCarryForwardStateSchema,
    closureSummary: defensiveClosureSummarySchema,
    handoffSummary: z.string().min(1),
    failure: defensiveFailureStateSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (value.status === "blocked" && !value.failure) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Blocked iterations must include a failure state.",
        path: ["failure"]
      });
    }

    if (value.status === "completed" && value.failure) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completed iterations cannot include a failure state.",
        path: ["failure"]
      });
    }

    if (value.prioritization.selectedAction.action.type !== value.chosenAction.type
      || value.prioritization.selectedAction.action.summary !== value.chosenAction.summary
      || value.prioritization.selectedAction.action.rationale !== value.chosenAction.rationale
      || value.prioritization.selectedAction.action.scope !== value.chosenAction.scope
      || value.prioritization.selectedAction.action.bounded !== value.chosenAction.bounded
      || JSON.stringify(value.prioritization.selectedAction.action.safetyChecks) !== JSON.stringify(value.chosenAction.safetyChecks)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chosen action must match the prioritization-selected action.",
        path: ["chosenAction"]
      });
    }

    if (value.carryForward.iterationId !== value.iterationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Carry-forward state must reference the current iteration.",
        path: ["carryForward", "iterationId"]
      });
    }
  });
export type DefensiveIterationRecord = z.infer<typeof defensiveIterationRecordSchema>;

export const defensiveLoopContractFieldSchema = z.object({
  key: z.string().min(1),
  required: z.boolean(),
  description: z.string().min(1)
});
export type DefensiveLoopContractField = z.infer<typeof defensiveLoopContractFieldSchema>;

export const defensiveLoopStageDefinitionSchema = z.object({
  stage: defensiveLoopStageSchema,
  purpose: z.string().min(1),
  consumes: z.array(z.string().min(1)),
  produces: z.array(z.string().min(1))
});
export type DefensiveLoopStageDefinition = z.infer<typeof defensiveLoopStageDefinitionSchema>;

export const defensiveLoopContractSchema = z.object({
  name: z.literal("defensive-iteration"),
  version: z.literal("1.0"),
  stages: z.tuple([
    defensiveLoopStageDefinitionSchema.extend({ stage: z.literal("intake") }),
    defensiveLoopStageDefinitionSchema.extend({ stage: z.literal("prioritize") }),
    defensiveLoopStageDefinitionSchema.extend({ stage: z.literal("act") }),
    defensiveLoopStageDefinitionSchema.extend({ stage: z.literal("verify") }),
    defensiveLoopStageDefinitionSchema.extend({ stage: z.literal("record") }),
    defensiveLoopStageDefinitionSchema.extend({ stage: z.literal("handoff") })
  ]),
  requiredInputs: z.array(defensiveLoopContractFieldSchema).min(4),
  requiredOutputs: z.array(defensiveLoopContractFieldSchema).min(4),
  failureStates: z
    .array(
      defensiveFailureStateSchema.extend({
        reason: defensiveFailureReasonSchema
      })
    )
    .min(3)
});
export type DefensiveLoopContract = z.infer<typeof defensiveLoopContractSchema>;

export const defensiveLoopContract = defensiveLoopContractSchema.parse({
  name: "defensive-iteration",
  version: "1.0",
  stages: [
    {
      stage: "intake",
      purpose: "Collect validated findings, target identity, asset context, and prior state before making any change.",
      consumes: ["findings", "target", "assetContext", "priorIteration"],
      produces: ["iterationInput"]
    },
    {
      stage: "prioritize",
      purpose: "Choose one bounded defensive action using explicit factor weights, intake evidence, and known asset risk.",
      consumes: ["iterationInput"],
      produces: ["prioritization", "chosenAction"]
    },
    {
      stage: "act",
      purpose: "Execute the selected defensive action only when scope and safety checks are clear.",
      consumes: ["chosenAction"],
      produces: ["executionArtifacts"]
    },
    {
      stage: "verify",
      purpose: "Confirm the action outcome with explicit checks instead of assuming risk reduction.",
      consumes: ["executionArtifacts"],
      produces: ["verification", "evidence"]
    },
    {
      stage: "record",
      purpose: "Persist what changed, what evidence supports it, and what residual risk remains.",
      consumes: ["chosenAction", "verification", "evidence"],
      produces: ["iterationRecord", "residualRisk"]
    },
    {
      stage: "handoff",
      purpose: "Recommend the next safe step so the following iteration starts with preserved context.",
      consumes: ["iterationRecord", "residualRisk"],
      produces: ["recommendedNextStep", "closureSummary", "handoffSummary"]
    }
  ],
  requiredInputs: [
    {
      key: "findings",
      required: true,
      description: "At least one finding with severity, confidence, source, and evidence."
    },
    {
      key: "target",
      required: true,
      description: "Target identity including kind, stable identifier, and display name."
    },
    {
      key: "assetContext",
      required: true,
      description: "Asset criticality and exposure context used to explain prioritization."
    },
    {
      key: "priorIteration",
      required: false,
      description: "Previous iteration summary and carry-forward risk when available."
    }
  ],
  requiredOutputs: [
    {
      key: "chosenAction",
      required: true,
      description: "The single bounded action selected for the iteration with rationale and safety checks."
    },
    {
      key: "prioritization",
      required: true,
      description: "The ranked candidate actions, explicit scoring factors, deferred follow-up items, and why non-selected actions were not chosen."
    },
    {
      key: "evidence",
      required: true,
      description: "Artifacts that show what was checked, changed, or deliberately blocked."
    },
    {
      key: "residualRisk",
      required: true,
      description: "Plain-language statement of remaining risk after the iteration."
    },
    {
      key: "recommendedNextStep",
      required: true,
      description: "The next safe action or explicit stop condition for the following iteration."
    },
    {
      key: "closureSummary",
      required: true,
      description: "Compact end-of-iteration guidance that states what risk changed, what evidence supports that claim, what remains, and whether the loop can safely continue."
    }
  ],
  failureStates: [
    {
      reason: "missing_evidence",
      blockedStage: "verify",
      summary: "Stop when the action cannot be supported by concrete evidence or verification output.",
      operatorAction: "Collect stronger evidence before claiming the risk changed."
    },
    {
      reason: "ambiguous_scope",
      blockedStage: "prioritize",
      summary: "Stop when the target boundary or affected assets are unclear.",
      operatorAction: "Clarify ownership, targets, or impacted components before acting."
    },
    {
      reason: "unsafe_action",
      blockedStage: "act",
      summary: "Stop when the proposed change is destructive, irreversible, or exceeds the bounded scope.",
      operatorAction: "Escalate for human review or choose a safer defensive action."
    }
  ]
});

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

export const scanStatusSchema = z.enum(["pending", "running", "complete", "aborted", "failed"]);
export type ScanStatus = z.infer<typeof scanStatusSchema>;

export const scansListQuerySchema = resourceListQuerySchema.extend({
  status: scanStatusSchema.optional(),
  sortBy: z.enum(["createdAt", "status", "currentRound"]).optional().default("createdAt"),
  sortDirection: sortDirectionSchema.default("desc")
});
export type ScansListQuery = z.infer<typeof scansListQuerySchema>;

export const scanSchema = z.object({
  id: z.string(),
  scope: scanScopeSchema,
  status: scanStatusSchema,
  currentRound: z.number().int().min(0),
  tacticsTotal: z.number().int().min(0),
  tacticsComplete: z.number().int().min(0),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional()
});
export type Scan = z.infer<typeof scanSchema>;

export const listScansResponseSchema = paginatedMetaSchema.extend({
  scans: z.array(scanSchema)
});
export type ListScansResponse = z.infer<typeof listScansResponseSchema>;

export const auditEntrySchema = z.object({
  id: z.string(),
  scanId: z.string(),
  timestamp: z.string().datetime(),
  actor: z.string(),
  action: z.string(),
  targetTacticId: z.string().optional(),
  scopeValid: z.boolean(),
  details: z.record(z.unknown())
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const attackPathSchema = z.object({
  tacticIds: z.array(z.string()),
  risk: z.number().min(0).max(1),
  description: z.string()
});
export type AttackPath = z.infer<typeof attackPathSchema>;

export const reportSchema = z.object({
  scanId: z.string(),
  executiveSummary: z.string(),
  totalFindings: z.number().int(),
  findingsBySeverity: z.object({
    info: z.number().int(),
    low: z.number().int(),
    medium: z.number().int(),
    high: z.number().int(),
    critical: z.number().int()
  }),
  topRisks: z.array(
    z.object({
      title: z.string(),
      severity: severitySchema,
      tacticTarget: z.string(),
      recommendation: z.string()
    })
  ),
  attackPaths: z.array(attackPathSchema),
  escalationRoutes: z.array(escalationRouteSchema).default([]),
  generatedAt: z.string().datetime()
});
export type Report = z.infer<typeof reportSchema>;

export const createScanRequestSchema = z.object({
  scope: scanScopeSchema,
  llm: scanLlmConfigSchema.optional()
});
export type CreateScanRequest = z.infer<typeof createScanRequestSchema>;

export const strategyMapResponseSchema = z.object({
  tactics: z.array(scanTacticSchema),
  relationships: z.array(
    z.object({
      source: z.string(),
      target: z.string()
    })
  )
});
export type StrategyMapResponse = z.infer<typeof strategyMapResponseSchema>;

export const wsEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("tactic_updated"), tactic: scanTacticSchema }),
  z.object({ type: z.literal("finding_added"), finding: findingSchema }),
  z.object({ type: z.literal("tool_run_started"), toolRun: toolRunSchema }),
  z.object({ type: z.literal("tool_run_completed"), toolRun: toolRunSchema }),
  z.object({ type: z.literal("observation_added"), observation: observationSchema }),
  z.object({ type: z.literal("agent_note_added"), agentNote: agentNoteSchema }),
  z.object({
    type: z.literal("finding_validated"),
    findingId: z.string(),
    validationStatus: validationStatusSchema,
    reason: z.string()
  }),
  z.object({ type: z.literal("scan_status"), scan: scanSchema }),
  z.object({
    type: z.literal("round_complete"),
    round: z.number(),
    summary: z.string()
  }),
  z.object({ type: z.literal("report_ready"), report: reportSchema }),
  z.object({ type: z.literal("escalation_route_detected"), route: escalationRouteSchema }),
  z.object({
    type: z.literal("strategy_analysis_complete"),
    round: z.number(),
    routesFound: z.number().int(),
    prioritizedTargets: z.array(z.string())
  })
]);
export type WsEvent = z.infer<typeof wsEventSchema>;
