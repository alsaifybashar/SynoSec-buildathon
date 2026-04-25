import { randomUUID } from "node:crypto";
import {
  buildWorkflowRunReport,
  executionReportDetailSchema,
  executionReportFindingFromVulnerability,
  executionReportFindingFromWorkflowFinding,
  executionReportSummarySchema,
  executionReportToolActivitySchema,
  executionReportFindingSchema,
  getWorkflowReportedFindings,
  normalizeExecutionReportStatus,
  summarizeHighestSeverity,
  type ExecutionReportDetail,
  type ExecutionReportFinding,
  type ExecutionKind,
  type ExecutionReportSummary,
  type ExecutionReportsListQuery
} from "@synosec/contracts";
import { Prisma } from "@prisma/client";
import { getLayerCoverageForScan, getSecurityVulnerabilitiesForScan, getSingleAgentScan, getSingleAgentScanReport } from "@/engine/scans/scan-store.js";
import { prisma } from "@/shared/database/prisma-client.js";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { RequestError } from "@/shared/http/request-error.js";
import { mapWorkflowRunRow } from "@/modules/workflows/index.js";

type PersistedExecutionReportRow = Awaited<ReturnType<typeof prisma.executionReport.findUniqueOrThrow>>;
type ExecutionReportSnapshot = Omit<ExecutionReportDetail, "id" | "archivedAt"> & {
  sourceDefinitionId: string | null;
};

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
    return [];
  }

  return value
    .map((entry) => executionReportFindingSchema.safeParse(entry))
    .filter((entry): entry is { success: true; data: ExecutionReportFinding } => entry.success)
    .map((entry) => entry.data);
}

function parseToolActivity(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => executionReportToolActivitySchema.safeParse(entry))
    .filter((entry): entry is { success: true; data: ExecutionReportDetail["toolActivity"][number] } => entry.success)
    .map((entry) => entry.data);
}

