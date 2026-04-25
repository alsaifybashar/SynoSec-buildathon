import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database/prisma-client.js";
import type {
  AuditEntry,
  AssetEdge,
  AssetNode,
  EnvironmentGraph,
  EscalationRoute,
  ScanTactic,
  OsiLayer,
  Scan,
  ScanLayerCoverage,
  ScanStatus,
  ScanLlmConfig,
  SecurityVulnerability,
  TacticStatus,
  ValidationStatus
} from "@synosec/contracts";
import { enrichAttackTechnique } from "@/engine/findings/attack-technique-mapper.js";
import { buildEnvironmentGraphFromScope } from "./environment-graph.js";

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function mapScanStatus(status: ScanStatus): "pending" | "running" | "complete" | "aborted" {
  return status === "failed" ? "aborted" : status;
}

function mapNodeStatus(status: TacticStatus): "pending" | "in_progress" | "complete" | "skipped" {
  switch (status) {
    case "in-progress":
      return "in_progress";
    default:
      return status;
  }
}

function fromNodeStatus(status: "pending" | "in_progress" | "complete" | "skipped"): TacticStatus {
  return status === "in_progress" ? "in-progress" : status;
}

function rowToScan(row: {
  id: string;
  scope: Prisma.JsonValue;
  status: "pending" | "running" | "complete" | "aborted";
  currentRound: number;
  tacticsTotal: number;
  tacticsComplete: number;
  createdAt: Date;
  completedAt: Date | null;
}): Scan {
  return {
    id: row.id,
    scope: row.scope as Scan["scope"],
    status: row.status,
    currentRound: row.currentRound,
    tacticsTotal: row.tacticsTotal,
    tacticsComplete: row.tacticsComplete,
    createdAt: row.createdAt.toISOString(),
    ...(row.completedAt ? { completedAt: row.completedAt.toISOString() } : {})
  };
}

function rowToSecurityVulnerability(row: {
  id: string;
  scanRunId: string;
  agentId: string;
  primaryLayer: string | null;
  relatedLayers: Prisma.JsonValue | null;
  category: string | null;
  title: string;
  description: string;
  impact: string | null;
  recommendation: string | null;
  severity: string;
  confidence: number;
  validationStatus: string | null;
  target: Prisma.JsonValue | null;
  evidenceItems: Prisma.JsonValue | null;
  technique: string;
  reproduction: Prisma.JsonValue | null;
  cwe: string | null;
  mitreId: string | null;
  owasp: string | null;
  tags: Prisma.JsonValue | null;
  createdAt: Date;
}): SecurityVulnerability {
  if (
    !row.primaryLayer
    || !row.category
    || !row.impact
    || !row.recommendation
    || !row.validationStatus
    || !row.target
    || !row.evidenceItems
  ) {
    throw new Error(`Stored vulnerability ${row.id} is missing required fields.`);
  }

  return {
    id: row.id,
    scanId: row.scanRunId,
    agentId: row.agentId,
    primaryLayer: row.primaryLayer as SecurityVulnerability["primaryLayer"],
    relatedLayers: Array.isArray(row.relatedLayers) ? row.relatedLayers as OsiLayer[] : [],
    category: row.category,
    title: row.title,
    description: row.description,
    impact: row.impact,
    recommendation: row.recommendation,
    severity: row.severity as SecurityVulnerability["severity"],
    confidence: row.confidence,
    validationStatus: row.validationStatus as SecurityVulnerability["validationStatus"],
    target: row.target as SecurityVulnerability["target"],
    evidence: row.evidenceItems as SecurityVulnerability["evidence"],
    technique: row.technique,
    ...(row.reproduction && typeof row.reproduction === "object" && !Array.isArray(row.reproduction)
      ? { reproduction: row.reproduction as NonNullable<SecurityVulnerability["reproduction"]> }
      : {}),
    ...(row.cwe ? { cwe: row.cwe } : {}),
    ...(row.mitreId ? { mitreId: row.mitreId } : {}),
    ...(row.owasp ? { owasp: row.owasp } : {}),
    tags: Array.isArray(row.tags) ? row.tags as string[] : [],
    createdAt: row.createdAt.toISOString()
  };
}

