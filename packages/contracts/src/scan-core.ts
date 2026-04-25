import { z } from "zod";

export const osiLayerSchema = z.enum(["L1", "L2", "L3", "L4", "L5", "L6", "L7"]);
export type OsiLayer = z.infer<typeof osiLayerSchema>;

export const osiLayerLabels: Record<OsiLayer, string> = {
  L1: "Physical",
  L2: "Data Link",
  L3: "Network",
  L4: "Transport",
  L5: "Session",
  L6: "Presentation",
  L7: "Application"
};

export const scanScopeSchema = z.object({
  environmentName: z.string().min(1).optional(),
  targets: z.array(z.string().min(1)).min(1).max(100),
  exclusions: z.array(z.string()).default([]),
  trustZones: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    hosts: z.array(z.string().min(1)).default([]),
    description: z.string().min(1).optional()
  })).default([]),
  connectivity: z.array(z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    port: z.number().int().min(1).max(65535).optional(),
    protocol: z.enum(["tcp", "udp", "icmp", "any"]).default("tcp"),
    trustZone: z.string().min(1).optional(),
    evidence: z.string().min(1).optional()
  })).default([]),
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

export const assetNodeSchema = z.object({
  id: z.string().min(1),
  host: z.string().min(1),
  type: z.enum(["host", "service", "subnet"]),
  discoveredAt: z.string().datetime(),
  metadata: z.record(z.unknown()).default({})
});
export type AssetNode = z.infer<typeof assetNodeSchema>;

export const assetEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  edgeType: z.enum(["reaches", "trusts", "hosts", "lateral_movement"]),
  evidence: z.string().min(1),
  metadata: z.record(z.unknown()).default({})
});
export type AssetEdge = z.infer<typeof assetEdgeSchema>;

export const environmentGraphSchema = z.object({
  scanId: z.string(),
  environmentName: z.string().min(1).optional(),
  nodes: z.array(assetNodeSchema),
  edges: z.array(assetEdgeSchema),
  generatedAt: z.string().datetime()
});
export type EnvironmentGraph = z.infer<typeof environmentGraphSchema>;

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

export const securityValidationStatusSchema = z.enum([
  "unverified",
  "suspected",
  "single_source",
  "cross_validated",
  "reproduced",
  "blocked",
  "rejected"
]);
export type SecurityValidationStatus = z.infer<typeof securityValidationStatusSchema>;

export const coverageStatusSchema = z.enum(["covered", "partially_covered", "not_covered"]);
export type CoverageStatus = z.infer<typeof coverageStatusSchema>;

export const securityVulnerabilityEvidenceSchema = z.object({
  sourceTool: z.string().min(1),
  quote: z.string().min(1),
  artifactRef: z.string().min(1).optional(),
  observationRef: z.string().min(1).optional(),
  toolRunRef: z.string().min(1).optional()
});
export type SecurityVulnerabilityEvidence = z.infer<typeof securityVulnerabilityEvidenceSchema>;

export const securityVulnerabilityTargetSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().optional(),
  url: z.string().url().optional(),
  path: z.string().min(1).optional(),
  service: z.string().min(1).optional()
});
export type SecurityVulnerabilityTarget = z.infer<typeof securityVulnerabilityTargetSchema>;

export const securityVulnerabilitySubmissionSchema = z.object({
  primaryLayer: osiLayerSchema,
  relatedLayers: z.array(osiLayerSchema).default([]),
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  impact: z.string().min(1),
  recommendation: z.string().min(1),
  severity: severitySchema,
  confidence: z.number().min(0).max(1),
  validationStatus: securityValidationStatusSchema.default("unverified"),
  target: securityVulnerabilityTargetSchema,
  evidence: z.array(securityVulnerabilityEvidenceSchema).min(1),
  technique: z.string().min(1),
  reproduction: z.object({
    commandPreview: z.string().min(1).optional(),
    steps: z.array(z.string().min(1)).min(1)
  }).optional(),
  cwe: z.string().min(1).optional(),
  mitreId: z.string().min(1).optional(),
  owasp: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).default([])
});
export type SecurityVulnerabilitySubmission = z.infer<typeof securityVulnerabilitySubmissionSchema>;

export const securityVulnerabilitySchema = securityVulnerabilitySubmissionSchema.extend({
  id: z.string(),
  scanId: z.string(),
  agentId: z.string(),
  createdAt: z.string().datetime()
});
export type SecurityVulnerability = z.infer<typeof securityVulnerabilitySchema>;

export const scanLayerCoverageSubmissionSchema = z.object({
  layer: osiLayerSchema,
  coverageStatus: coverageStatusSchema,
  confidenceSummary: z.string().min(1),
  toolRefs: z.array(z.string().min(1)).default([]),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  vulnerabilityIds: z.array(z.string().min(1)).default([]),
  gaps: z.array(z.string().min(1)).default([])
});
export type ScanLayerCoverageSubmission = z.infer<typeof scanLayerCoverageSubmissionSchema>;

export const scanLayerCoverageSchema = scanLayerCoverageSubmissionSchema.extend({
  scanId: z.string(),
  updatedAt: z.string().datetime()
});
export type ScanLayerCoverage = z.infer<typeof scanLayerCoverageSchema>;

export const validationStatusSchema = z.enum([
  "unverified",
  "suspected",
  "single_source",
  "replay_pending",
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
  order: z.number().int().min(0),
  edgeType: z.enum(["finding_chain", "lateral_movement"]).default("finding_chain"),
  fromHost: z.string().min(1).optional(),
  toHost: z.string().min(1).optional()
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
  crossHost: z.boolean().default(false),
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
