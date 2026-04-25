import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronRight } from "lucide-react";
import { DetailFieldGroup, DetailPage } from "@/shared/components/detail-page";
import { mockReportDetail } from "@/features/designs/report-mock-detail";
import {
  MARKDOWN_COMPONENTS_COMPACT,
  MetaInline,
  ReportPageActions,
  SEVERITY_STROKE,
  chainForFinding,
  toolEvidenceForFinding,
  type ToolEvidence
} from "@/features/designs/finding-shared";

function ToolChip({
  tool,
  active,
  onClick
}: {
  tool: ToolEvidence;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.7rem] transition ${
        active
          ? "border-foreground/60 bg-foreground/5 text-foreground"
          : "border-border/70 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      <span aria-hidden className="text-[0.65rem] opacity-60">⚙</span>
      <span>{tool.toolName}</span>
    </button>
  );
}

function FindingRow({
  finding,
  expanded,
  onToggle
}: {
  finding: typeof mockReportDetail.findings[number];
  expanded: boolean;
  onToggle: () => void;
}) {
  const evidence = useMemo(() => toolEvidenceForFinding(finding, mockReportDetail.toolActivity), [finding]);
  const chain = chainForFinding(mockReportDetail, finding.id);
  const [activeTool, setActiveTool] = useState<string | null>(evidence[0]?.toolName ?? null);
  const stroke = SEVERITY_STROKE[finding.severity];
  const tool = evidence.find((t) => t.toolName === activeTool) ?? null;

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-2.5 text-left transition hover:bg-muted/30"
        aria-expanded={expanded}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden
        />
        <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: stroke }} />
        <span className="w-16 shrink-0 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-muted-foreground">
          {finding.severity}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-foreground">{finding.title}</span>
        <span className="hidden truncate font-mono text-[0.7rem] text-muted-foreground md:inline md:max-w-[28ch]">
          {finding.targetLabel}
        </span>
        {chain ? (
          <span className="ml-2 inline-flex items-center rounded-full border border-rose-500/40 px-1.5 py-0 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-rose-600 dark:text-rose-300">
            ⛓
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div className="space-y-3 pb-4 pl-7 pr-2">
          <p className="text-sm leading-6 text-muted-foreground">{finding.summary}</p>
          {finding.recommendation ? (
            <p className="text-sm leading-6 text-foreground/90">
              <span className="mr-1 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">do</span>
              {finding.recommendation}
            </p>
          ) : null}
          {chain ? (
            <p className="text-xs leading-5 text-muted-foreground">
              <span className="mr-1 font-mono uppercase tracking-[0.22em] text-rose-500/80">⛓ chain</span>
              {chain.title}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">evidence</span>
            {evidence.map((t) => (
              <ToolChip
                key={t.toolName}
                tool={t}
                active={t.toolName === activeTool}
                onClick={() => setActiveTool(t.toolName === activeTool ? null : t.toolName)}
              />
            ))}
          </div>
          {tool ? (
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
              {tool.command ? (
                <pre className="overflow-x-auto font-mono text-[0.72rem] leading-5 text-foreground">$ {tool.command}</pre>
              ) : null}
              {tool.quote ? (
                <pre className="mt-1 overflow-x-auto font-mono text-[0.72rem] leading-5 text-muted-foreground">
                  {tool.quote}
                </pre>
              ) : null}
              {tool.outputPreview ? (
                <pre className="mt-1 max-h-32 overflow-auto font-mono text-[0.7rem] leading-5 text-muted-foreground">
                  {tool.outputPreview}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DesignReportFindingList() {
  const report = mockReportDetail;
  const [openId, setOpenId] = useState<string | null>(report.findings[0]?.id ?? null);

  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", "Finding · list"]}
      subtitle={report.executionId}
      timestamp={new Date(report.updatedAt).toLocaleString()}
      isDirty={false}
      onBack={() => undefined}
      onSave={() => undefined}
      onDismiss={() => undefined}
      onExportJson={() => undefined}
      actions={<ReportPageActions />}
    >
      <DetailFieldGroup className="bg-card/70">
        <div className="col-span-full space-y-3">
          <MetaInline report={report} />
          <article className="max-w-[72ch]">
            <ReactMarkdown components={MARKDOWN_COMPONENTS_COMPACT}>{report.executiveSummary}</ReactMarkdown>
          </article>
        </div>
      </DetailFieldGroup>

      <DetailFieldGroup className="bg-card/70">
        <div className="col-span-full">
          <div className="flex items-baseline justify-between pb-2">
            <span className="font-mono text-eyebrow font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Findings · {report.findings.length}
            </span>
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-muted-foreground">
              expand · click ⚙ for evidence
            </span>
          </div>
          <div className="rounded-md border border-border/60 bg-background/50 px-3">
            {report.findings.map((finding) => (
              <FindingRow
                key={finding.id}
                finding={finding}
                expanded={openId === finding.id}
                onToggle={() => setOpenId(openId === finding.id ? null : finding.id)}
              />
            ))}
          </div>
        </div>
      </DetailFieldGroup>
    </DetailPage>
  );
}
