import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, ChevronDown, Download, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import type { ExecutionReportDetail, ExecutionReportFinding, ExecutionReportToolActivity } from "@synosec/contracts";
import { DetailFieldGroup, DetailPage } from "@/shared/components/detail-page";
import { Button } from "@/shared/ui/button";
import { mockReportDetail } from "@/features/designs/report-mock-detail";

const SEVERITY_STROKE: Record<NonNullable<ExecutionReportFinding["severity"]>, string> = {
  info: "#64748b",
  low: "#2563eb",
  medium: "#ca8a04",
  high: "#ea580c",
  critical: "#dc2626"
};

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-7 text-2xl font-semibold tracking-tight text-foreground first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold text-foreground first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-5 text-base font-semibold text-foreground first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-3 text-[0.95rem] leading-7 text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6 text-[0.95rem] leading-7 text-foreground/90 marker:text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6 text-[0.95rem] leading-7 text-foreground/90 marker:text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
  code: ({ children, className }) => {
    if (className) {
      return <code className={className}>{children}</code>;
    }
    return <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[0.84em] text-foreground">{children}</code>;
  },
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-lg bg-muted/40 p-4 font-mono text-xs leading-6 text-foreground">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground">{children}</blockquote>,
  a: ({ children, href }) => <a href={href} className="text-primary underline-offset-2 hover:underline">{children}</a>,
  hr: () => <hr className="my-6 border-border" />
};

type ToolEvidence = {
  toolName: string;
  quote: string;
  status?: ExecutionReportToolActivity["status"];
  command?: string;
  outputPreview?: string | null;
};

function toolEvidenceForFinding(
  finding: ExecutionReportFinding,
  toolActivity: ExecutionReportToolActivity[]
): ToolEvidence[] {
  // Combine finding.evidence (tool quotes) and finding.sourceToolIds (tools that fired).
  const out = new Map<string, ToolEvidence>();
  for (const ev of finding.evidence) {
    out.set(ev.sourceTool, { toolName: ev.sourceTool, quote: ev.quote });
  }
  for (const id of finding.sourceToolIds) {
    if (!out.has(id)) out.set(id, { toolName: id, quote: "" });
  }
  // Enrich with the actual tool activity records (command, output)
  for (const item of out.values()) {
    const activity = toolActivity.find((t) => t.toolName === item.toolName);
    if (activity) {
      item.status = activity.status;
      item.command = activity.command;
      item.outputPreview = activity.outputPreview;
    }
  }
  return [...out.values()];
}

function chainForFinding(report: ExecutionReportDetail, findingId: string) {
  return report.graph.nodes.find((n) => n.kind === "chain" && n.findingIds.includes(findingId));
}

const SEVERITY_LABEL_BG: Record<NonNullable<ExecutionReportFinding["severity"]>, string> = {
  critical: "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-300",
  high: "bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-300",
  medium: "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-300",
  low: "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-300",
  info: "bg-slate-500/10 border-slate-500/40 text-slate-600 dark:text-slate-300"
};