function rowToLayerCoverage(row: {
  scanRunId: string;
  layer: string;
  coverageStatus: string;
  confidenceSummary: string;
  toolRefs: Prisma.JsonValue;
  evidenceRefs: Prisma.JsonValue;
  vulnerabilityIds: Prisma.JsonValue;
  gaps: Prisma.JsonValue;
  updatedAt: Date;
}): ScanLayerCoverage {
  return {
    scanId: row.scanRunId,
    layer: row.layer as ScanLayerCoverage["layer"],
    coverageStatus: row.coverageStatus as ScanLayerCoverage["coverageStatus"],
    confidenceSummary: row.confidenceSummary,
    toolRefs: Array.isArray(row.toolRefs) ? row.toolRefs as string[] : [],
    evidenceRefs: Array.isArray(row.evidenceRefs) ? row.evidenceRefs as string[] : [],
    vulnerabilityIds: Array.isArray(row.vulnerabilityIds) ? row.vulnerabilityIds as string[] : [],
    gaps: Array.isArray(row.gaps) ? row.gaps as string[] : [],
    updatedAt: row.updatedAt.toISOString()
  };
}

function rowToAudit(row: {
  id: string;
  scanRunId: string;
  timestamp: Date;
  actor: string;
  action: string;
  targetTacticId: string | null;
  scopeValid: boolean;
  details: Prisma.JsonValue;
}): AuditEntry {
  return {
    id: row.id,
    scanId: row.scanRunId,
    timestamp: row.timestamp.toISOString(),
    actor: row.actor,
    action: row.action,
    ...(row.targetTacticId ? { targetTacticId: row.targetTacticId } : {}),
    scopeValid: row.scopeValid,
    details: (row.details ?? {}) as Record<string, unknown>
  };
}

export async function createScan(
  scan: Scan,
  metadata?: {
    mode?: "legacy" | "workflow";
    applicationId?: string | null;
    runtimeId?: string | null;
    agentId?: string | null;
    llm?: ScanLlmConfig | null;
    stopReason?: string | null;
    summary?: Prisma.InputJsonValue | null;
  }
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.scanRun.create({
      data: {
        id: scan.id,
        mode: metadata?.mode ?? "legacy",
        applicationId: metadata?.applicationId ?? null,
        runtimeId: metadata?.runtimeId ?? null,
        agentId: metadata?.agentId ?? null,
        scope: scan.scope as Prisma.InputJsonValue,
        llmConfig: metadata?.llm ? metadata.llm as Prisma.InputJsonValue : Prisma.JsonNull,
        status: mapScanStatus(scan.status),
        currentRound: scan.currentRound,
        tacticsTotal: scan.tacticsTotal,
        tacticsComplete: scan.tacticsComplete,
        stopReason: metadata?.stopReason ?? null,
        summary: metadata?.summary ?? Prisma.JsonNull,
        createdAt: toDate(scan.createdAt),
        completedAt: scan.completedAt ? toDate(scan.completedAt) : null
      }
    });

    const graph = buildEnvironmentGraphFromScope(scan.id, scan.scope, scan.createdAt);
    await transaction.scanAssetNode.createMany({
      data: graph.nodes.map((node) => ({
        id: node.id,
        scanRunId: scan.id,
        host: node.host,
        type: node.type,
        discoveredAt: toDate(node.discoveredAt),
        metadata: node.metadata as Prisma.InputJsonValue
      }))
    });
    if (graph.edges.length > 0) {
      await transaction.scanAssetEdge.createMany({
        data: graph.edges.map((edge, index) => ({
          id: `${scan.id}:edge:${index}`,
          scanRunId: scan.id,
          fromNode: edge.from,
          toNode: edge.to,
          edgeType: edge.edgeType,
          evidence: edge.evidence,
          metadata: edge.metadata as Prisma.InputJsonValue
        }))
      });
    }
  });
}

