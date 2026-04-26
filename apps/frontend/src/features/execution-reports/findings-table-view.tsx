import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
import type { ExecutionReportDetail, ExecutionReportFinding } from "@synosec/contracts";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const SEVERITY_RANK: Record<ExecutionReportFinding["severity"], number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

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

type SortKey = "index" | "severity" | "type" | "target" | "validation" | "confidence" | "title";
type SortDir = "asc" | "desc";

function compare(a: ExecutionReportFinding, b: ExecutionReportFinding, key: SortKey, indexA: number, indexB: number): number {
  switch (key) {
    case "index":
      return indexA - indexB;
    case "severity":
      return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    case "type":
      return a.type.localeCompare(b.type);
    case "target":
      return a.targetLabel.localeCompare(b.targetLabel);
    case "validation":
      return (a.validationStatus ?? "").localeCompare(b.validationStatus ?? "");
    case "confidence":
      return (a.confidence ?? -1) - (b.confidence ?? -1);
    case "title":
      return a.title.localeCompare(b.title);
  }
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onClick
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (column: SortKey) => void;
}) {
  const active = sortKey === column;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onClick(column)}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.18em]",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
}

function SeverityCell({ severity }: { severity: ExecutionReportFinding["severity"] }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={cn("h-2 w-2 rounded-full", SEVERITY_DOT[severity])} />
      <span className={cn("font-mono text-[0.62rem] uppercase tracking-[0.16em]", SEVERITY_TEXT[severity])}>{severity}</span>
    </span>
  );
}

function ValidationPill({ status }: { status: ExecutionReportFinding["validationStatus"] }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="rounded-full border border-border/60 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
      {status.replaceAll("_", " ")}
    </span>
  );
}

