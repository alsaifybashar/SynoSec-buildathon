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
  workflowRunEvents: "/api/workflow-runs/:id/events",
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