function rowToAssetNode(row: {
  id: string;
  scanRunId: string;
  host: string;
  type: string;
  discoveredAt: Date;
  metadata: Prisma.JsonValue;
}): AssetNode {
  return {
    id: row.id,
    host: row.host,
    type: row.type as AssetNode["type"],
    discoveredAt: row.discoveredAt.toISOString(),
    metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {}
  };
}

function rowToAssetEdge(row: {
  fromNode: string;
  toNode: string;
  edgeType: string;
  evidence: string;
  metadata: Prisma.JsonValue;
}): AssetEdge {
  return {
    from: row.fromNode,
    to: row.toNode,
    edgeType: row.edgeType as AssetEdge["edgeType"],
    evidence: row.evidence,
    metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {}
  };
}

export async function getEnvironmentGraphForScan(scanId: string): Promise<EnvironmentGraph | null> {
  const scan = await prisma.scanRun.findUnique({
    where: { id: scanId },
    select: { id: true, scope: true, createdAt: true }
  });
  if (!scan) {
    return null;
  }

  const [nodes, edges] = await Promise.all([
    prisma.scanAssetNode.findMany({ where: { scanRunId: scanId }, orderBy: { id: "asc" } }),
    prisma.scanAssetEdge.findMany({ where: { scanRunId: scanId }, orderBy: { id: "asc" } })
  ]);
  const scope = scan.scope as Scan["scope"];
  return {
    scanId,
    ...(scope.environmentName ? { environmentName: scope.environmentName } : {}),
    nodes: nodes.map(rowToAssetNode),
    edges: edges.map(rowToAssetEdge),
    generatedAt: scan.createdAt.toISOString()
  };
}

export async function createEscalationRoute(scanId: string, route: EscalationRoute): Promise<void> {
  await prisma.escalationRoute.create({
    data: {
      id: route.id,
      scanRunId: scanId,
      title: route.title,
      compositeRisk: route.compositeRisk,
      technique: route.technique,
      startTarget: route.startTarget,
      endTarget: route.endTarget,
      routeLength: route.chainLength,
      crossHost: route.crossHost,
      confidence: route.confidence,
      narrative: route.narrative ?? null,
      createdAt: toDate(route.createdAt),
      routeFindings: {
        createMany: {
          data: route.findingIds.map((findingId, index) => {
            const link = route.links.find((candidate) => candidate.order === index);
            return {
              scanFindingId: findingId,
              ord: index,
              linkProbability: link?.probability ?? null,
              edgeType: link?.edgeType ?? null,
              fromHost: link?.fromHost ?? null,
              toHost: link?.toHost ?? null
            };
          })
        }
      }
    }
  });
}

function rowToEscalationRoute(row: {
  id: string;
  scanRunId: string;
  title: string;
  compositeRisk: number;
  technique: string;
  startTarget: string;
  endTarget: string;
  routeLength: number;
  crossHost: boolean;
  confidence: number;
  narrative: string | null;
  createdAt: Date;
  routeFindings: Array<{
    scanFindingId: string;
    ord: number;
    linkProbability: number | null;
    edgeType: string | null;
    fromHost: string | null;
    toHost: string | null;
  }>;
}): EscalationRoute {
  const ordered = row.routeFindings.slice().sort((left, right) => left.ord - right.ord);
  return {
    id: row.id,
    scanId: row.scanRunId,
    title: row.title,
    compositeRisk: row.compositeRisk,
    technique: row.technique,
    findingIds: ordered.map((item) => item.scanFindingId),
    links: ordered.slice(0, -1).map((item, index) => ({
      fromFindingId: item.scanFindingId,
      toFindingId: ordered[index + 1]?.scanFindingId ?? item.scanFindingId,
      probability: item.linkProbability ?? 0.5,
      order: item.ord,
      edgeType: item.edgeType === "lateral_movement" ? "lateral_movement" : "finding_chain",
      ...(item.fromHost ? { fromHost: item.fromHost } : {}),
      ...(item.toHost ? { toHost: item.toHost } : {})
    })),
    startTarget: row.startTarget,
    endTarget: row.endTarget,
    chainLength: row.routeLength,
    crossHost: row.crossHost,
    confidence: row.confidence,
    ...(row.narrative ? { narrative: row.narrative } : {}),
    createdAt: row.createdAt.toISOString()
  };
}

