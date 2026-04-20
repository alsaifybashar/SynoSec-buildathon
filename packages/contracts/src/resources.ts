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

export const toolExecutionModeSchema = z.enum(["catalog", "sandboxed"]);
export type ToolExecutionMode = z.infer<typeof toolExecutionModeSchema>;

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
  scriptPath: z.string().nullable().default(null),
  capabilities: z.array(z.lazy(() => toolCapabilityTagSchema)).default([]),
  category: z.lazy(() => toolCategorySchema),
  riskTier: z.lazy(() => toolRiskTierSchema),
  notes: z.string().nullable(),
  executionMode: toolExecutionModeSchema.default("catalog"),
  sandboxProfile: toolSandboxProfileSchema.nullable().default(null),
  privilegeProfile: toolPrivilegeProfileSchema.nullable().default(null),
  defaultArgs: z.array(z.string().min(1)).default([]),
  timeoutMs: z.number().int().min(1000).max(300000).nullable().default(null),
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
  binary: z.union([z.string().trim().min(1), z.literal(""), z.null()]).transform((value) => value || null).optional(),
  scriptPath: z.union([z.string().trim().min(1), z.literal(""), z.null()]).transform((value) => value || null).optional(),
  capabilities: z.array(z.lazy(() => toolCapabilityTagSchema)).default([]),
  category: z.lazy(() => toolCategorySchema),
  riskTier: z.lazy(() => toolRiskTierSchema),
  notes: z.union([z.string().trim(), z.literal(""), z.null()]).transform((value) => value || null),
  executionMode: toolExecutionModeSchema.default("catalog"),
  sandboxProfile: z.union([z.lazy(() => toolSandboxProfileSchema), z.literal(""), z.null()]).transform((value) => value || null).optional(),
  privilegeProfile: z.union([z.lazy(() => toolPrivilegeProfileSchema), z.literal(""), z.null()]).transform((value) => value || null).optional(),
  defaultArgs: z.array(z.string().trim().min(1)).default([]),
  timeoutMs: z.number().int().min(1000).max(300000).nullable().optional(),
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
  if (value.executionMode === "sandboxed") {
    if (!value.scriptPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Script path is required for sandboxed tools.",
        path: ["scriptPath"]
      });
    }
    if (value.capabilities.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one capability is required for sandboxed tools.",
        path: ["capabilities"]
      });
    }
    if (!value.sandboxProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sandbox profile is required for sandboxed tools.",
        path: ["sandboxProfile"]
      });
    }
    if (!value.privilegeProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Privilege profile is required for sandboxed tools.",
        path: ["privilegeProfile"]
      });
    }
  }
});
export type CreateAiToolBody = z.infer<typeof createAiToolBodySchema>;

export const updateAiToolBodySchema = aiToolBodyBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  })
  .superRefine((value, ctx) => {
    if (value.executionMode === "sandboxed") {
      if ("scriptPath" in value && !value.scriptPath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Script path is required for sandboxed tools.",
          path: ["scriptPath"]
        });
      }
      if ("capabilities" in value && value.capabilities?.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one capability is required for sandboxed tools.",
          path: ["capabilities"]
        });
      }
      if ("sandboxProfile" in value && !value.sandboxProfile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sandbox profile is required for sandboxed tools.",
          path: ["sandboxProfile"]
        });
      }
      if ("privilegeProfile" in value && !value.privilegeProfile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Privilege profile is required for sandboxed tools.",
          path: ["privilegeProfile"]
        });
      }
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

export const workflowTraceEventTypeSchema = z.enum([
  "stage_started",
  "agent_input",
  "model_decision",
  "tool_call",
  "tool_result",
  "agent_summary",
  "stage_completed",
  "stage_failed"
]);
export type WorkflowTraceEventType = z.infer<typeof workflowTraceEventTypeSchema>;

export const workflowTraceEventStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
export type WorkflowTraceEventStatus = z.infer<typeof workflowTraceEventStatusSchema>;

export const workflowTraceEventSchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string().uuid(),
  workflowId: z.string().uuid(),
  workflowStageId: z.string().uuid().nullable(),
  stepIndex: z.number().int().min(0),
  ord: z.number().int().min(0),
  type: workflowTraceEventTypeSchema,
  status: workflowTraceEventStatusSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  detail: z.string().nullable(),
  payload: jsonSchemaObjectSchema,
  createdAt: z.string().datetime()
});
export type WorkflowTraceEvent = z.infer<typeof workflowTraceEventSchema>;

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
  trace: z.array(workflowTraceEntrySchema),
  events: z.array(workflowTraceEventSchema).default([])
});
export type WorkflowRun = z.infer<typeof workflowRunSchema>;

export const workflowRunStreamMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("snapshot"),
    run: workflowRunSchema
  }),
  z.object({
    type: z.literal("event_appended"),
    run: workflowRunSchema,
    event: workflowTraceEventSchema
  }),
  z.object({
    type: z.literal("trace_appended"),
    run: workflowRunSchema,
    traceEntry: workflowTraceEntrySchema
  })
]);
export type WorkflowRunStreamMessage = z.infer<typeof workflowRunStreamMessageSchema>;
