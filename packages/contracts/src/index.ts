import { z } from "zod";

export const apiRoutes = {
  health: "/api/health",
  demo: "/api/demo",
  brief: "/api/brief",
  applications: "/api/applications",
  runtimes: "/api/runtimes",
  workflows: "/api/workflows",
  scanCreate: "/api/scan",
  scanList: "/api/scans",
  scanGet: "/api/scan/:id",
  scanFindings: "/api/scan/:id/findings",
  scanGraph: "/api/scan/:id/graph",
  scanChains: "/api/scan/:id/chains",
  scanReport: "/api/scan/:id/report",
  scanAbort: "/api/scan/:id/abort",
  scanAudit: "/api/scan/:id/audit",
  scanToolRuns: "/api/scan/:id/tool-runs",
  scanEvidence: "/api/scan/:id/evidence",
  scanSeed: "/api/scan/seed"
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

export const listApplicationsResponseSchema = z.object({
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

export const listRuntimesResponseSchema = z.object({
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

export const workflowTriggerSchema = z.enum(["manual", "schedule", "event"]);
export type WorkflowTrigger = z.infer<typeof workflowTriggerSchema>;

export const workflowStatusSchema = z.enum(["draft", "active", "paused"]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

export const workflowTargetModeSchema = z.enum(["application", "runtime", "manual"]);
export type WorkflowTargetMode = z.infer<typeof workflowTargetModeSchema>;

export const workflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  trigger: workflowTriggerSchema,
  status: workflowStatusSchema,
  maxDepth: z.number().int().min(1).max(8),
  targetMode: workflowTargetModeSchema,
  applicationId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Workflow = z.infer<typeof workflowSchema>;

export const listWorkflowsResponseSchema = z.object({
  workflows: z.array(workflowSchema)
});
export type ListWorkflowsResponse = z.infer<typeof listWorkflowsResponseSchema>;

const workflowBodyBaseSchema = z.object({
  name: z.string().trim().min(1),
  trigger: workflowTriggerSchema,
  status: workflowStatusSchema,
  maxDepth: z.number().int().min(1).max(8),
  targetMode: workflowTargetModeSchema,
  applicationId: z.union([z.string().uuid(), z.literal(""), z.null()]).transform((value) => value || null)
});

export const createWorkflowBodySchema = workflowBodyBaseSchema;
export type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;

export const updateWorkflowBodySchema = workflowBodyBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});
export type UpdateWorkflowBody = z.infer<typeof updateWorkflowBodySchema>;

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

export const nodeStatusSchema = z.enum(["pending", "in-progress", "complete", "skipped"]);
export type NodeStatus = z.infer<typeof nodeStatusSchema>;

export const dfsNodeSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  target: z.string(),
  layer: osiLayerSchema,
  service: z.string().optional(),
  port: z.number().int().optional(),
  riskScore: z.number().min(0).max(1),
  status: nodeStatusSchema,
  parentId: z.string().nullable(),
  depth: z.number().int().min(0),
  createdAt: z.string().datetime()
});
export type DfsNode = z.infer<typeof dfsNodeSchema>;

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
  nodeId: z.string(),
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
// GRACE — Graph-Reasoning Agents + Cyber Range Evaluation
// ---------------------------------------------------------------------------

export const techniqueNodeSchema = z.object({
  id: z.string(),
  mitreId: z.string(),
  name: z.string(),
  tactic: z.string()
});
export type TechniqueNode = z.infer<typeof techniqueNodeSchema>;

export const chainLinkSchema = z.object({
  fromFindingId: z.string(),
  toFindingId: z.string(),
  probability: z.number().min(0).max(1),
  order: z.number().int().min(0)
});
export type ChainLink = z.infer<typeof chainLinkSchema>;

export const vulnerabilityChainSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  title: z.string(),
  compositeRisk: z.number().min(0).max(1),
  technique: z.string(),
  findingIds: z.array(z.string()),
  links: z.array(chainLinkSchema),
  startTarget: z.string(),
  endTarget: z.string(),
  chainLength: z.number().int().min(1),
  confidence: z.number().min(0).max(1),
  narrative: z.string().optional(),
  createdAt: z.string().datetime()
});
export type VulnerabilityChain = z.infer<typeof vulnerabilityChainSchema>;

export const graceAgentContextSchema = z.object({
  detectedChains: z.array(vulnerabilityChainSchema),
  prioritizedTargets: z.array(z.string()),
  knownOpenPorts: z.record(z.array(z.number().int())),
  confirmedServices: z.record(z.array(z.string()))
});
export type GraceAgentContext = z.infer<typeof graceAgentContextSchema>;

