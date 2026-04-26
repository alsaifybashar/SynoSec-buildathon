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
  toolEvidenceForFinding
} from "@/features/designs/finding-shared";

/**
 * split · constellation
 * Right pane visualises the attack pattern as a node graph centred on the
 * selected vulnerability. Tools support evidence; evidence supports the
 * vulnerability; the vulnerability is connected to other vulnerabilities
 * (enables / derived_from / related) and ultimately to the chain.
 */

const EDGE_LABEL: Record<string, string> = {
  supports: "supports",
  enables: "enables",
  derived_from: "derived",
  correlates_with: "related"
};

type GraphPoint = { id: string; x: number; y: number; label: string; sub?: string; kind: "tool" | "finding" | "chain"; severity?: string };
type GraphEdge = { from: string; to: string; kind: string };

function buildGraph(
  report: typeof mockReportDetail,
  finding: typeof mockReportDetail.findings[number]
): { nodes: GraphPoint[]; edges: GraphEdge[]; w: number; h: number; centerId: string } {
  const w = 720;
  const h = 380;
  const cx = w / 2;
  const cy = h / 2;

  const evidence = toolEvidenceForFinding(finding, report.toolActivity);
  const related = report.findings.filter(
    (f) =>
      f.id !== finding.id &&
      (finding.relatedFindingIds.includes(f.id) ||
        finding.enablesFindingIds.includes(f.id) ||
        finding.derivedFromFindingIds.includes(f.id))
  );
  const chain = chainForFinding(report, finding.id);

  const nodes: GraphPoint[] = [];
  const edges: GraphEdge[] = [];

  // Centre vulnerability
  nodes.push({
    id: finding.id,
    x: cx,
    y: cy,
    label: finding.title,
    sub: finding.severity,
    kind: "finding",
    severity: finding.severity
  });

  // Tools to the left
  evidence.forEach((ev, i) => {
    const angle = Math.PI - Math.PI / 2 + ((i - (evidence.length - 1) / 2) * 0.55);
    const r = 220;
    const x = Math.max(70, cx + Math.cos(angle) * r);
    const y = cy + Math.sin(angle) * r;
    nodes.push({ id: `tool:${ev.toolName}`, x, y, label: ev.toolName, sub: ev.quote || undefined, kind: "tool" });
    edges.push({ from: `tool:${ev.toolName}`, to: finding.id, kind: "supports" });
  });

  // Related findings to the right
  related.forEach((rf, i) => {
    const angle = -Math.PI / 4 + ((i - (related.length - 1) / 2) * 0.5);
    const r = 200;
    const x = Math.min(w - 90, cx + Math.cos(angle) * r);
    const y = cy + Math.sin(angle) * r;
    nodes.push({
      id: rf.id,
      x,
      y,
      label: rf.title,
      sub: rf.severity,
      kind: "finding",
      severity: rf.severity
    });
    let kind = "correlates_with";
    if (finding.enablesFindingIds.includes(rf.id)) kind = "enables";
    else if (finding.derivedFromFindingIds.includes(rf.id)) kind = "derived_from";
    edges.push({ from: finding.id, to: rf.id, kind });
  });

  // Chain at the top
  if (chain && "title" in chain) {
    nodes.push({
      id: chain.id,
      x: cx,
      y: 38,
      label: chain.title,
      sub: "chain",
      kind: "chain",
      severity: "severity" in chain ? chain.severity : undefined
    });
    edges.push({ from: finding.id, to: chain.id, kind: "enables" });
  }

  return { nodes, edges, w, h, centerId: finding.id };
}

