import { useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { ExecutionReportDetail, ExecutionReportFinding } from "@synosec/contracts";
import { DetailFieldGroup, DetailPage } from "@/shared/components/detail-page";
import { mockReportDetail } from "@/features/designs/report-mock-detail";
import {
  MARKDOWN_COMPONENTS_COMPACT,
  MetaInline,
  ReportPageActions,
  SEVERITY_STROKE,
  toolEvidenceForFinding,
  type ToolEvidence
} from "@/features/designs/finding-shared";
import { chainNodeForFinding } from "@/features/designs/node-map";
import { cn } from "@/shared/lib/utils";

/**
 * Shared frame for "alternate attack-vector" designs. Mirrors the real
 * findings view in execution-reports/findings-table-view.tsx (left list +
 * right inspector) and lets each design swap only the small inline
 * attack-vector visualization in the inspector header.
 */

export type VectorGraphRenderArgs = {
  finding: ExecutionReportFinding;
  evidence: ToolEvidence[];
  allFindings: ExecutionReportFinding[];
  report: ExecutionReportDetail;
};

const SEVERITY_DOT: Record<ExecutionReportFinding["severity"], string> = {
  info: "bg-slate-400",
  low: "bg-blue-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-600"
};

function FindingListItem({
  finding,
  index,
  selected,
  onClick
}: {
  finding: ExecutionReportFinding;
  index: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2.5 border-l-2 px-3 py-1.5 text-left transition",
        selected
          ? "border-l-foreground bg-muted/40"
          : "border-l-transparent hover:border-l-border hover:bg-muted/20"
      )}
    >
      <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[finding.severity])} />
      <span className="w-5 shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm leading-tight text-foreground">{finding.title}</span>
      {finding.confidence !== null ? (
        <span className="shrink-0 font-mono text-[0.6rem] tabular-nums text-muted-foreground">
          {finding.confidence.toFixed(2)}
        </span>
      ) : null}
    </button>
  );
}

function InspectorSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-border/50 pt-5 first:border-t-0 first:pt-0">
      <p className="mb-2 font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <div className="text-sm leading-6 text-foreground/90">{children}</div>
    </section>
  );
}

