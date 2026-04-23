import { z } from "zod";
import {
  coverageStatusSchema,
  escalationRouteSchema,
  findingSchema,
  scanLayerCoverageSchema,
  securityVulnerabilitySchema,
  scanLlmConfigSchema,
  scanScopeSchema,
  scanTacticSchema,
  severitySchema,
  validationStatusSchema
} from "./scan-core.js";
import { agentNoteSchema, observationSchema, toolRunSchema } from "./tooling.js";
import { createPaginatedResponseSchema, paginatedMetaSchema, resourceListQuerySchema, sortDirectionSchema } from "./shared.js";
export const scanStatusSchema = z.enum(["pending", "running", "complete", "aborted", "failed"]);
export type ScanStatus = z.infer<typeof scanStatusSchema>;

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

export const scansListQuerySchema = resourceListQuerySchema.extend({
  status: scanStatusSchema.optional(),
  sortBy: z.enum(["createdAt", "status", "currentRound"]).optional().default("createdAt"),
  sortDirection: sortDirectionSchema.default("desc")
});
export type ScansListQuery = z.infer<typeof scansListQuerySchema>;

export const singleAgentScanSchema = scanSchema.extend({
  mode: z.literal("single-agent"),
  applicationId: z.string().uuid(),
  runtimeId: z.string().uuid().nullable(),
  agentId: z.string().uuid(),
  llm: scanLlmConfigSchema.optional(),
  stopReason: z.string().nullable().default(null)
});
export type SingleAgentScan = z.infer<typeof singleAgentScanSchema>;

export const createSingleAgentScanRequestSchema = z.object({
  applicationId: z.string().uuid(),
  runtimeId: z.string().uuid().nullable(),
  agentId: z.string().uuid(),
  scope: scanScopeSchema,
  llm: scanLlmConfigSchema.optional()
});
export type CreateSingleAgentScanRequest = z.infer<typeof createSingleAgentScanRequestSchema>;

export const singleAgentScanVulnerabilitiesResponseSchema = z.object({
  scanId: z.string(),
  vulnerabilities: z.array(securityVulnerabilitySchema)
});
export type SingleAgentScanVulnerabilitiesResponse = z.infer<typeof singleAgentScanVulnerabilitiesResponseSchema>;

export const singleAgentScanCoverageResponseSchema = z.object({
  scanId: z.string(),
  layers: z.array(scanLayerCoverageSchema)
});
export type SingleAgentScanCoverageResponse = z.infer<typeof singleAgentScanCoverageResponseSchema>;

export const singleAgentScanCompletionSchema = z.object({
  summary: z.string().min(1),
  residualRisk: z.string().min(1),
  recommendedNextStep: z.string().min(1),
  stopReason: z.string().min(1)
});
export type SingleAgentScanCompletion = z.infer<typeof singleAgentScanCompletionSchema>;

export const singleAgentScanTraceResponseSchema = z.object({
  scanId: z.string(),
  entries: z.array(auditEntrySchema)
});
export type SingleAgentScanTraceResponse = z.infer<typeof singleAgentScanTraceResponseSchema>;

export const singleAgentScanReportSchema = z.object({
  scanId: z.string(),
  executiveSummary: z.string(),
  stopReason: z.string().nullable(),
  totalVulnerabilities: z.number().int().min(0),
  vulnerabilitiesBySeverity: z.object({
    info: z.number().int().min(0),
    low: z.number().int().min(0),
    medium: z.number().int().min(0),
    high: z.number().int().min(0),
    critical: z.number().int().min(0)
  }),
  coverageOverview: z.record(coverageStatusSchema),
  topVulnerabilities: z.array(securityVulnerabilitySchema).max(10),
  generatedAt: z.string().datetime()
});
export type SingleAgentScanReport = z.infer<typeof singleAgentScanReportSchema>;

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
