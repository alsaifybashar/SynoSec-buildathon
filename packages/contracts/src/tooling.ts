import { z } from "zod";
import { findingSchema, osiLayerSchema, scanScopeSchema, severitySchema } from "./scan-core.js";

export const toolRiskTierSchema = z.enum(["passive", "active", "controlled-exploit"]);
export type ToolRiskTier = z.infer<typeof toolRiskTierSchema>;

export const toolCapabilityTagSchema = z.string().trim().min(1);
export type ToolCapabilityTag = z.infer<typeof toolCapabilityTagSchema>;

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

export const toolCategorySchema = z.enum([
  "topology",
  "auth",
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

export const toolRequestExecutorTypeSchema = z.enum(["bash", "native-ts"]);
export type ToolRequestExecutorType = z.infer<typeof toolRequestExecutorTypeSchema>;

const jsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  jsonPrimitiveSchema,
  z.array(jsonValueSchema),
  z.record(jsonValueSchema)
]));

const httpHeaderValueSchema = z.union([z.string(), z.array(z.string())]);
const connectorHttpResponseBindingSchema = z.object({
  name: z.string().trim().min(1),
  source: z.enum(["header", "body_regex"]),
  headerName: z.string().trim().min(1).optional(),
  pattern: z.string().trim().min(1).optional(),
  groupIndex: z.number().int().min(0).default(1),
  required: z.boolean().default(true)
}).superRefine((value, ctx) => {
  if (value.source === "header" && !value.headerName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "headerName is required when source=header.",
      path: ["headerName"]
    });
  }

  if (value.source === "body_regex" && !value.pattern) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "pattern is required when source=body_regex.",
      path: ["pattern"]
    });
  }
});
export type ConnectorHttpResponseBinding = z.infer<typeof connectorHttpResponseBindingSchema>;

export const connectorHttpRequestActionSchema = z.object({
  kind: z.literal("http_request"),
  id: z.string().min(1),
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).default("GET"),
  headers: z.record(z.string(), httpHeaderValueSchema).default({}),
  query: z.record(z.string(), z.string()).default({}),
  formBody: z.record(z.string(), z.string()).optional(),
  jsonBody: z.record(jsonValueSchema).optional(),
  timeoutMs: z.number().int().min(1).max(300000).default(30000),
  maxResponseBytes: z.number().int().min(1).max(1024 * 1024).default(32768),
  followRedirects: z.boolean().default(true),
  captureBody: z.boolean().default(true),
  captureHeaders: z.boolean().default(true),
  delayMs: z.number().int().min(0).max(60000).default(0),
  responseBindings: z.array(connectorHttpResponseBindingSchema).default([])
});
export type ConnectorHttpRequestAction = z.infer<typeof connectorHttpRequestActionSchema>;

export const connectorDnsRecordTypeSchema = z.enum([
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "NS",
  "SOA",
  "SRV",
  "TXT",
  "CAA"
]);
export type ConnectorDnsRecordType = z.infer<typeof connectorDnsRecordTypeSchema>;

export const connectorDnsQueryActionSchema = z.object({
  kind: z.literal("dns_query"),
  id: z.string().min(1),
  name: z.string().trim().min(1),
  recordType: connectorDnsRecordTypeSchema,
  resolver: z.string().trim().min(1).optional(),
  timeoutMs: z.number().int().min(1).max(300000).default(10000)
});
export type ConnectorDnsQueryAction = z.infer<typeof connectorDnsQueryActionSchema>;

export const connectorTcpConnectActionSchema = z.object({
  kind: z.literal("tcp_connect"),
  id: z.string().min(1),
  host: z.string().trim().min(1),
  port: z.number().int().min(1).max(65535),
  timeoutMs: z.number().int().min(1).max(300000).default(5000),
  send: z.string().optional(),
  expectRegex: z.string().trim().min(1).optional(),
  maxReadBytes: z.number().int().min(1).max(65536).default(1024)
});
export type ConnectorTcpConnectAction = z.infer<typeof connectorTcpConnectActionSchema>;

export const connectorTlsHandshakeActionSchema = z.object({
  kind: z.literal("tls_handshake"),
  id: z.string().min(1),
  host: z.string().trim().min(1),
  port: z.number().int().min(1).max(65535).default(443),
  serverName: z.string().trim().min(1).optional(),
  timeoutMs: z.number().int().min(1).max(300000).default(10000)
});
export type ConnectorTlsHandshakeAction = z.infer<typeof connectorTlsHandshakeActionSchema>;

export const connectorActionSchema = z.discriminatedUnion("kind", [
  connectorHttpRequestActionSchema,
  connectorDnsQueryActionSchema,
  connectorTcpConnectActionSchema,
  connectorTlsHandshakeActionSchema
]);
export type ConnectorAction = z.infer<typeof connectorActionSchema>;

export const connectorActionBatchSchema = z.object({
  actions: z.array(connectorActionSchema).min(1)
});
export type ConnectorActionBatch = z.infer<typeof connectorActionBatchSchema>;

export const connectorHttpRequestActionResultSchema = z.object({
  kind: z.literal("http_request"),
  actionId: z.string().min(1),
  ok: z.boolean(),
  statusCode: z.number().int().min(0),
  headers: z.record(z.string(), httpHeaderValueSchema).default({}),
  body: z.string().default(""),
  durationMs: z.number().int().min(0),
  networkError: z.string().optional()
});
export type ConnectorHttpRequestActionResult = z.infer<typeof connectorHttpRequestActionResultSchema>;

export const connectorDnsAnswerSchema = z.object({
  name: z.string().min(1),
  type: connectorDnsRecordTypeSchema,
  ttl: z.number().int().min(0).optional(),
  data: z.string().min(1)
});
export type ConnectorDnsAnswer = z.infer<typeof connectorDnsAnswerSchema>;

