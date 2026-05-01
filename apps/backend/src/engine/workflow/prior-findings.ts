import type { WorkflowReportedFinding } from "@synosec/contracts";

export type FormatPriorFindingLineageOptions = {
  maxFindings?: number;
  perFindingSummaryLength?: number;
};

const DEFAULT_MAX_FINDINGS = 25;
const DEFAULT_SUMMARY_LENGTH = 140;

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function pickFindingSummary(finding: WorkflowReportedFinding): string {
  const explanation = (finding.explanationSummary ?? "").trim();
  if (explanation.length > 0) {
    return explanation;
  }
  const firstQuote = finding.evidence.find((entry) => entry.quote.trim().length > 0)?.quote.trim() ?? "";
  return firstQuote;
}

function pickFindingSource(finding: WorkflowReportedFinding): { sourceTool: string; toolRunRef: string | null } {
  const evidenceWithSource = finding.evidence.find((entry) => entry.sourceTool && entry.sourceTool.trim().length > 0);
  const sourceTool = evidenceWithSource?.sourceTool ?? "unknown";
  const toolRunRef = finding.evidence.find((entry) => entry.toolRunRef && entry.toolRunRef.length > 0)?.toolRunRef ?? null;
  return { sourceTool, toolRunRef };
}

export function formatPriorFindingLineage(
  findings: readonly WorkflowReportedFinding[],
  options: FormatPriorFindingLineageOptions = {}
): string | null {
  if (findings.length === 0) {
    return null;
  }
  const maxFindings = options.maxFindings ?? DEFAULT_MAX_FINDINGS;
  const summaryLength = options.perFindingSummaryLength ?? DEFAULT_SUMMARY_LENGTH;

  const ordered = [...findings].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const visible = ordered.slice(-maxFindings);
  const overflow = ordered.length - visible.length;

  const lines: string[] = ["## Prior findings & lineage"];
  for (const finding of visible) {
    const { sourceTool, toolRunRef } = pickFindingSource(finding);
    const sourceLabel = toolRunRef ? `${sourceTool}/${toolRunRef}` : sourceTool;
    const summary = truncate(pickFindingSummary(finding), summaryLength) || finding.title;
    lines.push(`- [${finding.id}] "${finding.title}" — severity=${finding.severity}, source=${sourceLabel}, summary: ${summary}`);
  }
  if (overflow > 0) {
    lines.push(`…and ${overflow} more earlier finding${overflow === 1 ? "" : "s"}.`);
  }
  return lines.join("\n");
}
