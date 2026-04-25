import { z } from "zod";
import {
  escalationRouteSchema,
  findingSchema,
  scanScopeSchema,
  scanTacticSchema,
  severitySchema,
  validationStatusSchema
} from "./scan-core.js";
import { agentNoteSchema, observationSchema, toolRunSchema } from "./tooling.js";
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
