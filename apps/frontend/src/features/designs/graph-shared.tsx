import { useEffect, useRef, useState } from "react";
import type { ExecutionReportGraph, ExecutionReportGraphEdge, ExecutionReportGraphNode } from "@synosec/contracts";

export type GraphKind = ExecutionReportGraphNode["kind"];

export type RenderNode = {
  id: string;
  kind: GraphKind;
  title: string;
  summary: string;
  severity?: "info" | "low" | "medium" | "high" | "critical";
  sourceTool?: string;
  targetLabel?: string;
  quote?: string;
  findingIds?: string[];
};

export type RenderEdge = {
  id: string;
  source: string;
  target: string;
  kind: ExecutionReportGraphEdge["kind"];
};

export const NODE_FILL: Record<GraphKind, string> = {
  evidence: "#dbeafe",
  finding: "#fff7ed",
  chain: "#fef2f2"
};

export const NODE_STROKE: Record<GraphKind, string> = {
  evidence: "#2563eb",
  finding: "#ea580c",
  chain: "#dc2626"
};

export const EDGE_STYLE: Record<RenderEdge["kind"], { stroke: string; dash: string; width: number; label: string }> = {
  supports: { stroke: "#2563eb", dash: "4 6", width: 1.8, label: "supports" },
  derived_from: { stroke: "#7c3aed", dash: "none", width: 2, label: "derived" },
  correlates_with: { stroke: "#0f766e", dash: "6 6", width: 1.8, label: "related" },
  enables: { stroke: "#dc2626", dash: "none", width: 2.2, label: "enables" }
};

export const SEVERITY_STROKE: Record<NonNullable<RenderNode["severity"]>, string> = {
  info: "#64748b",
  low: "#2563eb",
  medium: "#ca8a04",
  high: "#ea580c",
  critical: "#dc2626"
};

export const SEVERITY_FILL: Record<NonNullable<RenderNode["severity"]>, string> = {
  info: "rgba(100,116,139,0.10)",
  low: "rgba(37,99,235,0.10)",
  medium: "rgba(202,138,4,0.10)",
  high: "rgba(234,88,12,0.10)",
  critical: "rgba(220,38,38,0.12)"
};

export const SEVERITY_RANK: Record<NonNullable<RenderNode["severity"]>, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4
};

export function toRenderNodes(graph: ExecutionReportGraph): { nodes: RenderNode[]; edges: RenderEdge[] } {
  const nodes = graph.nodes.map<RenderNode>((node) => ({
    id: node.id,
    kind: node.kind,
    title: node.title,
    summary: node.summary,
    ...("severity" in node && node.severity ? { severity: node.severity } : {}),
    ...("sourceTool" in node && node.sourceTool ? { sourceTool: node.sourceTool } : {}),
    ...("quote" in node && node.quote ? { quote: node.quote } : {}),
    ...("targetLabel" in node ? { targetLabel: node.targetLabel } : {}),
    ...("findingIds" in node ? { findingIds: node.findingIds } : {})
  }));
  const edges = graph.edges.map<RenderEdge>((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.kind
  }));
  return { nodes, edges };
}

export function useContainerSize(targetHeight = 720, breakpoint = 720, smallHeight = 520) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1080, height: targetHeight });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = (width: number) => {
      setSize({ width, height: width < breakpoint ? smallHeight : targetHeight });
    };
    update(element.getBoundingClientRect().width || 1080);
    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => update(element.getBoundingClientRect().width || 1080);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [breakpoint, smallHeight, targetHeight]);

  return { ref, size };
}

export function GraphLegendChips({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {labels.map((label) => (
        <span key={label} className="rounded-full border border-border/70 px-2 py-1">{label}</span>
      ))}
    </div>
  );
}

export function CompactInspector({
  node,
  edges,
  allNodes,
  onSelect
}: {
  node: RenderNode | null;
  edges: RenderEdge[];
  allNodes: RenderNode[];
  onSelect?: (id: string) => void;
}) {
  if (!node) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-950/85 px-4 py-3 text-xs text-slate-400 backdrop-blur">
        Select a node to inspect its evidence and relationships.
      </div>
    );
  }
  const stroke = node.severity ? SEVERITY_STROKE[node.severity] : NODE_STROKE[node.kind];
  const connected = edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/85 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 text-[0.68rem] text-slate-300">
        <span className="rounded-full border px-2 py-0.5 font-mono uppercase tracking-[0.18em]" style={{ borderColor: stroke, color: stroke }}>
          {node.kind}
        </span>
        {node.severity ? (
          <span className="rounded-full border px-2 py-0.5 font-mono uppercase tracking-[0.18em]" style={{ borderColor: stroke, color: stroke }}>
            {node.severity}
          </span>
        ) : null}
        {node.sourceTool ? <span className="text-slate-400">{node.sourceTool}</span> : null}
        {node.targetLabel ? <span className="text-slate-400">{node.targetLabel}</span> : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-100">{node.title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{node.summary}</p>
      {node.quote ? (
        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900/70 p-2 text-[0.7rem] leading-4 text-slate-300">{node.quote}</pre>
      ) : null}
      {connected.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {connected.map((edge) => {
            const otherId = edge.source === node.id ? edge.target : edge.source;
            const other = allNodes.find((n) => n.id === otherId);
            return (
              <button
                key={edge.id}
                type="button"
                onClick={() => onSelect?.(otherId)}
                className="rounded-full border border-slate-700 px-2 py-0.5 text-[0.65rem] text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              >
                <span className="font-mono uppercase tracking-[0.14em] text-slate-500">{EDGE_STYLE[edge.kind].label}</span>
                <span className="ml-1.5">{other?.title ?? otherId}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export const GRID_PATTERN_ID = "execution-grid-radial";

export function GraphCanvasBackground({ width, height }: { width: number; height: number }) {
  return (
    <>
      <defs>
        <pattern id={GRID_PATTERN_ID} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#1e293b" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${GRID_PATTERN_ID})`} />
    </>
  );
}
