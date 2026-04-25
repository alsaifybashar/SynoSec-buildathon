import {
  executionReportFindingSchema,
  executionReportToolActivitySchema,
  type ExecutionReportFinding,
  type ExecutionReportToolActivity
} from "@synosec/contracts";
import { prisma } from "@/shared/database/prisma-client.js";
import type { ToolSelectionPatternBias } from "./tool-selector.js";

type PatternReportInput = {
  id: string;
  targetLabel: string;
  findings: unknown;
  toolActivity: unknown;
};

type VerificationEventInput = {
  payload: unknown;
  status: string;
};

type EscalationRouteInput = {
  technique: string;
  crossHost: boolean;
  confidence: number;
};

export type ToolTargetPattern = {
  toolId: string | null;
  toolName: string;
  category: string | null;
  targetType: string;
  sampleCount: number;
  findingCount: number;
  promotedCount: number;
  rejectedCount: number;
  confirmationRate: number;
  falsePositiveRate: number;
  bias: number;
};

export type AssertionPattern = {
  status: string;
  sampleCount: number;
  acceptedCount: number;
  rejectedCount: number;
};

export type EscalationRoutePattern = {
  routeType: string;
  sampleCount: number;
  acceptedCount: number;
  rejectedCount: number;
  acceptanceRate: number;
};

export type CrossScanPatternLearningSnapshot = {
  generatedAt: string;
  completedReportCount: number;
  toolTargetPatterns: ToolTargetPattern[];
  assertionPatterns: AssertionPattern[];
  escalationRoutePatterns: EscalationRoutePattern[];
  toolSelectionBiases: ToolSelectionPatternBias[];
};

const promotedValidationStatuses = new Set(["single_source", "cross_validated", "reproduced"]);
const rejectedValidationStatuses = new Set(["suspected", "rejected"]);

function parseFindings(value: unknown): ExecutionReportFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => executionReportFindingSchema.safeParse(entry))
    .filter((entry): entry is { success: true; data: ExecutionReportFinding } => entry.success)
    .map((entry) => entry.data);
}

function parseToolActivity(value: unknown): ExecutionReportToolActivity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => executionReportToolActivitySchema.safeParse(entry))
    .filter((entry): entry is { success: true; data: ExecutionReportToolActivity } => entry.success)
    .map((entry) => entry.data);
}

