import { z } from "zod";
import { applicationEnvironmentSchema } from "./resources.js";
import { severityOrder, severitySchema, type Severity } from "./scan-core.js";

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

export const defensiveIssueDispositionSchema = z.enum(["fixed", "mitigated", "unverified", "skipped"]);
export type DefensiveIssueDisposition = z.infer<typeof defensiveIssueDispositionSchema>;

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

export const defensiveClosureSummarySchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  evidenceHighlights: z.array(z.string().min(1)).min(1).max(3),
  nextStep: z.string().min(1),
  continueLoop: z.boolean()
});
export type DefensiveClosureSummary = z.infer<typeof defensiveClosureSummarySchema>;

export const defensiveFinalOutcomeSchema = z.object({
  status: z.enum(["fixed", "mitigated", "blocked"]),
  summary: z.string().min(1),
  changeApplied: z.boolean()
});
export type DefensiveFinalOutcome = z.infer<typeof defensiveFinalOutcomeSchema>;

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

export const defensiveIssueOutcomeSchema = z.object({
  sourceId: z.string().min(1),
  sourceKind: defensivePrioritizationSourceKindSchema,
  title: z.string().min(1),
  severity: severitySchema,
  disposition: defensiveIssueDispositionSchema,
  summary: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).default([]),
  carryForward: z.boolean()
});
export type DefensiveIssueOutcome = z.infer<typeof defensiveIssueOutcomeSchema>;

export const defensiveCarryForwardStateSchema = z.object({
  iterationId: z.string().min(1),
  summary: z.string().min(1),
  target: defensiveTargetIdentitySchema,
  assetContext: defensiveAssetContextSchema,
  resolvedIssues: z.array(defensiveIssueOutcomeSchema).default([]),
  outstandingIssues: z.array(defensiveIssueOutcomeSchema).default([]),
  residualRisk: defensiveResidualRiskSchema,
  recommendedNextStep: defensiveNextStepSchema
});
export type DefensiveCarryForwardState = z.infer<typeof defensiveCarryForwardStateSchema>;

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
    return "Not selected because the evidence is weaker than the selected action.";
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

const buildIssueOutcomes = (
  input: DefensiveIterationInput,
  observations: DefensiveIterationObservation[],
  prioritization: DefensivePrioritization,
  evidence: DefensiveEvidenceArtifact[],
  outcome: "completed" | "blocked",
  failure?: DefensiveFailureState
): DefensiveIssueOutcome[] => {
  const sourceIndex = new Map<string, DefensivePrioritizationSource>(
    [
      ...input.findings.map((finding) => ({ ...finding, kind: "finding" as const })),
      ...observations.map((observation) => ({ ...observation, kind: "observation" as const }))
    ].map((source) => [`${source.kind}:${source.id}`, source])
  );
  const followUpKeys = new Set(prioritization.followUp.map((item) => `${item.sourceKind}:${item.sourceId}`));
  const selectedKeys = new Set(
    prioritization.selectedAction.sourceIds.map((sourceId, index) => {
      const sourceKind = prioritization.selectedAction.sourceKinds[index] ?? prioritization.selectedAction.sourceKinds[0];
      return `${sourceKind}:${sourceId}`;
    })
  );
  const evidenceRefs = evidence
    .map((artifact) => artifact.reference)
    .filter((reference): reference is string => typeof reference === "string" && reference.length > 0);

  return Array.from(sourceIndex.entries())
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, source]) => {
      const sourceKey = `${source.kind}:${source.id}`;

      if (followUpKeys.has(sourceKey)) {
        return defensiveIssueOutcomeSchema.parse({
          sourceId: source.id,
          sourceKind: source.kind,
          title: source.title,
          severity: source.severity,
          disposition: "unverified",
          summary: "Moved to follow-up because the evidence is not strong enough to support a confirmed remediation claim in this iteration.",
          evidenceRefs,
          carryForward: true
        });
      }

      if (selectedKeys.has(sourceKey)) {
        if (outcome === "completed") {
          const disposition = prioritization.selectedAction.action.type === "patch" ? "fixed" : "mitigated";

          return defensiveIssueOutcomeSchema.parse({
            sourceId: source.id,
            sourceKind: source.kind,
            title: source.title,
            severity: source.severity,
            disposition,
            summary: disposition === "fixed"
              ? "The selected bounded change removed the issue and verification evidence supports closing it for this iteration."
              : "The selected bounded change reduced the issue exposure, but some residual risk may remain for a later iteration.",
            evidenceRefs,
            carryForward: disposition !== "fixed"
          });
        }

        const disposition = failure?.reason === "ambiguous_scope"
          && prioritization.selectedAction.confidenceDisposition !== "confirmed_risk"
          ? "unverified"
          : "skipped";

        return defensiveIssueOutcomeSchema.parse({
          sourceId: source.id,
          sourceKind: source.kind,
          title: source.title,
          severity: source.severity,
          disposition,
          summary: disposition === "unverified"
            ? "Autonomous mitigation was blocked because the evidence was not strong enough to confirm the issue safely."
            : "The issue was intentionally skipped for this iteration because the proposed action could not be executed safely within the bounded scope.",
          evidenceRefs,
          carryForward: true
        });
      }

      return defensiveIssueOutcomeSchema.parse({
        sourceId: source.id,
        sourceKind: source.kind,
        title: source.title,
        severity: source.severity,
        disposition: "skipped",
        summary: "The issue was intentionally left for a later iteration because another action ranked higher for immediate risk reduction.",
        evidenceRefs,
        carryForward: true
      });
    });
};

