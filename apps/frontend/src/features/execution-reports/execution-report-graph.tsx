import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dagre from "dagre";
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
  isCluster?: boolean;
  clusterMemberIds?: string[];
  clusterMemberCount?: number;
  clusterGroupKey?: string;
};

type RenderEdge = {
  id: string;
  source: string;
  target: string;
  kind: ExecutionReportGraphEdge["kind"];
  label?: string;
  aggregatedCount?: number;
};

const DENSITY_THRESHOLD = 14;
const MIN_CLUSTER_SIZE = 3;

type LayoutNode = RenderNode & { x: number; y: number; width: number; height: number };
type LayoutEdge = RenderEdge & { points: Array<{ x: number; y: number }> };

const NODE_WIDTH: Record<GraphKind, number> = {
  evidence: 170,
  resource: 170,
  finding: 200,
  path: 190,
  attack_chain: 200
};

const NODE_HEIGHT: Record<GraphKind, number> = {
  evidence: 50,
  resource: 50,
  finding: 58,
  path: 54,
  attack_chain: 58
};

const NODE_FILL: Record<GraphKind, string> = {
  evidence: "#1e3a8a",
  resource: "#14532d",
  finding: "#7c2d12",
  path: "#4c1d95",
  attack_chain: "#7f1d1d"
};

const NODE_STROKE: Record<GraphKind, string> = {
  evidence: "#60a5fa",
  resource: "#4ade80",
  finding: "#fb923c",
  path: "#c4b5fd",
  attack_chain: "#fca5a5"
};

const NODE_GLYPH: Record<GraphKind, string> = {
  evidence: "E",
  resource: "R",
  finding: "F",
  path: "P",
  attack_chain: "C"
};

const EDGE_STYLE: Record<RenderEdge["kind"], { stroke: string; dash: string; width: number; label: string }> = {
  supports: { stroke: "#60a5fa", dash: "4 6", width: 1.6, label: "supports" },
  topology: { stroke: "#4ade80", dash: "none", width: 1.8, label: "topology" },
  affects: { stroke: "#fb923c", dash: "none", width: 2, label: "affects" },
  member_of: { stroke: "#c4b5fd", dash: "6 4", width: 1.6, label: "member of" },
  derived_from: { stroke: "#c4b5fd", dash: "none", width: 1.8, label: "derived" },
  correlates_with: { stroke: "#5eead4", dash: "6 6", width: 1.6, label: "related" },
  enables: { stroke: "#fca5a5", dash: "none", width: 2.2, label: "enables" }
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
      setSize({ width, height: width < 720 ? 540 : 760 });
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

type DagreLayout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  graphWidth: number;
  graphHeight: number;
};

function clusterGroupKey(node: RenderNode): string {
  if (node.kind === "finding") {
    return node.severity ?? "unspecified";
  }
  if (node.kind === "resource") {
    if (node.resourceKind === "custom") {
      return `custom:${node.customKind ?? "other"}`;
    }
    return node.resourceKind ?? "unspecified";
  }
  if (node.kind === "evidence") {
    return node.sourceTool ?? "unspecified";
  }
  return "all";
}

function clusterId(kind: GraphKind, groupKey: string): string {
  return `__cluster__:${kind}:${groupKey}`;
}

function clusterTitle(kind: GraphKind, groupKey: string, count: number): string {
  const groupLabel = groupKey.startsWith("custom:") ? groupKey.slice("custom:".length) : groupKey;
  return `${count} ${kind}${count === 1 ? "" : "s"} · ${groupLabel}`;
}

function nodeSize(node: RenderNode): { width: number; height: number } {
  if (node.isCluster) {
    return { width: 220, height: 64 };
  }
  return { width: NODE_WIDTH[node.kind], height: NODE_HEIGHT[node.kind] };
}