export function inferPatternTargetType(input: {
  targetLabel?: string | null;
  categories?: string[];
  technologies?: string[];
}): string {
  const text = [
    input.targetLabel ?? "",
    ...(input.categories ?? []),
    ...(input.technologies ?? [])
  ].join(" ").toLowerCase();

  if (/\b(express|node\.?js|npm)\b/.test(text)) return "node-express";
  if (/\b(jwt|session|auth|login|oauth)\b/.test(text)) return "auth-session";
  if (/\b(tls|ssl|certificate|cipher)\b/.test(text)) return "tls-service";
  if (/\b(cidr|subnet|gateway|segment|topology)\b/.test(text) || /\d+\.\d+\.\d+\.\d+\/\d+/.test(text)) return "network-segment";
  if (/^https?:\/\//.test(text) || /\b(http|web|xss|sqli|header|path)\b/.test(text)) return "web-http";
  if (/\d+\.\d+\.\d+\.\d+/.test(text) || /\b(port|service|banner)\b/.test(text)) return "network-service";
  return "generic";
}

export function buildCrossScanPatternLearningSnapshotFromRows(input: {
  reports: PatternReportInput[];
  verificationEvents?: VerificationEventInput[];
  escalationRoutes?: EscalationRouteInput[];
}): CrossScanPatternLearningSnapshot {
  const patternBuckets = new Map<string, {
    toolId: string | null;
    toolName: string;
    category: string | null;
    targetType: string;
    sampleCount: number;
    findingCount: number;
    promotedCount: number;
    rejectedCount: number;
  }>();

  for (const report of input.reports) {
    const findings = parseFindings(report.findings);
    const toolActivity = parseToolActivity(report.toolActivity);
    const targetType = inferPatternTargetType({
      targetLabel: report.targetLabel,
      categories: findings.map((finding) => finding.type)
    });
    const toolsByName = new Map(toolActivity.map((activity) => [activity.toolName.toLowerCase(), activity]));
    const toolsById = new Map(toolActivity.flatMap((activity) => activity.toolId ? [[activity.toolId, activity] as const] : []));
    const sampledTools = new Map<string, ExecutionReportToolActivity>();
    for (const activity of toolActivity) {
      if (activity.status === "completed") {
        sampledTools.set(activity.toolId ?? activity.toolName, activity);
      }
    }

    for (const activity of sampledTools.values()) {
      const key = `${activity.toolId ?? activity.toolName}|${targetType}`;
      const existing = patternBuckets.get(key) ?? {
        toolId: activity.toolId,
        toolName: activity.toolName,
        category: null,
        targetType,
        sampleCount: 0,
        findingCount: 0,
        promotedCount: 0,
        rejectedCount: 0
      };
      existing.sampleCount += 1;
      patternBuckets.set(key, existing);
    }

    for (const finding of findings) {
      const sourceTools = finding.sourceToolIds.length > 0
        ? finding.sourceToolIds
        : finding.evidence.map((item) => item.sourceTool);
      for (const sourceTool of sourceTools) {
        const activity = toolsById.get(sourceTool) ?? toolsByName.get(sourceTool.toLowerCase());
        const toolId = activity?.toolId ?? sourceTool;
        const toolName = activity?.toolName ?? sourceTool;
        const key = `${toolId}|${targetType}`;
        const existing = patternBuckets.get(key) ?? {
          toolId,
          toolName,
          category: finding.type,
          targetType,
          sampleCount: 0,
          findingCount: 0,
          promotedCount: 0,
          rejectedCount: 0
        };
        existing.category ??= finding.type;
        existing.findingCount += 1;
        const validationStatus = inferFindingValidationStatus(finding);
        if (promotedValidationStatuses.has(validationStatus)) {
          existing.promotedCount += 1;
        } else if (rejectedValidationStatuses.has(validationStatus)) {
          existing.rejectedCount += 1;
        }
        patternBuckets.set(key, existing);
      }
    }
  }

  const toolTargetPatterns = [...patternBuckets.values()]
    .map((bucket) => {
      const evaluatedFindings = bucket.promotedCount + bucket.rejectedCount;
      const confirmationRate = evaluatedFindings > 0 ? bucket.promotedCount / evaluatedFindings : 0;
      const falsePositiveRate = evaluatedFindings > 0 ? bucket.rejectedCount / evaluatedFindings : 0;
      return {
        ...bucket,
        confirmationRate,
        falsePositiveRate,
        bias: calculateBias(bucket.sampleCount, confirmationRate, falsePositiveRate)
      } satisfies ToolTargetPattern;
    })
    .sort((left, right) => right.bias - left.bias || right.sampleCount - left.sampleCount || left.toolName.localeCompare(right.toolName));

  const assertionPatterns = buildAssertionPatterns(input.verificationEvents ?? []);
  const escalationRoutePatterns = buildEscalationRoutePatterns(input.escalationRoutes ?? []);

  return {
    generatedAt: new Date().toISOString(),
    completedReportCount: input.reports.length,
    toolTargetPatterns,
    assertionPatterns,
    escalationRoutePatterns,
    toolSelectionBiases: toolTargetPatterns
      .filter((pattern) => pattern.sampleCount >= 2 && pattern.bias !== 0)
      .slice(0, 25)
      .map((pattern) => ({
        toolId: pattern.toolId,
        toolName: pattern.toolName,
        category: pattern.category,
        targetType: pattern.targetType,
        bias: pattern.bias,
        sampleCount: pattern.sampleCount,
        confirmationRate: pattern.confirmationRate,
        falsePositiveRate: pattern.falsePositiveRate,
        reason: `Cross-scan ${pattern.targetType} history: ${(pattern.confirmationRate * 100).toFixed(0)}% confirmed, ${(pattern.falsePositiveRate * 100).toFixed(0)}% rejected across ${pattern.sampleCount} completed run(s).`
      }))
  };
}

export async function buildCrossScanPatternLearningSnapshot(limit = 200): Promise<CrossScanPatternLearningSnapshot> {
  const [reports, verificationEvents, escalationRoutes] = await Promise.all([
    prisma.executionReport.findMany({
      where: { sourceStatus: "completed" },
      orderBy: { generatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        targetLabel: true,
        findings: true,
        toolActivity: true
      }
    }),
    prisma.workflowTraceEvent.findMany({
      where: { type: "verification" },
      orderBy: { createdAt: "desc" },
      take: limit * 5,
      select: {
        status: true,
        payload: true
      }
    }),
    prisma.escalationRoute.findMany({
      where: { scanRun: { status: "complete" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        technique: true,
        crossHost: true,
        confidence: true
      }
    })
  ]);

  return buildCrossScanPatternLearningSnapshotFromRows({
    reports: reports.map((report) => ({
      id: report.id,
      targetLabel: report.targetLabel,
      findings: report.findings,
      toolActivity: report.toolActivity
    })),
    verificationEvents: verificationEvents.map((event) => ({
      status: event.status,
      payload: event.payload
    })),
    escalationRoutes
  });
}

function inferFindingValidationStatus(finding: ExecutionReportFinding): string {
  if (typeof finding.confidence === "number" && finding.confidence >= 0.8) {
    return "single_source";
  }

  if (finding.evidence.length > 0) {
    return "single_source";
  }

  return "suspected";
}

function calculateBias(sampleCount: number, confirmationRate: number, falsePositiveRate: number) {
  if (sampleCount < 2) {
    return 0;
  }

  const confidenceWeight = Math.min(1, sampleCount / 8);
  const rawBias = (confirmationRate * 0.25) - (falsePositiveRate * 0.35);
  return Number((Math.max(-0.25, Math.min(0.25, rawBias * confidenceWeight))).toFixed(3));
}

function buildAssertionPatterns(events: VerificationEventInput[]): AssertionPattern[] {
  const buckets = new Map<string, AssertionPattern>();

  for (const event of events) {
    const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
      ? event.payload as Record<string, unknown>
      : {};
    const status = typeof payload["status"] === "string"
      ? payload["status"]
      : event.status === "failed" ? "rejected" : "single_source";
    const existing = buckets.get(status) ?? {
      status,
      sampleCount: 0,
      acceptedCount: 0,
      rejectedCount: 0
    };
    existing.sampleCount += 1;
    if (promotedValidationStatuses.has(status)) {
      existing.acceptedCount += 1;
    } else if (rejectedValidationStatuses.has(status) || event.status === "failed") {
      existing.rejectedCount += 1;
    }
    buckets.set(status, existing);
  }

  return [...buckets.values()].sort((left, right) => right.sampleCount - left.sampleCount);
}

function buildEscalationRoutePatterns(routes: EscalationRouteInput[]): EscalationRoutePattern[] {
  const buckets = new Map<string, EscalationRoutePattern>();

  for (const route of routes) {
    const routeType = route.crossHost ? "cross-host" : route.technique;
    const existing = buckets.get(routeType) ?? {
      routeType,
      sampleCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      acceptanceRate: 0
    };
    existing.sampleCount += 1;
    if (route.confidence >= 0.7) {
      existing.acceptedCount += 1;
    } else {
      existing.rejectedCount += 1;
    }
    existing.acceptanceRate = existing.acceptedCount / existing.sampleCount;
    buckets.set(routeType, existing);
  }

  return [...buckets.values()].sort((left, right) => right.acceptanceRate - left.acceptanceRate || right.sampleCount - left.sampleCount);
}
