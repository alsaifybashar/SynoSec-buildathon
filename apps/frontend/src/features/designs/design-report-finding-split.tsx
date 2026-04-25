import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
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

function MiniMap({
  finding,
  evidence,
  chainTitle,
  selectedTool,
  onSelectTool
}: {
  finding: typeof mockReportDetail.findings[number];
  evidence: ToolEvidence[];
  chainTitle: string | null;
  selectedTool: string | null;
  onSelectTool: (tool: string | null) => void;
}) {
  const w = 360;
  const h = 220;
  const cx = w / 2;
  const cy = h / 2 + 8;
  const r = Math.min(w, h) * 0.34;
  const stroke = SEVERITY_STROKE[finding.severity];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block w-full">
      <defs>
        <radialGradient id="split-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={r + 12} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 5" />
      <circle cx={cx} cy={cy} r={56} fill="url(#split-halo)" pointerEvents="none" />

      {chainTitle ? (
        <g>
          <line x1={cx} y1={cy - 24} x2={cx} y2={20} stroke={stroke} strokeWidth={1.2} strokeOpacity="0.6" />
          <rect x={cx - 70} y={6} width={140} height={22} rx={5} fill="none" stroke={stroke} strokeWidth={1.2} />
          <text x={cx} y={21} textAnchor="middle" fill={stroke} fontSize={9} fontFamily="ui-monospace, monospace">
            ⛓ {chainTitle.length > 20 ? `${chainTitle.slice(0, 19)}…` : chainTitle}
          </text>
        </g>
      ) : null}

      {evidence.map((ev, i) => {
        const angle = (i / Math.max(evidence.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const isSel = selectedTool === ev.toolName;
        return (
          <g key={ev.toolName}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={isSel ? 0.5 : 0.18} strokeWidth={isSel ? 1.2 : 0.8} strokeDasharray="2 4" />
            <g
              className="cursor-pointer"
              onClick={() => onSelectTool(isSel ? null : ev.toolName)}
            >
              {isSel ? <circle cx={x} cy={y} r={14} fill="none" stroke="currentColor" strokeOpacity="0.45" /> : null}
              <circle cx={x} cy={y} r={9} fill="var(--background)" stroke="currentColor" strokeOpacity={isSel ? 0.85 : 0.55} strokeWidth={isSel ? 1.6 : 1} />
              <text x={x} y={y + 3} textAnchor="middle" fill="currentColor" fontSize={8} fontFamily="ui-monospace, monospace">⚙</text>
              <text x={x} y={y + 22} textAnchor="middle" fill="currentColor" fontSize={9} fontFamily="ui-monospace, monospace" opacity={0.85}>
                {ev.toolName.length > 16 ? `${ev.toolName.slice(0, 15)}…` : ev.toolName}
              </text>
            </g>
          </g>
        );
      })}

      <g>
        <circle cx={cx} cy={cy} r={22} fill="var(--background)" stroke={stroke} strokeWidth={2} />
        <text x={cx} y={cy + 4} textAnchor="middle" fill={stroke} fontSize={9} fontFamily="ui-monospace, monospace" letterSpacing="2">
          FIND
        </text>
      </g>
    </svg>
  );
}

export function DesignReportFindingSplit() {
  const report = mockReportDetail;
  const [selectedId, setSelectedId] = useState<string>(report.findings[0]?.id ?? "");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const finding = report.findings.find((f) => f.id === selectedId) ?? report.findings[0]!;
  const evidence = useMemo(() => toolEvidenceForFinding(finding, report.toolActivity), [finding, report.toolActivity]);
  const chain = chainForFinding(report, finding.id);
  const tool = evidence.find((t) => t.toolName === activeTool) ?? null;

  function onSelect(id: string) {
    setSelectedId(id);
    setActiveTool(null);
  }

  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", "Finding · split"]}
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
          <div className="grid gap-0 overflow-hidden rounded-md border border-border/60 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
            {/* List pane */}
            <ul className="divide-y divide-border/60 border-b border-border/60 bg-background/40 lg:border-b-0 lg:border-r">
              <li className="flex items-baseline justify-between px-3 py-2">
                <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                  Findings · {report.findings.length}
                </span>
              </li>
              {report.findings.map((f) => {
                const isSel = f.id === finding.id;
                const stroke = SEVERITY_STROKE[f.severity];
                const hasChain = !!chainForFinding(report, f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(f.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                        isSel ? "bg-muted/50" : "hover:bg-muted/30"
                      }`}
                    >
                      <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: stroke }} />
                      <span className="w-12 shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                        {f.severity}
                      </span>
                      <span className="flex-1 truncate text-[0.82rem] text-foreground">{f.title}</span>
                      {hasChain ? (
                        <span className="font-mono text-[0.62rem] text-rose-500/80">⛓</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Detail pane */}
            <div className="space-y-4 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono uppercase tracking-[0.18em]" style={{ color: SEVERITY_STROKE[finding.severity] }}>
                  {finding.severity}
                </span>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span>{finding.type}</span>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span className="font-mono">{finding.targetLabel}</span>
                {chain ? (
                  <span className="ml-auto inline-flex items-center gap-1 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-rose-500/80">
                    ⛓ {chain.title}
                  </span>
                ) : null}
              </div>

              <h3 className="text-base font-semibold text-foreground">{finding.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{finding.summary}</p>
              {finding.recommendation ? (
                <p className="text-sm leading-6 text-foreground/90">
                  <span className="mr-1 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">do</span>
                  {finding.recommendation}
                </p>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="text-foreground/80">
                  <div className="mb-1 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                    Evidence map
                  </div>
                  <MiniMap
                    finding={finding}
                    evidence={evidence}
                    chainTitle={chain?.title ?? null}
                    selectedTool={activeTool}
                    onSelectTool={setActiveTool}
                  />
                </div>
                <div className="space-y-2">
                  <div className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                    {tool ? `Tool · ${tool.toolName}` : "Click ⚙ to inspect a tool"}
                  </div>
                  {tool ? (
                    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
                      {tool.command ? (
                        <pre className="overflow-x-auto font-mono text-[0.72rem] leading-5 text-foreground">$ {tool.command}</pre>
                      ) : null}
                      {tool.quote ? (
                        <pre className="mt-1 overflow-x-auto font-mono text-[0.72rem] leading-5 text-muted-foreground">{tool.quote}</pre>
                      ) : null}
                      {tool.outputPreview ? (
                        <pre className="mt-1 max-h-40 overflow-auto font-mono text-[0.7rem] leading-5 text-muted-foreground">{tool.outputPreview}</pre>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Each ⚙ in the map is a tool that produced evidence for this finding. Pick one to read its command, quoted match, and output preview.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailFieldGroup>
    </DetailPage>
  );
}
