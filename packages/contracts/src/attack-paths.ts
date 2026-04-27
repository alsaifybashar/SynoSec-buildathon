import { z } from "zod";
import {
  type WorkflowReportedAttackVector,
  type WorkflowReportedFinding,
  workflowAttackVectorKindSchema,
  workflowFindingValidationStatusSchema,
  workflowReportedAttackVectorSchema,
  workflowReportedFindingSchema
} from "./resources.js";
import { severitySchema } from "./scan-core.js";

const attackPathRouteStatusSchema = z.enum(["confirmed", "qualified", "blocked"]);
export type AttackPathRouteStatus = z.infer<typeof attackPathRouteStatusSchema>;

const attackPathConfidenceBandSchema = z.enum(["low", "medium", "high"]);
export type AttackPathConfidenceBand = z.infer<typeof attackPathConfidenceBandSchema>;

const attackPathLinkKindSchema = workflowAttackVectorKindSchema;
export type AttackPathLinkKind = z.infer<typeof attackPathLinkKindSchema>;

const attackPathEvidenceLevelSchema = z.enum([
  "relationship_only",
  "single_source",
  "cross_validated",
  "reproduced",
  "single_source_findings",
  "confirmed_findings",
  "blocked"
]);
export type AttackPathEvidenceLevel = z.infer<typeof attackPathEvidenceLevelSchema>;

export const attackPathValidationEvidenceRefSchema = z.object({
  findingId: z.string().uuid(),
  sourceTool: z.string().min(1),
  quote: z.string().min(1),
  artifactRef: z.string().min(1).optional(),
  observationRef: z.string().min(1).optional(),
  toolRunRef: z.string().min(1).optional(),
  traceEventId: z.string().uuid().optional(),
  externalUrl: z.string().url().optional()
});
export type AttackPathValidationEvidenceRef = z.infer<typeof attackPathValidationEvidenceRefSchema>;

export const attackPathValidationSchema = z.object({
  evidenceLevel: attackPathEvidenceLevelSchema,
  summary: z.string().min(1),
  observedTransition: z.string().min(1).nullable().default(null),
  evidenceRefs: z.array(attackPathValidationEvidenceRefSchema).default([]),
  blockedReason: z.string().min(1).nullable().default(null)
}).default({
  evidenceLevel: "relationship_only",
  summary: "This attack-vector relationship was derived from reported finding metadata and has not been independently validated.",
  observedTransition: null,
  evidenceRefs: [],
  blockedReason: null
});
export type AttackPathValidation = z.infer<typeof attackPathValidationSchema>;

export const attackPathVenueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  venueType: z.string().min(1),
  targetLabel: z.string().min(1),
  summary: z.string().min(1),
  findingIds: z.array(z.string().uuid()).default([])
});
export type AttackPathVenue = z.infer<typeof attackPathVenueSchema>;

export const attackPathVectorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sourceVenueId: z.string().min(1).nullable().default(null),
  destinationVenueId: z.string().min(1).nullable().default(null),
  summary: z.string().min(1),
  preconditions: z.array(z.string().min(1)).default([]),
  impact: z.string().min(1),
  kind: attackPathLinkKindSchema,
  status: attackPathRouteStatusSchema,
  confidence: attackPathConfidenceBandSchema,
  findingIds: z.array(z.string().uuid()).default([]),
  supportingFindingIds: z.array(z.string().uuid()).default([]),
  suspectedFindingIds: z.array(z.string().uuid()).default([]),
  blockedFindingIds: z.array(z.string().uuid()).default([]),
  validation: attackPathValidationSchema
});
export type AttackPathVector = z.infer<typeof attackPathVectorSchema>;

export const attackPathLinkSchema = z.object({
  id: z.string().min(1),
  sourceFindingId: z.string().uuid(),
  targetFindingId: z.string().uuid(),
  kind: attackPathLinkKindSchema,
  summary: z.string().min(1),
  status: attackPathRouteStatusSchema,
  supportingFindingIds: z.array(z.string().uuid()).default([]),
  suspectedFindingIds: z.array(z.string().uuid()).default([]),
  blockedFindingIds: z.array(z.string().uuid()).default([]),
  validation: attackPathValidationSchema
});
export type AttackPathLink = z.infer<typeof attackPathLinkSchema>;

export const derivedAttackPathSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  reachedAssetOrOutcome: z.string().min(1),
  pathSeverity: severitySchema,
  pathConfidence: attackPathConfidenceBandSchema,
  status: attackPathRouteStatusSchema,
  venueIds: z.array(z.string().min(1)).default([]),
  vectorIds: z.array(z.string().min(1)).default([]),
  findingIds: z.array(z.string().uuid()).default([]),
  supportingFindingIds: z.array(z.string().uuid()).default([]),
  suspectedFindingIds: z.array(z.string().uuid()).default([]),
  blockedFindingIds: z.array(z.string().uuid()).default([]),
  pathLinks: z.array(attackPathLinkSchema).default([])
});
export type DerivedAttackPath = z.infer<typeof derivedAttackPathSchema>;

export const attackPathSummarySchema = z.object({
  venues: z.array(attackPathVenueSchema).default([]),
  vectors: z.array(attackPathVectorSchema).default([]),
  paths: z.array(derivedAttackPathSchema).default([])
});
export type AttackPathSummary = z.infer<typeof attackPathSummarySchema>;

const uniqueNonEmptyStringArraySchema = z.array(z.string().min(1)).min(1).refine((values) => new Set(values).size === values.length, {
  message: "Expected unique string values."
});
const uniqueFindingIdArraySchema = z.array(z.string().uuid()).min(1).refine((values) => new Set(values).size === values.length, {
  message: "Expected unique finding ids."
});