function ConstellationGraph({
  graph,
  hoverId,
  onHover
}: {
  graph: ReturnType<typeof buildGraph>;
  hoverId: string | null;
  onHover: (id: string | null) => void;
}) {
  const { nodes, edges, w, h, centerId } = graph;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const center = byId.get(centerId)!;
  const stroke = center.severity ? SEVERITY_STROKE[center.severity as keyof typeof SEVERITY_STROKE] : "#dc2626";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img" aria-label="Attack pattern graph">
      <defs>
        <radialGradient id="constellation-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={center.x} cy={center.y} r={120} fill="url(#constellation-halo)" pointerEvents="none" />

      {/* Edges */}
      {edges.map((e, i) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        const isHover = hoverId === a.id || hoverId === b.id;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const isChainEdge = e.kind === "enables" && b.kind === "chain";
        return (
          <g key={`e-${i}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={isChainEdge ? stroke : "currentColor"}
              strokeOpacity={isHover ? 0.7 : isChainEdge ? 0.55 : 0.22}
              strokeWidth={isHover ? 1.4 : 1}
              strokeDasharray={e.kind === "correlates_with" ? "3 4" : undefined}
            />
            <text
              x={mx}
              y={my - 4}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={8}
              fill="currentColor"
              opacity={isHover ? 0.85 : 0.4}
              letterSpacing="1.5"
            >
              {(EDGE_LABEL[e.kind] ?? e.kind).toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const isCenter = n.id === centerId;
        const isHover = hoverId === n.id;
        const nStroke = n.severity ? SEVERITY_STROKE[n.severity as keyof typeof SEVERITY_STROKE] : "#94a3b8";
        const labelMax = n.kind === "tool" ? 18 : 26;
        const label = n.label.length > labelMax ? `${n.label.slice(0, labelMax - 1)}…` : n.label;
        return (
          <g
            key={n.id}
            onMouseEnter={() => onHover(n.id)}
            onMouseLeave={() => onHover(null)}
            className="cursor-default"
          >
            {n.kind === "tool" ? (
              <>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isHover ? 12 : 10}
                  fill="var(--background)"
                  stroke="currentColor"
                  strokeOpacity={isHover ? 0.85 : 0.5}
                  strokeWidth={1}
                />
                <text
                  x={n.x}
                  y={n.y + 3}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={9}
                  fill="currentColor"
                  opacity={0.85}
                >
                  ⚙
                </text>
                <text
                  x={n.x}
                  y={n.y + 24}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={9}
                  fill="currentColor"
                  opacity={isHover ? 0.95 : 0.75}
                >
                  {label}
                </text>
              </>
            ) : n.kind === "chain" ? (
              <>
                <rect
                  x={n.x - 90}
                  y={n.y - 14}
                  width={180}
                  height={28}
                  rx={6}
                  fill="var(--background)"
                  stroke={nStroke}
                  strokeWidth={1.2}
                  strokeDasharray="3 3"
                  opacity={0.95}
                />
                <text
                  x={n.x}
                  y={n.y - 1}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={8}
                  fill={nStroke}
                  letterSpacing="2"
                >
                  ⛓ CHAIN
                </text>
                <text
                  x={n.x}
                  y={n.y + 11}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={9}
                  fill="currentColor"
                  opacity={0.85}
                >
                  {label}
                </text>
              </>
            ) : (
              <>
                <rect
                  x={n.x - (isCenter ? 90 : 70)}
                  y={n.y - (isCenter ? 22 : 18)}
                  width={isCenter ? 180 : 140}
                  height={isCenter ? 44 : 36}
                  rx={6}
                  fill="var(--background)"
                  stroke={nStroke}
                  strokeWidth={isCenter ? 1.8 : 1.2}
                  opacity={isHover || isCenter ? 1 : 0.9}
                />
                <text
                  x={n.x}
                  y={n.y - (isCenter ? 5 : 3)}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={8}
                  fill={nStroke}
                  letterSpacing="2"
                >
                  {(n.sub ?? "").toUpperCase()}
                </text>
                <text
                  x={n.x}
                  y={n.y + (isCenter ? 12 : 10)}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={9}
                  fill="currentColor"
                  opacity={0.9}
                >
                  {label}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function DesignReportFindingSplitLedger() {
  const report = mockReportDetail;
  const [selectedId, setSelectedId] = useState<string>(report.findings[0]?.id ?? "");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const finding = report.findings.find((f) => f.id === selectedId) ?? report.findings[0]!;
  const evidence = useMemo(
    () => toolEvidenceForFinding(finding, report.toolActivity),
    [finding, report.toolActivity]
  );
  const chain = chainForFinding(report, finding.id);
  const stroke = SEVERITY_STROKE[finding.severity];
  const graph = useMemo(() => buildGraph(report, finding), [report, finding]);

  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", "Finding · split constellation"]}
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
          <div className="grid gap-0 overflow-hidden rounded-md border border-border/60 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2.6fr)]">
            {/* Findings list */}
            <ul className="divide-y divide-border/60 border-b border-border/60 bg-background/40 lg:border-b-0 lg:border-r">
              <li className="flex items-baseline justify-between px-3 py-2">
                <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                  Vulnerabilities · {report.findings.length}
                </span>
              </li>
              {report.findings.map((f) => {
                const isSel = f.id === finding.id;
                const fStroke = SEVERITY_STROKE[f.severity];
                const inChain = !!chainForFinding(report, f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(f.id)}
                      className={`relative flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                        isSel ? "bg-muted/50" : "hover:bg-muted/25"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ background: fStroke, opacity: isSel ? 1 : 0.45 }}
                      />
                      <span
                        className="w-12 shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.18em]"
                        style={{ color: fStroke }}
                      >
                        {f.severity}
                      </span>
                      <span className="flex-1 truncate text-[0.82rem] text-foreground">{f.title}</span>
                      {inChain ? (
                        <span className="font-mono text-[0.62rem] text-rose-500/85">⛓</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Constellation graph */}
            <div className="relative px-5 py-5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${stroke}, transparent)` }}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono uppercase tracking-[0.18em]" style={{ color: stroke }}>
                  {finding.severity}
                </span>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span>{finding.type}</span>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span className="font-mono">{finding.targetLabel}</span>
                {chain ? (
                  <span className="ml-auto inline-flex items-center gap-1 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-rose-500/85">
                    ⛓ {"title" in chain ? chain.title : ""}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 text-lg font-semibold leading-tight tracking-tight text-foreground">
                {finding.title}
              </h3>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                  Attack pattern
                </span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                  tools · vulnerabilities · chain
                </span>
              </div>
              <div className="mt-1.5 rounded-md border border-border/60 bg-background/40 px-2 py-2">
                <ConstellationGraph graph={graph} hoverId={hoverId} onHover={setHoverId} />
              </div>

              {/* Edge legend */}
              <div className="mt-2 flex flex-wrap gap-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden className="block h-px w-6 bg-current opacity-60" /> supports
                </span>
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden className="block h-px w-6" style={{ background: stroke, opacity: 0.7 }} /> enables
                </span>
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden className="block h-px w-6 bg-current opacity-50" style={{ borderTop: "1px dashed" }} /> related
                </span>
              </div>

              {/* Linked vulnerabilities */}
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                    summary
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{finding.summary}</p>
                  {finding.recommendation ? (
                    <div className="mt-2 rounded border border-border/60 bg-muted/15 px-2.5 py-2">
                      <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                        remediation
                      </div>
                      <p className="mt-0.5 text-sm leading-6 text-foreground/95">{finding.recommendation}</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                    linked vulnerabilities
                  </div>
                  <ul className="space-y-1">
                    {(["enablesFindingIds", "derivedFromFindingIds", "relatedFindingIds"] as const).map((key) => {
                      const ids = finding[key];
                      if (!ids.length) return null;
                      const label = key === "enablesFindingIds" ? "enables" : key === "derivedFromFindingIds" ? "derived from" : "related";
                      return ids.map((rid) => {
                        const rf = report.findings.find((f) => f.id === rid);
                        if (!rf) return null;
                        const rStroke = SEVERITY_STROKE[rf.severity];
                        return (
                          <li key={`${key}-${rid}`}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(rid)}
                              onMouseEnter={() => setHoverId(rid)}
                              onMouseLeave={() => setHoverId(null)}
                              className="flex w-full items-center gap-2 rounded border border-border/60 bg-background/40 px-2 py-1.5 text-left transition hover:border-foreground/20 hover:bg-muted/20"
                            >
                              <span
                                className="font-mono text-[0.6rem] uppercase tracking-[0.18em]"
                                style={{ color: rStroke }}
                              >
                                {rf.severity}
                              </span>
                              <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                                {label}
                              </span>
                              <span className="flex-1 truncate text-[0.78rem] text-foreground">{rf.title}</span>
                            </button>
                          </li>
                        );
                      });
                    })}
                    {!finding.enablesFindingIds.length &&
                    !finding.derivedFromFindingIds.length &&
                    !finding.relatedFindingIds.length ? (
                      <li className="text-xs leading-5 text-muted-foreground">
                        No linked vulnerabilities — this finding stands alone.
                      </li>
                    ) : null}
                  </ul>

                  <div className="pt-1 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                    evidence sources
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {evidence.map((ev) => (
                      <span
                        key={ev.toolName}
                        onMouseEnter={() => setHoverId(`tool:${ev.toolName}`)}
                        onMouseLeave={() => setHoverId(null)}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5"
                      >
                        <span aria-hidden className="font-mono text-[0.62rem] text-muted-foreground">⚙</span>
                        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-foreground">
                          {ev.toolName}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailFieldGroup>
    </DetailPage>
  );
}