const buildCarryForwardState = (
  iterationId: string,
  input: DefensiveIterationInput,
  issueOutcomes: DefensiveIssueOutcome[],
  residualRisk: DefensiveResidualRisk,
  recommendedNextStep: DefensiveNextStep
): DefensiveCarryForwardState =>
  defensiveCarryForwardStateSchema.parse({
    iterationId,
    summary: `${issueOutcomes.filter((issue) => issue.disposition === "fixed" || issue.disposition === "mitigated").length} issue(s) changed state and ${issueOutcomes.filter((issue) => issue.carryForward).length} item(s) carry forward into the next iteration.`,
    target: input.target,
    assetContext: input.assetContext,
    resolvedIssues: issueOutcomes.filter((issue) => !issue.carryForward),
    outstandingIssues: issueOutcomes.filter((issue) => issue.carryForward),
    residualRisk,
    recommendedNextStep
  });

const buildClosureSummary = (
  selectedAction: DefensiveChosenAction,
  evidence: DefensiveEvidenceArtifact[],
  residualRisk: DefensiveResidualRisk,
  recommendedNextStep: DefensiveNextStep,
  status: "completed" | "blocked"
): DefensiveClosureSummary => {
  const evidenceHighlights = evidence
    .map((artifact) => artifact.summary.trim())
    .filter((summary) => summary.length > 0)
    .slice(0, 3);

  const fallbackEvidence = status === "completed"
    ? "The bounded change and verification checks are recorded for review."
    : "The available review evidence is recorded before any autonomous change.";

  return defensiveClosureSummarySchema.parse({
    headline: status === "completed"
      ? "Defensive iteration complete: one bounded risk reduction landed."
      : "Defensive iteration blocked: no unsupported remediation was applied.",
    summary: status === "completed"
      ? `${selectedAction.summary} Evidence supports the risk reduction claim, and remaining risk is: ${residualRisk.summary}`
      : `${selectedAction.summary} The loop stopped before making a change. Remaining risk is: ${residualRisk.summary}`,
    evidenceHighlights: evidenceHighlights.length > 0 ? evidenceHighlights : [fallbackEvidence],
    nextStep: recommendedNextStep.summary,
    continueLoop: recommendedNextStep.continueLoop
  });
};

const buildFinalOutcome = (
  selectedAction: DefensiveChosenAction,
  verificationSummary: string,
  status: "completed" | "blocked"
): DefensiveFinalOutcome =>
  defensiveFinalOutcomeSchema.parse({
    status: status === "blocked"
      ? "blocked"
      : selectedAction.type === "patch"
        ? "fixed"
        : "mitigated",
    summary: verificationSummary,
    changeApplied: status === "completed"
  });

const blockDefensiveIteration = (
  request: DefensiveExecutionRequest,
  prioritization: DefensivePrioritization,
  failure: DefensiveFailureState
): DefensiveIterationRecord => {
  const selectedAction = prioritization.selectedAction.action;
  const residualRisk = defensiveResidualRiskSchema.parse({
    level: request.input.findings
      .map((finding) => finding.severity)
      .sort((left, right) => severityOrder[right] - severityOrder[left])[0] ?? "info",
    summary: "The hardening iteration was blocked, so the selected risk remains in place until scope or evidence improves.",
    remainingFindingIds: prioritization.selectedAction.sourceIds,
    needsHumanReview: true
  });
  const recommendedNextStep = defensiveNextStepSchema.parse({
    summary: failure.operatorAction,
    rationale: failure.summary,
    continueLoop: false
  });
  const issueOutcomes = buildIssueOutcomes(
    request.input,
    request.observations,
    prioritization,
    request.evidence,
    "blocked",
    failure
  );
  const finalOutcome = buildFinalOutcome(selectedAction, failure.summary, "blocked");
  const carryForward = buildCarryForwardState(
    request.iterationId,
    request.input,
    issueOutcomes,
    residualRisk,
    recommendedNextStep
  );
  const closureSummary = buildClosureSummary(
    selectedAction,
    request.evidence,
    residualRisk,
    recommendedNextStep,
    "blocked"
  );

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
    finalOutcome,
    issueOutcomes,
    residualRisk,
    recommendedNextStep,
    carryForward,
    closureSummary,
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
  const issueOutcomes = buildIssueOutcomes(
    request.input,
    request.observations,
    prioritization,
    request.evidence,
    "completed"
  );
  const finalOutcome = buildFinalOutcome(selectedAction, request.outcomeSummary, "completed");
  const carryForward = buildCarryForwardState(
    request.iterationId,
    request.input,
    issueOutcomes,
    residualRisk,
    recommendedNextStep
  );
  const closureSummary = buildClosureSummary(
    selectedAction,
    request.evidence,
    residualRisk,
    recommendedNextStep,
    "completed"
  );

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
    finalOutcome,
    issueOutcomes,
    residualRisk,
    recommendedNextStep,
    carryForward,
    closureSummary,
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
    finalOutcome: defensiveFinalOutcomeSchema,
    issueOutcomes: z.array(defensiveIssueOutcomeSchema).min(1),
    residualRisk: defensiveResidualRiskSchema,
    recommendedNextStep: defensiveNextStepSchema,
    carryForward: defensiveCarryForwardStateSchema,
    closureSummary: defensiveClosureSummarySchema,
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

    if (value.carryForward.iterationId !== value.iterationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Carry-forward state must reference the current iteration.",
        path: ["carryForward", "iterationId"]
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
      produces: ["recommendedNextStep", "closureSummary", "handoffSummary"]
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
    },
    {
      key: "closureSummary",
      required: true,
      description: "Compact end-of-iteration guidance that states what risk changed, what evidence supports that claim, what remains, and whether the loop can safely continue."
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