export const attackPathHandoffVenueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  venueType: z.string().min(1),
  targetLabel: z.string().min(1),
  summary: z.string().min(1),
  findingIds: uniqueFindingIdArraySchema
}).strict();
export type AttackPathHandoffVenue = z.infer<typeof attackPathHandoffVenueSchema>;

export const attackPathHandoffVectorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sourceVenueId: z.string().min(1).optional(),
  destinationVenueId: z.string().min(1).optional(),
  preconditions: uniqueNonEmptyStringArraySchema,
  impact: z.string().min(1),
  confidence: z.number().min(0).max(1),
  findingIds: uniqueFindingIdArraySchema
}).strict();
export type AttackPathHandoffVector = z.infer<typeof attackPathHandoffVectorSchema>;

export const attackPathHandoffPathSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  severity: severitySchema,
  venueIds: uniqueNonEmptyStringArraySchema,
  vectorIds: uniqueNonEmptyStringArraySchema,
  findingIds: uniqueFindingIdArraySchema
}).strict();
export type AttackPathHandoffPath = z.infer<typeof attackPathHandoffPathSchema>;

export const attackPathHandoffSchema = z.object({
  attackVenues: z.array(attackPathHandoffVenueSchema).min(1),
  attackVectors: z.array(attackPathHandoffVectorSchema).min(1),
  attackPaths: z.array(attackPathHandoffPathSchema).min(1)
}).strict().superRefine((value, ctx) => {
  const requireUniqueIds = (path: string, ids: string[]) => {
    const seen = new Set<string>();
    ids.forEach((id, index) => {
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate ${path} id ${id}.`,
          path: [path, index, "id"]
        });
      }
      seen.add(id);
    });
  };

  requireUniqueIds("attackVenues", value.attackVenues.map((venue) => venue.id));
  requireUniqueIds("attackVectors", value.attackVectors.map((vector) => vector.id));
  requireUniqueIds("attackPaths", value.attackPaths.map((path) => path.id));
});
export type AttackPathHandoff = z.infer<typeof attackPathHandoffSchema>;

const uuidJsonSchema = { type: "string", format: "uuid" } as const;
const idJsonSchema = { type: "string", minLength: 1 } as const;
const nonEmptyStringArrayJsonSchema = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: idJsonSchema
} as const;
const findingIdArrayJsonSchema = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: uuidJsonSchema
} as const;

export const attackPathHandoffJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["attackVenues", "attackVectors", "attackPaths"],
  properties: {
    attackVenues: {
      type: "array",
      minItems: 1,
      description: "Observed entrypoints or reachable surfaces that matter to the attack map.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "venueType", "targetLabel", "summary", "findingIds"],
        properties: {
          id: idJsonSchema,
          label: idJsonSchema,
          venueType: idJsonSchema,
          targetLabel: idJsonSchema,
          summary: idJsonSchema,
          findingIds: findingIdArrayJsonSchema
        }
      }
    },
    attackVectors: {
      type: "array",
      minItems: 1,
      description: "Potential exploit or abuse routes derived from linked findings.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "preconditions", "impact", "confidence", "findingIds"],
        properties: {
          id: idJsonSchema,
          label: idJsonSchema,
          sourceVenueId: idJsonSchema,
          destinationVenueId: idJsonSchema,
          preconditions: nonEmptyStringArrayJsonSchema,
          impact: idJsonSchema,
          confidence: { type: "number", minimum: 0, maximum: 1 },
          findingIds: findingIdArrayJsonSchema
        }
      }
    },
    attackPaths: {
      type: "array",
      minItems: 1,
      description: "Prioritized end-to-end routes through the observed attack map.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "summary", "severity", "venueIds", "vectorIds", "findingIds"],
        properties: {
          id: idJsonSchema,
          title: idJsonSchema,
          summary: idJsonSchema,
          severity: { type: "string", enum: severitySchema.options },
          venueIds: nonEmptyStringArrayJsonSchema,
          vectorIds: nonEmptyStringArrayJsonSchema,
          findingIds: findingIdArrayJsonSchema
        }
      }
    }
  }
} as const;

export function parseAttackPathHandoff(input: unknown): AttackPathHandoff {
  return attackPathHandoffSchema.parse(input);
}

export function validateAttackPathHandoffReferences(input: {
  handoff: AttackPathHandoff;
  findingIds: Iterable<string>;
  vectorIds?: Iterable<string>;
}) {
  const knownFindingIds = new Set(input.findingIds);
  const venueIds = new Set(input.handoff.attackVenues.map((venue) => venue.id));
  const vectorIds = new Set([
    ...input.handoff.attackVectors.map((vector) => vector.id),
    ...(input.vectorIds ? [...input.vectorIds] : [])
  ]);
  const errors: string[] = [];
  const checkFindingIds = (path: string, findingIds: string[]) => {
    for (const findingId of findingIds) {
      if (!knownFindingIds.has(findingId)) {
        errors.push(`${path} references unknown finding id ${findingId}`);
      }
    }
  };

  input.handoff.attackVenues.forEach((venue, index) => {
    checkFindingIds(`attackVenues[${index}].findingIds`, venue.findingIds);
  });

  input.handoff.attackVectors.forEach((vector, index) => {
    if (vector.sourceVenueId && !venueIds.has(vector.sourceVenueId)) {
      errors.push(`attackVectors[${index}].sourceVenueId references unknown venue id ${vector.sourceVenueId}`);
    }
    if (vector.destinationVenueId && !venueIds.has(vector.destinationVenueId)) {
      errors.push(`attackVectors[${index}].destinationVenueId references unknown venue id ${vector.destinationVenueId}`);
    }
    checkFindingIds(`attackVectors[${index}].findingIds`, vector.findingIds);
  });

  input.handoff.attackPaths.forEach((path, index) => {
    for (const venueId of path.venueIds) {
      if (!venueIds.has(venueId)) {
        errors.push(`attackPaths[${index}].venueIds references unknown venue id ${venueId}`);
      }
    }
    for (const vectorId of path.vectorIds) {
      if (!vectorIds.has(vectorId)) {
        errors.push(`attackPaths[${index}].vectorIds references unknown vector id ${vectorId}`);
      }
    }
    checkFindingIds(`attackPaths[${index}].findingIds`, path.findingIds);
  });

  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "path";
}

function findingSeverityRank(value: z.infer<typeof severitySchema>) {
  switch (value) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    case "info": return 0;
  }
}

function validationTier(status: z.infer<typeof workflowFindingValidationStatusSchema> | undefined) {
  switch (status) {
    case "reproduced":
    case "cross_validated":
      return 4;
    case "single_source":
      return 3;
    case "suspected":
      return 1;
    case "unverified":
      return 0;
    case "blocked":
      return -1;
    case "rejected":
      return -2;
    default:
      return 0;
  }
}

function isConfirmedFinding(finding: WorkflowReportedFinding) {
  return validationTier(finding.validationStatus) >= 3;
}

function isCrossValidatedFinding(finding: WorkflowReportedFinding) {
  return finding.validationStatus === "cross_validated" || finding.validationStatus === "reproduced";
}

function isBlockedFinding(finding: WorkflowReportedFinding) {
  return finding.validationStatus === "blocked" || finding.validationStatus === "rejected";
}

function isSuspectedFinding(finding: WorkflowReportedFinding) {
  return !isConfirmedFinding(finding) && !isBlockedFinding(finding);
}

function highestSeverity(findings: WorkflowReportedFinding[]) {
  return findings
    .slice()
    .sort((left, right) => findingSeverityRank(right.severity) - findingSeverityRank(left.severity))[0]?.severity ?? "info";
}

function confidenceBand(input: {
  findings: WorkflowReportedFinding[];
  strongEdgeCount: number;
  weakEdgeCount: number;
  relatedOnly: boolean;
  status: AttackPathRouteStatus;
}) {
  if (input.status === "blocked") {
    return "low";
  }

  const average = input.findings.reduce((sum, finding) => sum + finding.confidence, 0) / Math.max(input.findings.length, 1);
  if (!input.relatedOnly && input.strongEdgeCount > 0 && average >= 0.8 && input.findings.every(isConfirmedFinding)) {
    return "high";
  }
  if (input.strongEdgeCount > 0 || average >= 0.65 || input.weakEdgeCount > 0) {
    return "medium";
  }
  return "low";
}

function isEndToEndValidatedEvidenceLevel(evidenceLevel: AttackPathEvidenceLevel) {
  return evidenceLevel === "cross_validated" || evidenceLevel === "reproduced";
}

function routeStatus(input: {
  findings: WorkflowReportedFinding[];
  criticalLinks: Array<{
    kind: AttackPathLinkKind;
    status: AttackPathRouteStatus;
    evidenceLevel?: AttackPathEvidenceLevel;
  }>;
}) {
  if (input.findings.some(isBlockedFinding) || input.criticalLinks.some((link) => link.status === "blocked")) {
    return "blocked" as const;
  }
  if (
    input.findings.length > 0
    && input.findings.every(isConfirmedFinding)
    && input.criticalLinks.length > 0
    && input.criticalLinks.every((link) => (
      link.kind !== "related"
      && link.status === "confirmed"
      && isEndToEndValidatedEvidenceLevel(link.evidenceLevel ?? "relationship_only")
    ))
  ) {
    return "confirmed" as const;
  }
  return "qualified" as const;
}

function evidenceLevelForFindings(findings: WorkflowReportedFinding[], relatedOnly: boolean): AttackPathEvidenceLevel {
  if (findings.some(isBlockedFinding)) {
    return "blocked";
  }
  if (relatedOnly) {
    return "relationship_only";
  }
  if (!relatedOnly && findings.length > 0 && findings.every(isCrossValidatedFinding)) {
    return "confirmed_findings";
  }
  if (findings.length > 0 && findings.every(isConfirmedFinding)) {
    return "single_source_findings";
  }
  return "relationship_only";
}

function collectValidationEvidenceRefs(findings: WorkflowReportedFinding[]): AttackPathValidationEvidenceRef[] {
  return findings.flatMap((finding) =>
    finding.evidence.map((item) => attackPathValidationEvidenceRefSchema.parse({
      findingId: finding.id,
      sourceTool: item.sourceTool,
      quote: item.quote,
      ...(item.artifactRef ? { artifactRef: item.artifactRef } : {}),
      ...(item.observationRef ? { observationRef: item.observationRef } : {}),
      ...(item.toolRunRef ? { toolRunRef: item.toolRunRef } : {}),
      ...(item.traceEventId ? { traceEventId: item.traceEventId } : {}),
      ...(item.externalUrl ? { externalUrl: item.externalUrl } : {})
    }))
  );
}

function blockedReasonForFindings(findings: WorkflowReportedFinding[]) {
  const blocked = findings.find(isBlockedFinding);
  if (!blocked) {
    return null;
  }
  return blocked.confidenceReason ?? blocked.explanationSummary ?? `${blocked.title} blocked attack-vector validation.`;
}

function validationSummaryFor(input: {
  evidenceLevel: AttackPathEvidenceLevel;
  sourceTitle: string;
  targetTitle: string;
  relatedOnly: boolean;
}) {
  switch (input.evidenceLevel) {
    case "blocked":
      return `Attack-vector validation from ${input.sourceTitle} to ${input.targetTitle} is blocked.`;
    case "confirmed_findings":
      return `Both sides of the attack vector are cross-validated, supporting progression from ${input.sourceTitle} to ${input.targetTitle}.`;
    case "single_source_findings":
      return `The linked findings are evidence-backed, but the attack vector itself still lacks end-to-end transition validation.`;
    case "relationship_only":
    default:
      return input.relatedOnly
        ? `The attack vector is a correlation candidate between ${input.sourceTitle} and ${input.targetTitle}.`
        : `The attack vector depends on finding relationship metadata and needs stronger validation.`;
  }
}

function buildAttackPathValidation(input: {
  findings: WorkflowReportedFinding[];
  kind: AttackPathLinkKind;
  summary: string;
}): AttackPathValidation {
  const evidenceLevel = evidenceLevelForFindings(input.findings, input.kind === "related");
  return attackPathValidationSchema.parse({
    evidenceLevel,
    summary: validationSummaryFor({
      evidenceLevel,
      sourceTitle: input.findings[0]?.title ?? "source finding",
      targetTitle: input.findings[input.findings.length - 1]?.title ?? "target finding",
      relatedOnly: input.kind === "related"
    }),
    observedTransition: input.kind === "related" ? null : input.summary,
    evidenceRefs: collectValidationEvidenceRefs(input.findings),
    blockedReason: blockedReasonForFindings(input.findings)
  });
}

function classifyVenueType(finding: WorkflowReportedFinding) {
  if (finding.target.url?.startsWith("http")) {
    return "web_surface";
  }
  if (finding.target.port) {
    return "network_service";
  }
  return "host_asset";
}

function createFindingTargetLabel(finding: WorkflowReportedFinding) {
  return finding.target.url ?? [
    finding.target.host,
    finding.target.port ? `:${finding.target.port}` : "",
    finding.target.path ?? ""
  ].join("");
}

function candidateVenueKey(finding: WorkflowReportedFinding) {
  return `${finding.chain?.id ?? finding.chain?.title ?? "surface"}::${createFindingTargetLabel(finding)}`;
}

function parseAttackPathHandoffEnrichment(handoff: unknown) {
  if (!isRecord(handoff)) {
    return { venues: [], vectors: [], paths: [] } as {
      venues: AttackPathHandoffVenue[];
      vectors: AttackPathHandoffVector[];
      paths: AttackPathHandoffPath[];
    };
  }

  const parsed = parseAttackPathHandoff(handoff);
  return {
    venues: parsed.attackVenues,
    vectors: parsed.attackVectors,
    paths: parsed.attackPaths
  };
}

type DerivedLink = {
  id: string;
  kind: AttackPathLinkKind;
  sourceFindingId: string;
  targetFindingId: string;
  summary: string;
  sourceFinding: WorkflowReportedFinding;
  targetFinding: WorkflowReportedFinding;
  explicitVector?: WorkflowReportedAttackVector;
};

function compareFindings(left: WorkflowReportedFinding, right: WorkflowReportedFinding) {
  const severityDelta = findingSeverityRank(right.severity) - findingSeverityRank(left.severity);
  if (severityDelta !== 0) {
    return severityDelta;
  }

  const validationDelta = validationTier(right.validationStatus) - validationTier(left.validationStatus);
  if (validationDelta !== 0) {
    return validationDelta;
  }

  const confidenceDelta = right.confidence - left.confidence;
  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  const createdDelta = left.createdAt.localeCompare(right.createdAt);
  if (createdDelta !== 0) {
    return createdDelta;
  }

  return left.id.localeCompare(right.id);
}

function explicitVectorValidation(vector: WorkflowReportedAttackVector): AttackPathValidation {
  const evidenceLevel: AttackPathEvidenceLevel = (() => {
    switch (vector.validationStatus) {
      case "reproduced":
        return "reproduced";
      case "cross_validated":
        return "cross_validated";
      case "single_source":
        return "single_source";
      case "blocked":
      case "rejected":
        return "blocked";
      default:
        return "relationship_only";
    }
  })();

  return attackPathValidationSchema.parse({
    evidenceLevel,
    summary: vector.validationStatus === "single_source" || vector.validationStatus === "cross_validated" || vector.validationStatus === "reproduced"
      ? "The attack vector transition is backed by explicit transition evidence."
      : vector.kind === "related"
        ? "The attack vector is an explicit relationship without observed transition evidence."
        : "The attack vector has not been independently validated.",
    observedTransition: vector.kind === "related" ? null : vector.summary,
    evidenceRefs: vector.transitionEvidence.map((evidence: WorkflowReportedAttackVector["transitionEvidence"][number]) => attackPathValidationEvidenceRefSchema.parse({
      findingId: vector.sourceFindingId,
      sourceTool: evidence.sourceTool,
      quote: evidence.quote,
      ...(evidence.artifactRef ? { artifactRef: evidence.artifactRef } : {}),
      ...(evidence.observationRef ? { observationRef: evidence.observationRef } : {}),
      ...(evidence.toolRunRef ? { toolRunRef: evidence.toolRunRef } : {}),
      ...(evidence.traceEventId ? { traceEventId: evidence.traceEventId } : {}),
      ...(evidence.externalUrl ? { externalUrl: evidence.externalUrl } : {})
    })),
    blockedReason: vector.validationStatus === "blocked" || vector.validationStatus === "rejected"
      ? "Attack-vector transition validation was blocked or rejected."
      : null
  });
}

function buildAttackVectorLinks(findings: WorkflowReportedFinding[], attackVectors: WorkflowReportedAttackVector[] = []) {
  const lookup = new Map(findings.map((finding) => [finding.id, finding]));
  return attackVectors.flatMap((vector): DerivedLink[] => {
    const sourceFinding = lookup.get(vector.sourceFindingId);
    const targetFinding = lookup.get(vector.destinationFindingId);
    if (!sourceFinding || !targetFinding || vector.validationStatus === "rejected") {
      return [];
    }
    return [{
      id: vector.id,
      kind: vector.kind,
      sourceFindingId: vector.sourceFindingId,
      targetFindingId: vector.destinationFindingId,
      summary: vector.summary,
      sourceFinding,
      targetFinding,
      explicitVector: vector
    }];
  }).sort((left, right) => left.id.localeCompare(right.id));
}

function buildConnectedComponents(findings: WorkflowReportedFinding[], links: DerivedLink[]) {
  const lookup = new Map(findings.map((finding) => [finding.id, finding]));
  const adjacency = new Map<string, Set<string>>();
  for (const finding of findings) {
    adjacency.set(finding.id, new Set<string>());
  }

  for (const link of links) {
    adjacency.get(link.sourceFindingId)?.add(link.targetFindingId);
    adjacency.get(link.targetFindingId)?.add(link.sourceFindingId);
  }

  const byChain = new Map<string, string[]>();
  for (const finding of findings) {
    if (!finding.chain?.title) {
      continue;
    }
    const key = finding.chain.id ?? `chain:${slugify(finding.chain.title)}`;
    const bucket = byChain.get(key) ?? [];
    bucket.push(finding.id);
    byChain.set(key, bucket);
  }

  for (const findingIds of byChain.values()) {
    if (findingIds.length < 2) {
      continue;
    }
    for (const left of findingIds) {
      for (const right of findingIds) {
        if (left !== right) {
          adjacency.get(left)?.add(right);
        }
      }
    }
  }

  const visited = new Set<string>();
  const components: WorkflowReportedFinding[][] = [];

  for (const finding of findings) {
    if (visited.has(finding.id)) {
      continue;
    }

    const queue = [finding.id];
    const component: WorkflowReportedFinding[] = [];
    visited.add(finding.id);
    while (queue.length > 0) {
      const next = queue.shift()!;
      const member = lookup.get(next);
      if (member) {
        component.push(member);
      }
      for (const neighbor of adjacency.get(next) ?? []) {
        if (visited.has(neighbor)) {
          continue;
        }
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    components.push(component.sort(compareFindings));
  }

  return components.filter((component) => component.length > 1);
}

function bestDirectedRoute(findings: WorkflowReportedFinding[], links: DerivedLink[]) {
  const memberIds = new Set(findings.map((finding) => finding.id));
  const directedLinks = links.filter((link) => memberIds.has(link.sourceFindingId) && memberIds.has(link.targetFindingId) && link.kind !== "related");
  if (directedLinks.length === 0) {
    return { findingIds: [] as string[], links: [] as DerivedLink[] };
  }

  const findingById = new Map(findings.map((finding) => [finding.id, finding]));
  const adjacency = new Map<string, DerivedLink[]>();
  const indegree = new Map<string, number>();
  for (const finding of findings) {
    adjacency.set(finding.id, []);
    indegree.set(finding.id, 0);
  }
  for (const link of directedLinks) {
    adjacency.get(link.sourceFindingId)?.push(link);
    indegree.set(link.targetFindingId, (indegree.get(link.targetFindingId) ?? 0) + 1);
  }
  for (const edges of adjacency.values()) {
    edges.sort((left, right) => {
      const kindDelta = (left.kind === "enables" ? 1 : 0) === (right.kind === "enables" ? 1 : 0)
        ? 0
        : (left.kind === "enables" ? -1 : 1);
      if (kindDelta !== 0) {
        return kindDelta;
      }
      return compareFindings(findingById.get(left.targetFindingId)!, findingById.get(right.targetFindingId)!);
    });
  }

  const starts = findings
    .slice()
    .sort(compareFindings)
    .sort((left, right) => (indegree.get(left.id) ?? 0) - (indegree.get(right.id) ?? 0));

  const scoreRoute = (routeLinks: DerivedLink[]) => {
    const findingsInRoute = routeLinks.flatMap((link) => [link.sourceFinding, link.targetFinding]);
    const uniqueFindingIds = [...new Set(findingsInRoute.map((finding) => finding.id))];
    const uniqueFindings = uniqueFindingIds.map((id) => findingById.get(id)!);
    const strongEdgeCount = routeLinks.filter((link) => link.kind === "enables").length;
    const weakEdgeCount = routeLinks.filter((link) => link.kind === "derived_from").length;
    return [
      strongEdgeCount,
      uniqueFindings.some((finding) => isConfirmedFinding(finding)) ? 1 : 0,
      highestSeverity(uniqueFindings),
      weakEdgeCount,
      uniqueFindings.length
    ] as const;
  };

  const severityValue = (value: z.infer<typeof severitySchema>) => findingSeverityRank(value);
  let bestLinks: DerivedLink[] = [];

  const compareScores = (left: ReturnType<typeof scoreRoute>, right: ReturnType<typeof scoreRoute>) => {
    if (left[0] !== right[0]) return left[0] - right[0];
    if (left[1] !== right[1]) return left[1] - right[1];
    if (severityValue(left[2]) !== severityValue(right[2])) return severityValue(left[2]) - severityValue(right[2]);
    if (left[3] !== right[3]) return left[3] - right[3];
    if (left[4] !== right[4]) return left[4] - right[4];
    return 0;
  };

  const visit = (findingId: string, route: DerivedLink[], seen: Set<string>) => {
    const outgoing = adjacency.get(findingId) ?? [];
    let advanced = false;
    for (const link of outgoing) {
      if (seen.has(link.targetFindingId)) {
        continue;
      }
      advanced = true;
      seen.add(link.targetFindingId);
      visit(link.targetFindingId, [...route, link], seen);
      seen.delete(link.targetFindingId);
    }

    if (!advanced && route.length > 0) {
      const routeScore = scoreRoute(route);
      const bestScore = bestLinks.length > 0 ? scoreRoute(bestLinks) : null;
      if (!bestScore || compareScores(routeScore, bestScore) > 0) {
        bestLinks = route;
      }
    }
  };

  for (const start of starts) {
    visit(start.id, [], new Set([start.id]));
  }

  const orderedFindingIds: string[] = [];
  if (bestLinks.length > 0) {
    orderedFindingIds.push(bestLinks[0]!.sourceFindingId);
    for (const link of bestLinks) {
      orderedFindingIds.push(link.targetFindingId);
    }
  }

  return { findingIds: orderedFindingIds, links: bestLinks };
}

function routeFromCluster(findings: WorkflowReportedFinding[], links: DerivedLink[]) {
  const findingIds = findings
    .slice()
    .sort((left, right) => {
      const roleOrder = (value: string | undefined) => {
        switch (normalizeText(value).toLowerCase()) {
          case "entry": return 0;
          case "pivot": return 1;
          case "impact": return 2;
          default: return 3;
        }
      };
      const roleDelta = roleOrder(left.relationshipExplanations?.chainRole) - roleOrder(right.relationshipExplanations?.chainRole);
      if (roleDelta !== 0) {
        return roleDelta;
      }
      return compareFindings(left, right);
    })
    .map((finding) => finding.id);

  const routeLinks: DerivedLink[] = [];
  for (let index = 0; index < findingIds.length - 1; index += 1) {
    const sourceId = findingIds[index]!;
    const targetId = findingIds[index + 1]!;
    const explicit = links.find((link) => (
      (link.sourceFindingId === sourceId && link.targetFindingId === targetId)
      || (link.kind === "related" && link.sourceFindingId === targetId && link.targetFindingId === sourceId)
    ));
    if (explicit) {
      routeLinks.push(explicit);
      continue;
    }
    const sourceFinding = findings.find((finding) => finding.id === sourceId)!;
    const targetFinding = findings.find((finding) => finding.id === targetId)!;
    routeLinks.push({
      id: `related:${sourceId}:${targetId}`,
      kind: "related",
      sourceFindingId: sourceId,
      targetFindingId: targetId,
      summary: sourceFinding.chain?.summary ?? `${sourceFinding.title} and ${targetFinding.title} belong to the same correlated attack path candidate.`,
      sourceFinding,
      targetFinding
    });
  }

  return { findingIds, links: routeLinks };
}

function mergeVenueEnrichment(venue: AttackPathVenue, enrichment: AttackPathHandoffVenue[]) {
  const match = enrichment.find((candidate) => (
    (candidate.id && candidate.id === venue.id)
    || candidate.findingIds.some((findingId) => venue.findingIds.includes(findingId))
  ));
  if (!match) {
    return venue;
  }

  return {
    ...venue,
    label: match.label ?? venue.label,
    venueType: match.venueType ?? venue.venueType,
    targetLabel: match.targetLabel ?? venue.targetLabel,
    summary: match.summary ?? venue.summary
  };
}

function mergeVectorEnrichment(vector: AttackPathVector, enrichment: AttackPathHandoffVector[]) {
  const match = enrichment.find((candidate) => (
    (candidate.id && candidate.id === vector.id)
    || candidate.findingIds.some((findingId) => vector.findingIds.includes(findingId))
  ));
  if (!match) {
    return vector;
  }

  return {
    ...vector,
    label: match.label ?? vector.label,
    sourceVenueId: match.sourceVenueId ?? vector.sourceVenueId,
    destinationVenueId: match.destinationVenueId ?? vector.destinationVenueId,
    preconditions: match.preconditions.length > 0 ? match.preconditions : vector.preconditions,
    impact: match.impact ?? vector.impact
  };
}

function mergePathEnrichment(path: DerivedAttackPath, enrichment: AttackPathHandoffPath[]) {
  const match = enrichment.find((candidate) => (
    (candidate.id && candidate.id === path.id)
    || candidate.findingIds.some((findingId) => path.findingIds.includes(findingId))
  ));
  if (!match) {
    return {
      ...path,
      title: qualifyUnconfirmedOutcomeClaim(path.title, path.status),
      summary: qualifyUnconfirmedOutcomeClaim(path.summary, path.status)
    };
  }

  return {
    ...path,
    title: qualifyUnconfirmedOutcomeClaim(match.title ?? path.title, path.status),
    summary: qualifyUnconfirmedOutcomeClaim(match.summary ?? path.summary, path.status),
    pathSeverity: match.severity ?? path.pathSeverity
  };
}

const inflatedOutcomePattern = /\b(takeover|compromise|credential theft|credential compromise|privilege escalation)\b/i;

function softenOutcomeClaims(value: string) {
  return value
    .replace(/\b(?:complete\s+)?takeover\b/gi, "possible takeover")
    .replace(/\bcredential theft\b/gi, "credential-theft opportunity")
    .replace(/\bcredential compromise\b/gi, "credential-compromise opportunity")
    .replace(/\bprivilege escalation\b/gi, "privilege-escalation opportunity");
}

function qualifyUnconfirmedOutcomeClaim(value: string, status: AttackPathRouteStatus) {
  if (status === "confirmed" || !inflatedOutcomePattern.test(value)) {
    return value;
  }

  const softened = softenOutcomeClaims(value);
  return /^(potential|possible|plausible|unproven|qualified)\b/i.test(softened)
    ? softened
    : `Potential ${softened}`;
}

export function buildAttackPathSummary(input: {
  findings: WorkflowReportedFinding[];
  attackVectors?: WorkflowReportedAttackVector[];
  handoff?: unknown;
}): AttackPathSummary {
  const findings = input.findings
    .filter((finding) => finding.validationStatus !== "rejected")
    .slice()
    .sort(compareFindings);
  const attackVectors = (input.attackVectors ?? [])
    .map((vector) => workflowReportedAttackVectorSchema.parse(vector))
    .filter((vector) => vector.validationStatus !== "rejected");
  const links = buildAttackVectorLinks(findings, attackVectors);
  const components = buildConnectedComponents(findings, links);
  if (components.length === 0) {
    return attackPathSummarySchema.parse({ venues: [], vectors: [], paths: [] });
  }

  const handoff = parseAttackPathHandoffEnrichment(input.handoff);
  const venueMap = new Map<string, AttackPathVenue>();
  const vectors: AttackPathVector[] = [];
  const paths: DerivedAttackPath[] = [];
  const vectorIdsInUse = new Set<string>();

  const getVenueForFinding = (finding: WorkflowReportedFinding) => {
    const key = candidateVenueKey(finding);
    const existing = venueMap.get(key);
    if (existing) {
      if (!existing.findingIds.includes(finding.id)) {
        existing.findingIds.push(finding.id);
      }
      return existing.id;
    }

    const venue = mergeVenueEnrichment({
      id: `venue:${slugify(key)}`,
      label: finding.chain?.title ?? createFindingTargetLabel(finding),
      venueType: classifyVenueType(finding),
      targetLabel: createFindingTargetLabel(finding),
      summary: finding.chain?.summary ?? finding.explanationSummary ?? finding.impact,
      findingIds: [finding.id]
    }, handoff.venues);
    venueMap.set(key, venue);
    return venue.id;
  };

  for (const component of components) {
    const memberIds = new Set(component.map((finding) => finding.id));
    const componentLinks = links.filter((link) => memberIds.has(link.sourceFindingId) && memberIds.has(link.targetFindingId));
    const directedRoute = bestDirectedRoute(component, componentLinks);
    const route = directedRoute.findingIds.length > 1
      ? directedRoute
      : routeFromCluster(component, componentLinks);

    if (route.findingIds.length < 2) {
      continue;
    }

    const routeFindings = route.findingIds.map((findingId) => component.find((finding) => finding.id === findingId)!).filter(Boolean);
    const pathLinks = route.links.map((link) => {
      const linkFindings = [link.sourceFinding, link.targetFinding];
      const validation = link.explicitVector
        ? explicitVectorValidation(link.explicitVector)
        : buildAttackPathValidation({
          findings: linkFindings,
          kind: link.kind,
          summary: link.summary
        });
      const status = routeStatus({
        findings: linkFindings,
        criticalLinks: [{
          kind: link.kind,
          status: linkFindings.some(isBlockedFinding)
            ? "blocked"
            : link.kind !== "related" && isEndToEndValidatedEvidenceLevel(validation.evidenceLevel)
              ? "confirmed"
              : "qualified",
          evidenceLevel: validation.evidenceLevel
        }]
      });
      return attackPathLinkSchema.parse({
        id: link.id,
        sourceFindingId: link.sourceFindingId,
        targetFindingId: link.targetFindingId,
        kind: link.kind,
        summary: link.summary,
        status,
        supportingFindingIds: linkFindings.filter(isConfirmedFinding).map((finding) => finding.id),
        suspectedFindingIds: linkFindings.filter(isSuspectedFinding).map((finding) => finding.id),
        blockedFindingIds: linkFindings.filter(isBlockedFinding).map((finding) => finding.id),
        validation
      });
    });

    const routeStatusValue = routeStatus({
      findings: routeFindings,
      criticalLinks: pathLinks.map((link) => ({
        kind: link.kind,
        status: link.status,
        evidenceLevel: link.validation.evidenceLevel
      }))
    });

    const routeSupporting = component.filter(isConfirmedFinding).map((finding) => finding.id);
    const routeSuspected = component.filter(isSuspectedFinding).map((finding) => finding.id);
    const routeBlocked = component.filter(isBlockedFinding).map((finding) => finding.id);
    const routeVectorIds: string[] = [];
    const venueIds = [...new Set(routeFindings.map((finding) => getVenueForFinding(finding)))];

    for (const pathLink of pathLinks) {
      const sourceVenueId = getVenueForFinding(component.find((finding) => finding.id === pathLink.sourceFindingId)!);
      const destinationVenueId = getVenueForFinding(component.find((finding) => finding.id === pathLink.targetFindingId)!);
      const link = route.links.find((candidate) => candidate.id === pathLink.id);
      const vectorId = link?.explicitVector?.id ?? `vector:${slugify(pathLink.id)}`;
      routeVectorIds.push(vectorId);
      if (vectorIdsInUse.has(vectorId)) {
        continue;
      }
      vectorIdsInUse.add(vectorId);
      const explicitVector = link?.explicitVector;
      vectors.push(mergeVectorEnrichment({
        id: vectorId,
        label: explicitVector?.summary ?? pathLink.summary,
        sourceVenueId,
        destinationVenueId,
        summary: explicitVector?.summary ?? pathLink.summary,
        preconditions: explicitVector?.preconditions ?? [],
        impact: explicitVector?.impact ?? component.find((finding) => finding.id === pathLink.targetFindingId)?.impact ?? pathLink.summary,
        kind: pathLink.kind,
        status: pathLink.status,
        confidence: confidenceBand({
          findings: routeFindings,
          strongEdgeCount: pathLink.kind === "enables" ? 1 : 0,
          weakEdgeCount: pathLink.kind === "derived_from" ? 1 : 0,
          relatedOnly: pathLink.kind === "related",
          status: pathLink.status
        }),
        findingIds: [pathLink.sourceFindingId, pathLink.targetFindingId],
        supportingFindingIds: pathLink.supportingFindingIds,
        suspectedFindingIds: pathLink.suspectedFindingIds,
        blockedFindingIds: pathLink.blockedFindingIds,
        validation: explicitVector ? explicitVectorValidation(explicitVector) : pathLink.validation
      }, handoff.vectors));
    }

    const strongestFinding = component.slice().sort(compareFindings)[0]!;
    const finalFinding = routeFindings[routeFindings.length - 1]!;
    const confidence = confidenceBand({
      findings: routeFindings,
      strongEdgeCount: pathLinks.filter((link) => link.kind === "enables").length,
      weakEdgeCount: pathLinks.filter((link) => link.kind === "derived_from").length,
      relatedOnly: pathLinks.every((link) => link.kind === "related"),
      status: routeStatusValue
    });
    const title = strongestFinding.chain?.title
      ?? `${routeFindings[0]!.title} to ${finalFinding.title}`;
    const summary = strongestFinding.chain?.summary
      ?? finalFinding.explanationSummary
      ?? `${routeFindings[0]!.title} combines with ${finalFinding.title} to reach ${createFindingTargetLabel(finalFinding)}.`;

    paths.push(mergePathEnrichment({
      id: strongestFinding.chain?.id ?? `path:${slugify(component.map((finding) => finding.id).join("-"))}`,
      title,
      summary,
      reachedAssetOrOutcome: createFindingTargetLabel(finalFinding),
      pathSeverity: highestSeverity(component),
      pathConfidence: confidence,
      status: routeStatusValue,
      venueIds,
      vectorIds: routeVectorIds,
      findingIds: route.findingIds,
      supportingFindingIds: routeSupporting,
      suspectedFindingIds: routeSuspected,
      blockedFindingIds: routeBlocked,
      pathLinks
    }, handoff.paths));
  }

  const rankedPaths = paths
    .slice()
    .sort((left: DerivedAttackPath, right: DerivedAttackPath) => {
      const explicitDelta = right.pathLinks.filter((link: z.infer<typeof attackPathLinkSchema>) => link.kind === "enables").length
        - left.pathLinks.filter((link: z.infer<typeof attackPathLinkSchema>) => link.kind === "enables").length;
      if (explicitDelta !== 0) {
        return explicitDelta;
      }

      const confirmedDelta = right.supportingFindingIds.length - right.suspectedFindingIds.length - (left.supportingFindingIds.length - left.suspectedFindingIds.length);
      if (confirmedDelta !== 0) {
        return confirmedDelta;
      }

      const severityDelta = findingSeverityRank(right.pathSeverity) - findingSeverityRank(left.pathSeverity);
      if (severityDelta !== 0) {
        return severityDelta;
      }

      const confidenceRanks: Record<AttackPathConfidenceBand, number> = { high: 2, medium: 1, low: 0 };
      const confidenceDelta = confidenceRanks[right.pathConfidence] - confidenceRanks[left.pathConfidence];
      if (confidenceDelta !== 0) {
        return confidenceDelta;
      }

      return left.id.localeCompare(right.id);
    });

  const venueList = [...venueMap.values()]
    .map((venue) => attackPathVenueSchema.parse({
      ...venue,
      findingIds: [...new Set(venue.findingIds)].sort()
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return attackPathSummarySchema.parse({
    venues: venueList,
    vectors: vectors.sort((left, right) => left.id.localeCompare(right.id)),
    paths: rankedPaths
  });
}

export function summarizeAttackPaths(summary: AttackPathSummary) {
  if (summary.paths.length === 0) {
    return "No linked attack paths were derived from the persisted findings.";
  }

  const topPath = summary.paths[0]!;
  return `${summary.paths.length} attack path${summary.paths.length === 1 ? "" : "s"} derived. Top path reaches ${topPath.reachedAssetOrOutcome} with ${topPath.status} status and ${topPath.pathSeverity} severity.`;
}

export function attackPathSummaryFromWorkflowFindings(
  findings: Array<z.infer<typeof workflowReportedFindingSchema>>,
  handoff?: unknown,
  attackVectors: Array<z.infer<typeof workflowReportedAttackVectorSchema>> = []
) {
  return buildAttackPathSummary({
    findings: findings.map((finding) => workflowReportedFindingSchema.parse(finding)),
    attackVectors: attackVectors.map((vector) => workflowReportedAttackVectorSchema.parse(vector)),
    handoff
  });
}