function FindingInspector({
  finding,
  report,
  graphLabel,
  renderGraph
}: {
  finding: ExecutionReportFinding;
  report: ExecutionReportDetail;
  graphLabel: string;
  renderGraph: (args: VectorGraphRenderArgs) => ReactNode;
}) {
  const evidence = useMemo(
    () => toolEvidenceForFinding(finding, report.toolActivity),
    [finding, report.toolActivity]
  );
  const chain = useMemo(() => chainNodeForFinding(report, finding.id), [report, finding.id]);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold leading-tight text-foreground">{finding.title}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
          <span>{finding.type}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{finding.targetLabel}</span>
          {finding.validationStatus ? (
            <>
              <span aria-hidden>·</span>
              <span>{finding.validationStatus.replaceAll("_", " ")}</span>
            </>
          ) : null}
        </div>
        <div className="space-y-1.5 rounded-md border border-border/60 bg-background/30 px-3 py-2.5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground/80">
            {graphLabel}
          </p>
          {renderGraph({ finding, evidence, allFindings: report.findings, report })}
        </div>
      </header>

      <section className="space-y-3">
        <p className="text-sm leading-6 text-foreground/90">{finding.summary}</p>
        {finding.explanationSummary ? (
          <p className="border-l-2 border-border/70 pl-3 text-sm leading-6 text-muted-foreground">
            {finding.explanationSummary}
          </p>
        ) : null}
      </section>

      {finding.evidence.length > 0 ? (
        <InspectorSection label={`Evidence · ${finding.evidence.length}`}>
          <ul className="space-y-3">
            {finding.evidence.map((ev, index) => (
              <li key={`${finding.id}:evidence:${index}`} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
                  <span className="font-mono uppercase tracking-[0.14em] text-foreground/80">{ev.sourceTool}</span>
                  {ev.toolRunRef ? (
                    <span className="font-mono text-[0.65rem]">tool:{ev.toolRunRef.slice(0, 8)}</span>
                  ) : null}
                  {ev.observationRef ? (
                    <span className="font-mono text-[0.65rem]">obs:{ev.observationRef.slice(0, 8)}</span>
                  ) : null}
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-mono text-[0.72rem] leading-5 text-muted-foreground">
                  {ev.quote}
                </pre>
              </li>
            ))}
          </ul>
        </InspectorSection>
      ) : null}

      {finding.confidenceReason ? (
        <InspectorSection label="Verification">
          <p>{finding.confidenceReason}</p>
        </InspectorSection>
      ) : null}

      {chain ? (
        <InspectorSection label="Attack chain">
          <p className="text-sm font-medium text-foreground">{chain.title}</p>
          <p className="text-sm text-muted-foreground">{chain.summary}</p>
        </InspectorSection>
      ) : null}

      {finding.recommendation ? (
        <section className="border-t border-border/50 pt-5">
          <div className="rounded-md border-l-2 border-l-primary bg-primary/5 px-4 py-3">
            <p className="mb-1.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-primary">
              Recommendation
            </p>
            <p className="text-sm leading-6 text-foreground/90">{finding.recommendation}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function FindingsAlternativeFrame({
  breadcrumbLabel,
  graphLabel,
  renderGraph,
  renderAfterFindings
}: {
  breadcrumbLabel: string;
  graphLabel: string;
  renderGraph: (args: VectorGraphRenderArgs) => ReactNode;
  renderAfterFindings?: (args: {
    report: ExecutionReportDetail;
    selectedFinding: ExecutionReportFinding;
    evidence: ToolEvidence[];
  }) => ReactNode;
}) {
  const report = mockReportDetail;
  const [selectedId, setSelectedId] = useState<string>(report.findings[0]?.id ?? "");
  const selected = report.findings.find((f) => f.id === selectedId) ?? report.findings[0]!;
  const selectedEvidence = useMemo(
    () => toolEvidenceForFinding(selected, report.toolActivity),
    [report.toolActivity, selected]
  );

  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", breadcrumbLabel]}
      subtitle={report.executionId}
      timestamp={new Date(report.updatedAt).toLocaleString()}
      isDirty={false}
      onBack={() => undefined}
      onSave={() => undefined}
      onDismiss={() => undefined}
      onExportJson={() => undefined}
      actions={<ReportPageActions />}
    >
      <DetailFieldGroup title="Executive Summary" className="bg-card/70">
        <div className="col-span-full space-y-3">
          <MetaInline report={report} />
          <ReactMarkdown components={MARKDOWN_COMPONENTS_COMPACT}>{report.executiveSummary}</ReactMarkdown>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 px-2 py-1">{report.sourceLabel}</span>
            <span className="rounded-full border border-border/70 px-2 py-1">{report.targetLabel}</span>
          </div>
        </div>
      </DetailFieldGroup>

      <DetailFieldGroup title="Findings" className="bg-card/70">
        <div className="col-span-full">
          <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
            <div className="max-h-[640px] overflow-y-auto border-b border-border/40 lg:border-b-0 lg:border-r">
              <ul className="divide-y divide-border/20">
                {report.findings.map((f, i) => (
                  <li key={f.id}>
                    <FindingListItem
                      finding={f}
                      index={i}
                      selected={f.id === selected.id}
                      onClick={() => setSelectedId(f.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div className="max-h-[640px] overflow-y-auto px-5 py-5 lg:px-6">
              <FindingInspector
                finding={selected}
                report={report}
                graphLabel={graphLabel}
                renderGraph={renderGraph}
              />
            </div>
          </div>
        </div>
      </DetailFieldGroup>

      {renderAfterFindings
        ? renderAfterFindings({
            report,
            selectedFinding: selected,
            evidence: selectedEvidence
          })
        : null}
    </DetailPage>
  );
}

export { SEVERITY_STROKE };
