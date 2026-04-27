import { useMemo } from "react";
import type { ExecutionReportDetail, ExecutionReportFinding } from "@synosec/contracts";
import { cn } from "@/shared/lib/utils";

/**
 * Shared node-map primitives for the alternative finding-graph designs.
 *
 * The default graph in findings-table-view.tsx renders a 4-column linear
 * map: Tool → Evidence → Finding → Related. Each alternative below reuses
 * the same node + edge visual language (rounded-rect nodes, severity dots,
 * curved bezier edges in the same palette) but lays the nodes out
 * differently. Layouts only need to return positions for each node id.
 */

export type NodeKind = "tool" | "evidence" | "finding" | "related";
export type EdgeVariant = "supports" | "derived" | "related" | "enables";

export type GraphNode = {
  id: string;
  label: string;
  sublabel?: string;
  kind: NodeKind;
  severity?: ExecutionReportFinding["severity"];
};

export type GraphEdge = {
  from: string;
  to: string;
  variant: EdgeVariant;
};

export type GraphModel = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type NodePos = { x: number; y: number; w: number; h: number; cx: number; cy: number };

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

export type RelatedTarget = {
  findingId: string;
  variant: Exclude<EdgeVariant, "supports">;
  reverse?: boolean;
  explanation?: string | null;
};

export function relatedTargetsForFinding(report: ExecutionReportDetail, finding: ExecutionReportFinding): RelatedTarget[] {
  const targets: RelatedTarget[] = [];
  const findingNodes = new Map(
    report.graph.nodes
      .filter((node): node is Extract<ExecutionReportDetail["graph"]["nodes"][number], { kind: "finding" }> => node.kind === "finding")
      .map((node) => [node.id, node.findingId] as const)
  );
  for (const edge of report.graph.edges) {
    if (edge.kind === "derived_from" && edge.target === finding.id) {
      const findingId = findingNodes.get(edge.source);
      if (findingId) targets.push({ findingId, variant: "derived", reverse: true, explanation: edge.label ?? null });
      continue;
    }
    if (edge.kind === "correlates_with" && edge.source === finding.id) {
      const findingId = findingNodes.get(edge.target);
      if (findingId) targets.push({ findingId, variant: "related", explanation: edge.label ?? null });
      continue;
    }
    if (edge.kind === "enables" && edge.source === finding.id) {
      const findingId = findingNodes.get(edge.target);
      if (findingId) targets.push({ findingId, variant: "enables", explanation: edge.label ?? null });
    }
  }
  return targets;
}

export function chainNodeForFinding(report: ExecutionReportDetail, findingId: string) {
  return report.graph.nodes.find((node) => node.kind === "chain" && node.findingIds.includes(findingId)) ?? null;
}

