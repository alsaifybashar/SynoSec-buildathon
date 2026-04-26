import { z } from "zod";
import { workflowReportedFindingSchema } from "./resources.js";
import { securityVulnerabilitySchema, severitySchema, type SecurityVulnerability } from "./scan-core.js";
import { createPaginatedResponseSchema, executionKindSchema, resourceListQuerySchema, sortDirectionSchema } from "./shared.js";

export const executionReportStatusSchema = z.enum(["pending", "running", "completed", "failed", "aborted"]);
export type ExecutionReportStatus = z.infer<typeof executionReportStatusSchema>;

export const executionReportFindingSourceSchema = z.enum(["workflow-finding", "attack-map-finding"]);
export type ExecutionReportFindingSource = z.infer<typeof executionReportFindingSourceSchema>;

export const executionReportFindingSchema = z.object({
  id: z.string().min(1),
  executionId: z.string().min(1),
  executionKind: executionKindSchema,
  source: executionReportFindingSourceSchema,
  severity: severitySchema,
  title: z.string().min(1),
  type: z.string().min(1),
  summary: z.string().min(1),
  recommendation: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  targetLabel: z.string().min(1),
  evidence: z.array(z.object({
    sourceTool: z.string().min(1),
    quote: z.string().min(1),
    artifactRef: z.string().min(1).optional(),
    observationRef: z.string().min(1).optional(),
    toolRunRef: z.string().min(1).optional()
  })).default([]),
  sourceToolIds: z.array(z.string().min(1)).default([]),
  sourceToolRunIds: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime()
});
export type ExecutionReportFinding = z.infer<typeof executionReportFindingSchema>;

export const executionReportToolActivitySchema = z.object({
  id: z.string().min(1),
  executionId: z.string().min(1),
  executionKind: executionKindSchema,
  phase: z.string().min(1),
  toolId: z.string().min(1).nullable(),
  toolName: z.string().min(1),
  command: z.string().min(1),
  status: z.enum(["running", "completed", "failed"]),
  outputPreview: z.string().nullable(),
  exitCode: z.number().int().nullable(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable()
});
export type ExecutionReportToolActivity = z.infer<typeof executionReportToolActivitySchema>;

export const executionReportGraphNodeKindSchema = z.enum(["evidence", "finding", "chain"]);
export type ExecutionReportGraphNodeKind = z.infer<typeof executionReportGraphNodeKindSchema>;

export const executionReportGraphEdgeKindSchema = z.enum(["supports", "derived_from", "correlates_with", "enables"]);
export type ExecutionReportGraphEdgeKind = z.infer<typeof executionReportGraphEdgeKindSchema>;

export const executionReportGraphArtifactRefSchema = z.object({
  traceEventId: z.string().uuid().optional(),
  observationRef: z.string().min(1).optional(),
  toolRunRef: z.string().min(1).optional(),
  artifactRef: z.string().min(1).optional(),
  externalUrl: z.string().url().optional()
}).refine((value) => Object.values(value).some((entry) => typeof entry === "string" && entry.trim().length > 0), {
  message: "At least one evidence reference is required."
});
export type ExecutionReportGraphArtifactRef = z.infer<typeof executionReportGraphArtifactRefSchema>;

export const executionReportGraphEvidenceNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("evidence"),
  title: z.string().min(1),
  summary: z.string().min(1),
  sourceTool: z.string().min(1),
  quote: z.string().min(1),
  severity: severitySchema.optional(),
  refs: z.array(executionReportGraphArtifactRefSchema).min(1),
  createdAt: z.string().datetime()
});
export type ExecutionReportGraphEvidenceNode = z.infer<typeof executionReportGraphEvidenceNodeSchema>;

export const executionReportGraphFindingNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("finding"),
  findingId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  severity: severitySchema,
  confidence: z.number().min(0).max(1).nullable(),
  targetLabel: z.string().min(1),
  createdAt: z.string().datetime()
});
export type ExecutionReportGraphFindingNode = z.infer<typeof executionReportGraphFindingNodeSchema>;

export const executionReportGraphChainNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("chain"),
  title: z.string().min(1),
  summary: z.string().min(1),
  severity: severitySchema,
  findingIds: z.array(z.string().min(1)).min(1),
  createdAt: z.string().datetime()
});
export type ExecutionReportGraphChainNode = z.infer<typeof executionReportGraphChainNodeSchema>;

export const executionReportGraphNodeSchema = z.discriminatedUnion("kind", [
  executionReportGraphEvidenceNodeSchema,
  executionReportGraphFindingNodeSchema,
  executionReportGraphChainNodeSchema
]);
export type ExecutionReportGraphNode = z.infer<typeof executionReportGraphNodeSchema>;

export const executionReportGraphEdgeSchema = z.object({
  id: z.string().min(1),
  kind: executionReportGraphEdgeKindSchema,
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().min(1).optional(),
  createdAt: z.string().datetime()
});
export type ExecutionReportGraphEdge = z.infer<typeof executionReportGraphEdgeSchema>;

export const executionReportGraphSchema = z.object({
  nodes: z.array(executionReportGraphNodeSchema).default([]),
  edges: z.array(executionReportGraphEdgeSchema).default([])
});
export type ExecutionReportGraph = z.infer<typeof executionReportGraphSchema>;

