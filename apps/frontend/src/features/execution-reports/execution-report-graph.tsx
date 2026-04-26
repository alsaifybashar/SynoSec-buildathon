import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  refs?: Array<{
    traceEventId?: string;
    observationRef?: string;
    toolRunRef?: string;
    artifactRef?: string;
    externalUrl?: string;
  }>;
};

type RenderEdge = {
  id: string;
  source: string;
  target: string;
  kind: ExecutionReportGraphEdge["kind"];
};

const NODE_RADIUS: Record<GraphKind, number> = {
  evidence: 20,
  finding: 28,
  chain: 34
};

const NODE_FILL: Record<GraphKind, string> = {
  evidence: "#dbeafe",
  finding: "#fff7ed",
  chain: "#fef2f2"
};

const NODE_STROKE: Record<GraphKind, string> = {
  evidence: "#2563eb",
  finding: "#ea580c",
  chain: "#dc2626"
};

const EDGE_STYLE: Record<RenderEdge["kind"], { stroke: string; dash: string; width: number; label: string }> = {
  supports: { stroke: "#2563eb", dash: "4 6", width: 1.8, label: "supports" },
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

const KIND_COLUMN: Record<GraphKind, number> = {
  evidence: 0,
  finding: 1,
  chain: 2
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
  const [size, setSize] = useState({ width: 960, height: 520 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = (width: number) => {
      setSize({
        width,
        height: width < 720 ? 420 : 520
      });
    };

    update(element.getBoundingClientRect().width || 960);
    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => {
        update(element.getBoundingClientRect().width || 960);
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
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
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

  const findings = nodes.filter((node) => node.kind === "finding").sort(compareByFindingPriority);
  const findingIndex = new Map(findings.map((node, index) => [node.id, index]));

  const averageNeighborFindingIndex = (node: RenderNode) => {
    const neighbors = adjacency.get(node.id) ?? [];
    const indices = neighbors
      .map((neighborId) => nodeById.get(neighborId))
      .filter((neighbor): neighbor is RenderNode => Boolean(neighbor && neighbor.kind === "finding"))
      .map((neighbor) => findingIndex.get(neighbor.id))
      .filter((index): index is number => index !== undefined);

    if (indices.length === 0) {
      return Number.MAX_SAFE_INTEGER;
    }

    return indices.reduce((sum, index) => sum + index, 0) / indices.length;
  };

  const orderWithinKind = (kind: GraphKind) => {
    return nodes
      .filter((node) => node.kind === kind)
      .sort((left, right) => {
        const leftAnchor = averageNeighborFindingIndex(left);
        const rightAnchor = averageNeighborFindingIndex(right);
        if (leftAnchor !== rightAnchor) {
          return leftAnchor - rightAnchor;
        }
        if (kind === "finding") {
          return compareByFindingPriority(left, right);
        }
        return compareByTitle(left, right);
      });
  };

  const laneWidth = Math.max(width - 220, 240) / 2;
  const xForKind = (kind: GraphKind) => 110 + KIND_COLUMN[kind] * laneWidth;
  const verticalPadding = 58;

  for (const kind of ["evidence", "finding", "chain"] satisfies GraphKind[]) {
    const ordered = kind === "finding" ? findings : orderWithinKind(kind);
    const usableHeight = Math.max(height - verticalPadding * 2, 180);

    ordered.forEach((node, index) => {
      const y = ordered.length === 1
        ? height / 2
        : verticalPadding + (index * usableHeight) / Math.max(ordered.length - 1, 1);
      positions.set(node.id, { x: xForKind(kind), y });
    });
  }

  return positions;
}

function formatEdgeLabel(kind: RenderEdge["kind"]) {
  return EDGE_STYLE[kind].label;
}

function NodeInspector({ node, connectedEdges }: { node: RenderNode | null; connectedEdges: RenderEdge[] }) {
  if (!node) {
    return (
      <div className="rounded-xl border border-border bg-background/60 p-4">
        <p className="text-sm text-muted-foreground">Select a node to inspect its evidence, relationships, and references.</p>
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
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{node.title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{node.summary}</p>

      {node.quote ? <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{node.quote}</pre> : null}

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

      {node.findingIds && node.findingIds.length > 0 ? (
        <div className="mt-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Chain findings</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
            {node.findingIds.map((findingId) => (
              <span key={findingId} className="rounded-full border border-border/70 px-2 py-1">{findingId}</span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Relationships</p>
        {connectedEdges.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No persisted edges connect to this node.</p> : null}
        <div className="mt-2 space-y-2">
          {connectedEdges.map((edge) => (
            <div key={edge.id} className="rounded-lg border border-border/70 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-[0.14em]">{formatEdgeLabel(edge.kind)}</span>
              <span className="ml-2">{edge.source === node.id ? edge.target : edge.source}</span>
            </div>
          ))}
        </div>
      </div>
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
    ...("findingIds" in node ? { findingIds: node.findingIds } : {})
  }));
  const edges = graph.edges.map<RenderEdge>((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.kind
  }));
  const { ref, size } = useContainerSize();
  const positions = useMemo(() => buildSnapshotLayout(nodes, edges, size.width, size.height), [edges, nodes, size.height, size.width]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(graph.nodes[0]?.id ?? null);
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panningRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    setSelectedNodeId(graph.nodes[0]?.id ?? null);
  }, [graph.nodes]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const connectedEdges = selectedNodeId
    ? edges.filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId)
    : [];

  const screenCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (size.width / rect.width),
      y: (clientY - rect.top) * (size.height / rect.height)
    };
  }, [size.height, size.width]);

  const setZoom = useCallback((nextScale: number, anchor = { x: size.width / 2, y: size.height / 2 }) => {
    const scale = Math.max(0.6, Math.min(2.4, nextScale));
    setViewport((current) => {
      const worldX = (anchor.x - current.x) / current.scale;
      const worldY = (anchor.y - current.y) / current.scale;
      return {
        scale,
        x: anchor.x - worldX * scale,
        y: anchor.y - worldY * scale
      };
    });
  }, [size.height, size.width]);

  const resetView = useCallback(() => {
    setViewport({ scale: 1, x: 0, y: 0 });
  }, []);

  const onMouseDown = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    if (target.tagName !== "svg" && target.tagName !== "rect") {
      return;
    }
    movedRef.current = false;
    panningRef.current = { clientX: event.clientX, clientY: event.clientY, x: viewport.x, y: viewport.y };
  }, [viewport.x, viewport.y]);

  const onMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const panStart = panningRef.current;
    if (!panStart) {
      return;
    }
    movedRef.current = true;
    const current = screenCoords(event.clientX, event.clientY);
    const start = screenCoords(panStart.clientX, panStart.clientY);
    setViewport((viewportState) => ({
      ...viewportState,
      x: panStart.x + current.x - start.x,
      y: panStart.y + current.y - start.y
    }));
  }, [screenCoords]);

  const onMouseUp = useCallback(() => {
    panningRef.current = null;
  }, []);

  const onWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const anchor = screenCoords(event.clientX, event.clientY);
    setZoom(viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1), anchor);
  }, [screenCoords, setZoom, viewport.scale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border/70 px-2 py-1">{nodes.length} nodes</span>
        <span className="rounded-full border border-border/70 px-2 py-1">{edges.length} edges</span>
        <span className="rounded-full border border-border/70 px-2 py-1">snapshot layout</span>
        <span className="rounded-full border border-border/70 px-2 py-1">pan, zoom, inspect</span>
      </div>

      {nodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-12 text-center text-sm text-muted-foreground">
          No execution graph was persisted for this report.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
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
                        {style.label}
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
                  const label = node.title.length > 20 ? `${node.title.slice(0, 19)}…` : node.title;

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
                        <text y={4} textAnchor="middle" fill={stroke} fontSize={11} fontFamily="ui-monospace, monospace">⛓</text>
                      ) : null}
                      <text y={radius + 15} textAnchor="middle" fill="#e2e8f0" fontSize={9} fontFamily="ui-monospace, monospace">
                        {label}
                      </text>
                      <text y={radius + 26} textAnchor="middle" fill={stroke} fontSize={7} fontFamily="ui-monospace, monospace" opacity={0.85}>
                        {node.kind.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="absolute left-3 top-3 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-[0.65rem] font-mono text-slate-300 backdrop-blur">
              <div className="uppercase tracking-[0.2em] text-slate-500">Execution Map</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <span>evidence</span>
                <span>finding</span>
                <span>chain</span>
              </div>
            </div>

            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-[0.65rem] font-mono text-slate-300 backdrop-blur">
              <button type="button" className="rounded border border-slate-700 px-2 py-1 hover:border-slate-500" onClick={() => setZoom(viewport.scale / 1.12)}>-</button>
              <span>{Math.round(viewport.scale * 100)}%</span>
              <button type="button" className="rounded border border-slate-700 px-2 py-1 hover:border-slate-500" onClick={() => setZoom(viewport.scale * 1.12)}>+</button>
              <button type="button" className="rounded border border-slate-700 px-2 py-1 hover:border-slate-500" onClick={resetView}>fit</button>
            </div>
          </div>

          <div className={cn("space-y-3", "xl:max-h-[520px] xl:overflow-y-auto")}>
            <div>
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">Inspector</p>
              <p className="mt-1 text-sm text-muted-foreground">Select nodes to inspect evidence references and graph relationships.</p>
            </div>
            <NodeInspector node={selectedNode} connectedEdges={connectedEdges} />
          </div>
        </div>
      )}
    </div>
  );
}
