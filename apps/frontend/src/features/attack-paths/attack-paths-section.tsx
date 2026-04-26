import { useEffect, useMemo, useState } from "react";
import type { AttackPathSummary } from "@synosec/contracts";
import { cn } from "@/shared/lib/utils";

type Severity = AttackPathSummary["paths"][number]["pathSeverity"];

function severityHex(severity: Severity) {
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

type GraphNodeKind = "venue" | "finding" | "outcome";

type GraphNode = {
  id: string;
  label: string;
  sublabel?: string;
  kind: GraphNodeKind;
  severity?: Severity;
};

type GraphEdge = { from: string; to: string; variant: "supports" | "reaches" };

function AttackPathGraph({
  path,
  findingTitles,
  findingSeverities,
  venueLookup,
  onSelectFinding
}: {
  path: AttackPathSummary["paths"][number];
  findingTitles: Map<string, string>;
  findingSeverities: Map<string, Severity>;
  venueLookup: Map<string, AttackPathSummary["venues"][number]>;
  onSelectFinding?: (id: string) => void;
}) {
  const { columns, edges } = useMemo(() => {
    const venuesInPath = path.venueIds
      .map((venueId) => venueLookup.get(venueId))
      .filter((venue): venue is AttackPathSummary["venues"][number] => Boolean(venue));

    const venueNodes: GraphNode[] = venuesInPath.map((venue) => ({
      id: `v:${venue.id}`,
      label: venue.label,
      sublabel: venue.venueType,
      kind: "venue"
    }));

    const findingNodes: GraphNode[] = path.findingIds.map((findingId, index) => ({
      id: `f:${findingId}`,
      label: findingTitles.get(findingId) ?? findingId,
      sublabel: `Step ${String(index + 1).padStart(2, "0")}`,
      kind: "finding",
      severity: findingSeverities.get(findingId) ?? path.pathSeverity
    }));

    const outcomeNode: GraphNode = {
      id: "o:outcome",
      label: path.reachedAssetOrOutcome,
      sublabel: "Reached",
      kind: "outcome"
    };

    const localEdges: GraphEdge[] = [];
    for (const venue of venuesInPath) {
      for (const findingId of venue.findingIds) {
        if (path.findingIds.includes(findingId)) {
          localEdges.push({ from: `v:${venue.id}`, to: `f:${findingId}`, variant: "supports" });
        }
      }
    }
    if (path.findingIds.length > 0) {
      localEdges.push({
        from: `f:${path.findingIds[path.findingIds.length - 1]!}`,
        to: outcomeNode.id,
        variant: "reaches"
      });
    }

    const cols: GraphNode[][] = [];
    if (venueNodes.length > 0) cols.push(venueNodes);
    cols.push(findingNodes);
    cols.push([outcomeNode]);

    return { columns: cols, edges: localEdges };
  }, [path, findingTitles, findingSeverities, venueLookup]);

  const colWidth = 168;
  const colGap = 28;
  const nodeHeight = 38;
  const nodeGap = 8;
  const padX = 10;
  const padY = 18;
  const nodeWidth = colWidth - 8;

  const maxRows = Math.max(...columns.map((col) => col.length), 1);
  const innerWidth = columns.length * colWidth + (columns.length - 1) * colGap;
  const width = innerWidth + padX * 2;
  const height = padY * 2 + 14 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * nodeGap;

  type Pos = { x: number; y: number; cx: number; cy: number };
  const positions = new Map<string, Pos>();
  columns.forEach((col, colIndex) => {
    const colX = padX + colIndex * (colWidth + colGap) + (colWidth - nodeWidth) / 2;
    const totalH = col.length * nodeHeight + Math.max(0, col.length - 1) * nodeGap;
    const slotH = maxRows * nodeHeight + Math.max(0, maxRows - 1) * nodeGap;
    const startY = padY + 14 + (slotH - totalH) / 2;
    col.forEach((node, rowIndex) => {
      const y = startY + rowIndex * (nodeHeight + nodeGap);
      positions.set(node.id, {
        x: colX,
        y,
        cx: colX + nodeWidth / 2,
        cy: y + nodeHeight / 2
      });
    });
  });

  const colLabels: string[] = [];
  if (columns.length === 3) colLabels.push("Venue", "Finding", "Outcome");
  else colLabels.push("Finding", "Outcome");

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Attack path graph"
        className="block h-auto w-full text-border"
        style={{ maxHeight: height }}
      >
        <defs>
          <marker id="ap-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
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
          const x1 = from.x + nodeWidth;
          const y1 = from.cy;
          const x2 = to.x;
          const y2 = to.cy;
          const dx = (x2 - x1) * 0.5;
          const path = `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
          const isReaches = edge.variant === "reaches";
          return (
            <path
              key={`${edge.from}-${edge.to}-${index}`}
              d={path}
              fill="none"
              stroke={isReaches ? "#f97316" : "#0ea5e9"}
              strokeWidth={isReaches ? 1.75 : 1.5}
              strokeOpacity={0.95}
              strokeDasharray={isReaches ? "4 4" : undefined}
              strokeLinecap="round"
              markerEnd={isReaches ? "url(#ap-arrow)" : undefined}
            />
          );
        })}

        {columns.flat().map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const isFinding = node.kind === "finding";
          const isOutcome = node.kind === "outcome";
          const dot = node.severity ? severityHex(node.severity) : null;
          const handleClick = isFinding && onSelectFinding ? () => onSelectFinding(node.id.replace(/^f:/, "")) : undefined;
          return (
            <g
              key={node.id}
              onClick={handleClick}
              style={{ cursor: handleClick ? "pointer" : "default" }}
            >
              <rect
                x={pos.x}
                y={pos.y}
                width={nodeWidth}
                height={nodeHeight}
                rx={6}
                ry={6}
                className={cn(isFinding ? "fill-card" : "fill-background", "stroke-border")}
                strokeWidth={isFinding ? 1.5 : 1}
                strokeDasharray={isOutcome ? "4 4" : undefined}
              />
              {dot ? <circle cx={pos.x + 10} cy={pos.cy} r={3.5} fill={dot} /> : null}
              <text
                x={dot ? pos.x + 20 : pos.x + 10}
                y={pos.cy - (node.sublabel ? 3 : -3)}
                className="fill-foreground"
                style={{ fontSize: 11, fontWeight: isFinding ? 600 : 500 }}
              >
                {truncate(node.label, dot ? 18 : 22)}
              </text>
              {node.sublabel ? (
                <text
                  x={dot ? pos.x + 20 : pos.x + 10}
                  y={pos.cy + 9}
                  className="fill-muted-foreground font-mono"
                  style={{ fontSize: 9 }}
                >
                  {truncate(node.sublabel, dot ? 22 : 26)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg width={22} height={6} aria-hidden>
            <line x1={1} x2={21} y1={3} y2={3} stroke="#0ea5e9" strokeWidth={1.4} strokeOpacity={0.9} />
          </svg>
          contains
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width={22} height={6} aria-hidden>
            <line x1={1} x2={21} y1={3} y2={3} stroke="#f97316" strokeWidth={1.6} strokeDasharray="3 3" />
          </svg>
          reaches
        </span>
      </div>
    </div>
  );
}

const SEVERITY_DOT: Record<Severity, string> = {
  info: "bg-slate-400",
  low: "bg-blue-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-600"
};

const severityTone: Record<AttackPathSummary["paths"][number]["pathSeverity"], string> = {
  info: "border-slate-500/30 bg-slate-500/10 text-slate-700",
  low: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-700",
  critical: "border-rose-600/30 bg-rose-600/10 text-rose-700"
};

const statusTone: Record<AttackPathSummary["paths"][number]["status"], string> = {
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  qualified: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  blocked: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700"
};

const evidenceTone: Record<AttackPathSummary["vectors"][number]["validation"]["evidenceLevel"], string> = {
  reproduced: "border-emerald-600/30 bg-emerald-600/10 text-emerald-800",
  cross_validated: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  single_source: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  confirmed_findings: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  single_source_findings: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  relationship_only: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  blocked: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700"
};

function formatEvidenceLevel(value: AttackPathSummary["vectors"][number]["validation"]["evidenceLevel"]) {
  return value.replaceAll("_", " ");
}

function labelForFinding(findingId: string, findingLookup: Map<string, string>) {
  return findingLookup.get(findingId) ?? findingId;
}

export function AttackPathsSection({
  attackPaths,
  findingTitles,
  findingSeverities,
  title = "Attack Paths",
  summary,
  emptyMessage,
  onSelectFinding
}: {
  attackPaths: AttackPathSummary;
  findingTitles?: Map<string, string>;
  findingSeverities?: Map<string, Severity>;
  title?: string;
  summary?: string | null;
  emptyMessage: string;
  onSelectFinding?: (id: string) => void;
}) {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(attackPaths.paths[0]?.id ?? null);
  useEffect(() => {
    setSelectedPathId(attackPaths.paths[0]?.id ?? null);
  }, [attackPaths.paths]);

  const pathLookup = useMemo(() => new Map(attackPaths.paths.map((path) => [path.id, path])), [attackPaths.paths]);
  const vectorLookup = useMemo(() => new Map(attackPaths.vectors.map((vector) => [vector.id, vector])), [attackPaths.vectors]);
  const venueLookup = useMemo(() => new Map(attackPaths.venues.map((venue) => [venue.id, venue])), [attackPaths.venues]);
  const selectedPath = selectedPathId ? pathLookup.get(selectedPathId) ?? attackPaths.paths[0] ?? null : attackPaths.paths[0] ?? null;
  const findingLookup = findingTitles ?? new Map<string, string>();
  const severityLookup = findingSeverities ?? new Map<string, Severity>();

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/90">
            {summary ?? "Derived attack routes group supporting findings into the paths that matter operationally."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border/70 px-2 py-1">{attackPaths.paths.length} paths</span>
          <span className="rounded-full border border-border/70 px-2 py-1">{attackPaths.vectors.length} vectors</span>
          <span className="rounded-full border border-border/70 px-2 py-1">{attackPaths.venues.length} venues</span>
        </div>
      </div>

      {attackPaths.paths.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-8 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <div className="max-h-[640px] overflow-y-auto border-b border-border/40 lg:border-b-0 lg:border-r">
            <ul className="divide-y divide-border/20">
              {attackPaths.paths.map((path, index) => {
                const isSelected = selectedPath?.id === path.id;
                return (
                  <li key={path.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPathId(path.id)}
                      className={cn(
                        "group flex w-full items-center gap-2.5 border-l-2 px-3 py-1.5 text-left transition",
                        isSelected
                          ? "border-l-foreground bg-muted/40"
                          : "border-l-transparent hover:border-l-border hover:bg-muted/20"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[path.pathSeverity])}
                      />
                      <span className="w-5 shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm leading-tight text-foreground">{path.title}</span>
                      <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {path.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedPath ? (
            <div className="max-h-[640px] space-y-5 overflow-y-auto px-5 py-5 lg:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]", severityTone[selectedPath.pathSeverity])}>
                  {selectedPath.pathSeverity}
                </span>
                <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]", statusTone[selectedPath.status])}>
                  {selectedPath.status}
                </span>
                <span className="rounded-full border border-border/70 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {selectedPath.pathConfidence} confidence
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedPath.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/90">{selectedPath.summary}</p>
                <p className="mt-3 text-sm text-muted-foreground">Reached asset or outcome: {selectedPath.reachedAssetOrOutcome}</p>
              </div>

              {selectedPath.findingIds.length > 0 ? (
                <div className="rounded-md border border-border/60 bg-background/30 px-3 py-3">
                  <AttackPathGraph
                    path={selectedPath}
                    findingTitles={findingLookup}
                    findingSeverities={severityLookup}
                    venueLookup={venueLookup}
                    {...(onSelectFinding ? { onSelectFinding } : {})}
                  />
                </div>
              ) : null}

              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Ordered findings</p>
                <div className="mt-3 space-y-2">
                  {selectedPath.findingIds.map((findingId, index) => (
                    <div key={`${selectedPath.id}:${findingId}`} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                      <span className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectFinding?.(findingId)}
                        className={cn(
                          "text-left text-sm leading-6",
                          onSelectFinding ? "underline-offset-2 hover:underline" : ""
                        )}
                      >
                        {labelForFinding(findingId, findingLookup)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Venues</p>
                  <div className="mt-3 space-y-2">
                    {selectedPath.venueIds.map((venueId) => {
                      const venue = venueLookup.get(venueId);
                      return venue ? (
                        <div key={venue.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                          <p className="text-sm font-medium text-foreground">{venue.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{venue.summary}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Vectors</p>
                  <div className="mt-3 space-y-2">
                    {selectedPath.vectorIds.map((vectorId) => {
                      const vector = vectorLookup.get(vectorId);
                      return vector ? (
                        <div key={vector.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{vector.label}</p>
                            <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.14em]", evidenceTone[vector.validation.evidenceLevel])}>
                              {formatEvidenceLevel(vector.validation.evidenceLevel)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{vector.impact}</p>
                          {vector.findingIds.length >= 2 ? (
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                              Source: {labelForFinding(vector.findingIds[0]!, findingLookup)} · Destination: {labelForFinding(vector.findingIds[1]!, findingLookup)}
                            </p>
                          ) : null}
                          <p className="mt-2 text-sm leading-6 text-foreground/90">{vector.validation.summary}</p>
                          {vector.validation.observedTransition ? (
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                              Observed transition: {vector.validation.observedTransition}
                            </p>
                          ) : null}
                          {vector.validation.blockedReason ? (
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                              Blocked: {vector.validation.blockedReason}
                            </p>
                          ) : null}
                          {vector.validation.evidenceRefs.length > 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Transition evidence: {vector.validation.evidenceRefs.length} evidence reference{vector.validation.evidenceRefs.length === 1 ? "" : "s"}
                            </p>
                          ) : null}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Link status</p>
                <div className="mt-3 space-y-2">
                  {selectedPath.pathLinks.map((link) => (
                    <div key={link.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border/70 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                          {link.kind.replaceAll("_", " ")}
                        </span>
                        <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em]", statusTone[link.status])}>
                          {link.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground/90">{link.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[0.72rem] text-muted-foreground">
                {selectedPath.supportingFindingIds.length > 0 ? <span>Supporting: {selectedPath.supportingFindingIds.length}</span> : null}
                {selectedPath.suspectedFindingIds.length > 0 ? <span>Suspected: {selectedPath.suspectedFindingIds.length}</span> : null}
                {selectedPath.blockedFindingIds.length > 0 ? <span>Blocked: {selectedPath.blockedFindingIds.length}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