function aggregateForDensity(
  nodes: RenderNode[],
  edges: RenderEdge[],
  expanded: Set<string>
): { nodes: RenderNode[]; edges: RenderEdge[] } {
  const byKind = new Map<GraphKind, RenderNode[]>();
  for (const node of nodes) {
    const arr = byKind.get(node.kind) ?? [];
    arr.push(node);
    byKind.set(node.kind, arr);
  }

  const memberToCluster = new Map<string, RenderNode>();
  const aggregatedNodes: RenderNode[] = [];

  for (const [kind, kindNodes] of byKind) {
    if (kindNodes.length <= DENSITY_THRESHOLD) {
      aggregatedNodes.push(...kindNodes);
      continue;
    }
    const groups = new Map<string, RenderNode[]>();
    for (const node of kindNodes) {
      const key = clusterGroupKey(node);
      const arr = groups.get(key) ?? [];
      arr.push(node);
      groups.set(key, arr);
    }
    for (const [groupKey, members] of groups) {
      const id = clusterId(kind, groupKey);
      const expandedHere = expanded.has(id);
      if (expandedHere || members.length < MIN_CLUSTER_SIZE) {
        aggregatedNodes.push(...members);
        continue;
      }
      const representativeSeverity = kind === "finding"
        ? (members[0]?.severity ?? undefined)
        : undefined;
      const clusterNode: RenderNode = {
        id,
        kind,
        title: clusterTitle(kind, groupKey, members.length),
        summary: `Click to expand ${members.length} grouped ${kind} nodes.`,
        isCluster: true,
        clusterMemberIds: members.map((member) => member.id),
        clusterMemberCount: members.length,
        clusterGroupKey: groupKey,
        ...(representativeSeverity ? { severity: representativeSeverity } : {})
      };
      aggregatedNodes.push(clusterNode);
      for (const member of members) {
        memberToCluster.set(member.id, clusterNode);
      }
    }
  }

  const seenEdge = new Map<string, RenderEdge>();
  const symmetricSeen = new Set<string>();
  for (const edge of edges) {
    const sourceCluster = memberToCluster.get(edge.source);
    const targetCluster = memberToCluster.get(edge.target);
    const sourceId = sourceCluster?.id ?? edge.source;
    const targetId = targetCluster?.id ?? edge.target;
    if (sourceId === targetId) {
      continue;
    }
    if (edge.kind === "correlates_with") {
      const [a, b] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
      const symKey = `corr:${a}:${b}`;
      if (symmetricSeen.has(symKey)) {
        continue;
      }
      symmetricSeen.add(symKey);
    }
    const key = `${sourceId}->${targetId}:${edge.kind}`;
    const existing = seenEdge.get(key);
    if (existing) {
      existing.aggregatedCount = (existing.aggregatedCount ?? 1) + 1;
      continue;
    }
    const isAggregated = Boolean(sourceCluster || targetCluster);
    const newEdge: RenderEdge = {
      ...edge,
      id: isAggregated ? `agg:${key}` : edge.id,
      source: sourceId,
      target: targetId,
      ...(isAggregated ? { aggregatedCount: 1 } : {})
    };
    seenEdge.set(key, newEdge);
  }

  return { nodes: aggregatedNodes, edges: Array.from(seenEdge.values()) };
}

const EDGE_WEIGHT: Record<RenderEdge["kind"], number> = {
  enables: 6,
  affects: 5,
  derived_from: 4,
  member_of: 3,
  topology: 3,
  supports: 2,
  correlates_with: 1
};

const EDGE_MINLEN: Record<RenderEdge["kind"], number> = {
  enables: 1,
  affects: 1,
  derived_from: 1,
  member_of: 1,
  topology: 1,
  supports: 1,
  correlates_with: 0
};