function normalizeExecutionKind(value: string | null | undefined): ExecutionKind | null {
  if (value === "single-agent" || value === "workflow" || value === "attack-map") {
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

  async createForSingleAgentScan(scanId: string) {
    const snapshot = await this.buildSingleAgentSnapshot(scanId);
    return this.createFromSnapshot(snapshot);
  }

  async createForWorkflowRun(runId: string) {
    const snapshot = await this.buildWorkflowSnapshot(runId);
    return this.createFromSnapshot(snapshot);
  }

  async createForAttackMapRun(runId: string) {
    const snapshot = await this.buildAttackMapSnapshot(runId);
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
        raw: snapshot.raw as Prisma.InputJsonValue,
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
      findings: parseFindings(row.findings),
      toolActivity: parseToolActivity(row.toolActivity),
      coverageOverview: row.coverageOverview,
      sourceSummary: row.sourceSummary,
      raw: row.raw
    });
  }

  private async buildSingleAgentSnapshot(scanId: string): Promise<ExecutionReportSnapshot> {
    const [scan, report, vulnerabilities, layers, scanRow, application] = await Promise.all([
      getSingleAgentScan(scanId),
      getSingleAgentScanReport(scanId),
      getSecurityVulnerabilitiesForScan(scanId),
      getLayerCoverageForScan(scanId),
      prisma.scanRun.findUnique({ where: { id: scanId } }),
      prisma.scanRun.findUnique({ where: { id: scanId } }).then(async (row) => {
        if (!row?.applicationId) {
          return null;
        }
        return prisma.application.findUnique({ where: { id: row.applicationId } });
      })
    ]);

    if (!scan || !report || !scanRow) {
      throw new RequestError(404, "Execution report source run not found.");
    }
    if (!scan.completedAt || (scan.status !== "complete" && scan.status !== "failed" && scan.status !== "aborted")) {
      throw new RequestError(400, "Execution report can only be created after the single-agent scan finishes.");
    }

    const findings = vulnerabilities.map(executionReportFindingFromVulnerability);
    const title = application?.name ?? "Single-agent scan";
    return {
      executionId: scan.id,
      executionKind: "single-agent",
      sourceDefinitionId: null,
      status: normalizeExecutionReportStatus(scan.status),
      title,
      targetLabel: scan.scope.targets[0] ?? scan.id,
      sourceLabel: title,
      findingsCount: findings.length,
      highestSeverity: summarizeHighestSeverity(findings),
      generatedAt: scan.completedAt,
      updatedAt: scan.completedAt,
      executiveSummary: report.executiveSummary,
      findings,
      toolActivity: [],
      coverageOverview: report.coverageOverview,
      sourceSummary: {
        executionKind: "single-agent",
        scanId: scan.id,
        applicationId: scan.applicationId,
        runtimeId: scan.runtimeId,
        stopReason: report.stopReason,
        totalVulnerabilities: report.totalVulnerabilities,
        topVulnerabilityIds: report.topVulnerabilities.map((item) => item.id)
      },
      raw: {
        layers,
        scanSummary: scanRow.summary ?? null
      }
    };
  }

  private async buildWorkflowSnapshot(runId: string): Promise<ExecutionReportSnapshot> {
    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        workflow: {
          include: { stages: true }
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

    const findings = getWorkflowReportedFindings(workflowRun).map(executionReportFindingFromWorkflowFinding);
    const toolActivity = workflowRun.events
      .filter((event) => event.type === "tool_result")
      .map((event) => executionReportToolActivitySchema.parse({
        id: event.id,
        executionId: workflowRun.id,
        executionKind: workflowRun.executionKind,
        phase: event.title,
        toolId: typeof event.payload["toolId"] === "string" ? event.payload["toolId"] : null,
        toolName: typeof event.payload["toolName"] === "string" ? event.payload["toolName"] : "Tool",
        command: typeof event.payload["commandPreview"] === "string" ? event.payload["commandPreview"] : event.summary,
        status: event.status === "failed" ? "failed" : "completed",
        outputPreview: event.detail,
        exitCode: null,
        startedAt: event.createdAt,
        completedAt: event.createdAt
      }));

    const closeoutEvent = workflowRun.events
      .filter((event) => event.type === "run_completed" || event.type === "run_failed")
      .slice()
      .sort((left, right) => right.ord - left.ord)[0] ?? null;
    const closeoutPayload = closeoutEvent?.payload && typeof closeoutEvent.payload === "object" && !Array.isArray(closeoutEvent.payload)
      ? closeoutEvent.payload as Record<string, unknown>
      : {};
    const planEvent = workflowRun.events
      .filter((event) => event.type === "system_message" && typeof event.payload["plan"] === "object")
      .slice()
      .sort((left, right) => right.ord - left.ord)[0] ?? null;
    const overallRisk = planEvent?.payload && typeof planEvent.payload === "object" && !Array.isArray(planEvent.payload)
      && typeof (planEvent.payload as Record<string, unknown>)["plan"] === "object"
      && (planEvent.payload as Record<string, unknown>)["plan"] !== null
      && typeof ((planEvent.payload as Record<string, unknown>)["plan"] as Record<string, unknown>)["overallRisk"] === "string"
      ? ((planEvent.payload as Record<string, unknown>)["plan"] as Record<string, unknown>)["overallRisk"] as "critical" | "high" | "medium" | "low"
      : null;
    const executionKind = normalizeExecutionKind(workflowRun.executionKind)
      ?? normalizeExecutionKind(run.workflow.executionKind)
      ?? "workflow";

    return {
      executionId: workflowRun.id,
      executionKind,
      sourceDefinitionId: run.workflowId,
      status: normalizeExecutionReportStatus(workflowRun.status),
      title: run.workflow.name,
      targetLabel: run.targetAssetId ?? run.workflow.applicationId,
      sourceLabel: run.workflow.name,
      findingsCount: findings.length,
      highestSeverity: summarizeHighestSeverity(findings),
      generatedAt: run.completedAt.toISOString(),
      updatedAt: run.completedAt.toISOString(),
      executiveSummary: report.executiveSummary,
      findings,
      toolActivity,
      coverageOverview: report.coverageOverview,
      sourceSummary: executionKind === "attack-map"
        ? {
            executionKind: "attack-map",
            runId: workflowRun.id,
            phase: typeof closeoutPayload["phase"] === "string" ? closeoutPayload["phase"] : "workflow",
            overallRisk,
            chainCount: typeof closeoutPayload["chainCount"] === "number" ? closeoutPayload["chainCount"] : 0,
            findingNodeCount: typeof closeoutPayload["findingNodeCount"] === "number" ? closeoutPayload["findingNodeCount"] : findings.length
          }
        : {
            executionKind: "workflow",
            runId: workflowRun.id,
            workflowId: run.workflowId,
            stopReason: report.stopReason,
            totalFindings: report.totalFindings,
            topFindingIds: report.topFindings.map((item) => item.id)
          },
      raw: {
        eventCount: workflowRun.events.length
      }
    };
  }

  private async buildAttackMapSnapshot(runId: string): Promise<ExecutionReportSnapshot> {
    const run = await prisma.orchestratorRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new RequestError(404, "Execution report source run not found.");
    }
    if (run.status !== "completed" && run.status !== "failed") {
      throw new RequestError(400, "Execution report can only be created after the attack-map run finishes.");
    }

    const findings = parseFindings(run.findings ?? []);
    const toolActivity = parseToolActivity(run.toolActivity ?? []);
    const plan = run.plan && typeof run.plan === "object" && !Array.isArray(run.plan) ? run.plan as Record<string, unknown> : null;
    const mapNodes = Array.isArray(run.mapNodes) ? run.mapNodes as Array<Record<string, unknown>> : [];

    return {
      executionId: run.id,
      executionKind: "attack-map",
      sourceDefinitionId: null,
      status: normalizeExecutionReportStatus(run.status),
      title: "Attack map run",
      targetLabel: run.targetUrl,
      sourceLabel: "Attack map",
      findingsCount: findings.length,
      highestSeverity: summarizeHighestSeverity(findings),
      generatedAt: run.updatedAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
      executiveSummary: run.summary ?? "The attack-map run completed without a closeout summary.",
      findings,
      toolActivity,
      coverageOverview: {},
      sourceSummary: {
        executionKind: "attack-map",
        runId: run.id,
        phase: run.phase,
        overallRisk: typeof plan?.["overallRisk"] === "string" ? plan["overallRisk"] as "critical" | "high" | "medium" | "low" : null,
        chainCount: mapNodes.filter((node) => node["type"] === "chain").length,
        findingNodeCount: mapNodes.filter((node) => node["type"] === "finding").length
      },
      raw: {
        mapNodeCount: mapNodes.length,
        mapEdgeCount: Array.isArray(run.mapEdges) ? run.mapEdges.length : 0
      }
    };
  }
}
