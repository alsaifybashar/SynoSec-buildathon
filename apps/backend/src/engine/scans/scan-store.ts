import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database/prisma-client.js";
import type {
  AuditEntry,
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
    agentId?: string | null;
    llm?: ScanLlmConfig | null;
    stopReason?: string | null;
    summary?: Prisma.InputJsonValue | null;
  }
): Promise<void> {
  await prisma.scanRun.create({
    data: {
      id: scan.id,
      mode: metadata?.mode ?? "legacy",
      applicationId: metadata?.applicationId ?? null,
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
  await prisma.scanFinding.create({
    data: {
      id: vulnerability.id,
      scanRunId: scanId,
      scanTacticId: tacticId,
      agentId,
      primaryLayer: vulnerability.primaryLayer,
      relatedLayers: vulnerability.relatedLayers as Prisma.InputJsonValue,
      category: vulnerability.category,
      target: vulnerability.target as Prisma.InputJsonValue,
      severity: vulnerability.severity,
      confidence: vulnerability.confidence,
      title: vulnerability.title,
      description: vulnerability.description,
      evidence: vulnerability.evidence.map((item) => item.quote).join("\n\n"),
      evidenceItems: vulnerability.evidence as Prisma.InputJsonValue,
      technique: vulnerability.technique,
      impact: vulnerability.impact,
      recommendation: vulnerability.recommendation,
      reproduceCommand: vulnerability.reproduction?.commandPreview ?? null,
      reproduction: vulnerability.reproduction ? vulnerability.reproduction as Prisma.InputJsonValue : Prisma.JsonNull,
      validated: vulnerability.validationStatus === "cross_validated" || vulnerability.validationStatus === "reproduced",
      validationStatus: vulnerability.validationStatus,
      cwe: vulnerability.cwe ?? null,
      owasp: vulnerability.owasp ?? null,
      tags: vulnerability.tags as Prisma.InputJsonValue,
      evidenceRefs: vulnerability.evidence
        .flatMap((item) => [item.artifactRef, item.observationRef].filter((value): value is string => Boolean(value))) as Prisma.InputJsonValue,
      sourceToolRuns: vulnerability.evidence
        .flatMap((item) => item.toolRunRef ? [item.toolRunRef] : []) as Prisma.InputJsonValue,
      createdAt: toDate(vulnerability.createdAt)
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