export async function getEscalationRoutesForScan(scanId: string): Promise<EscalationRoute[]> {
  const rows = await prisma.escalationRoute.findMany({
    where: { scanRunId: scanId },
    include: { routeFindings: true },
    orderBy: { compositeRisk: "desc" }
  });

  return rows.map(rowToEscalationRoute);
}

export async function getScan(id: string): Promise<Scan | null> {
  const row = await prisma.scanRun.findUnique({ where: { id } });
  return row ? rowToScan(row) : null;
}

export async function createDfsNode(node: ScanTactic): Promise<void> {
  await prisma.scanTactic.create({
    data: {
      id: node.id,
      scanRunId: node.scanId,
      target: node.target,
      layer: node.layer,
      service: node.service ?? null,
      port: node.port ?? null,
      riskScore: node.riskScore,
      status: mapNodeStatus(node.status),
      parentTacticId: node.parentTacticId,
      depth: node.depth,
      createdAt: toDate(node.createdAt)
    }
  });
}

export async function updateNodeStatus(id: string, status: TacticStatus): Promise<void> {
  await prisma.scanTactic.update({
    where: { id },
    data: { status: mapNodeStatus(status) }
  });
}

export async function createSecurityVulnerability(
  scanId: string,
  agentId: string,
  tacticId: string,
  vulnerability: SecurityVulnerability
): Promise<void> {
  const enrichment = enrichAttackTechnique({
    technique: vulnerability.technique,
    title: vulnerability.title,
    description: vulnerability.description,
    ...(vulnerability.cwe ? { existingCwe: vulnerability.cwe } : {}),
    ...(vulnerability.mitreId ? { existingMitreId: vulnerability.mitreId } : {}),
    tags: vulnerability.tags
  });
  const enrichedVulnerability = {
    ...vulnerability,
    ...(enrichment.cwe ? { cwe: enrichment.cwe } : {}),
    ...(enrichment.mitreId ? { mitreId: enrichment.mitreId } : {}),
    tags: enrichment.tags
  };

  await prisma.scanFinding.create({
    data: {
      id: enrichedVulnerability.id,
      scanRunId: scanId,
      scanTacticId: tacticId,
      agentId,
      primaryLayer: enrichedVulnerability.primaryLayer,
      relatedLayers: enrichedVulnerability.relatedLayers as Prisma.InputJsonValue,
      category: enrichedVulnerability.category,
      target: enrichedVulnerability.target as Prisma.InputJsonValue,
      severity: enrichedVulnerability.severity,
      confidence: enrichedVulnerability.confidence,
      title: enrichedVulnerability.title,
      description: enrichedVulnerability.description,
      evidence: enrichedVulnerability.evidence.map((item) => item.quote).join("\n\n"),
      evidenceItems: enrichedVulnerability.evidence as Prisma.InputJsonValue,
      technique: enrichedVulnerability.technique,
      impact: enrichedVulnerability.impact,
      recommendation: enrichedVulnerability.recommendation,
      reproduceCommand: enrichedVulnerability.reproduction?.commandPreview ?? null,
      reproduction: enrichedVulnerability.reproduction ? enrichedVulnerability.reproduction as Prisma.InputJsonValue : Prisma.JsonNull,
      validated: enrichedVulnerability.validationStatus === "cross_validated" || enrichedVulnerability.validationStatus === "reproduced",
      validationStatus: enrichedVulnerability.validationStatus,
      cwe: enrichedVulnerability.cwe ?? null,
      mitreId: enrichedVulnerability.mitreId ?? null,
      owasp: enrichedVulnerability.owasp ?? null,
      tags: enrichedVulnerability.tags as Prisma.InputJsonValue,
      evidenceRefs: enrichedVulnerability.evidence
        .flatMap((item) => [item.artifactRef, item.observationRef].filter((value): value is string => Boolean(value))) as Prisma.InputJsonValue,
      sourceToolRuns: enrichedVulnerability.evidence
        .flatMap((item) => item.toolRunRef ? [item.toolRunRef] : []) as Prisma.InputJsonValue,
      createdAt: toDate(enrichedVulnerability.createdAt)
    }
  });
}