function buildDagreLayout(nodes: RenderNode[], edges: RenderEdge[]): DagreLayout {
  const g = new dagre.graphlib.Graph({ multigraph: true, directed: true });
  const density = edges.length / Math.max(nodes.length, 1);
  const nodesep = Math.round(32 + Math.min(28, density * 6));
  const ranksep = Math.round(110 + Math.min(120, density * 22));
  const edgesep = Math.round(22 + Math.min(24, density * 4));
  const ranker = nodes.length > 80 ? "longest-path" : "network-simplex";
  g.setGraph({
    rankdir: "LR",
    nodesep,
    ranksep,
    edgesep,
    marginx: 36,
    marginy: 36,
    ranker
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, nodeSize(node));
  }

  for (const edge of edges) {
    if (!g.hasNode(edge.source) || !g.hasNode(edge.target)) {
      continue;
    }
    g.setEdge(
      edge.source,
      edge.target,
      {
        id: edge.id,
        weight: EDGE_WEIGHT[edge.kind] ?? 1,
        minlen: EDGE_MINLEN[edge.kind] ?? 1
      },
      edge.id
    );
  }

  dagre.layout(g);

  const layoutNodes: LayoutNode[] = nodes
    .map((node) => {
      const pos = g.node(node.id);
      if (!pos) {
        return null;
      }
      return {
        ...node,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height
      } satisfies LayoutNode;
    })
    .filter((entry): entry is LayoutNode => entry !== null);

  const layoutEdges: LayoutEdge[] = edges
    .map((edge) => {
      const data = g.edge({ v: edge.source, w: edge.target, name: edge.id });
      if (!data || !data.points || data.points.length === 0) {
        return null;
      }
      return { ...edge, points: data.points.map((point: { x: number; y: number }) => ({ x: point.x, y: point.y })) };
    })
    .filter((entry): entry is LayoutEdge => entry !== null);

  const graphMeta = g.graph();
  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    graphWidth: graphMeta.width ?? 0,
    graphHeight: graphMeta.height ?? 0
  };
}