export const connectorDnsQueryActionResultSchema = z.object({
  kind: z.literal("dns_query"),
  actionId: z.string().min(1),
  ok: z.boolean(),
  name: z.string().min(1),
  recordType: connectorDnsRecordTypeSchema,
  responseCode: z.string().min(1),
  answers: z.array(connectorDnsAnswerSchema).default([]),
  durationMs: z.number().int().min(0),
  networkError: z.string().optional()
});
export type ConnectorDnsQueryActionResult = z.infer<typeof connectorDnsQueryActionResultSchema>;

export const connectorTcpConnectActionResultSchema = z.object({
  kind: z.literal("tcp_connect"),
  actionId: z.string().min(1),
  ok: z.boolean(),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  status: z.enum(["connected", "refused", "timed_out", "error"]),
  banner: z.string().default(""),
  matchedExpectRegex: z.boolean().optional(),
  durationMs: z.number().int().min(0),
  networkError: z.string().optional()
});
export type ConnectorTcpConnectActionResult = z.infer<typeof connectorTcpConnectActionResultSchema>;

export const connectorTlsHandshakeActionResultSchema = z.object({
  kind: z.literal("tls_handshake"),
  actionId: z.string().min(1),
  ok: z.boolean(),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  serverName: z.string().min(1).optional(),
  protocol: z.string().optional(),
  cipher: z.string().optional(),
  certSubject: z.string().optional(),
  certIssuer: z.string().optional(),
  certSan: z.array(z.string()).default([]),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  durationMs: z.number().int().min(0),
  handshakeError: z.string().optional(),
  networkError: z.string().optional()
});
export type ConnectorTlsHandshakeActionResult = z.infer<typeof connectorTlsHandshakeActionResultSchema>;

export const connectorActionResultSchema = z.discriminatedUnion("kind", [
  connectorHttpRequestActionResultSchema,
  connectorDnsQueryActionResultSchema,
  connectorTcpConnectActionResultSchema,
  connectorTlsHandshakeActionResultSchema
]);
export type ConnectorActionResult = z.infer<typeof connectorActionResultSchema>;

export const connectorActionExecutionResultSchema = z.object({
  actionResults: z.array(connectorActionResultSchema).default([])
});
export type ConnectorActionExecutionResult = z.infer<typeof connectorActionExecutionResultSchema>;

export const toolRequestSchema = z.object({
  toolId: z.string().min(1).optional(),
  tool: z.string().min(1),
  executorType: toolRequestExecutorTypeSchema.default("bash"),
  capabilities: z.array(toolCapabilityTagSchema).default([]),
  target: z.string().min(1),
  port: z.number().int().optional(),
  service: z.string().optional(),
  layer: osiLayerSchema,
  riskTier: toolRiskTierSchema,
  justification: z.string().min(1),
  sandboxProfile: toolSandboxProfileSchema,
  privilegeProfile: toolPrivilegeProfileSchema,
  parameters: z.record(jsonValueSchema).default({})
}).superRefine((value, ctx) => {
  if (!value.toolId) {
    return;
  }
  if (value.capabilities.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `At least one capability tag is required for ${value.executorType} tool execution.`,
      path: ["capabilities"]
    });
  }

  if (typeof value.parameters["commandPreview"] !== "string") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Command preview is required in structured parameters for ${value.executorType} tool execution.`,
      path: ["parameters", "commandPreview"]
    });
  }

  if (value.executorType === "bash") {
    if (typeof value.parameters["bashSource"] !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bash source is required in structured parameters for bash tool execution.",
        path: ["parameters", "bashSource"]
      });
    }
    if (typeof value.parameters["toolInput"] !== "object" || value.parameters["toolInput"] == null || Array.isArray(value.parameters["toolInput"])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Structured tool input is required for bash tool execution.",
        path: ["parameters", "toolInput"]
      });
    }
    return;
  }

  if (typeof value.parameters["toolInput"] !== "object" || value.parameters["toolInput"] == null || Array.isArray(value.parameters["toolInput"])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Structured tool input is required for native tool execution.",
      path: ["parameters", "toolInput"]
    });
  }

  const batchResult = connectorActionBatchSchema.safeParse(value.parameters["actionBatch"]);
  if (!batchResult.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Connector action batch is required for native tool execution.",
      path: ["parameters", "actionBatch"]
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
  executorType: toolRequestExecutorTypeSchema.default("bash"),
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
  installedBinaries: z.array(z.string().trim().min(1)).default([]),
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
  installedBinaries: z.array(z.string().trim().min(1)).default([]),
  supportedToolIds: z.array(z.string().min(1)).default([]),
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
  key: z.string(),
  title: z.string(),
  summary: z.string(),
  severity: severitySchema,
  confidence: z.number().min(0).max(1)
});
export type Observation = z.infer<typeof observationSchema>;

export const internalObservationSchema = z.object({
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
export type InternalObservation = z.infer<typeof internalObservationSchema>;

export const toolExecutionPublicResultSchema = z.object({
  toolRunId: z.string(),
  toolId: z.string(),
  toolName: z.string(),
  status: toolRunStatusSchema,
  outputPreview: z.string(),
  observations: z.array(observationSchema).default([]),
  totalObservations: z.number().int().min(0),
  truncated: z.boolean()
});
export type ToolExecutionPublicResult = z.infer<typeof toolExecutionPublicResultSchema>;

export const connectorExecutionResultSchema = z.object({
  output: z.string(),
  exitCode: z.number().int(),
  observations: z.array(z.lazy(() => internalObservationSchema)).default([]),
  actionResults: z.array(connectorActionResultSchema).default([]),
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
