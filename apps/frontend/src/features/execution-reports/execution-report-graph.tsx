import { type MouseEvent, type WheelEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExecutionReportGraph, ExecutionReportGraphEdge, ExecutionReportGraphNode } from "@synosec/contracts";
import { cn } from "@/shared/lib/utils";

type GraphKind = ExecutionReportGraphNode["kind"];

type RenderNode = {
  id: string;
  kind: GraphKind;
  title: string;
  summary: string;
  severity?: "info" | "low" | "medium" | "high" | "critical";
  sourceTool?: string;
  targetLabel?: string;
  quote?: string;
  findingIds?: string[];
  resourceIds?: string[];
  refs?: Array<{
    traceEventId?: string;
    observationRef?: string;
    toolRunRef?: string;
    artifactRef?: string;
    externalUrl?: string;
  }>;
  resourceKind?: string;
  customKind?: string | null;
  tags?: string[];
};

type RenderEdge = {
  id: string;
  source: string;
  target: string;
  kind: ExecutionReportGraphEdge["kind"];
  label?: string;
};

const LANE_ORDER: GraphKind[] = ["resource", "evidence", "finding", "path", "chain"];

const NODE_RADIUS: Record<GraphKind, number> = {
  evidence: 20,
  resource: 24,
  finding: 28,
  path: 30,
  chain: 34
};

const NODE_FILL: Record<GraphKind, string> = {
  evidence: "#dbeafe",
  resource: "#dcfce7",
  finding: "#fff7ed",
  path: "#f3e8ff",
  chain: "#fef2f2"
};

const NODE_STROKE: Record<GraphKind, string> = {
  evidence: "#2563eb",
  resource: "#16a34a",
  finding: "#ea580c",
  path: "#7c3aed",
  chain: "#dc2626"
};

const EDGE_STYLE: Record<RenderEdge["kind"], { stroke: string; dash: string; width: number; label: string }> = {
  supports: { stroke: "#2563eb", dash: "4 6", width: 1.8, label: "supports" },
  topology: { stroke: "#16a34a", dash: "none", width: 2, label: "topology" },
  affects: { stroke: "#ea580c", dash: "none", width: 2, label: "affects" },
  member_of: { stroke: "#7c3aed", dash: "6 4", width: 1.9, label: "member of" },
  derived_from: { stroke: "#7c3aed", dash: "none", width: 2, label: "derived" },
  correlates_with: { stroke: "#0f766e", dash: "6 6", width: 1.8, label: "related" },
  enables: { stroke: "#dc2626", dash: "none", width: 2.2, label: "enables" }
};

const SEVERITY_STROKE: Record<NonNullable<RenderNode["severity"]>, string> = {
  info: "#64748b",
  low: "#2563eb",
  medium: "#ca8a04",
  high: "#ea580c",
  critical: "#dc2626"
};

const SEVERITY_RANK: Record<NonNullable<RenderNode["severity"]>, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4
};

function useContainerSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1280, height: 760 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = (width: number) => {
      setSize({
        width,
        height: width < 720 ? 500 : 760
      });
    };

    update(element.getBoundingClientRect().width || 1280);
    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => {
        update(element.getBoundingClientRect().width || 1280);
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        update(entry.contentRect.width);
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function buildSnapshotLayout(nodes: RenderNode[], edges: RenderEdge[], width: number, height: number) {
  const positions = new Map<string, { x: number; y: number }>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  const compareByTitle = (left: RenderNode, right: RenderNode) => left.title.localeCompare(right.title);
  const compareByFindingPriority = (left: RenderNode, right: RenderNode) => {
    const leftSeverity = left.severity ? SEVERITY_RANK[left.severity] : Number.MAX_SAFE_INTEGER;
    const rightSeverity = right.severity ? SEVERITY_RANK[right.severity] : Number.MAX_SAFE_INTEGER;
    if (leftSeverity !== rightSeverity) {
      return leftSeverity - rightSeverity;
    }
    return compareByTitle(left, right);
  };

  const rankWithinKind = (node: RenderNode) => {
    if (node.kind === "finding") {
      return node.severity ? SEVERITY_RANK[node.severity] : Number.MAX_SAFE_INTEGER;
    }
    return (adjacency.get(node.id)?.length ?? 0) * -1;
  };

  const orderWithinKind = (kind: GraphKind) => {
    return nodes
      .filter((node) => node.kind === kind)
      .sort((left, right) => {
        const leftRank = rankWithinKind(left);
        const rightRank = rankWithinKind(right);
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }
        return kind === "finding" ? compareByFindingPriority(left, right) : compareByTitle(left, right);
      });
  };

  const presentKinds = LANE_ORDER.filter((kind) => nodes.some((node) => node.kind === kind));
  const laneCount = Math.max(presentKinds.length, 1);
  const laneWidth = laneCount === 1 ? 0 : Math.max(width - 220, 320) / (laneCount - 1);
  const verticalPadding = 58;

  presentKinds.forEach((kind, laneIndex) => {
    const ordered = orderWithinKind(kind);
    const usableHeight = Math.max(height - verticalPadding * 2, 180);

    ordered.forEach((node, index) => {
      const y = ordered.length === 1
        ? height / 2
        : verticalPadding + (index * usableHeight) / Math.max(ordered.length - 1, 1);
      const x = laneCount === 1 ? width / 2 : 110 + laneIndex * laneWidth;
      positions.set(node.id, { x, y });
    });
  });

  return { positions, presentKinds };
}

function formatEdgeLabel(edge: RenderEdge) {
  return edge.label?.trim().length ? edge.label : EDGE_STYLE[edge.kind].label;
}

function formatKindLabel(node: RenderNode) {
  switch (node.kind) {
    case "resource":
      return node.resourceKind === "custom" ? node.customKind ?? "custom" : node.resourceKind ?? "resource";
    default:
      return node.kind;
  }
}

