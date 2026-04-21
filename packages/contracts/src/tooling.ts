import { z } from "zod";
import { findingSchema, osiLayerSchema, scanScopeSchema, severitySchema } from "./scan-core.js";
import { toolPrivilegeProfileSchema, toolSandboxProfileSchema } from "./resources.js";

export const toolRiskTierSchema = z.enum(["passive", "active", "controlled-exploit"]);
export type ToolRiskTier = z.infer<typeof toolRiskTierSchema>;

export const toolCapabilityTagSchema = z.string().trim().min(1);
export type ToolCapabilityTag = z.infer<typeof toolCapabilityTagSchema>;

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
  implementedBy: z.enum(["script", "manual"]).optional(),
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
  toolId: z.string().min(1).optional(),
  tool: z.string().min(1),
  executorType: z.literal("bash").default("bash"),
  capabilities: z.array(toolCapabilityTagSchema).default([]),
  target: z.string().min(1),
  port: z.number().int().optional(),
  service: z.string().optional(),
  layer: osiLayerSchema,
  riskTier: toolRiskTierSchema,
  justification: z.string().min(1),
  sandboxProfile: toolSandboxProfileSchema,
  privilegeProfile: toolPrivilegeProfileSchema,
  parameters: z.record(z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
  ])).default({})
}).superRefine((value, ctx) => {
  if (!value.toolId) {
    return;
  }
  if (value.capabilities.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one capability tag is required for bash tool execution.",
      path: ["capabilities"]
    });
  }
  if (typeof value.parameters["bashSource"] !== "string") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bash source is required in structured parameters for bash tool execution.",
      path: ["parameters", "bashSource"]
    });
  }
  if (typeof value.parameters["commandPreview"] !== "string") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Command preview is required in structured parameters for bash tool execution.",
      path: ["parameters", "commandPreview"]
    });
  }
  if (typeof value.parameters["toolInput"] !== "object" || Array.isArray(value.parameters["toolInput"])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Structured tool input is required for bash tool execution.",
      path: ["parameters", "toolInput"]
    });
  }
});
export type ToolRequest = z.infer<typeof toolRequestSchema>;

export const toolRunSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  tacticId: z.string(),
  agentId: z.string(),
  toolId: z.string().optional(),
  tool: z.string(),
  executorType: z.literal("bash").default("bash"),
  capabilities: z.array(toolCapabilityTagSchema).default([]),
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
  allowedCapabilities: z.array(toolCapabilityTagSchema).min(1),
  allowedSandboxProfiles: z.array(toolSandboxProfileSchema).default([]),
  allowedPrivilegeProfiles: z.array(toolPrivilegeProfileSchema).default([]),
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
  allowedCapabilities: z.array(toolCapabilityTagSchema).min(1),
  allowedSandboxProfiles: z.array(toolSandboxProfileSchema).default([]),
  allowedPrivilegeProfiles: z.array(toolPrivilegeProfileSchema).default([]),
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

export const observationSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  tacticId: z.string(),
  toolRunId: z.string(),
  toolId: z.string().optional(),
  tool: z.string(),
  capabilities: z.array(toolCapabilityTagSchema).default([]),
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