function pointsToPath(points: Array<{ x: number; y: number }>): string {
  const first = points[0];
  if (!first) {
    return "";
  }
  if (points.length < 3) {
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }
  const segments: string[] = [`M ${first.x} ${first.y}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (!current || !next) {
      continue;
    }
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    segments.push(`Q ${current.x} ${current.y} ${midX} ${midY}`);
  }
  const last = points[points.length - 1];
  if (last) {
    segments.push(`L ${last.x} ${last.y}`);
  }
  return segments.join(" ");
}

function longestSegmentMidpoint(points: Array<{ x: number; y: number }>): { x: number; y: number; length: number } {
  const first = points[0];
  if (!first) {
    return { x: 0, y: 0, length: 0 };
  }
  if (points.length === 1) {
    return { x: first.x, y: first.y, length: 0 };
  }
  let bestIndex = 1;
  let bestLength = -1;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) {
      continue;
    }
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > bestLength) {
      bestLength = len;
      bestIndex = i;
    }
  }
  const start = points[bestIndex - 1];
  const end = points[bestIndex];
  if (!start || !end) {
    return { x: first.x, y: first.y, length: 0 };
  }
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, length: bestLength };
}

function midpointOnPath(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  const first = points[0];
  if (!first) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return first;
  }
  let total = 0;
  const segLengths: number[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) {
      segLengths.push(0);
      continue;
    }
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    total += len;
  }
  const target = total / 2;
  let acc = 0;
  for (let i = 0; i < segLengths.length; i += 1) {
    const segLen = segLengths[i] ?? 0;
    const start = points[i];
    const end = points[i + 1];
    if (!start || !end) {
      continue;
    }
    if (acc + segLen >= target) {
      const ratio = (target - acc) / Math.max(segLen, 0.0001);
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
      };
    }
    acc += segLen;
  }
  return points[Math.floor(points.length / 2)] ?? first;
}

function truncate(text: string, max: number) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function formatKindLabel(node: RenderNode) {
  if (node.kind === "resource") {
    return node.resourceKind === "custom" ? node.customKind ?? "custom" : node.resourceKind ?? "resource";
  }
  return node.kind;
}

function formatEdgeLabel(edge: RenderEdge) {
  return edge.label?.trim().length ? edge.label : EDGE_STYLE[edge.kind].label;
}

function InspectorSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="text-[0.66rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function InspectorMetaRow({ items }: { items: Array<string | null | undefined> }) {
  const filtered = items.filter((entry): entry is string => Boolean(entry));
  if (filtered.length === 0) {
    return null;
  }
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {filtered.map((entry, index) => (
        <span key={`${index}:${entry}`}>
          {index > 0 ? <span className="px-1.5 text-muted-foreground/50">·</span> : null}
          {entry}
        </span>
      ))}
    </p>
  );
}

function InspectorRefList({ refs }: { refs: NonNullable<RenderNode["refs"]> }) {
  const rows: Array<{ label: string; value: string }> = [];
  for (const ref of refs) {
    if (ref.traceEventId) rows.push({ label: "trace", value: ref.traceEventId.slice(0, 8) });
    if (ref.toolRunRef) rows.push({ label: "tool", value: ref.toolRunRef });
    if (ref.observationRef) rows.push({ label: "obs", value: ref.observationRef });
    if (ref.artifactRef) rows.push({ label: "artifact", value: ref.artifactRef });
    if (ref.externalUrl) rows.push({ label: "url", value: ref.externalUrl });
  }
  if (rows.length === 0) {
    return null;
  }
  return (
    <ul className="space-y-1 text-xs">
      {rows.map((row, index) => (
        <li key={`${row.label}:${row.value}:${index}`} className="flex gap-2 font-mono">
          <span className="w-14 shrink-0 text-muted-foreground/70">{row.label}</span>
          <span className="min-w-0 break-all text-foreground/90">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

function NodeInspector({
  node,
  onExpandCluster
}: {
  node: RenderNode | null;
  onExpandCluster?: (clusterIdValue: string) => void;
}) {
  if (!node) {
    return (
      <p className="text-sm text-muted-foreground">Select a node to inspect its details and references.</p>
    );
  }

  const accentColor = NODE_STROKE[node.kind];
  const isCluster = node.isCluster === true;

  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: accentColor }} aria-hidden />
        <span className="font-mono">{node.kind}</span>
        {isCluster ? <span className="font-mono text-amber-400">· cluster</span> : null}
        {node.severity ? (
          <span className="font-mono text-foreground/80">· {node.severity}</span>
        ) : null}
      </div>
      <h2 className="mt-2 text-base font-semibold leading-snug text-foreground">{node.title}</h2>

      {isCluster ? (
        <>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {node.clusterMemberCount ?? 0} {node.kind} nodes grouped under
            {node.clusterGroupKey ? <span className="font-mono"> {node.clusterGroupKey}</span> : " a single bucket"}.
          </p>
          <button
            type="button"
            className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
            onClick={() => onExpandCluster?.(node.id)}
          >
            Expand cluster
          </button>
        </>
      ) : (
        <>
          <InspectorMetaRow
            items={[
              node.sourceTool,
              node.targetLabel,
              node.resourceKind ? formatKindLabel(node) : null
            ]}
          />
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{node.summary}</p>

          {node.quote ? (
            <pre className="mt-3 overflow-x-auto rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs leading-relaxed text-muted-foreground">
              {node.quote}
            </pre>
          ) : null}

          {node.tags && node.tags.length > 0 ? (
            <InspectorSection label="Tags">
              <p className="text-xs leading-6 text-muted-foreground">{node.tags.join(", ")}</p>
            </InspectorSection>
          ) : null}

          {node.refs && node.refs.length > 0 ? (
            <InspectorSection label="References">
              <InspectorRefList refs={node.refs} />
            </InspectorSection>
          ) : null}

        </>
      )}
    </div>
  );
}

const EDGE_KINDS: Array<RenderEdge["kind"]> = [
  "supports",
  "topology",
  "affects",
  "member_of",
  "derived_from",
  "correlates_with",
  "enables"
];

export function ExecutionReportGraphMap({ graph }: { graph: ExecutionReportGraph }) {
  const nodes = useMemo<RenderNode[]>(
    () =>
      graph.nodes.map<RenderNode>((node) => ({
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
      })),
    [graph.nodes]
  );

  const edges = useMemo<RenderEdge[]>(
    () =>
      graph.edges.map<RenderEdge>((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        kind: edge.kind,
        ...(edge.label ? { label: edge.label } : {})
      })),
    [graph.edges]
  );

  const { ref, size } = useContainerSize();
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(() => new Set());
  const aggregated = useMemo(() => aggregateForDensity(nodes, edges, expandedClusters), [nodes, edges, expandedClusters]);
  const layout = useMemo(() => buildDagreLayout(aggregated.nodes, aggregated.edges), [aggregated]);
  const hasClusters = aggregated.nodes.some((node) => node.isCluster);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(graph.nodes[0]?.id ?? null);
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panningRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const toggleCluster = useCallback((clusterIdValue: string) => {
    setExpandedClusters((current) => {
      const next = new Set(current);
      if (next.has(clusterIdValue)) {
        next.delete(clusterIdValue);
      } else {
        next.add(clusterIdValue);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedClusters(new Set());
  }, []);

  const fitToView = useCallback(() => {
    if (layout.nodes.length === 0 || size.width === 0 || size.height === 0) {
      return;
    }
    const padding = 24;
    const scale = Math.max(
      0.4,
      Math.min(
        1.4,
        Math.min(
          (size.width - padding * 2) / Math.max(layout.graphWidth, 1),
          (size.height - padding * 2) / Math.max(layout.graphHeight, 1)
        )
      )
    );
    const offsetX = (size.width - layout.graphWidth * scale) / 2;
    const offsetY = (size.height - layout.graphHeight * scale) / 2;
    setViewport({ scale, x: offsetX, y: offsetY });
  }, [layout.graphHeight, layout.graphWidth, layout.nodes.length, size.height, size.width]);

  useEffect(() => {
    setSelectedNodeId(graph.nodes[0]?.id ?? null);
  }, [graph.nodes]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }
    return aggregated.nodes.find((node) => node.id === selectedNodeId)
      ?? nodes.find((node) => node.id === selectedNodeId)
      ?? null;
  }, [aggregated.nodes, nodes, selectedNodeId]);

  const neighborIds = useMemo(() => {
    if (!selectedNodeId) {
      return new Set<string>();
    }
    const neighbors = new Set<string>([selectedNodeId]);
    for (const edge of aggregated.edges) {
      if (edge.source === selectedNodeId) {
        neighbors.add(edge.target);
      } else if (edge.target === selectedNodeId) {
        neighbors.add(edge.source);
      }
    }
    return neighbors;
  }, [aggregated.edges, selectedNodeId]);

  const onMouseDown = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
      const target = event.target as SVGElement;
      if (target.tagName !== "svg" && target.tagName !== "rect") {
        return;
      }
      movedRef.current = false;
      panningRef.current = { clientX: event.clientX, clientY: event.clientY, x: viewport.x, y: viewport.y };
    },
    [viewport.x, viewport.y]
  );

  const onMouseMove = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
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
    },
    [size.height, size.width]
  );

  const onMouseUp = useCallback(() => {
    panningRef.current = null;
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const handler = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      const anchor = {
        x: (event.clientX - rect.left) * (size.width / rect.width),
        y: (event.clientY - rect.top) * (size.height / rect.height)
      };
      setViewport((current) => {
        const scale = Math.max(0.3, Math.min(2.6, current.scale * (event.deltaY > 0 ? 0.9 : 1.1)));
        const worldX = (anchor.x - current.x) / current.scale;
        const worldY = (anchor.y - current.y) / current.scale;
        return {
          scale,
          x: anchor.x - worldX * scale,
          y: anchor.y - worldY * scale
        };
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [size.height, size.width]);

  const adjustZoom = useCallback(
    (factor: number) => {
      setViewport((current) => {
        const scale = Math.max(0.3, Math.min(2.6, current.scale * factor));
        const centerX = size.width / 2;
        const centerY = size.height / 2;
        const worldX = (centerX - current.x) / current.scale;
        const worldY = (centerY - current.y) / current.scale;
        return {
          scale,
          x: centerX - worldX * scale,
          y: centerY - worldY * scale
        };
      });
    },
    [size.height, size.width]
  );

  return (
    <div className="space-y-4">
      {hasClusters || expandedClusters.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-300">
            {expandedClusters.size > 0
              ? `${expandedClusters.size} cluster${expandedClusters.size === 1 ? "" : "s"} expanded`
              : "dense lanes grouped — click a cluster to expand"}
          </span>
          {expandedClusters.size > 0 ? (
            <button
              type="button"
              className="rounded-full border border-border/70 px-2 py-1 hover:bg-muted/40"
              onClick={collapseAll}
            >
              collapse all
            </button>
          ) : null}
        </div>
      ) : null}

      {nodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-12 text-center text-sm text-muted-foreground">
          No execution graph was persisted for this report.
        </div>
      ) : (
        <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-background/70 2xl:flex-row">
          <div ref={ref} className="relative min-w-0 flex-1 bg-slate-950/95">
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
                {EDGE_KINDS.map((kind) => (
                  <marker
                    key={kind}
                    id={`graph-arrow-${kind}`}
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_STYLE[kind].stroke} />
                  </marker>
                ))}
              </defs>
              <rect width={size.width} height={size.height} fill="url(#execution-grid)" />
              <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
                {layout.edges.map((edge) => {
                  const style = EDGE_STYLE[edge.kind];
                  const dimmed = selectedNodeId !== null && !(neighborIds.has(edge.source) && neighborIds.has(edge.target));
                  const path = pointsToPath(edge.points);
                  return (
                    <path
                      key={edge.id}
                      d={path}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth={style.width}
                      strokeDasharray={style.dash}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      markerEnd={`url(#graph-arrow-${edge.kind})`}
                      opacity={dimmed ? 0.16 : 0.9}
                    />
                  );
                })}

                {layout.nodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const dimmed = selectedNodeId !== null && !neighborIds.has(node.id);
                  const fill = NODE_FILL[node.kind];
                  const stroke = NODE_STROKE[node.kind];
                  const halfWidth = node.width / 2;
                  const halfHeight = node.height / 2;
                  const titleMax = Math.max(12, Math.floor((node.width - 38) / 7));
                  const summaryMax = Math.max(14, Math.floor((node.width - 24) / 6));
                  const isCluster = node.isCluster === true;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x},${node.y})`}
                      className="cursor-pointer"
                      opacity={dimmed ? 0.35 : 1}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isCluster) {
                          toggleCluster(node.id);
                          setSelectedNodeId(null);
                          return;
                        }
                        setSelectedNodeId(node.id);
                      }}
                    >
                      {isCluster ? (
                        <>
                          <rect
                            x={-halfWidth + 6}
                            y={-halfHeight + 6}
                            width={node.width}
                            height={node.height}
                            rx={9}
                            ry={9}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={1}
                            opacity={0.45}
                          />
                          <rect
                            x={-halfWidth + 3}
                            y={-halfHeight + 3}
                            width={node.width}
                            height={node.height}
                            rx={9}
                            ry={9}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={1}
                            opacity={0.7}
                          />
                        </>
                      ) : null}
                      {isSelected ? (
                        <rect
                          x={-halfWidth - 4}
                          y={-halfHeight - 4}
                          width={node.width + 8}
                          height={node.height + 8}
                          rx={12}
                          ry={12}
                          fill="none"
                          stroke={stroke}
                          strokeOpacity={0.55}
                          strokeWidth={2}
                        />
                      ) : null}
                      <rect
                        x={-halfWidth}
                        y={-halfHeight}
                        width={node.width}
                        height={node.height}
                        rx={9}
                        ry={9}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSelected ? 2 : isCluster ? 1.6 : 1.2}
                        strokeDasharray={isCluster ? "5 4" : undefined}
                      />
                      {isCluster ? (
                        <g transform={`translate(${halfWidth - 18},${-halfHeight + 14})`}>
                          <circle r={10} fill="#0f172a" stroke={stroke} strokeWidth={1.2} />
                          <text
                            y={4}
                            textAnchor="middle"
                            fill={stroke}
                            fontSize={14}
                            fontWeight={700}
                            fontFamily="ui-monospace, monospace"
                          >
                            +
                          </text>
                        </g>
                      ) : null}
                      <g transform={`translate(${-halfWidth + 14},${-halfHeight + 16})`}>
                        <circle r={9} fill="#0f172a" stroke={stroke} strokeWidth={1.2} />
                        <text
                          y={3}
                          textAnchor="middle"
                          fill={stroke}
                          fontSize={10}
                          fontWeight={600}
                          fontFamily="ui-monospace, monospace"
                        >
                          {NODE_GLYPH[node.kind]}
                        </text>
                      </g>
                      <text
                        x={-halfWidth + 30}
                        y={-halfHeight + 19}
                        fill="#f8fafc"
                        fontSize={12}
                        fontWeight={600}
                      >
                        {truncate(node.title, titleMax)}
                      </text>
                      <text
                        x={-halfWidth + 12}
                        y={-halfHeight + 36}
                        fill="#cbd5f5"
                        fontSize={10}
                        fontFamily="ui-monospace, monospace"
                        opacity={0.85}
                      >
                        {truncate(formatKindLabel(node).toUpperCase(), 14)}
                        {node.severity ? `  ·  ${node.severity.toUpperCase()}` : ""}
                      </text>
                      {node.height >= 56 ? (
                        <text
                          x={-halfWidth + 12}
                          y={-halfHeight + 51}
                          fill="#94a3b8"
                          fontSize={9}
                        >
                          {truncate(node.summary, summaryMax)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}

                {layout.edges.map((edge) => {
                  const style = EDGE_STYLE[edge.kind];
                  const dimmed = selectedNodeId !== null && !(neighborIds.has(edge.source) && neighborIds.has(edge.target));
                  if (dimmed) {
                    return null;
                  }
                  const labelPoint = longestSegmentMidpoint(edge.points);
                  if (labelPoint.length < 60) {
                    return null;
                  }
                  const rawText = `${formatEdgeLabel(edge)}${edge.aggregatedCount && edge.aggregatedCount > 1 ? ` ×${edge.aggregatedCount}` : ""}`;
                  const charBudget = Math.max(4, Math.floor((labelPoint.length - 12) / 7));
                  const text = rawText.length <= charBudget ? rawText : `${rawText.slice(0, Math.max(3, charBudget - 1)).trimEnd()}…`;
                  const labelWidth = text.length * 6.4 + 12;
                  const labelHeight = 16;
                  return (
                    <g key={`label:${edge.id}`} transform={`translate(${labelPoint.x},${labelPoint.y})`}>
                      <rect
                        x={-labelWidth / 2}
                        y={-labelHeight / 2}
                        width={labelWidth}
                        height={labelHeight}
                        rx={4}
                        ry={4}
                        fill="#0f172a"
                        stroke={style.stroke}
                        strokeOpacity={0.45}
                        strokeWidth={0.8}
                      />
                      <text
                        y={3.5}
                        textAnchor="middle"
                        fill={style.stroke}
                        fontSize={10}
                        fontFamily="ui-monospace, monospace"
                      >
                        {text}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-lg border border-border/60 bg-slate-900/80 p-1 text-xs text-slate-200 shadow-md backdrop-blur">
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-slate-800"
                onClick={() => adjustZoom(1.2)}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-slate-800"
                onClick={() => adjustZoom(1 / 1.2)}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-[0.68rem] uppercase tracking-[0.14em] hover:bg-slate-800"
                onClick={fitToView}
                aria-label="Fit to view"
              >
                fit
              </button>
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-lg border border-border/60 bg-slate-900/75 px-2 py-1.5 text-[0.65rem] text-slate-200 shadow-sm backdrop-blur">
              {(Object.keys(NODE_FILL) as GraphKind[]).map((kind) => (
                <span key={kind} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm border"
                    style={{ background: NODE_FILL[kind], borderColor: NODE_STROKE[kind] }}
                  />
                  <span className="uppercase tracking-[0.14em]">{kind}</span>
                </span>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "border-t border-border bg-background/70 p-4 2xl:border-l 2xl:border-t-0",
              "2xl:w-[340px] 2xl:flex-shrink-0 2xl:overflow-y-auto"
            )}
          >
            <NodeInspector node={selectedNode} onExpandCluster={toggleCluster} />
          </div>
        </div>
      )}
    </div>
  );
}
