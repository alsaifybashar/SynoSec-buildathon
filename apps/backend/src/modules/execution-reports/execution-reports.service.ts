import { randomUUID } from "node:crypto";
import {
  attackPathSummarySchema,
  buildWorkflowRunReport,
  executionReportGraphEdgeSchema,
  executionReportGraphNodeSchema,
  executionReportGraphSchema,
  executionReportDetailSchema,
  executionReportFindingFromWorkflowFinding,
  executionReportSummarySchema,
  executionReportToolActivitySchema,
  executionReportFindingSchema,
  getWorkflowReportedAttackVectors,
  getWorkflowReportedFindings,
  getWorkflowReportedSystemGraph,
  normalizeExecutionReportStatus,
  summarizeHighestSeverity,
  type ExecutionReportDetail,
  type ExecutionReportFinding,
  type ExecutionKind,
  type ExecutionReportSummary,
  type ExecutionReportsListQuery,
  type WorkflowReportedAttackVector,
  type WorkflowReportedFinding,
  type WorkflowReportedPath,
  type WorkflowReportedResource,
  type WorkflowReportedResourceRelationship
} from "@synosec/contracts";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database/prisma-client.js";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { RequestError } from "@/shared/http/request-error.js";
import { mapWorkflowRunRow } from "@/modules/workflows/index.js";

type PersistedExecutionReportRow = Awaited<ReturnType<typeof prisma.executionReport.findUniqueOrThrow>>;
type ExecutionReportSnapshot = Omit<ExecutionReportDetail, "id" | "archivedAt"> & {
  sourceDefinitionId: string | null;
};

