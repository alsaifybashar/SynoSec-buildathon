import { Prisma } from "@/platform/generated/prisma/index.js";
import { prisma } from "@/platform/core/database/prisma-client.js";
import type {
  AuditEntry,
  ScanTactic,
  Finding,
  OsiLayer,
  Scan,
  ScanStatus,
  TacticStatus,
  ValidationStatus,
  EscalationRoute
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

function rowToNode(row: {
  id: string;
  scanRunId: string;
  target: string;
  layer: string;
  service: string | null;
  port: number | null;
  riskScore: number;
  status: "pending" | "in_progress" | "complete" | "skipped";
  parentTacticId: string | null;
  depth: number;
  createdAt: Date;
}): ScanTactic {
  return {
    id: row.id,
    scanId: row.scanRunId,
    target: row.target,
    layer: row.layer as ScanTactic["layer"],
    ...(row.service ? { service: row.service } : {}),
    ...(row.port != null ? { port: row.port } : {}),
    riskScore: row.riskScore,
    status: fromNodeStatus(row.status),
    parentTacticId: row.parentTacticId,
    depth: row.depth,
    createdAt: row.createdAt.toISOString()
  };
}

function rowToFinding(row: {
  id: string;
  scanRunId: string;
  scanTacticId: string;
  agentId: string;
  severity: string;
  confidence: number;
  title: string;
  description: string;
  evidence: string;
  technique: string;
  reproduceCommand: string | null;
  validated: boolean;
  validationStatus: string | null;
  evidenceRefs: Prisma.JsonValue | null;
  sourceToolRuns: Prisma.JsonValue | null;
  confidenceReason: string | null;
  createdAt: Date;
}): Finding {
  return {
    id: row.id,
    tacticId: row.scanTacticId,
    scanId: row.scanRunId,
    agentId: row.agentId,
    severity: row.severity as Finding["severity"],
    confidence: row.confidence,
    title: row.title,
    description: row.description,
    evidence: row.evidence,
    technique: row.technique,
    ...(row.reproduceCommand ? { reproduceCommand: row.reproduceCommand } : {}),
    validated: row.validated,
    ...(row.validationStatus ? { validationStatus: row.validationStatus as Finding["validationStatus"] } : {}),
    ...(Array.isArray(row.evidenceRefs) ? { evidenceRefs: row.evidenceRefs as string[] } : {}),
    ...(Array.isArray(row.sourceToolRuns) ? { sourceToolRuns: row.sourceToolRuns as string[] } : {}),
    ...(row.confidenceReason ? { confidenceReason: row.confidenceReason } : {}),
    createdAt: row.createdAt.toISOString()
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

type RouteWithFindings = {
  id: string;
  scanRunId: string;
  title: string;
  compositeRisk: number;
  technique: string;
  startTarget: string;
  endTarget: string;
  routeLength: number;
  confidence: number;
  narrative: string | null;
  createdAt: Date;
  routeFindings: Array<{
    ord: number;
    linkProbability: number | null;
    scanFinding: {
      id: string;
    };
  }>;
};

function rowToChain(row: RouteWithFindings): EscalationRoute {
  const ordered = row.routeFindings.slice().sort((left, right) => left.ord - right.ord);
  return {
    id: row.id,
    scanId: row.scanRunId,
    title: row.title,
    compositeRisk: row.compositeRisk,
    technique: row.technique,
    findingIds: ordered.map((entry) => entry.scanFinding.id),
    links: ordered
      .slice(1)
      .map((entry, index) => ({
        fromFindingId: ordered[index]?.scanFinding.id ?? "",
        toFindingId: entry.scanFinding.id,
        probability: entry.linkProbability ?? row.confidence,
        order: index
      }))
      .filter((entry) => entry.fromFindingId.length > 0),
    startTarget: row.startTarget,
    endTarget: row.endTarget,
    chainLength: row.routeLength,
    confidence: row.confidence,
    ...(row.narrative ? { narrative: row.narrative } : {}),
    createdAt: row.createdAt.toISOString()
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export async function ensureScanStoreAvailable(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

export async function closeScanStore(): Promise<void> {
  await prisma.$disconnect();
}

export async function initScanStoreSchema(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

export async function createScan(scan: Scan): Promise<void> {
  await prisma.scanRun.create({
    data: {
      id: scan.id,
      scope: scan.scope as Prisma.InputJsonValue,
      status: mapScanStatus(scan.status),
      currentRound: scan.currentRound,
      tacticsTotal: scan.tacticsTotal,
      tacticsComplete: scan.tacticsComplete,
      createdAt: toDate(scan.createdAt),
      completedAt: scan.completedAt ? toDate(scan.completedAt) : null
    }
  });
}

export async function getScan(id: string): Promise<Scan | null> {
  const row = await prisma.scanRun.findUnique({ where: { id } });
  return row ? rowToScan(row) : null;
}

export async function listScans(): Promise<Scan[]> {
  const rows = await prisma.scanRun.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(rowToScan);
}

export async function updateScanStatus(id: string, status: ScanStatus, extra?: Partial<Scan>): Promise<void> {
  await prisma.scanRun.update({
    where: { id },
    data: {
      status: mapScanStatus(status),
      ...(extra?.currentRound !== undefined ? { currentRound: extra.currentRound } : {}),
      ...(extra?.tacticsTotal !== undefined ? { tacticsTotal: extra.tacticsTotal } : {}),
      ...(extra?.tacticsComplete !== undefined ? { tacticsComplete: extra.tacticsComplete } : {}),
      ...(extra?.completedAt !== undefined ? { completedAt: extra.completedAt ? toDate(extra.completedAt) : null } : {})
    }
  });
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

export async function linkDiscoveredNodes(parentTacticId: string, childId: string): Promise<void> {
  await prisma.scanTactic.update({
    where: { id: childId },
    data: { parentTacticId }
  });
}

export async function getDfsNode(id: string): Promise<ScanTactic | null> {
  const row = await prisma.scanTactic.findUnique({ where: { id } });
  return row ? rowToNode(row) : null;
}

export async function getNextPendingNode(scanId: string, maxDepth: number): Promise<ScanTactic | null> {
  const row = await prisma.scanTactic.findFirst({
    where: {
      scanRunId: scanId,
      status: "pending",
      depth: { lte: maxDepth }
    },
    orderBy: [
      { depth: "desc" },
      { riskScore: "desc" },
      { createdAt: "asc" }
    ]
  });
  return row ? rowToNode(row) : null;
}

export async function updateNodeStatus(id: string, status: TacticStatus): Promise<void> {
  await prisma.scanTactic.update({
    where: { id },
    data: { status: mapNodeStatus(status) }
  });
}

export async function getGraphForScan(
  scanId: string
): Promise<{ tactics: ScanTactic[]; relationships: Array<{ source: string; target: string }> }> {
  const rows = await prisma.scanTactic.findMany({
    where: { scanRunId: scanId },
    orderBy: [{ depth: "asc" }, { createdAt: "asc" }]
  });
  return {
    tactics: rows.map(rowToNode),
    relationships: rows
      .filter((row) => row.parentTacticId)
      .map((row) => ({
        source: row.parentTacticId as string,
        target: row.id
      }))
  };
}

export async function getAttackPaths(
  scanId: string
): Promise<Array<{ tacticIds: string[]; risk: number; description: string }>> {
  const tactics = await prisma.scanTactic.findMany({
    where: { scanRunId: scanId },
    select: { id: true, parentTacticId: true, target: true }
  });
  const findings = await prisma.scanFinding.findMany({
    where: { scanRunId: scanId, severity: { in: ["high", "critical"] } },
    select: { title: true, severity: true, scanTacticId: true }
  });
  const tacticById = new Map(tactics.map((tactic) => [tactic.id, tactic]));
  return findings.slice(0, 10).map((finding) => {
    const tacticIds: string[] = [];
    let currentId: string | null = finding.scanTacticId;
    while (currentId) {
      tacticIds.unshift(currentId);
      currentId = tacticById.get(currentId)?.parentTacticId ?? null;
    }
    return {
      tacticIds: unique(tacticIds),
      risk: finding.severity === "critical" ? 0.95 : 0.75,
      description: `Attack path to ${tacticById.get(finding.scanTacticId)?.target ?? finding.scanTacticId} via ${finding.title}`
    };
  });
}

export async function createFinding(finding: Finding): Promise<void> {
  await prisma.scanFinding.create({
    data: {
      id: finding.id,
      scanRunId: finding.scanId,
      scanTacticId: finding.tacticId,
      agentId: finding.agentId,
      severity: finding.severity,
      confidence: finding.confidence,
      title: finding.title,
      description: finding.description,
      evidence: finding.evidence,
      technique: finding.technique,
      reproduceCommand: finding.reproduceCommand ?? null,
      validated: finding.validated,
      validationStatus: finding.validationStatus ?? null,
      evidenceRefs: (finding.evidenceRefs ?? []) as Prisma.InputJsonValue,
      sourceToolRuns: (finding.sourceToolRuns ?? []) as Prisma.InputJsonValue,
      confidenceReason: finding.confidenceReason ?? null,
      createdAt: toDate(finding.createdAt)
    }
  });
}

export async function getFindingsForScan(scanId: string): Promise<Finding[]> {
  const rows = await prisma.scanFinding.findMany({
    where: { scanRunId: scanId },
    orderBy: { createdAt: "desc" }
  });
  return rows.map(rowToFinding);
}

export async function getFindingsForNode(tacticId: string): Promise<Finding[]> {
  const rows = await prisma.scanFinding.findMany({
    where: { scanTacticId: tacticId },
    orderBy: { createdAt: "desc" }
  });
  return rows.map(rowToFinding);
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

export async function createVulnerabilityChain(chain: EscalationRoute): Promise<void> {
  await prisma.escalationRoute.upsert({
    where: { id: chain.id },
    create: {
      id: chain.id,
      scanRunId: chain.scanId,
      title: chain.title,
      compositeRisk: chain.compositeRisk,
      technique: chain.technique,
      startTarget: chain.startTarget,
      endTarget: chain.endTarget,
      routeLength: chain.chainLength,
      confidence: chain.confidence,
      narrative: chain.narrative ?? null,
      createdAt: toDate(chain.createdAt)
    },
    update: {
      title: chain.title,
      compositeRisk: chain.compositeRisk,
      technique: chain.technique,
      startTarget: chain.startTarget,
      endTarget: chain.endTarget,
      routeLength: chain.chainLength,
      confidence: chain.confidence,
      narrative: chain.narrative ?? null
    }
  });
}

export async function linkFindingsInChain(chainId: string, findingIds: string[]): Promise<void> {
  await prisma.escalationRouteFinding.deleteMany({
    where: { escalationRouteId: chainId }
  });
  if (findingIds.length === 0) {
    return;
  }
  await prisma.escalationRouteFinding.createMany({
    data: findingIds.map((findingId, index) => ({
      escalationRouteId: chainId,
      scanFindingId: findingId,
      ord: index,
      linkProbability: index === 0 ? null : 0.8
    }))
  });
}

export async function getVulnerabilityChains(scanId: string): Promise<EscalationRoute[]> {
  const rows = await prisma.escalationRoute.findMany({
    where: { scanRunId: scanId },
    orderBy: { compositeRisk: "desc" },
    include: {
      routeFindings: {
        include: { scanFinding: { select: { id: true } } }
      }
    }
  });
  return rows.map((row) => rowToChain(row as RouteWithFindings));
}

export async function boostNodeRiskScore(
  scanId: string,
  target: string,
  layer: OsiLayer,
  boost: number
): Promise<void> {
  const rows = await prisma.scanTactic.findMany({
    where: {
      scanRunId: scanId,
      target,
      layer,
      status: "pending"
    },
    select: { id: true, riskScore: true }
  });
  await prisma.$transaction(
    rows.map((row) =>
      prisma.scanTactic.update({
        where: { id: row.id },
        data: { riskScore: Math.min(1, row.riskScore + boost) }
      })
    )
  );
}

export async function getAttackSurfaceClusters(
  scanId: string
): Promise<Array<{ target: string; totalFindings: number; riskWeight: number }>> {
  const rows = await prisma.scanFinding.findMany({
    where: { scanRunId: scanId },
    include: { scanTactic: { select: { target: true } } }
  });
  const grouped = new Map<string, { totalFindings: number; riskWeight: number }>();
  for (const row of rows) {
    const target = row.scanTactic.target;
    const current = grouped.get(target) ?? { totalFindings: 0, riskWeight: 0 };
    current.totalFindings += 1;
    current.riskWeight += row.severity === "critical" ? 4 : row.severity === "high" ? 3 : row.severity === "medium" ? 2 : row.severity === "low" ? 1 : 0;
    grouped.set(target, current);
  }
  return [...grouped.entries()]
    .map(([target, value]) => ({ target, ...value }))
    .sort((left, right) => right.riskWeight - left.riskWeight)
    .slice(0, 5);
}

export async function detectVulnerabilityChains(
  scanId: string
): Promise<Array<{ startTarget: string; trigger: string; endTarget: string; impact: string; routeConfidence: number }>> {
  const tactics = await prisma.scanTactic.findMany({
    where: { scanRunId: scanId },
    select: { id: true, target: true, parentTacticId: true }
  });
  const findings = await prisma.scanFinding.findMany({
    where: {
      scanRunId: scanId,
      severity: { in: ["high", "critical"] },
      confidence: { gt: 0.7 }
    },
    select: { scanTacticId: true, title: true, confidence: true }
  });
  const childrenByParent = new Map<string, string[]>();
  for (const tactic of tactics) {
    if (!tactic.parentTacticId) continue;
    const existing = childrenByParent.get(tactic.parentTacticId) ?? [];
    existing.push(tactic.id);
    childrenByParent.set(tactic.parentTacticId, existing);
  }
  const descendants = new Map<string, Set<string>>();
  for (const tactic of tactics) {
    const seen = new Set<string>();
    const queue = [...(childrenByParent.get(tactic.id) ?? [])].map((id) => ({ id, depth: 1 }));
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.depth > 3 || seen.has(current.id)) continue;
      seen.add(current.id);
      for (const childId of childrenByParent.get(current.id) ?? []) {
        queue.push({ id: childId, depth: current.depth + 1 });
      }
    }
    descendants.set(tactic.id, seen);
  }
  const findingsByTactic = new Map<string, typeof findings>();
  for (const finding of findings) {
    const existing = findingsByTactic.get(finding.scanTacticId) ?? [];
    existing.push(finding);
    findingsByTactic.set(finding.scanTacticId, existing);
  }
  const tacticById = new Map(tactics.map((tactic) => [tactic.id, tactic]));
  const detections: Array<{ startTarget: string; trigger: string; endTarget: string; impact: string; routeConfidence: number }> = [];
  for (const tactic of tactics) {
    const tacticFindings = findingsByTactic.get(tactic.id) ?? [];
    for (const descendantId of descendants.get(tactic.id) ?? []) {
      const descendant = tacticById.get(descendantId);
      if (!descendant) continue;
      for (const left of tacticFindings) {
        for (const right of findingsByTactic.get(descendantId) ?? []) {
          detections.push({
            startTarget: tactic.target,
            trigger: left.title,
            endTarget: descendant.target,
            impact: right.title,
            routeConfidence: (left.confidence + right.confidence) / 2
          });
        }
      }
    }
  }
  return detections.sort((left, right) => right.routeConfidence - left.routeConfidence).slice(0, 20);
}

export async function findOrphanedHighRiskFindings(scanId: string): Promise<string[]> {
  const rows = await prisma.scanFinding.findMany({
    where: {
      scanRunId: scanId,
      severity: { in: ["high", "critical"] }
    },
    select: { id: true, title: true, validationStatus: true }
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.title, (counts.get(row.title) ?? 0) + 1);
  }
  return rows
    .filter((row) => (row.validationStatus === "single_source" || row.validationStatus === null) && (counts.get(row.title) ?? 0) === 1)
    .map((row) => row.id);
}