export const executionReportSummarySchema = z.object({
  id: z.string().uuid(),
  executionId: z.string().min(1),
  executionKind: executionKindSchema,
  sourceDefinitionId: z.string().uuid().nullable().default(null),
  status: executionReportStatusSchema,
  title: z.string().min(1),
  targetLabel: z.string().min(1),
  sourceLabel: z.string().min(1),
  findingsCount: z.number().int().min(0),
  highestSeverity: severitySchema.nullable(),
  generatedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable().default(null)
});
export type ExecutionReportSummary = z.infer<typeof executionReportSummarySchema>;

export const executionReportSourceSummarySchema = z.discriminatedUnion("executionKind", [
  z.object({
    executionKind: z.literal("workflow"),
    runId: z.string().uuid(),
    workflowId: z.string().uuid(),
    stopReason: z.string().nullable(),
    totalFindings: z.number().int().min(0),
    topFindingIds: z.array(z.string().min(1)).default([])
  }),
  z.object({
    executionKind: z.literal("attack-map"),
    runId: z.string().uuid(),
    phase: z.string().min(1),
    overallRisk: z.enum(["critical", "high", "medium", "low"]).nullable(),
    chainCount: z.number().int().min(0),
    findingNodeCount: z.number().int().min(0)
  })
]);
export type ExecutionReportSourceSummary = z.infer<typeof executionReportSourceSummarySchema>;

export const executionReportDetailSchema = executionReportSummarySchema.extend({
  executiveSummary: z.string().min(1),
  graph: executionReportGraphSchema.default({ nodes: [], edges: [] }),
  findings: z.array(executionReportFindingSchema),
  toolActivity: z.array(executionReportToolActivitySchema),
  coverageOverview: z.record(z.string()).default({}),
  sourceSummary: executionReportSourceSummarySchema,
  raw: z.record(z.unknown()).default({})
});
export type ExecutionReportDetail = z.infer<typeof executionReportDetailSchema>;

export const executionReportArchiveFilterSchema = z.enum(["exclude", "only", "include"]);
export type ExecutionReportArchiveFilter = z.infer<typeof executionReportArchiveFilterSchema>;

export const executionReportsListQuerySchema = resourceListQuerySchema.extend({
  executionKind: executionKindSchema.optional(),
  status: executionReportStatusSchema.optional(),
  archived: executionReportArchiveFilterSchema.default("exclude"),
  sortBy: z.enum(["generatedAt", "updatedAt", "findingsCount", "highestSeverity", "executionKind", "status", "title"]).optional().default("generatedAt"),
  sortDirection: sortDirectionSchema.default("desc")
});
export type ExecutionReportsListQuery = z.infer<typeof executionReportsListQuerySchema>;

export const listExecutionReportsResponseSchema = createPaginatedResponseSchema("reports", executionReportSummarySchema);
export type ListExecutionReportsResponse = z.infer<typeof listExecutionReportsResponseSchema>;

export function uniqueExecutionReportValues(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function normalizeExecutionReportStatus(status: string): ExecutionReportStatus {
  switch (status) {
    case "complete":
      return "completed";
    case "aborted":
      return "aborted";
    case "pending":
    case "running":
    case "completed":
    case "failed":
      return status;
    default:
      return "failed";
  }
}

export function severityRank(value: SecurityVulnerability["severity"] | null) {
  switch (value) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    case "info":
      return 0;
    default:
      return -1;
  }
}

export function summarizeHighestSeverity(findings: Array<{ severity: SecurityVulnerability["severity"] }>) {
  const ordered = findings
    .map((finding) => finding.severity)
    .sort((left, right) => severityRank(right) - severityRank(left));
  return ordered[0] ?? null;
}

export function executionReportFindingFromWorkflowFinding(
  finding: z.infer<typeof workflowReportedFindingSchema>,
  options?: {
    executionId?: string;
    executionKind?: ExecutionReportFinding["executionKind"];
    source?: ExecutionReportFindingSource;
    type?: string;
    summary?: string;
    recommendation?: string | null;
    confidence?: number | null;
    targetLabel?: string;
    sourceToolIds?: string[];
    sourceToolRunIds?: string[];
  }
): ExecutionReportFinding {
  return executionReportFindingSchema.parse({
    id: finding.id,
    executionId: options?.executionId ?? finding.workflowRunId,
    executionKind: options?.executionKind ?? "workflow",
    source: options?.source ?? "workflow-finding",
    severity: finding.severity,
    title: finding.title,
    type: options?.type ?? finding.type,
    summary: options?.summary ?? finding.impact,
    recommendation: options?.recommendation ?? finding.recommendation,
    confidence: options?.confidence ?? finding.confidence,
    targetLabel: options?.targetLabel ?? finding.target.url ?? [
      finding.target.host,
      finding.target.port ? `:${finding.target.port}` : "",
      finding.target.path ?? ""
    ].join(""),
    evidence: finding.evidence,
    sourceToolIds: uniqueExecutionReportValues(options?.sourceToolIds ?? finding.evidence.map((item) => item.sourceTool)),
    sourceToolRunIds: uniqueExecutionReportValues(options?.sourceToolRunIds ?? []),
    createdAt: finding.createdAt
  });
}