function parseGraph(value: Prisma.JsonValue) {
  const parsed = executionReportGraphSchema.safeParse(value);
  if (!parsed.success) {
    throw new RequestError(500, `Execution report graph payload is invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

function parseAttackPaths(value: Prisma.JsonValue) {
  if (value === null || value === undefined) {
    return { venues: [], vectors: [], paths: [] };
  }

  const parsed = attackPathSummarySchema.safeParse(value);
  if (!parsed.success) {
    throw new RequestError(500, `Execution report attackPaths payload is invalid: ${parsed.error.message}`);
  }

  return parsed.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dedupeGraph(input: { nodes: unknown[]; edges: unknown[] }) {
  const nodesById = new Map<string, ExecutionReportDetail["graph"]["nodes"][number]>();
  const edgesById = new Map<string, ExecutionReportDetail["graph"]["edges"][number]>();

  for (const candidate of input.nodes) {
    const parsed = executionReportGraphNodeSchema.safeParse(candidate);
    if (parsed.success) {
      nodesById.set(parsed.data.id, parsed.data);
    }
  }

  for (const candidate of input.edges) {
    const parsed = executionReportGraphEdgeSchema.safeParse(candidate);
    if (parsed.success) {
      edgesById.set(parsed.data.id, parsed.data);
    }
  }

  return {
    nodes: [...nodesById.values()],
    edges: [...edgesById.values()].filter((edge) => nodesById.has(edge.source) && nodesById.has(edge.target))
  };
}

function createWorkflowFindingTargetLabel(finding: WorkflowReportedFinding) {
  return [
    finding.target.host,
    finding.target.port ? `:${finding.target.port}` : "",
    finding.target.path ?? ""
  ].join("");
}

function createResourceSummary(resource: WorkflowReportedResource) {
  if (resource.summary?.trim().length) {
    return resource.summary;
  }
  return resource.tags.length > 0
    ? `Tagged as ${resource.tags.join(", ")}.`
    : `Reported ${resource.kind} resource.`;
}

function createPathSummary(path: WorkflowReportedPath) {
  if (path.summary?.trim().length) {
    return path.summary;
  }
  const parts = [];
  if (path.resourceIds.length > 0) {
    parts.push(`${path.resourceIds.length} resources`);
  }
  if (path.findingIds.length > 0) {
    parts.push(`${path.findingIds.length} findings`);
  }
  return parts.length > 0
    ? `Grouped path covering ${parts.join(" and ")}.`
    : "Reported attack path grouping.";
}

function createResourceCreatedAt(
  resource: WorkflowReportedResource,
  resourceRelationships: WorkflowReportedResourceRelationship[],
  findings: WorkflowReportedFinding[],
  fallbackCreatedAt: string
) {
  return resource.createdAt
    ?? resourceRelationships.find((relationship) => relationship.sourceResourceId === resource.id || relationship.targetResourceId === resource.id)?.createdAt
    ?? findings.find((finding) => (finding.resourceIds ?? []).includes(resource.id) || finding.resourceId === resource.id)?.createdAt
    ?? fallbackCreatedAt;
}

function buildWorkflowExecutionGraph(input: {
  findings: WorkflowReportedFinding[];
  attackVectors?: WorkflowReportedAttackVector[];
  resources?: WorkflowReportedResource[];
  resourceRelationships?: WorkflowReportedResourceRelationship[];
  paths?: WorkflowReportedPath[];
  defaultCreatedAt?: string;
}) {
  const findings = input.findings;
  const attackVectors = input.attackVectors ?? [];
  const resources = input.resources ?? [];
  const resourceRelationships = input.resourceRelationships ?? [];
  const paths = input.paths ?? [];
  const defaultCreatedAt = input.defaultCreatedAt ?? new Date().toISOString();
  const nodes: unknown[] = [];
  const edges: unknown[] = [];
  const attackChainNodes = new Map<string, {
    id: string;
    kind: "attack_chain";
    title: string;
    summary: string;
    severity: WorkflowReportedFinding["severity"];
    findingIds: string[];
    createdAt: string;
  }>();

  for (const resource of resources) {
    const createdAt = createResourceCreatedAt(resource, resourceRelationships, findings, defaultCreatedAt);
    nodes.push({
      id: resource.id,
      kind: "resource",
      title: resource.name,
      summary: createResourceSummary(resource),
      resourceKind: resource.kind,
      customKind: resource.customKind ?? null,
      tags: resource.tags ?? [],
      createdAt
    });
  }

  for (const relationship of resourceRelationships) {
    edges.push({
      id: relationship.id,
      kind: "topology",
      source: relationship.sourceResourceId,
      target: relationship.targetResourceId,
      label: relationship.kind === "custom" ? relationship.customKind : relationship.kind,
      createdAt: relationship.createdAt ?? defaultCreatedAt
    });
  }

  for (const finding of findings) {
    nodes.push({
      id: finding.id,
      kind: "finding",
      findingId: finding.id,
      title: finding.title,
      summary: finding.impact,
      severity: finding.severity,
      confidence: finding.confidence,
      targetLabel: createWorkflowFindingTargetLabel(finding),
      createdAt: finding.createdAt
    });

    finding.evidence.forEach((evidence, index) => {
      const evidenceNodeId = `${finding.id}:evidence:${index}`;
      nodes.push({
        id: evidenceNodeId,
        kind: "evidence",
        title: `${finding.title} evidence ${index + 1}`,
        summary: evidence.quote,
        sourceTool: evidence.sourceTool,
        quote: evidence.quote,
        severity: finding.severity,
        refs: [{
          ...(evidence.artifactRef ? { artifactRef: evidence.artifactRef } : {}),
          ...(evidence.observationRef ? { observationRef: evidence.observationRef } : {}),
          ...(evidence.toolRunRef ? { toolRunRef: evidence.toolRunRef } : {}),
          ...(evidence.traceEventId ? { traceEventId: evidence.traceEventId } : {}),
          ...(evidence.externalUrl ? { externalUrl: evidence.externalUrl } : {})
        }],
        createdAt: finding.createdAt
      });
      edges.push({
        id: `${evidenceNodeId}:supports:${finding.id}`,
        kind: "supports",
        source: evidenceNodeId,
        target: finding.id,
        createdAt: finding.createdAt
      });
    });

    if (finding.attackChain) {
      const chainNodeId = finding.attackChain.id?.trim().length ? finding.attackChain.id : `attack-chain:${finding.attackChain.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const existingChain = attackChainNodes.get(chainNodeId);
      if (existingChain) {
        if (!existingChain.findingIds.includes(finding.id)) {
          existingChain.findingIds.push(finding.id);
        }
      } else {
        attackChainNodes.set(chainNodeId, {
          id: chainNodeId,
          kind: "attack_chain",
          title: finding.attackChain.title,
          summary: finding.attackChain.summary,
          severity: finding.attackChain.severity ?? finding.severity,
          findingIds: [finding.id],
          createdAt: finding.createdAt
        });
      }
      edges.push({
        id: `${finding.id}:attack-chain:${chainNodeId}`,
        kind: "enables",
        source: finding.id,
        target: chainNodeId,
        createdAt: finding.createdAt
      });
    }

    for (const resourceId of new Set([...(finding.resourceId ? [finding.resourceId] : []), ...(finding.resourceIds ?? [])])) {
      edges.push({
        id: `${resourceId}:affects:${finding.id}`,
        kind: "affects",
        source: resourceId,
        target: finding.id,
        createdAt: finding.createdAt
      });
    }
  }

  for (const path of paths) {
    nodes.push({
      id: path.id,
      kind: "path",
      title: path.title,
      summary: createPathSummary(path),
      ...(path.severity ? { severity: path.severity } : {}),
      resourceIds: path.resourceIds ?? [],
      findingIds: path.findingIds ?? [],
      createdAt: defaultCreatedAt
    });
    for (const resourceId of path.resourceIds ?? []) {
      edges.push({
        id: `${resourceId}:member_of:${path.id}`,
        kind: "member_of",
        source: resourceId,
        target: path.id,
        createdAt: defaultCreatedAt
      });
    }
    for (const findingId of path.findingIds ?? []) {
      edges.push({
        id: `${findingId}:member_of:${path.id}`,
        kind: "member_of",
        source: findingId,
        target: path.id,
        createdAt: defaultCreatedAt
      });
    }
  }

  for (const vector of attackVectors) {
    const edgeKind = vector.kind === "derived_from"
      ? "derived_from"
      : vector.kind === "related"
        ? "correlates_with"
        : "enables";
    edges.push({
      id: vector.id,
      kind: edgeKind,
      source: vector.sourceFindingId,
      target: vector.destinationFindingId,
      label: vector.summary,
      createdAt: vector.createdAt
    });
  }

  nodes.push(...attackChainNodes.values());
  return dedupeGraph({ nodes, edges });
}

function buildAttackMapExecutionGraph(input: {
  findings: ExecutionReportFinding[];
  mapNodes: Array<Record<string, unknown>>;
  mapEdges: Array<Record<string, unknown>>;
}) {
  const nodes: unknown[] = [];
  const edges: unknown[] = [];

  for (const finding of input.findings) {
    nodes.push({
      id: finding.id,
      kind: "finding",
      findingId: finding.id,
      title: finding.title,
      summary: finding.summary,
      severity: finding.severity,
      confidence: finding.confidence,
      targetLabel: finding.targetLabel,
      createdAt: finding.createdAt
    });
    finding.evidence.forEach((evidence, index) => {
      const evidenceNodeId = `${finding.id}:evidence:${index}`;
      nodes.push({
        id: evidenceNodeId,
        kind: "evidence",
        title: `${finding.title} evidence ${index + 1}`,
        summary: evidence.quote,
        sourceTool: evidence.sourceTool,
        quote: evidence.quote,
        severity: finding.severity,
        refs: [{
          ...(evidence.artifactRef ? { artifactRef: evidence.artifactRef } : {}),
          ...(evidence.observationRef ? { observationRef: evidence.observationRef } : {}),
          ...(evidence.toolRunRef ? { toolRunRef: evidence.toolRunRef } : {})
        }],
        createdAt: finding.createdAt
      });
      edges.push({
        id: `${evidenceNodeId}:supports:${finding.id}`,
        kind: "supports",
        source: evidenceNodeId,
        target: finding.id,
        createdAt: finding.createdAt
      });
    });
  }

  for (const node of input.mapNodes.filter((candidate) => candidate["type"] === "chain" || candidate["type"] === "attack_chain")) {
    const chainId = typeof node["id"] === "string" ? node["id"] : null;
    if (!chainId) {
      continue;
    }
    const data = isRecord(node["data"]) ? node["data"] : {};
    const findingIds = Array.isArray(data["findingIds"]) ? data["findingIds"].filter((value): value is string => typeof value === "string") : [];
    nodes.push({
      id: chainId,
      kind: "attack_chain",
      title: typeof node["label"] === "string" ? node["label"] : "Attack chain",
      summary: typeof data["description"] === "string" ? data["description"] : "Correlated attack path.",
      severity: typeof node["severity"] === "string" ? node["severity"] : "medium",
      findingIds,
      createdAt: new Date().toISOString()
    });
  }

  for (const edge of input.mapEdges.filter((candidate) => candidate["kind"] === "chain" || candidate["kind"] === "attack_chain")) {
    const source = typeof edge["source"] === "string" ? edge["source"] : null;
    const target = typeof edge["target"] === "string" ? edge["target"] : null;
    if (!source || !target) {
      continue;
    }
    edges.push({
      id: typeof edge["id"] === "string" ? edge["id"] : `${source}:${target}`,
      kind: "enables",
      source,
      target,
      createdAt: new Date().toISOString()
    });
  }

  return dedupeGraph({ nodes, edges });
}

function compareSeverity(left: ExecutionReportSummary["highestSeverity"], right: ExecutionReportSummary["highestSeverity"]) {
  const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0, null: -1 } as const;
  return order[right ?? "null"] - order[left ?? "null"];
}