export const graceChainDetectionSchema = z.object({
  startTarget: z.string(),
  trigger: z.string(),
  endTarget: z.string(),
  impact: z.string(),
  chainConfidence: z.number().min(0).max(1)
});
export type GraceChainDetection = z.infer<typeof graceChainDetectionSchema>;

export const graceReportSchema = z.object({
  scanId: z.string(),
  detectedChains: z.array(vulnerabilityChainSchema),
  chainDetections: z.array(graceChainDetectionSchema),
  prioritizedTargets: z.array(z.string()),
  orphanedHighRiskFindingIds: z.array(z.string()),
  generatedAt: z.string().datetime()
});
export type GraceReport = z.infer<typeof graceReportSchema>;

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
  "content_discovery"
]);
export type ToolAdapter = z.infer<typeof toolAdapterSchema>;

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
  nodeId: z.string(),
  agentId: z.string(),
  adapter: toolAdapterSchema,
  tool: z.string(),
  target: z.string(),
  port: z.number().int().optional(),
  status: toolRunStatusSchema,
  riskTier: toolRiskTierSchema,
  justification: z.string(),
  commandPreview: z.string(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  statusReason: z.string().optional(),
  output: z.string().optional(),
  exitCode: z.number().int().optional()
});
export type ToolRun = z.infer<typeof toolRunSchema>;

export const observationSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  nodeId: z.string(),
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

export const evidenceResponseSchema = z.object({
  toolRuns: z.array(toolRunSchema),
  observations: z.array(observationSchema)
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

const blockDefensiveIteration = (
  request: DefensiveExecutionRequest,
  prioritization: DefensivePrioritization,
  failure: DefensiveFailureState
): DefensiveIterationRecord => {
  const selectedAction = prioritization.selectedAction.action;

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
    residualRisk: {
      level: request.input.findings
        .map((finding) => finding.severity)
        .sort((left, right) => severityOrder[right] - severityOrder[left])[0] ?? "info",
      summary: "The hardening iteration was blocked, so the selected risk remains in place until scope or evidence improves.",
      remainingFindingIds: prioritization.selectedAction.sourceIds,
      needsHumanReview: true
    },
    recommendedNextStep: {
      summary: failure.operatorAction,
      rationale: failure.summary,
      continueLoop: false
    },
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
    residualRisk,
    recommendedNextStep,
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
    residualRisk: defensiveResidualRiskSchema,
    recommendedNextStep: defensiveNextStepSchema,
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
      produces: ["recommendedNextStep", "handoffSummary"]
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

export const scanSchema = z.object({
  id: z.string(),
  scope: scanScopeSchema,
  status: scanStatusSchema,
  currentRound: z.number().int().min(0),
  nodesTotal: z.number().int().min(0),
  nodesComplete: z.number().int().min(0),
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
  targetNodeId: z.string().optional(),
  scopeValid: z.boolean(),
  details: z.record(z.unknown())
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const attackPathSchema = z.object({
  nodeIds: z.array(z.string()),
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
      nodeTarget: z.string(),
      recommendation: z.string()
    })
  ),
  attackPaths: z.array(attackPathSchema),
  attackChains: z.array(vulnerabilityChainSchema).default([]),
  generatedAt: z.string().datetime()
});
export type Report = z.infer<typeof reportSchema>;

export const createScanRequestSchema = z.object({
  scope: scanScopeSchema,
  llm: scanLlmConfigSchema.optional()
});
export type CreateScanRequest = z.infer<typeof createScanRequestSchema>;

export const graphResponseSchema = z.object({
  nodes: z.array(dfsNodeSchema),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string()
    })
  )
});
export type GraphResponse = z.infer<typeof graphResponseSchema>;

export const wsEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("node_updated"), node: dfsNodeSchema }),
  z.object({ type: z.literal("finding_added"), finding: findingSchema }),
  z.object({ type: z.literal("tool_run_started"), toolRun: toolRunSchema }),
  z.object({ type: z.literal("tool_run_completed"), toolRun: toolRunSchema }),
  z.object({ type: z.literal("observation_added"), observation: observationSchema }),
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
  z.object({ type: z.literal("chain_detected"), chain: vulnerabilityChainSchema }),
  z.object({
    type: z.literal("grace_analysis_complete"),
    round: z.number(),
    chainsFound: z.number().int(),
    prioritizedTargets: z.array(z.string())
  })
]);
export type WsEvent = z.infer<typeof wsEventSchema>;