function MetaStrip({ report }: { report: ExecutionReportDetail }) {
  const items: Array<{ label: string; value: string }> = [
    { label: "Execution kind", value: report.executionKind },
    { label: "Status", value: report.status },
    { label: "Target", value: report.targetLabel },
    { label: "Source", value: report.sourceLabel },
    { label: "Findings", value: String(report.findingsCount) },
    { label: "Highest severity", value: report.highestSeverity ?? "none" }
  ];
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-border bg-background/50 px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label}>
          <div className="font-mono text-eyebrow font-medium uppercase tracking-[0.3em] text-muted-foreground">{item.label}</div>
          <div className="mt-1 text-sm text-foreground">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function FindingMiniMap({
  finding,
  evidence,
  chainTitle,
  selectedTool,
  onSelectTool
}: {
  finding: ExecutionReportFinding;
  evidence: ToolEvidence[];
  chainTitle: string | null;
  selectedTool: string | null;
  onSelectTool: (tool: string | null) => void;
}) {
  const w = 520;
  const h = 320;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.32;
  const stroke = SEVERITY_STROKE[finding.severity] ?? "#64748b";

  const positions = evidence.map((ev, i) => {
    const angle = (i / Math.max(evidence.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { ev, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });

  const chainPos = chainTitle
    ? { x: cx, y: cy - r - 60 }
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-slate-950/95">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block w-full">
        <defs>
          <pattern id="finding-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="finding-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.5" />
            <stop offset="60%" stopColor={stroke} stopOpacity="0.12" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill="url(#finding-grid)" />

        <circle cx={cx} cy={cy} r={r + 18} fill="none" stroke="#1e293b" strokeDasharray="2 5" />
        <circle cx={cx} cy={cy} r={88} fill="url(#finding-halo)" pointerEvents="none" />

        {chainPos ? (
          <g>
            <line x1={cx} y1={cy - 28} x2={chainPos.x} y2={chainPos.y + 14} stroke="#dc2626" strokeWidth={1.6} />
            <rect x={chainPos.x - 78} y={chainPos.y - 14} width={156} height={28} rx={6} fill="#0f172a" stroke="#dc2626" strokeWidth={1.4} />
            <text x={chainPos.x} y={chainPos.y + 4} textAnchor="middle" fill="#fecaca" fontSize={10} fontFamily="ui-monospace, monospace">
              ⛓ {chainTitle && chainTitle.length > 22 ? `${chainTitle.slice(0, 21)}…` : chainTitle}
            </text>
          </g>
        ) : null}

        {positions.map(({ ev, x, y }) => {
          const isSel = selectedTool === ev.toolName;
          return (
            <g key={ev.toolName}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#475569" strokeWidth={isSel ? 1.6 : 0.9} strokeDasharray="3 4" opacity={isSel ? 0.95 : 0.55} />
              <g
                className="cursor-pointer"
                onClick={() => onSelectTool(isSel ? null : ev.toolName)}
              >
                {isSel ? <circle cx={x} cy={y} r={20} fill="none" stroke="#94a3b8" strokeWidth={1.2} opacity={0.55} /> : null}
                <circle cx={x} cy={y} r={14} fill="#0f172a" stroke="#94a3b8" strokeWidth={isSel ? 2.2 : 1.4} />
                <text x={x} y={y + 4} textAnchor="middle" fill="#cbd5e1" fontSize={9} fontFamily="ui-monospace, monospace">⚙</text>
                <text x={x} y={y + 26} textAnchor="middle" fill="#e2e8f0" fontSize={9} fontFamily="ui-monospace, monospace">
                  {ev.toolName.length > 18 ? `${ev.toolName.slice(0, 17)}…` : ev.toolName}
                </text>
              </g>
            </g>
          );
        })}

        <g className="cursor-pointer">
          <circle cx={cx} cy={cy} r={32} fill="#0f172a" stroke={stroke} strokeWidth={2.4} />
          <text x={cx} y={cy + 5} textAnchor="middle" fill={stroke} fontSize={11} fontFamily="ui-monospace, monospace" letterSpacing="2">
            FIND
          </text>
        </g>
      </svg>
    </div>
  );
}

function FindingCard({
  finding,
  report,
  expanded,
  onToggle
}: {
  finding: ExecutionReportFinding;
  report: ExecutionReportDetail;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const evidence = useMemo(() => toolEvidenceForFinding(finding, report.toolActivity), [finding, report.toolActivity]);
  useEffect(() => {
    if (!expanded) setSelectedTool(null);
  }, [expanded]);
  useEffect(() => {
    if (expanded && evidence.length > 0 && !selectedTool) {
      const first = evidence[0];
      if (first) setSelectedTool(first.toolName);
    }
  }, [expanded, evidence, selectedTool]);

  const chain = chainForFinding(report, finding.id);
  const stroke = SEVERITY_STROKE[finding.severity] ?? "#64748b";
  const tool = evidence.find((t) => t.toolName === selectedTool) ?? null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/50 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-muted/30"
        aria-expanded={expanded}
      >
        <span
          className="inline-block h-8 w-1.5 rounded-full"
          style={{ background: stroke }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={`rounded-full border px-2 py-0.5 font-mono uppercase tracking-[0.16em] ${SEVERITY_LABEL_BG[finding.severity]}`}>
              {finding.severity}
            </span>
            <span>{finding.type}</span>
            <span className="truncate">{finding.targetLabel}</span>
            {chain ? (
              <span className="ml-auto rounded-full border border-rose-500/40 px-2 py-0.5 font-mono uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">
                ⛓ chain
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{finding.title}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="border-t border-border/60 px-5 py-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">{finding.summary}</p>
              {finding.recommendation ? (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="font-mono text-eyebrow font-medium uppercase tracking-[0.3em] text-muted-foreground">Recommendation</div>
                  <p className="mt-1 text-sm leading-6 text-foreground">{finding.recommendation}</p>
                </div>
              ) : null}
              {chain ? (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3">
                  <div className="font-mono text-eyebrow font-medium uppercase tracking-[0.3em] text-rose-600 dark:text-rose-300">Part of chain</div>
                  <p className="mt-1 text-sm leading-6 text-foreground">{chain.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{chain.summary}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
                {finding.sourceToolIds.map((id) => (
                  <span key={id} className="rounded-full border border-border/70 px-2 py-1">{id}</span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-eyebrow font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  Evidence map · {evidence.length} tools
                </div>
                <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-muted-foreground">click ⚙ to inspect</span>
              </div>
              <FindingMiniMap
                finding={finding}
                evidence={evidence}
                chainTitle={chain?.title ?? null}
                selectedTool={selectedTool}
                onSelectTool={setSelectedTool}
              />
              {tool ? (
                <div className="rounded-lg border border-border bg-background/70 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/70 px-2 py-0.5 font-mono uppercase tracking-[0.16em]">
                      {tool.toolName}
                    </span>
                    {tool.status ? (
                      <span className="rounded-full border border-border/70 px-2 py-0.5 font-mono uppercase tracking-[0.16em]">
                        {tool.status}
                      </span>
                    ) : null}
                  </div>
                  {tool.command ? (
                    <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-[0.78rem] leading-5 text-foreground">
                      $ {tool.command}
                    </pre>
                  ) : null}
                  {tool.quote ? (
                    <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-[0.78rem] leading-5 text-muted-foreground">
                      {tool.quote}
                    </pre>
                  ) : null}
                  {tool.outputPreview ? (
                    <pre className="mt-2 max-h-44 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-[0.76rem] leading-5 text-muted-foreground">
                      {tool.outputPreview}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DesignReportFindingMap() {
  const report = mockReportDetail;
  const [openId, setOpenId] = useState<string | null>(report.findings[0]?.id ?? null);

  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", "Finding map"]}
      subtitle={report.executionId}
      timestamp={new Date(report.updatedAt).toLocaleString()}
      isDirty={false}
      onBack={() => undefined}
      onSave={() => undefined}
      onDismiss={() => undefined}
      onExportJson={() => undefined}
      actions={(
        <div className="flex flex-wrap items-center gap-2 px-0 py-0">
          <Button type="button" variant="outline" className="h-8 text-[0.72rem]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="button" variant="outline" className="h-8 text-[0.72rem]">
            <Archive className="h-4 w-4" />
            Archive
          </Button>
          <Button type="button" variant="destructive" className="h-8 text-[0.72rem]">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="ml-auto">
            <Button type="button" variant="outline" className="h-8 text-[0.72rem]">
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>
      )}
    >
      <DetailFieldGroup className="bg-card/70">
        <div className="col-span-full space-y-4">
          <MetaStrip report={report} />
          <article className="rounded-2xl border border-border bg-background/60 px-8 py-7">
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>{report.executiveSummary}</ReactMarkdown>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 px-2 py-1">{report.sourceLabel}</span>
              <span className="rounded-full border border-border/70 px-2 py-1">{report.targetLabel}</span>
            </div>
          </article>
        </div>
      </DetailFieldGroup>

      <DetailFieldGroup title="Findings" className="bg-card/70">
        <div className="col-span-full space-y-3">
          <p className="text-sm text-muted-foreground">
            Open a finding to see the tools and quotes that produced it. Each finding draws its own minimal evidence map.
          </p>
          <div className="space-y-2">
            {report.findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                report={report}
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