function FindingsTable({
  findings,
  onSelect,
  selectedId
}: {
  findings: ExecutionReportFinding[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const indexed = findings.map((finding, index) => ({ finding, index }));
    indexed.sort((left, right) => {
      const result = compare(left.finding, right.finding, sortKey, left.index, right.index);
      return sortDir === "asc" ? result : -result;
    });
    return indexed;
  }, [findings, sortKey, sortDir]);

  function toggleSort(column: SortKey) {
    if (column === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortDir(column === "severity" || column === "confidence" ? "desc" : "asc");
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background/40">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[8%]"><SortHeader label="#" column="index" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
            <TableHead className="w-[12%]"><SortHeader label="Severity" column="severity" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
            <TableHead className="w-[14%]"><SortHeader label="Type" column="type" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
            <TableHead className="w-[20%]"><SortHeader label="Target" column="target" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
            <TableHead className="w-[12%]"><SortHeader label="Status" column="validation" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
            <TableHead className="w-[10%]"><SortHeader label="Conf." column="confidence" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
            <TableHead className="w-[24%]"><SortHeader label="Title" column="title" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(({ finding, index }) => {
            const selected = finding.id === selectedId;
            return (
              <TableRow
                key={finding.id}
                onClick={() => onSelect(finding.id)}
                className={cn("cursor-pointer", selected && "bg-muted/40")}
                data-state={selected ? "selected" : undefined}
              >
                <TableCell className="font-mono text-[0.7rem] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </TableCell>
                <TableCell><SeverityCell severity={finding.severity} /></TableCell>
                <TableCell className="truncate text-foreground/90">{finding.type}</TableCell>
                <TableCell className="truncate font-mono text-[0.7rem] text-muted-foreground">{finding.targetLabel}</TableCell>
                <TableCell><ValidationPill status={finding.validationStatus} /></TableCell>
                <TableCell className="font-mono text-[0.7rem] text-muted-foreground">
                  {finding.confidence === null ? "—" : finding.confidence.toFixed(2)}
                </TableCell>
                <TableCell className="truncate font-medium text-foreground">{finding.title}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

type GraphNodeShape = {
  id: string;
  label: string;
  sublabel?: string;
  kind: "tool" | "evidence" | "finding" | "related";
  severity?: ExecutionReportFinding["severity"];
};

type GraphEdgeShape = {
  from: string;
  to: string;
  variant: "supports" | "derived" | "related" | "enables";
};

function buildGraphModel(finding: ExecutionReportFinding, all: ExecutionReportFinding[]) {
  const tools = Array.from(new Set(finding.evidence.map((evidence) => evidence.sourceTool)));
  const toolNodes: GraphNodeShape[] = tools.map((tool) => ({ id: `t:${tool}`, label: tool, kind: "tool" }));

  const evidenceNodes: GraphNodeShape[] = finding.evidence.map((evidence, index) => {
    const node: GraphNodeShape = { id: `e:${index}`, label: evidence.sourceTool, kind: "evidence" };
    if (evidence.toolRunRef) node.sublabel = `tool:${evidence.toolRunRef.slice(0, 8)}`;
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

  function pushRelated(ids: string[], variant: GraphEdgeShape["variant"], reverse = false) {
    for (const id of ids) {
      const target = lookup.get(id);
      if (!target || seen.has(id)) continue;
      seen.add(id);
      const nodeId = `r:${id}`;
      relatedNodes.push({ id: nodeId, label: target.title, sublabel: target.type, kind: "related", severity: target.severity });
      relatedEdges.push(reverse ? { from: nodeId, to: "f", variant } : { from: "f", to: nodeId, variant });
    }
  }

  pushRelated(finding.derivedFromFindingIds, "derived", true);
  pushRelated(finding.relatedFindingIds, "related");
  pushRelated(finding.enablesFindingIds, "enables");

  const edges: GraphEdgeShape[] = [];
  finding.evidence.forEach((evidence, index) => {
    edges.push({ from: `t:${evidence.sourceTool}`, to: `e:${index}`, variant: "supports" });
    edges.push({ from: `e:${index}`, to: "f", variant: "supports" });
  });
  edges.push(...relatedEdges);

  return {
    columns: [toolNodes, evidenceNodes, [findingNode], relatedNodes],
    edges
  };
}

const EDGE_STROKE: Record<GraphEdgeShape["variant"], string> = {
  supports: "currentColor",
  derived: "#a855f7",
  related: "#64748b",
  enables: "#ea580c"
};

function FindingNodeGraph({ finding, allFindings }: { finding: ExecutionReportFinding; allFindings: ExecutionReportFinding[] }) {
  const { columns, edges } = useMemo(() => buildGraphModel(finding, allFindings), [finding, allFindings]);

  const colWidth = 168;
  const colGap = 32;
  const nodeHeight = 38;
  const nodeGap = 10;
  const padX = 12;
  const padY = 16;
  const nodeWidth = colWidth - 16;

  const maxRows = Math.max(...columns.map((col) => col.length), 1);
  const innerWidth = columns.length * colWidth + (columns.length - 1) * colGap;
  const width = innerWidth + padX * 2;
  const height = padY * 2 + 14 + maxRows * nodeHeight + (maxRows - 1) * nodeGap;

  const positions = new Map<string, { x: number; y: number; w: number; h: number; cx: number; cy: number }>();
  columns.forEach((col, colIndex) => {
    const colX = padX + colIndex * (colWidth + colGap) + (colWidth - nodeWidth) / 2;
    const totalH = col.length * nodeHeight + (col.length - 1) * nodeGap;
    const startY = padY + 14 + (maxRows * nodeHeight + (maxRows - 1) * nodeGap - totalH) / 2;
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

  const colLabels = ["Tool", "Evidence", "Finding", "Related"];

  return (
    <div className="overflow-x-auto rounded-md border border-border/60 bg-background/40">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="Finding traceability graph"
        className="text-border"
      >
        {colLabels.map((label, index) => (
          <text
            key={label}
            x={padX + index * (colWidth + colGap) + colWidth / 2}
            y={padY + 4}
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
          return (
            <path
              key={`${edge.from}-${edge.to}-${index}`}
              d={path}
              fill="none"
              stroke={EDGE_STROKE[edge.variant]}
              strokeWidth={1}
              strokeOpacity={edge.variant === "supports" ? 0.5 : 0.85}
              strokeDasharray={edge.variant === "related" ? "3 3" : undefined}
            />
          );
        })}

        {columns.flat().map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const isFinding = node.kind === "finding";
          const sevDot = node.severity ? severityHex(node.severity) : null;
          return (
            <g key={node.id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.w}
                height={pos.h}
                rx={6}
                ry={6}
                className={cn(
                  isFinding ? "fill-card" : "fill-background",
                  "stroke-border"
                )}
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
    </div>
  );
}

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

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <div className="text-sm leading-6 text-foreground/90">{children}</div>
    </section>
  );
}

function FindingDrawer({
  finding,
  allFindings,
  onClose,
  onSelect,
  onJumpToToolActivity
}: {
  finding: ExecutionReportFinding;
  allFindings: ExecutionReportFinding[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onJumpToToolActivity: (toolRunRef: string) => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const findingLookup = useMemo(() => new Map(allFindings.map((item) => [item.id, item])), [allFindings]);

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={`Finding: ${finding.title}`}
        className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-border bg-background shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-border/60 px-6 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityCell severity={finding.severity} />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">{finding.type}</span>
              <ValidationPill status={finding.validationStatus} />
              {finding.confidence !== null ? (
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                  conf {finding.confidence.toFixed(2)}
                </span>
              ) : null}
            </div>
            <h2 className="text-lg font-semibold leading-tight text-foreground">{finding.title}</h2>
            <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{finding.targetLabel}</p>
          </div>
          <Button type="button" variant="outline" onClick={onClose} className="h-8 w-8 shrink-0 p-0" aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <DrawerSection label="Traceability">
              <FindingNodeGraph finding={finding} allFindings={allFindings} />
            </DrawerSection>

            <DrawerSection label="Summary">
              <p>{finding.summary}</p>
            </DrawerSection>

            {finding.explanationSummary ? (
              <DrawerSection label="Why this finding exists">
                <p>{finding.explanationSummary}</p>
              </DrawerSection>
            ) : null}

            {finding.evidence.length > 0 ? (
              <DrawerSection label={`Evidence · ${finding.evidence.length}`}>
                <ul className="space-y-3">
                  {finding.evidence.map((evidence, index) => (
                    <li key={`${finding.id}:evidence:${index}`} className="space-y-2">
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
                        {evidence.observationRef ? (
                          <span className="font-mono text-[0.65rem]">obs:{evidence.observationRef.slice(0, 8)}</span>
                        ) : null}
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-mono text-[0.72rem] leading-5 text-muted-foreground">
                        {evidence.quote}
                      </pre>
                    </li>
                  ))}
                </ul>
              </DrawerSection>
            ) : null}

            {finding.confidenceReason || finding.reproduction ? (
              <DrawerSection label="Verification">
                {finding.confidenceReason ? <p>{finding.confidenceReason}</p> : null}
                {finding.reproduction ? (
                  <div className="mt-3 space-y-2">
                    {finding.reproduction.commandPreview ? (
                      <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-[0.72rem] text-muted-foreground">
                        {finding.reproduction.commandPreview}
                      </pre>
                    ) : null}
                    {finding.reproduction.steps.length > 0 ? (
                      <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
                        {finding.reproduction.steps.map((step, index) => (
                          <li key={`${finding.id}:step:${index}`}>{step}</li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                ) : null}
              </DrawerSection>
            ) : null}

            {(finding.derivedFromFindingIds.length
              || finding.relatedFindingIds.length
              || finding.enablesFindingIds.length
              || finding.chain) ? (
              <DrawerSection label="Relationships">
                <div className="space-y-3">
                  <RelationshipGroup
                    label="Derived from"
                    explanation={finding.relationshipExplanations?.derivedFrom}
                    ids={finding.derivedFromFindingIds}
                    findingLookup={findingLookup}
                    onSelect={onSelect}
                  />
                  <RelationshipGroup
                    label="Related to"
                    explanation={finding.relationshipExplanations?.relatedTo}
                    ids={finding.relatedFindingIds}
                    findingLookup={findingLookup}
                    onSelect={onSelect}
                  />
                  <RelationshipGroup
                    label="Enables"
                    explanation={finding.relationshipExplanations?.enables}
                    ids={finding.enablesFindingIds}
                    findingLookup={findingLookup}
                    onSelect={onSelect}
                  />
                  {finding.chain ? (
                    <div className="space-y-1">
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Attack chain</p>
                      <p className="text-sm font-medium text-foreground">{finding.chain.title}</p>
                      <p className="text-sm text-muted-foreground">{finding.chain.summary}</p>
                    </div>
                  ) : null}
                </div>
              </DrawerSection>
            ) : null}

            {finding.recommendation ? (
              <DrawerSection label="Recommendation">
                <p>{finding.recommendation}</p>
              </DrawerSection>
            ) : null}
          </div>
        </div>
      </aside>
    </div>,
    document.body
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

export function ExecutionReportFindingsView({
  report,
  onJumpToToolActivity
}: {
  report: ExecutionReportDetail;
  onJumpToToolActivity: (toolRunRef: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? report.findings.find((finding) => finding.id === selectedId) ?? null : null;

  if (report.findings.length === 0) {
    return (
      <p className="rounded-md border border-border/60 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
        No structured findings were reported for this execution.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-eyebrow font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Findings · {report.findings.length}
          </p>
          <p className="text-[0.7rem] text-muted-foreground">Click a row to inspect traceability and evidence</p>
        </div>
        <FindingsTable
          findings={report.findings}
          onSelect={(id) => setSelectedId(id)}
          selectedId={selectedId}
        />
      </div>
      {selected ? (
        <FindingDrawer
          finding={selected}
          allFindings={report.findings}
          onClose={() => setSelectedId(null)}
          onSelect={(id) => setSelectedId(id)}
          onJumpToToolActivity={onJumpToToolActivity}
        />
      ) : null}
    </>
  );
}