export function severityHex(severity: ExecutionReportFinding["severity"]) {
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

export function buildModel(
  report: ExecutionReportDetail,
  finding: ExecutionReportFinding,
  allFindings: ExecutionReportFinding[]
): GraphModel {
  const tools = Array.from(new Set(finding.evidence.map((e) => e.sourceTool)));
  const toolNodes: GraphNode[] = tools.map((t) => ({ id: `t:${t}`, label: t, kind: "tool" }));
  const evidenceNodes: GraphNode[] = finding.evidence.map((ev, i) => ({
    id: `e:${i}`,
    label: `Signal ${String(i + 1).padStart(2, "0")}`,
    sublabel: ev.toolRunRef ? `run:${ev.toolRunRef.slice(0, 8)}` : truncate(ev.quote.replace(/\s+/g, " "), 24),
    kind: "evidence"
  }));
  const findingNode: GraphNode = {
    id: "f",
    label: finding.title,
    sublabel: finding.targetLabel,
    kind: "finding",
    severity: finding.severity
  };

  const lookup = new Map(allFindings.map((x) => [x.id, x]));
  const relatedNodes: GraphNode[] = [];
  const relatedEdges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const related of relatedTargetsForFinding(report, finding)) {
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

  const edges: GraphEdge[] = [];
  finding.evidence.forEach((ev, i) => {
    edges.push({ from: `t:${ev.sourceTool}`, to: `e:${i}`, variant: "supports" });
    edges.push({ from: `e:${i}`, to: "f", variant: "supports" });
  });
  edges.push(...relatedEdges);

  return {
    nodes: [...toolNodes, ...evidenceNodes, findingNode, ...relatedNodes],
    edges
  };
}

export type LayoutResult = {
  width: number;
  height: number;
  positions: Map<string, NodePos>;
  axisLabels?: Array<{ x: number; y: number; text: string; anchor?: "start" | "middle" | "end" }>;
  /** Direction the curve bends from (for bezier control point offsets). */
  flow?: "horizontal" | "vertical" | "radial";
};

export type LayoutFn = (model: GraphModel) => LayoutResult;

/**
 * Standard horizontal-columns layout. Each column has a header label and a
 * list of node ids; nodes are placed in vertical order within their column.
 * Columns are spaced left-to-right; edges curve horizontally between them.
 */
export function columnarLayout({
  columns,
  labels,
  nodeWidth = 140,
  nodeHeight = 34,
  colGap = 24,
  nodeGap = 6,
  padX = 10,
  padY = 16
}: {
  columns: string[][];
  labels: string[];
  nodeWidth?: number;
  nodeHeight?: number;
  colGap?: number;
  nodeGap?: number;
  padX?: number;
  padY?: number;
}): LayoutFn {
  return () => {
    const colCount = columns.length;
    const maxRows = Math.max(1, ...columns.map((c) => c.length));
    const innerWidth = colCount * nodeWidth + Math.max(0, colCount - 1) * colGap;
    const width = innerWidth + padX * 2;
    const height = padY * 2 + 12 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * nodeGap;

    const positions = new Map<string, NodePos>();
    columns.forEach((col, colIdx) => {
      const colX = padX + colIdx * (nodeWidth + colGap);
      const totalH = col.length * nodeHeight + Math.max(0, col.length - 1) * nodeGap;
      const slotH = maxRows * nodeHeight + Math.max(0, maxRows - 1) * nodeGap;
      const startY = padY + 12 + (slotH - totalH) / 2;
      col.forEach((id, rowIdx) => {
        const y = startY + rowIdx * (nodeHeight + nodeGap);
        positions.set(id, {
          x: colX,
          y,
          w: nodeWidth,
          h: nodeHeight,
          cx: colX + nodeWidth / 2,
          cy: y + nodeHeight / 2
        });
      });
    });

    const axisLabels = labels.map((text, i) => ({
      x: padX + i * (nodeWidth + colGap) + nodeWidth / 2,
      y: padY + 2,
      text,
      anchor: "middle" as const
    }));

    return { width, height, positions, axisLabels, flow: "horizontal" };
  };
}

/**
 * Renders the node + edge graph using the same visual language as the
 * default linear graph: rounded-rect nodes, severity dot, curved colored
 * bezier edges with arrow markers for non-"supports" variants.
 */
export function NodeMap({
  model,
  layout,
  className
}: {
  model: GraphModel;
  layout: LayoutFn;
  className?: string;
}) {
  const result = useMemo(() => layout(model), [model, layout]);
  const presentVariants = Array.from(new Set(model.edges.map((e) => e.variant))) as EdgeVariant[];

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${result.width} ${result.height}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Finding traceability graph"
        className={cn("block h-auto w-full text-border", className)}
        style={{ maxHeight: result.height }}
      >
        <defs>
          {(["derived", "related", "enables"] as const).map((variant) => (
            <marker
              key={variant}
              id={`nm-arrow-${variant}`}
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

        {result.axisLabels?.map((lbl, i) => (
          <text
            key={`axis-${i}`}
            x={lbl.x}
            y={lbl.y}
            textAnchor={lbl.anchor ?? "middle"}
            className="fill-muted-foreground font-mono"
            style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase" }}
          >
            {lbl.text}
          </text>
        ))}

        {model.edges.map((edge, i) => {
          const from = result.positions.get(edge.from);
          const to = result.positions.get(edge.to);
          if (!from || !to) return null;
          let x1: number;
          let y1: number;
          let x2: number;
          let y2: number;
          let cp1x: number;
          let cp1y: number;
          let cp2x: number;
          let cp2y: number;
          if (result.flow === "vertical") {
            x1 = from.cx;
            y1 = from.y + from.h;
            x2 = to.cx;
            y2 = to.y;
            const dy = (y2 - y1) * 0.5;
            cp1x = x1;
            cp1y = y1 + dy;
            cp2x = x2;
            cp2y = y2 - dy;
          } else if (result.flow === "radial") {
            x1 = from.cx;
            y1 = from.cy;
            x2 = to.cx;
            y2 = to.cy;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            cp1x = mx;
            cp1y = my;
            cp2x = mx;
            cp2y = my;
          } else {
            x1 = from.x + from.w;
            y1 = from.cy;
            x2 = to.x;
            y2 = to.cy;
            const dx = (x2 - x1) * 0.5;
            cp1x = x1 + dx;
            cp1y = y1;
            cp2x = x2 - dx;
            cp2y = y2;
          }
          const path = `M ${x1} ${y1} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x2} ${y2}`;
          const markerEnd = edge.variant === "supports" ? undefined : `url(#nm-arrow-${edge.variant})`;
          return (
            <path
              key={`${edge.from}-${edge.to}-${i}`}
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

        {model.nodes.map((node) => {
          const pos = result.positions.get(node.id);
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
