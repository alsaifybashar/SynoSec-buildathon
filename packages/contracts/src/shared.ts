import { z } from "zod";

export const apiRoutes = {
  health: "/api/health",
  authGoogleLogin: "/api/auth/google",
  authLogout: "/api/auth/logout",
  authSession: "/api/auth/session",
  applications: "/api/applications",
  applicationTargets: "/api/applications/:id/targets",
  runtimes: "/api/runtimes",
  aiProviders: "/api/ai-providers",
  aiAgents: "/api/ai-agents",
  aiTools: "/api/ai-tools",
  executionConstraints: "/api/execution-constraints",
  workflows: "/api/workflows",
  workflowRuns: "/api/workflow-runs",
  workflowRunEvents: "/api/workflow-runs/:id/events",
  workflowRunTranscript: "/api/workflow-runs/:id/transcript",
  workflowRunFindings: "/api/workflow-runs/:id/findings",
  workflowRunCoverage: "/api/workflow-runs/:id/coverage",
  workflowRunReport: "/api/workflow-runs/:id/report",
  executionReports: "/api/execution-reports",
  executionReportArchive: "/api/execution-reports/:id/archive",
  executionReportUnarchive: "/api/execution-reports/:id/unarchive",
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

export const authenticatedUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable()
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

export const authSessionResponseSchema = z.object({
  authEnabled: z.boolean(),
  authenticated: z.boolean(),
  csrfToken: z.string().min(1).nullable(),
  googleClientId: z.string().min(1).nullable(),
  user: authenticatedUserSchema.nullable()
}).superRefine((value, ctx) => {
  if (value.authenticated && !value.user) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Authenticated sessions must include a user.",
      path: ["user"]
    });
  }
});
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;

export const googleLoginBodySchema = z.object({
  idToken: z.string().min(1)
});
export type GoogleLoginBody = z.infer<typeof googleLoginBodySchema>;

export const sortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

export const executionKindSchema = z.enum(["single-agent", "workflow", "attack-map"]);
export type ExecutionKind = z.infer<typeof executionKindSchema>;

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

export const jsonSchemaObjectSchema = z.record(z.unknown());
export type JsonSchemaObject = z.infer<typeof jsonSchemaObjectSchema>;

export const templateProviderSchema = z.enum(["local", "sonnet"]);
export type TemplateProvider = z.infer<typeof templateProviderSchema>;

export const templateVariableSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  required: z.boolean().default(false)
});
export type TemplateVariable = z.infer<typeof templateVariableSchema>;

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
