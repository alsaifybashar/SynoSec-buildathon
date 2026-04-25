import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown } from "lucide-react";
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

function ZenMiniMap({
  finding,
  evidence,
  hasChain,
  selectedTool,
  onSelectTool
}: {
  finding: typeof mockReportDetail.findings[number];
  evidence: ToolEvidence[];
  hasChain: boolean;
  selectedTool: string | null;
  onSelectTool: (tool: string | null) => void;
}) {
  const w = 220;
  const h = 150;
  const cx = w / 2;
  const cy = h / 2 + (hasChain ? 6 : 0);
  const r = Math.min(w, h) * 0.32;
  const stroke = SEVERITY_STROKE[finding.severity];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      {hasChain ? (
        <g>
          <line x1={cx} y1={cy - 18} x2={cx} y2={10} stroke={stroke} strokeOpacity="0.5" strokeDasharray="2 3" />
          <text x={cx} y={9} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={8} fill={stroke}>⛓</text>
        </g>
      ) : null}
      {evidence.map((ev, i) => {
        const angle = (i / Math.max(evidence.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const isSel = selectedTool === ev.toolName;
        return (
          <g key={ev.toolName}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={isSel ? 0.5 : 0.15} strokeWidth={0.8} />
            <g
              className="cursor-pointer"
              onClick={() => onSelectTool(isSel ? null : ev.toolName)}
            >
              <circle cx={x} cy={y} r={6} fill="var(--background)" stroke="currentColor" strokeOpacity={isSel ? 0.85 : 0.5} strokeWidth={isSel ? 1.6 : 1} />
              <text x={x} y={y + 2} textAnchor="middle" fill="currentColor" fontSize={6} fontFamily="ui-monospace, monospace">⚙</text>
            </g>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={14} fill="var(--background)" stroke={stroke} strokeWidth={1.6} />
      <text x={cx} y={cy + 3} textAnchor="middle" fill={stroke} fontSize={7} fontFamily="ui-monospace, monospace" letterSpacing="2">FIND</text>
    </svg>
  );
}

function ZenCard({
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
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const stroke = SEVERITY_STROKE[finding.severity];
  const tool = evidence.find((t) => t.toolName === activeTool) ?? null;

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-background/40 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/20"
        aria-expanded={expanded}
      >
        <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: stroke }} />
        <span className="w-14 shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          {finding.severity}
        </span>
        <span className="flex-1 truncate text-sm text-foreground">{finding.title}</span>
        <span className="hidden truncate font-mono text-[0.66rem] text-muted-foreground md:inline md:max-w-[24ch]">
          {finding.targetLabel}
        </span>
        {chain ? <span className="font-mono text-[0.62rem] text-rose-500/80">⛓</span> : null}
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="border-t border-border/40 px-4 py-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
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
              {tool ? (
                <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-foreground/90">
                  <div className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                    Tool · {tool.toolName}
                  </div>
                  {tool.command ? (
                    <pre className="mt-1 overflow-x-auto font-mono text-[0.72rem] leading-5 text-foreground">$ {tool.command}</pre>
                  ) : null}
                  {tool.quote ? (
                    <pre className="mt-1 overflow-x-auto font-mono text-[0.72rem] leading-5 text-muted-foreground">{tool.quote}</pre>
                  ) : null}
                  {tool.outputPreview ? (
                    <pre className="mt-1 max-h-32 overflow-auto font-mono text-[0.7rem] leading-5 text-muted-foreground">{tool.outputPreview}</pre>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="text-foreground/70">
              <ZenMiniMap
                finding={finding}
                evidence={evidence}
                hasChain={!!chain}
                selectedTool={activeTool}
                onSelectTool={setActiveTool}
              />
              <div className="mt-1 text-center font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                {evidence.length} tools · click ⚙
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DesignReportFindingZen() {
  const report = mockReportDetail;
  const [openId, setOpenId] = useState<string | null>(report.findings[0]?.id ?? null);

  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", "Finding · zen"]}
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
          <article className="max-w-[68ch]">
            <ReactMarkdown components={MARKDOWN_COMPONENTS_COMPACT}>{report.executiveSummary}</ReactMarkdown>
          </article>
        </div>
      </DetailFieldGroup>

      <DetailFieldGroup className="bg-card/70">
        <div className="col-span-full space-y-2">
          <div className="font-mono text-eyebrow font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Findings · {report.findings.length}
          </div>
          <div className="space-y-1.5">
            {report.findings.map((finding) => (
              <ZenCard
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