function includesQuery(parts: Array<string | null | undefined>, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return parts.some((part) => (part ?? "").toLowerCase().includes(normalized));
}

function parseFindings(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    throw new RequestError(500, "Execution report findings payload is invalid: expected an array.");
  }

  return value.map((entry, index) => {
    const parsed = executionReportFindingSchema.safeParse(entry);
    if (!parsed.success) {
      throw new RequestError(500, `Execution report findings[${index}] payload is invalid: ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

function parseToolActivity(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    throw new RequestError(500, "Execution report toolActivity payload is invalid: expected an array.");
  }

  return value.map((entry, index) => {
    const parsed = executionReportToolActivitySchema.safeParse(entry);
    if (!parsed.success) {
      throw new RequestError(500, `Execution report toolActivity[${index}] payload is invalid: ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

function normalizeExecutionKind(value: string | null | undefined): ExecutionKind | null {
  if (value === "workflow") {
    return value;
  }

  return null;
}

export class ExecutionReportsService {
  async list(query: ExecutionReportsListQuery): Promise<PaginatedResult<ExecutionReportSummary>> {
    const rows = await prisma.executionReport.findMany({
      where: {
        ...(query.executionKind ? { executionKind: query.executionKind } : {}),
        ...(query.status ? { sourceStatus: query.status } : {}),
        ...(query.archived === "exclude" ? { archivedAt: null } : {}),
        ...(query.archived === "only" ? { archivedAt: { not: null } } : {})
      },
      orderBy: { generatedAt: "desc" }
    });

    const summaries = rows
      .map((row) => this.mapRowToSummary(row))
      .filter((summary) => includesQuery([summary.title, summary.targetLabel, summary.sourceLabel], query.q ?? ""))
      .sort((left, right) => {
        switch (query.sortBy) {
          case "executionKind":
            return query.sortDirection === "asc"
              ? left.executionKind.localeCompare(right.executionKind)
              : right.executionKind.localeCompare(left.executionKind);
          case "status":
            return query.sortDirection === "asc"
              ? left.status.localeCompare(right.status)
              : right.status.localeCompare(left.status);
          case "title":
            return query.sortDirection === "asc"
              ? left.title.localeCompare(right.title)
              : right.title.localeCompare(left.title);
          case "highestSeverity":
            return query.sortDirection === "asc"
              ? compareSeverity(right.highestSeverity, left.highestSeverity)
              : compareSeverity(left.highestSeverity, right.highestSeverity);
          case "findingsCount":
            return query.sortDirection === "asc"
              ? left.findingsCount - right.findingsCount
              : right.findingsCount - left.findingsCount;
          case "updatedAt":
            return query.sortDirection === "asc"
              ? left.updatedAt.localeCompare(right.updatedAt)
              : right.updatedAt.localeCompare(left.updatedAt);
          case "generatedAt":
          default:
            return query.sortDirection === "asc"
              ? left.generatedAt.localeCompare(right.generatedAt)
              : right.generatedAt.localeCompare(left.generatedAt);
        }
      });

    return paginateItems(summaries, query.page, query.pageSize);
  }

  async getById(id: string): Promise<ExecutionReportDetail> {
    const row = await prisma.executionReport.findUnique({ where: { id } });
    if (!row) {
      throw new RequestError(404, "Execution report not found.");
    }

    return this.mapRowToDetail(row);
  }

  async archive(id: string): Promise<ExecutionReportDetail> {
    const row = await prisma.executionReport.update({
      where: { id },
      data: { archivedAt: new Date() }
    });
    return this.mapRowToDetail(row);
  }

  async unarchive(id: string): Promise<ExecutionReportDetail> {
    const row = await prisma.executionReport.update({
      where: { id },
      data: { archivedAt: null }
    });
    return this.mapRowToDetail(row);
  }

  async remove(id: string): Promise<boolean> {
    const existing = await prisma.executionReport.findUnique({ where: { id } });
    if (!existing) {
      return false;
    }

    await prisma.executionReport.delete({ where: { id } });
    return true;
  }

  async createForWorkflowRun(runId: string) {
    const snapshot = await this.buildWorkflowSnapshot(runId);
    return this.createFromSnapshot(snapshot);
  }

  private async createFromSnapshot(snapshot: ExecutionReportSnapshot) {
    const existing = await prisma.executionReport.findUnique({
      where: {
        executionKind_sourceExecutionId: {
          executionKind: snapshot.executionKind,
          sourceExecutionId: snapshot.executionId
        }
      }
    });
    if (existing) {
      return this.mapRowToDetail(existing);
    }

    const row = await prisma.executionReport.create({
      data: {
        id: randomUUID(),
        executionKind: snapshot.executionKind,
        sourceExecutionId: snapshot.executionId,
        sourceDefinitionId: snapshot.sourceDefinitionId,
        sourceStatus: snapshot.status,
        title: snapshot.title,
        targetLabel: snapshot.targetLabel,
        sourceLabel: snapshot.sourceLabel,
        executiveSummary: snapshot.executiveSummary,
        findingsCount: snapshot.findingsCount,
        highestSeverity: snapshot.highestSeverity,
        findings: snapshot.findings as Prisma.InputJsonValue,
        toolActivity: snapshot.toolActivity as Prisma.InputJsonValue,
        coverageOverview: snapshot.coverageOverview as Prisma.InputJsonValue,
        sourceSummary: snapshot.sourceSummary as Prisma.InputJsonValue,
        raw: {
          ...snapshot.raw,
          graph: snapshot.graph,
          attackPaths: snapshot.attackPaths,
          attackPathExecutiveSummary: snapshot.attackPathExecutiveSummary
        } as Prisma.InputJsonValue,
        generatedAt: new Date(snapshot.generatedAt)
      }
    });

    return this.mapRowToDetail(row);
  }

  private mapRowToSummary(row: PersistedExecutionReportRow): ExecutionReportSummary {
    return executionReportSummarySchema.parse({
      id: row.id,
      executionId: row.sourceExecutionId,
      executionKind: row.executionKind,
      sourceDefinitionId: row.sourceDefinitionId,
      status: row.sourceStatus,
      title: row.title,
      targetLabel: row.targetLabel,
      sourceLabel: row.sourceLabel,
      findingsCount: row.findingsCount,
      highestSeverity: row.highestSeverity,
      generatedAt: row.generatedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      archivedAt: row.archivedAt?.toISOString() ?? null
    });
  }

  private mapRowToDetail(row: PersistedExecutionReportRow): ExecutionReportDetail {
    return executionReportDetailSchema.parse({
      ...this.mapRowToSummary(row),
      executiveSummary: row.executiveSummary,
      attackPathExecutiveSummary: isRecord(row.raw) && typeof row.raw["attackPathExecutiveSummary"] === "string"
        ? row.raw["attackPathExecutiveSummary"]
        : "No linked attack paths were derived from the persisted findings.",
      attackPaths: parseAttackPaths(isRecord(row.raw) ? row.raw["attackPaths"] as Prisma.JsonValue : null),
      graph: parseGraph(isRecord(row.raw) ? row.raw["graph"] as Prisma.JsonValue : null),
      findings: parseFindings(row.findings),
      toolActivity: parseToolActivity(row.toolActivity),
      coverageOverview: row.coverageOverview,
      sourceSummary: row.sourceSummary,
      raw: row.raw
    });
  }

  private async buildWorkflowSnapshot(runId: string): Promise<ExecutionReportSnapshot> {
    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        workflow: {
          include: {
            application: true,
            stages: true
          }
        },
        traceEvents: true
      }
    });
    if (!run) {
      throw new RequestError(404, "Execution report source run not found.");
    }
    if (!run.completedAt || (run.status !== "completed" && run.status !== "failed")) {
      throw new RequestError(400, "Execution report can only be created after the workflow run finishes.");
    }

    const workflowRun = mapWorkflowRunRow(run as Parameters<typeof mapWorkflowRunRow>[0]);
    const report = buildWorkflowRunReport(workflowRun);
    if (!report) {
      throw new RequestError(400, "Workflow run report could not be built at completion.");
    }

    const workflowFindings = getWorkflowReportedFindings(workflowRun);
    const workflowAttackVectors = getWorkflowReportedAttackVectors(workflowRun);
    const workflowSystemGraph = getWorkflowReportedSystemGraph(workflowRun);
    const findings = workflowFindings.map((finding) => executionReportFindingFromWorkflowFinding(finding));
    const toolActivity = workflowRun.events
      .filter((event) => event.type === "tool_result")
      .map((event) => executionReportToolActivitySchema.parse({
        id: event.id,
        executionId: workflowRun.id,
        executionKind: workflowRun.executionKind,
        phase: event.title,
        toolId: typeof event.payload["toolId"] === "string" ? event.payload["toolId"] : null,
        toolName: typeof event.payload["toolName"] === "string" ? event.payload["toolName"] : "Tool",
        command: typeof event.payload["commandPreview"] === "string"
          ? event.payload["commandPreview"]
          : typeof event.payload["usedToolName"] === "string"
            ? event.payload["usedToolName"]
            : event.summary,
        status: event.status === "failed" ? "failed" : "completed",
        outputPreview: typeof event.payload["outputPreview"] === "string"
          ? event.payload["outputPreview"]
          : event.summary,
        exitCode: typeof event.payload["exitCode"] === "number" ? event.payload["exitCode"] : null,
        startedAt: event.createdAt,
        completedAt: event.createdAt
      }));

    const executionKind = normalizeExecutionKind(workflowRun.executionKind)
      ?? normalizeExecutionKind(run.workflow.executionKind)
      ?? "workflow";
    const graph = buildWorkflowExecutionGraph({
      findings: workflowFindings,
      attackVectors: workflowAttackVectors,
      resources: workflowSystemGraph.resources,
      resourceRelationships: workflowSystemGraph.resourceRelationships,
      paths: workflowSystemGraph.paths,
      defaultCreatedAt: run.completedAt.toISOString()
    });
    const attackPaths = report.attackPaths;

    return {
      executionId: workflowRun.id,
      executionKind,
      sourceDefinitionId: run.workflowId,
      status: normalizeExecutionReportStatus(workflowRun.status),
      title: run.workflow.name,
      targetLabel: run.workflow.application?.name ?? "Unknown target",
      sourceLabel: run.workflow.name,
      findingsCount: findings.length,
      highestSeverity: summarizeHighestSeverity(findings),
      generatedAt: run.completedAt.toISOString(),
      updatedAt: run.completedAt.toISOString(),
      executiveSummary: report.executiveSummary,
      attackPathExecutiveSummary: report.attackPathExecutiveSummary,
      attackPaths,
      graph,
      findings,
      toolActivity,
      coverageOverview: report.coverageOverview,
      sourceSummary: {
        executionKind: "workflow",
        runId: workflowRun.id,
        workflowId: run.workflowId,
        stopReason: report.stopReason,
        totalFindings: report.totalFindings,
        topFindingIds: report.topFindings.map((item) => item.id)
      },
      raw: {
        eventCount: workflowRun.events.length,
        graph,
        attackPaths,
        attackVectors: workflowAttackVectors,
        attackPathExecutiveSummary: report.attackPathExecutiveSummary
      }
    };
  }
}