function NodeInspector({ node }: { node: RenderNode | null }) {
  if (!node) {
    return (
      <div className="rounded-xl border border-border bg-background/60 p-4">
        <p className="text-sm text-muted-foreground">Select a node to inspect its details and references.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">{node.kind}</span>
        {node.severity ? <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">{node.severity}</span> : null}
        {node.sourceTool ? <span>{node.sourceTool}</span> : null}
        {node.targetLabel ? <span>{node.targetLabel}</span> : null}
        {node.resourceKind ? <span>{formatKindLabel(node)}</span> : null}
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{node.title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{node.summary}</p>

      {node.quote ? <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{node.quote}</pre> : null}

      {node.tags && node.tags.length > 0 ? (
        <div className="mt-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Tags</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
            {node.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border/70 px-2 py-1">{tag}</span>
            ))}
          </div>
        </div>
      ) : null}

      {node.refs && node.refs.length > 0 ? (
        <div className="mt-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">References</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
            {node.refs.flatMap((ref, index) => [
              ref.traceEventId ? <span key={`${index}:trace`} className="rounded-full border border-border/70 px-2 py-1">trace:{ref.traceEventId.slice(0, 8)}</span> : null,
              ref.toolRunRef ? <span key={`${index}:tool`} className="rounded-full border border-border/70 px-2 py-1">tool:{ref.toolRunRef}</span> : null,
              ref.observationRef ? <span key={`${index}:obs`} className="rounded-full border border-border/70 px-2 py-1">obs:{ref.observationRef}</span> : null,
              ref.artifactRef ? <span key={`${index}:artifact`} className="rounded-full border border-border/70 px-2 py-1">artifact:{ref.artifactRef}</span> : null,
              ref.externalUrl ? <span key={`${index}:url`} className="rounded-full border border-border/70 px-2 py-1">{ref.externalUrl}</span> : null
            ])}
          </div>
        </div>
      ) : null}

      {node.resourceIds && node.resourceIds.length > 0 ? (
        <div className="mt-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Path resources</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
            {node.resourceIds.map((resourceId) => (
              <span key={resourceId} className="rounded-full border border-border/70 px-2 py-1">{resourceId}</span>
            ))}
          </div>
        </div>
      ) : null}

      {node.findingIds && node.findingIds.length > 0 ? (
        <div className="mt-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {node.kind === "path" ? "Path findings" : "Chain findings"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
            {node.findingIds.map((findingId) => (
              <span key={findingId} className="rounded-full border border-border/70 px-2 py-1">{findingId}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ExecutionReportGraphMap({ graph }: { graph: ExecutionReportGraph }) {
  const nodes = graph.nodes.map<RenderNode>((node) => ({
    id: node.id,
    kind: node.kind,
    title: node.title,
    summary: node.summary,
    ...("severity" in node && node.severity ? { severity: node.severity } : {}),
    ...("sourceTool" in node
      ? {
          ...(node.sourceTool ? { sourceTool: node.sourceTool } : {}),
          ...(node.quote ? { quote: node.quote } : {}),
          ...(node.refs
            ? {
                refs: node.refs.map((ref) => ({
                  ...(ref.traceEventId ? { traceEventId: ref.traceEventId } : {}),
                  ...(ref.observationRef ? { observationRef: ref.observationRef } : {}),
                  ...(ref.toolRunRef ? { toolRunRef: ref.toolRunRef } : {}),
                  ...(ref.artifactRef ? { artifactRef: ref.artifactRef } : {}),
                  ...(ref.externalUrl ? { externalUrl: ref.externalUrl } : {})
                }))
              }
            : {})
        }
      : {}),
    ...("targetLabel" in node ? { targetLabel: node.targetLabel } : {}),
    ...("findingIds" in node ? { findingIds: node.findingIds } : {}),
    ...("resourceIds" in node ? { resourceIds: node.resourceIds } : {}),
    ...("resourceKind" in node ? { resourceKind: node.resourceKind, customKind: node.customKind, tags: node.tags } : {})
  }));
  const edges = graph.edges.map<RenderEdge>((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.kind,
    ...(edge.label ? { label: edge.label } : {})
  }));
  const { ref, size } = useContainerSize();
  const layout = useMemo(() => buildSnapshotLayout(nodes, edges, size.width, size.height), [edges, nodes, size.height, size.width]);
  const positions = layout.positions;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(graph.nodes[0]?.id ?? null);
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panningRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    setSelectedNodeId(graph.nodes[0]?.id ?? null);
  }, [graph.nodes]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  const onMouseDown = useCallback((event: MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    if (target.tagName !== "svg" && target.tagName !== "rect") {
      return;
    }
    movedRef.current = false;
    panningRef.current = { clientX: event.clientX, clientY: event.clientY, x: viewport.x, y: viewport.y };
  }, [viewport.x, viewport.y]);

  const onMouseMove = useCallback((event: MouseEvent<SVGSVGElement>) => {
    const panStart = panningRef.current;
    if (!panStart) {
      return;
    }
    movedRef.current = true;
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const current = {
      x: (event.clientX - rect.left) * (size.width / rect.width),
      y: (event.clientY - rect.top) * (size.height / rect.height)
    };
    const start = {
      x: (panStart.clientX - rect.left) * (size.width / rect.width),
      y: (panStart.clientY - rect.top) * (size.height / rect.height)
    };
    setViewport((viewportState) => ({
      ...viewportState,
      x: panStart.x + current.x - start.x,
      y: panStart.y + current.y - start.y
    }));
  }, [size.height, size.width]);

  const onMouseUp = useCallback(() => {
    panningRef.current = null;
  }, []);

  const onWheel = useCallback((event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const anchor = {
      x: (event.clientX - rect.left) * (size.width / rect.width),
      y: (event.clientY - rect.top) * (size.height / rect.height)
    };
    const scale = Math.max(0.6, Math.min(2.4, viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1)));
    setViewport((current) => {
      const worldX = (anchor.x - current.x) / current.scale;
      const worldY = (anchor.y - current.y) / current.scale;
      return {
        scale,
        x: anchor.x - worldX * scale,
        y: anchor.y - worldY * scale
      };
    });
  }, [size.height, size.width, viewport.scale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border/70 px-2 py-1">{nodes.length} nodes</span>
        <span className="rounded-full border border-border/70 px-2 py-1">{edges.length} edges</span>
        <span className="rounded-full border border-border/70 px-2 py-1">system-wide graph</span>
        <span className="rounded-full border border-border/70 px-2 py-1">pan, zoom, inspect</span>
      </div>

      {nodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-12 text-center text-sm text-muted-foreground">
          No execution graph was persisted for this report.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div ref={ref} className="relative overflow-hidden rounded-2xl border border-border bg-slate-950/95">
            <svg
              ref={svgRef}
              width={size.width}
              height={size.height}
              viewBox={`0 0 ${size.width} ${size.height}`}
              aria-label="Execution report graph"
              className="block w-full cursor-grab"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onWheel={onWheel}
              onClick={() => {
                if (!movedRef.current) {
                  setSelectedNodeId(null);
                }
              }}
            >
              <defs>
                <pattern id="execution-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={size.width} height={size.height} fill="url(#execution-grid)" />
              <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
                {edges.map((edge, index) => {
                  const source = positions.get(edge.source);
                  const target = positions.get(edge.target);
                  if (!source || !target) {
                    return null;
                  }
                  const style = EDGE_STYLE[edge.kind];
                  const dx = target.x - source.x;
                  const dy = target.y - source.y;
                  const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                  const offset = ((index % 5) - 2) * 10;
                  const mx = (source.x + target.x) / 2 - (dy / distance) * offset;
                  const my = (source.y + target.y) / 2 + (dx / distance) * offset;
                  return (
                    <g key={edge.id}>
                      <path
                        d={`M ${source.x} ${source.y} Q ${mx} ${my} ${target.x} ${target.y}`}
                        fill="none"
                        stroke={style.stroke}
                        strokeWidth={style.width}
                        strokeDasharray={style.dash}
                        opacity={selectedNodeId && edge.source !== selectedNodeId && edge.target !== selectedNodeId ? 0.3 : 0.82}
                      />
                      <text
                        x={mx}
                        y={my - 6}
                        fill={style.stroke}
                        fontSize={8}
                        fontFamily="ui-monospace, monospace"
                        textAnchor="middle"
                        opacity={0.9}
                      >
                        {formatEdgeLabel(edge)}
                      </text>
                    </g>
                  );
                })}

                {nodes.map((node) => {
                  const position = positions.get(node.id);
                  if (!position) {
                    return null;
                  }
                  const radius = NODE_RADIUS[node.kind];
                  const stroke = node.severity ? SEVERITY_STROKE[node.severity] : NODE_STROKE[node.kind];
                  const isSelected = node.id === selectedNodeId;
                  const label = node.title.length > 20 ? `${node.title.slice(0, 19)}...` : node.title;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${position.x},${position.y})`}
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedNodeId(node.id);
                      }}
                    >
                      {isSelected ? <circle r={radius + 8} fill="none" stroke={stroke} strokeWidth={1.6} opacity={0.55} /> : null}
                      <circle
                        r={radius}
                        fill={NODE_FILL[node.kind]}
                        stroke={stroke}
                        strokeWidth={isSelected ? 2.6 : 1.6}
                        opacity={selectedNodeId && !isSelected ? 0.82 : 1}
                      />
                      {node.kind === "chain" ? (
                        <text y={4} textAnchor="middle" fill={stroke} fontSize={11} fontFamily="ui-monospace, monospace">C</text>
                      ) : null}
                      {node.kind === "path" ? (
                        <text y={4} textAnchor="middle" fill={stroke} fontSize={11} fontFamily="ui-monospace, monospace">P</text>
                      ) : null}
                      {node.kind === "resource" ? (
                        <text y={4} textAnchor="middle" fill={stroke} fontSize={11} fontFamily="ui-monospace, monospace">R</text>
                      ) : null}
                      <text y={radius + 15} textAnchor="middle" fill="#e2e8f0" fontSize={9} fontFamily="ui-monospace, monospace">
                        {label}
                      </text>
                      <text y={radius + 26} textAnchor="middle" fill={stroke} fontSize={7} fontFamily="ui-monospace, monospace" opacity={0.85}>
                        {formatKindLabel(node).toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

          </div>

          <div className={cn("space-y-3", "xl:max-h-[760px] xl:overflow-y-auto")}>
            <NodeInspector node={selectedNode} />
          </div>
        </div>
      )}
    </div>
  );
}
