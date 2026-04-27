import { useEffect, useMemo, useRef, useState } from "react";
import type { ExecutionReportDetail, ExecutionReportFinding } from "@synosec/contracts";
import { cn } from "@/shared/lib/utils";

const SEVERITY_DOT: Record<ExecutionReportFinding["severity"], string> = {
  info: "bg-slate-400",
  low: "bg-blue-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-600"
};

const SEVERITY_TEXT: Record<ExecutionReportFinding["severity"], string> = {
  info: "text-slate-500 dark:text-slate-300",
  low: "text-blue-600 dark:text-blue-300",
  medium: "text-amber-600 dark:text-amber-300",
  high: "text-orange-600 dark:text-orange-300",
  critical: "text-red-600 dark:text-red-400"
};

function severityHex(severity: ExecutionReportFinding["severity"]) {
  switch (severity) {
    case "info": return "#94a3b8";
    case "low": return "#3b82f6";
    case "medium": return "#f59e0b";
    case "high": return "#f97316";
    case "critical": return "#dc2626";
  }
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function preferredFindingId(report: ExecutionReportDetail) {
  const topPathFindingId = report.attackPaths.paths[0]?.findingIds[0];
  if (topPathFindingId && report.findings.some((finding) => finding.id === topPathFindingId)) {
    return topPathFindingId;
  }
  const topFindingId = report.sourceSummary.topFindingIds.find((findingId) => report.findings.some((finding) => finding.id === findingId));
  return topFindingId ?? report.findings[0]?.id ?? null;
}

type GraphNodeShape = {
  id: string;
  label: string;
  sublabel?: string;
  kind: "tool" | "evidence" | "finding" | "related";
  severity?: ExecutionReportFinding["severity"];
};

type EdgeVariant = "supports" | "derived" | "related" | "enables";

type GraphEdgeShape = {
  from: string;
  to: string;
  variant: EdgeVariant;
};

const EDGE_STROKE: Record<EdgeVariant, string> = {
  supports: "#0ea5e9",
  derived: "#a855f7",
  related: "#14b8a6",
  enables: "#f97316"
};

const EDGE_DASH: Partial<Record<EdgeVariant, string>> = {
  related: "3 3"
};

const EDGE_LABEL: Record<EdgeVariant, string> = {
  supports: "supports",
  derived: "derived from",
  related: "related to",
  enables: "enables"
};

const RELATION_SUBLABEL: Record<Exclude<EdgeVariant, "supports">, string> = {
  derived: "Derived from",
  related: "Related to",
  enables: "Enables"
};

type RelatedEdge = {
  findingId: string;
  variant: Exclude<EdgeVariant, "supports">;
  reverse?: boolean;
  explanation?: string | null;
};

function relatedEdgesForFinding(report: ExecutionReportDetail, finding: ExecutionReportFinding): RelatedEdge[] {
  const edges: RelatedEdge[] = [];
  const findingNodes = new Map(
    report.graph.nodes
      .filter((node): node is Extract<ExecutionReportDetail["graph"]["nodes"][number], { kind: "finding" }> => node.kind === "finding")
      .map((node) => [node.id, node.findingId] as const)
  );
  for (const edge of report.graph.edges) {
    if (edge.kind === "derived_from" && edge.target === finding.id) {
      const relatedId = findingNodes.get(edge.source);
      if (relatedId) {
        edges.push({ findingId: relatedId, variant: "derived", reverse: true, explanation: edge.label ?? null });
      }
      continue;
    }
    if (edge.kind === "correlates_with" && edge.source === finding.id) {
      const relatedId = findingNodes.get(edge.target);
      if (relatedId) {
        edges.push({ findingId: relatedId, variant: "related", explanation: edge.label ?? null });
      }
      continue;
    }
    if (edge.kind === "enables" && edge.source === finding.id) {
      const relatedId = findingNodes.get(edge.target);
      if (relatedId) {
        edges.push({ findingId: relatedId, variant: "enables", explanation: edge.label ?? null });
      }
    }
  }
  return edges;
}

function chainForFinding(report: ExecutionReportDetail, findingId: string) {
  return report.graph.nodes.find((node) => node.kind === "chain" && node.findingIds.includes(findingId)) ?? null;
}

function buildGraphModel(report: ExecutionReportDetail, finding: ExecutionReportFinding, all: ExecutionReportFinding[]) {
  const tools = Array.from(new Set(finding.evidence.map((evidence) => evidence.sourceTool)));
  const toolNodes: GraphNodeShape[] = tools.map((tool) => ({ id: `t:${tool}`, label: tool, kind: "tool" }));

  const evidenceNodes: GraphNodeShape[] = finding.evidence.map((evidence, index) => {
    const node: GraphNodeShape = {
      id: `e:${index}`,
      label: `Signal ${String(index + 1).padStart(2, "0")}`,
      kind: "evidence"
    };
    node.sublabel = evidence.toolRunRef
      ? `run:${evidence.toolRunRef.slice(0, 8)}`
      : truncate(evidence.quote.replace(/\s+/g, " "), 24);
    return node;
  });

  const findingNode: GraphNodeShape = {
    id: "f",
    label: finding.title,
    sublabel: finding.targetLabel,
    kind: "finding",
    severity: finding.severity
  };

  const lookup = new Map(all.map((item) => [item.id, item]));
  const relatedNodes: GraphNodeShape[] = [];
  const relatedEdges: GraphEdgeShape[] = [];
  const seen = new Set<string>();

  for (const related of relatedEdgesForFinding(report, finding)) {
      const id = related.findingId;
      const target = lookup.get(id);
      if (!target || seen.has(id)) continue;
      seen.add(id);
      const nodeId = `r:${id}`;
      relatedNodes.push({
        id: nodeId,
        label: target.title,
        sublabel: RELATION_SUBLABEL[related.variant],
        kind: "related",
        severity: target.severity
      });
      relatedEdges.push(related.reverse ? { from: nodeId, to: "f", variant: related.variant } : { from: "f", to: nodeId, variant: related.variant });
  }

  const edges: GraphEdgeShape[] = [];
  finding.evidence.forEach((evidence, index) => {
    edges.push({ from: `t:${evidence.sourceTool}`, to: `e:${index}`, variant: "supports" });
    edges.push({ from: `e:${index}`, to: "f", variant: "supports" });
  });
  edges.push(...relatedEdges);

  const columns: GraphNodeShape[][] = [toolNodes, evidenceNodes, [findingNode]];
  if (relatedNodes.length > 0) columns.push(relatedNodes);
  return { columns, edges };
}

function FindingNodeGraph({
  report,
  finding,
  allFindings,
  onSelectRelated
}: {
  report: ExecutionReportDetail;
  finding: ExecutionReportFinding;
  allFindings: ExecutionReportFinding[];
  onSelectRelated: (id: string) => void;
}) {
  const { columns, edges } = useMemo(() => buildGraphModel(report, finding, allFindings), [report, finding, allFindings]);

  const colWidth = 144;
  const colGap = 24;
  const nodeHeight = 34;
  const nodeGap = 6;
  const padX = 10;
  const padY = 16;
  const nodeWidth = colWidth - 8;

  const maxRows = Math.max(...columns.map((col) => col.length), 1);
  const innerWidth = columns.length * colWidth + (columns.length - 1) * colGap;
  const width = innerWidth + padX * 2;
  const height = padY * 2 + 12 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * nodeGap;

  type Pos = { x: number; y: number; w: number; h: number; cx: number; cy: number };
  const positions = new Map<string, Pos>();
  columns.forEach((col, colIndex) => {
    const colX = padX + colIndex * (colWidth + colGap) + (colWidth - nodeWidth) / 2;
    const totalH = col.length * nodeHeight + Math.max(0, col.length - 1) * nodeGap;
    const slotH = maxRows * nodeHeight + Math.max(0, maxRows - 1) * nodeGap;
    const startY = padY + 12 + (slotH - totalH) / 2;
    col.forEach((node, rowIndex) => {
      const y = startY + rowIndex * (nodeHeight + nodeGap);
      positions.set(node.id, {
        x: colX,
        y,
        w: nodeWidth,
        h: nodeHeight,
        cx: colX + nodeWidth / 2,
        cy: y + nodeHeight / 2
      });
    });
  });

  const colLabels = columns.length === 4
    ? ["Tool", "Evidence", "Finding", "Related findings"]
    : ["Tool", "Evidence", "Finding"];

  const presentVariants = Array.from(new Set(edges.map((edge) => edge.variant))) as EdgeVariant[];

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Finding traceability graph"
        className="block h-auto w-full text-border"
        style={{ maxHeight: height }}
      >
        <defs>
          {(["derived", "related", "enables"] as const).map((variant) => (
            <marker
              key={variant}
              id={`arrow-${variant}`}
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={4}
              markerHeight={4}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_STROKE[variant]} />
            </marker>
          ))}
        </defs>

        {colLabels.map((label, index) => (
          <text
            key={label}
            x={padX + index * (colWidth + colGap) + colWidth / 2}
            y={padY + 2}
            textAnchor="middle"
            className="fill-muted-foreground font-mono"
            style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase" }}
          >
            {label}
          </text>
        ))}

        {edges.map((edge, index) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          const x1 = from.x + from.w;
          const y1 = from.cy;
          const x2 = to.x;
          const y2 = to.cy;
          const dx = (x2 - x1) * 0.5;
          const path = `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
          const markerEnd = edge.variant === "supports" ? undefined : `url(#arrow-${edge.variant})`;
          return (
            <path
              key={`${edge.from}-${edge.to}-${index}`}
              d={path}
              fill="none"
              stroke={EDGE_STROKE[edge.variant]}
              strokeWidth={edge.variant === "supports" ? 1.5 : 1.75}
              strokeOpacity={0.95}
              strokeDasharray={EDGE_DASH[edge.variant]}
              strokeLinecap="round"
              markerEnd={markerEnd}
            />
          );
        })}

        {columns.flat().map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const isFinding = node.kind === "finding";
          const isRelated = node.kind === "related";
          const sevDot = node.severity ? severityHex(node.severity) : null;
          const handleClick = isRelated ? () => onSelectRelated(node.id.replace(/^r:/, "")) : undefined;
          return (
            <g
              key={node.id}
              onClick={handleClick}
              style={{ cursor: handleClick ? "pointer" : "default" }}
            >
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.w}
                height={pos.h}
                rx={6}
                ry={6}
                className={cn(isFinding ? "fill-card" : "fill-background", "stroke-border")}
                strokeWidth={isFinding ? 1.5 : 1}
              />
              {sevDot ? <circle cx={pos.x + 10} cy={pos.cy} r={3.5} fill={sevDot} /> : null}
              <text
                x={sevDot ? pos.x + 20 : pos.x + 10}
                y={pos.cy - (node.sublabel ? 3 : -3)}
                className="fill-foreground"
                style={{ fontSize: 11, fontWeight: isFinding ? 600 : 500 }}
              >
                {truncate(node.label, sevDot ? 18 : 22)}
              </text>
              {node.sublabel ? (
                <text
                  x={sevDot ? pos.x + 20 : pos.x + 10}
                  y={pos.cy + 9}
                  className="fill-muted-foreground font-mono"
                  style={{ fontSize: 9 }}
                >
                  {truncate(node.sublabel, sevDot ? 22 : 26)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {presentVariants.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
          {presentVariants.map((variant) => (
            <span key={variant} className="inline-flex items-center gap-1.5">
              <svg width={22} height={6} aria-hidden>
                <line
                  x1={1}
                  x2={21}
                  y1={3}
                  y2={3}
                  stroke={EDGE_STROKE[variant]}
                  strokeWidth={1.4}
                  strokeOpacity={variant === "supports" ? 0.55 : 0.95}
                  strokeDasharray={EDGE_DASH[variant]}
                />
              </svg>
              {EDGE_LABEL[variant]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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

function InspectorSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/50 pt-5 first:border-t-0 first:pt-0">
      <p className="mb-2 font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <div className="text-sm leading-6 text-foreground/90">{children}</div>
    </section>
  );
}

function RelationshipGroup({
  label,
  explanation,
  ids,
  findingLookup,
  onSelect
}: {
  label: string;
  explanation: string | null | undefined;
  ids: string[];
  findingLookup: Map<string, ExecutionReportFinding>;
  onSelect: (id: string) => void;
}) {
  if (ids.length === 0 && !explanation) return null;
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      {explanation ? <p className="text-sm text-foreground/85">{explanation}</p> : null}
      {ids.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id) => {
            const related = findingLookup.get(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className="rounded-full border border-border/60 px-2 py-0.5 text-[0.7rem] text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
              >
                {related ? related.title : id}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FindingInspector({
  report,
  finding,
  allFindings,
  onSelect,
  onJumpToToolActivity
}: {
  report: ExecutionReportDetail;
  finding: ExecutionReportFinding;
  allFindings: ExecutionReportFinding[];
  onSelect: (id: string) => void;
  onJumpToToolActivity: (toolRunRef: string) => void;
}) {
  const findingLookup = useMemo(() => new Map(allFindings.map((item) => [item.id, item])), [allFindings]);
  const relatedEdges = useMemo(() => relatedEdgesForFinding(report, finding), [report, finding]);
  const chain = useMemo(() => chainForFinding(report, finding.id), [report, finding.id]);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold leading-tight text-foreground">{finding.title}</h2>
        <div className="rounded-md border border-border/60 bg-background/30 px-3 py-2">
          <FindingNodeGraph report={report} finding={finding} allFindings={allFindings} onSelectRelated={onSelect} />
        </div>
      </header>

      <section className="space-y-3">
        <p className="text-sm leading-6 text-foreground/90">{finding.summary}</p>
        {finding.explanationSummary && finding.explanationSummary.trim() !== finding.summary.trim() ? (
          <p className="border-l-2 border-border/70 pl-3 text-sm leading-6 text-muted-foreground">
            {finding.explanationSummary}
          </p>
        ) : null}
      </section>

      {finding.evidence.length > 0 ? (
        <section className="border-t border-border/50 pt-5">
          <div className="mb-2 flex items-center gap-2">
            <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">Evidence</p>
            <span className="font-mono text-[0.6rem] tabular-nums text-muted-foreground">{finding.evidence.length}</span>
          </div>
          <ul className="space-y-3 text-sm leading-6 text-foreground/90">
            {finding.evidence.map((evidence, index) => (
              <li key={`${finding.id}:evidence:${index}`} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
                  <span className="font-mono uppercase tracking-[0.14em] text-foreground/80">{evidence.sourceTool}</span>
                  {evidence.toolRunRef ? (
                    <button
                      type="button"
                      onClick={() => onJumpToToolActivity(evidence.toolRunRef as string)}
                      className="font-mono text-[0.65rem] underline-offset-2 hover:underline"
                    >
                      tool:{evidence.toolRunRef.slice(0, 8)}
                    </button>
                  ) : null}
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-mono text-[0.72rem] leading-5 text-muted-foreground">
                  {evidence.quote}
                </pre>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(finding.confidenceReason || finding.reproduction || relatedEdges.length > 0 || chain) ? (
        <details className="group border-t border-border/50 pt-4">
          <summary className="cursor-pointer list-none font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
            More <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
          </summary>
          <div className="mt-4 space-y-5">
            {finding.confidenceReason || finding.reproduction ? (
              <div className="space-y-2 text-sm leading-6 text-foreground/90">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Verification</p>
                {finding.confidenceReason ? <p>{finding.confidenceReason}</p> : null}
                {finding.reproduction?.commandPreview ? (
                  <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-[0.72rem] text-muted-foreground">
                    {finding.reproduction.commandPreview}
                  </pre>
                ) : null}
                {finding.reproduction && finding.reproduction.steps.length > 0 ? (
                  <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
                    {finding.reproduction.steps.map((step, index) => (
                      <li key={`${finding.id}:step:${index}`}>{step}</li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}

            {(relatedEdges.length > 0 || chain) ? (
              <div className="space-y-3">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Relationships</p>
                <RelationshipGroup
                  label="Derived from"
                  explanation={relatedEdges.find((edge) => edge.variant === "derived")?.explanation ?? undefined}
                  ids={relatedEdges.filter((edge) => edge.variant === "derived").map((edge) => edge.findingId)}
                  findingLookup={findingLookup}
                  onSelect={onSelect}
                />
                <RelationshipGroup
                  label="Related to"
                  explanation={relatedEdges.find((edge) => edge.variant === "related")?.explanation ?? undefined}
                  ids={relatedEdges.filter((edge) => edge.variant === "related").map((edge) => edge.findingId)}
                  findingLookup={findingLookup}
                  onSelect={onSelect}
                />
                <RelationshipGroup
                  label="Enables"
                  explanation={relatedEdges.find((edge) => edge.variant === "enables")?.explanation ?? undefined}
                  ids={relatedEdges.filter((edge) => edge.variant === "enables").map((edge) => edge.findingId)}
                  findingLookup={findingLookup}
                  onSelect={onSelect}
                />
                {chain ? (
                  <div className="space-y-1">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Attack chain</p>
                    <p className="text-sm font-medium text-foreground">{chain.title}</p>
                    <p className="text-sm text-muted-foreground">{chain.summary}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </details>
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

export function ExecutionReportFindingsView({
  report,
  onJumpToToolActivity
}: {
  report: ExecutionReportDetail;
  onJumpToToolActivity: (toolRunRef: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => preferredFindingId(report));
  const inspectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedId(preferredFindingId(report));
  }, [report.id, report.findings]);

  const selected = useMemo(
    () => report.findings.find((finding) => finding.id === selectedId) ?? report.findings[0] ?? null,
    [report.findings, selectedId]
  );

  if (!selected) {
    return (
      <p className="rounded-md border border-border/60 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
        No structured findings were reported for this execution.
      </p>
    );
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    if (inspectorRef.current) {
      inspectorRef.current.scrollTop = 0;
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
        <div className="h-[calc(100vh-14rem)] overflow-y-auto border-b border-border/40 lg:border-b-0 lg:border-r">
          <ul className="divide-y divide-border/20">
            {report.findings.map((finding, index) => (
              <li key={finding.id}>
                <FindingListItem
                  finding={finding}
                  index={index}
                  selected={finding.id === selected.id}
                  onClick={() => handleSelect(finding.id)}
                />
              </li>
            ))}
          </ul>
        </div>

        <div ref={inspectorRef} className="h-[calc(100vh-14rem)] overflow-y-auto px-5 py-5 lg:px-6">
          <FindingInspector
            report={report}
            finding={selected}
            allFindings={report.findings}
            onSelect={handleSelect}
            onJumpToToolActivity={onJumpToToolActivity}
          />
        </div>
      </div>
    </div>
  );
}