export async function getSecurityVulnerabilitiesForScan(scanId: string): Promise<SecurityVulnerability[]> {
  const rows = await prisma.scanFinding.findMany({
    where: {
      scanRunId: scanId,
      primaryLayer: { not: null }
    },
    orderBy: { createdAt: "desc" }
  });

  return rows.map((row) => rowToSecurityVulnerability(row));
}

export async function upsertLayerCoverage(coverage: ScanLayerCoverage): Promise<void> {
  await prisma.scanLayerCoverage.upsert({
    where: {
      scanRunId_layer: {
        scanRunId: coverage.scanId,
        layer: coverage.layer
      }
    },
    create: {
      scanRunId: coverage.scanId,
      layer: coverage.layer,
      coverageStatus: coverage.coverageStatus,
      confidenceSummary: coverage.confidenceSummary,
      toolRefs: coverage.toolRefs as Prisma.InputJsonValue,
      evidenceRefs: coverage.evidenceRefs as Prisma.InputJsonValue,
      vulnerabilityIds: coverage.vulnerabilityIds as Prisma.InputJsonValue,
      gaps: coverage.gaps as Prisma.InputJsonValue,
      updatedAt: toDate(coverage.updatedAt)
    },
    update: {
      coverageStatus: coverage.coverageStatus,
      confidenceSummary: coverage.confidenceSummary,
      toolRefs: coverage.toolRefs as Prisma.InputJsonValue,
      evidenceRefs: coverage.evidenceRefs as Prisma.InputJsonValue,
      vulnerabilityIds: coverage.vulnerabilityIds as Prisma.InputJsonValue,
      gaps: coverage.gaps as Prisma.InputJsonValue,
      updatedAt: toDate(coverage.updatedAt)
    }
  });
}

export async function getLayerCoverageForScan(scanId: string): Promise<ScanLayerCoverage[]> {
  const rows = await prisma.scanLayerCoverage.findMany({
    where: { scanRunId: scanId },
    orderBy: { layer: "asc" }
  });

  return rows.map(rowToLayerCoverage);
}

export async function createAuditEntry(entry: AuditEntry): Promise<void> {
  await prisma.scanAuditEntry.create({
    data: {
      id: entry.id,
      scanRunId: entry.scanId,
      timestamp: toDate(entry.timestamp),
      actor: entry.actor,
      action: entry.action,
      targetTacticId: entry.targetTacticId ?? null,
      scopeValid: entry.scopeValid,
      details: entry.details as Prisma.InputJsonValue
    }
  });
}

export async function getAuditForScan(scanId: string): Promise<AuditEntry[]> {
  const rows = await prisma.scanAuditEntry.findMany({
    where: { scanRunId: scanId },
    orderBy: { timestamp: "asc" }
  });
  return rows.map(rowToAudit);
}

export async function updateFindingValidation(
  findingId: string,
  validationStatus: ValidationStatus,
  confidence: number,
  confidenceReason: string
): Promise<void> {
  await prisma.scanFinding.update({
    where: { id: findingId },
    data: {
      validationStatus,
      confidence,
      confidenceReason,
      validated: validationStatus === "cross_validated" || validationStatus === "reproduced"
    }
  });
}
