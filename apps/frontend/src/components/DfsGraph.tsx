import { useCallback, useEffect, useMemo, type MouseEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  DfsNode,
  Finding,
  GraphResponse,
  OsiLayer,
  Severity,
  VulnerabilityChain
} from "@synosec/contracts";

// ─── Layer colours ────────────────────────────────────────────────────────────
const LAYER_BORDER: Record<OsiLayer, string> = {
  L2: "#6b7280",
  L3: "#3b82f6",
  L4: "#06b6d4",
  L5: "#a855f7",
  L6: "#14b8a6",
  L7: "#f97316",
};

// ─── Custom Node ──────────────────────────────────────────────────────────────
interface SynoSecNodeData extends Record<string, unknown> {
  node: DfsNode;
  hasHighRisk: boolean;
  isChainNode: boolean;
  isPrioritized: boolean;
  chainTechnique?: string;
}

function SynoSecNode({ data }: NodeProps) {
  const { node, hasHighRisk, isChainNode, isPrioritized, chainTechnique } = data as SynoSecNodeData;
  const borderColor = LAYER_BORDER[node.layer] ?? "#6b7280";
  const riskPct = Math.round(node.riskScore * 100);

  const statusDot: Record<string, string> = {
    pending: "bg-gray-600",
    "in-progress": "bg-green-400 animate-pulse",
    complete: "bg-green-600",
    skipped: "bg-gray-500",
  };

  return (
    <div
      style={{
        border: `2px solid ${isChainNode ? "#10b981" : hasHighRisk ? "#ef4444" : borderColor}`,
        boxShadow: isChainNode
          ? "0 0 0 2px rgba(16,185,129,0.25), 0 0 16px 2px rgba(16,185,129,0.25)"
          : hasHighRisk
          ? "0 0 12px 2px rgba(239,68,68,0.4)"
          : `0 0 8px 0px ${borderColor}40`,
      }}
      className="min-w-[140px] max-w-[180px] rounded-lg bg-gray-900 p-3"
    >
      {/* Layer badge */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <span
          style={{ color: borderColor, borderColor }}
          className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold"
        >
          {node.layer}
        </span>
        <div className="flex items-center gap-1">
          {isPrioritized && <span className="rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] font-bold text-emerald-300">GRACE</span>}
          <span className={`h-2 w-2 rounded-full ${statusDot[node.status] ?? "bg-gray-600"}`} />
        </div>
      </div>

      {/* Target */}
      <p className="truncate font-mono text-xs font-semibold text-gray-200">{node.target}</p>

      {/* Service + port */}
      {(node.service ?? node.port) && (
        <p className="mt-0.5 truncate font-mono text-[10px] text-gray-500">
          {[node.service, node.port ? `:${node.port}` : ""].filter(Boolean).join("")}
        </p>
      )}

      {chainTechnique && (
        <p className="mt-1 truncate rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
          {chainTechnique}
        </p>
      )}

      {/* Risk bar */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${riskPct}%`,
            backgroundColor:
              riskPct >= 80
                ? "#ef4444"
                : riskPct >= 60
                ? "#f97316"
                : riskPct >= 40
                ? "#eab308"
                : "#22c55e",
          }}
        />
      </div>
      <p className="mt-0.5 text-right font-mono text-[9px] text-gray-600">{riskPct}%</p>

      <Handle type="target" position={Position.Top} className="!border-0 !bg-gray-600" />
      <Handle type="source" position={Position.Bottom} className="!border-0 !bg-gray-600" />
    </div>
  );
}

const nodeTypes = { synosec: SynoSecNode };

// ─── Layout helpers ──────────────────────────────────────────────────────────
function buildLayout(
  rawNodes: DfsNode[],
  rawEdges: Array<{ source: string; target: string }>,
  highRiskIds: Set<string>,
  chainNodeIds: Set<string>,
  prioritizedTargets: Set<string>,
  chainTechniqueByNodeId: Map<string, string>
): { nodes: Node[]; edges: Edge[] } {
  // Group by depth
  const byDepth = new Map<number, DfsNode[]>();
  for (const n of rawNodes) {
    if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
    byDepth.get(n.depth)!.push(n);
  }

  const X_SPACING = 220;
  const Y_SPACING = 140;
  const positions = new Map<string, { x: number; y: number }>();

  const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);
  for (const depth of depths) {
    const group = byDepth.get(depth)!;
    const y = depth * Y_SPACING;
    const totalWidth = (group.length - 1) * X_SPACING;
    group.forEach((n, i) => {
      positions.set(n.id, { x: i * X_SPACING - totalWidth / 2, y });
    });
  }

  const nodes: Node[] = rawNodes.map((n) => ({
    id: n.id,
    type: "synosec",
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      node: n,
      hasHighRisk: highRiskIds.has(n.id),
      isChainNode: chainNodeIds.has(n.id),
      isPrioritized: prioritizedTargets.has(n.target),
      chainTechnique: chainTechniqueByNodeId.get(n.id)
    } as SynoSecNodeData,
  }));

  const edges: Edge[] = rawEdges.map((e) => {
    const sourceNode = rawNodes.find((n) => n.id === e.source);
    const isActive = sourceNode?.status === "in-progress";
    const isChainEdge = chainNodeIds.has(e.source) && chainNodeIds.has(e.target);
    return {
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: isActive || isChainEdge,
      style: {
        stroke: isChainEdge ? "#10b981" : isActive ? "#22c55e" : "#374151",
        strokeWidth: isChainEdge ? 2.5 : 1.5,
        strokeDasharray: isChainEdge ? "6 4" : undefined
      },
    };
  });

  return { nodes, edges };
}

// ─── Inner component (needs ReactFlowProvider) ────────────────────────────────
interface DfsGraphInnerProps {
  graph: GraphResponse;
  findings: Finding[];
  chains: VulnerabilityChain[];
  selectedChainId: string | null;
  prioritizedTargets: string[];
  onNodeClick: (node: DfsNode) => void;
}

const HIGH_SEVERITIES: Severity[] = ["high", "critical"];

function DfsGraphInner({
  graph,
  findings,
  chains,
  selectedChainId,
  prioritizedTargets,
  onNodeClick
}: DfsGraphInnerProps) {
  const { fitView } = useReactFlow();

  const highRiskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const f of findings) {
      if (HIGH_SEVERITIES.includes(f.severity)) ids.add(f.nodeId);
    }
    return ids;
  }, [findings]);

  const activeChains = useMemo(
    () => (selectedChainId ? chains.filter((chain) => chain.id === selectedChainId) : chains),
    [chains, selectedChainId]
  );

  const chainNodeIds = useMemo(() => {
    const nodeIds = new Set<string>();
    for (const chain of activeChains) {
      for (const findingId of chain.findingIds) {
        const finding = findings.find((candidate) => candidate.id === findingId);
        if (finding) nodeIds.add(finding.nodeId);
      }
    }
    return nodeIds;
  }, [activeChains, findings]);

  const chainTechniqueByNodeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const chain of activeChains) {
      for (const findingId of chain.findingIds) {
        const finding = findings.find((candidate) => candidate.id === findingId);
        if (finding && !map.has(finding.nodeId)) {
          map.set(finding.nodeId, chain.technique);
        }
      }
    }
    return map;
  }, [activeChains, findings]);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () =>
      buildLayout(
        graph.nodes,
        graph.edges,
        highRiskIds,
        chainNodeIds,
        new Set(prioritizedTargets),
        chainTechniqueByNodeId
      ),
    [graph, highRiskIds, chainNodeIds, prioritizedTargets, chainTechniqueByNodeId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync when graph/findings change
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      const raw = graph.nodes.find((n) => n.id === node.id);
      if (raw) onNodeClick(raw);
    },
    [graph.nodes, onNodeClick]
  );

  const handleInit = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.15 }), 50);
  }, [fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onInit={handleInit}
      fitView
      className="bg-gray-950"
    >
      <Background color="#1f2937" gap={20} />
      <Controls className="!border-gray-700 !bg-gray-900 !text-gray-300" />
      <MiniMap
        className="!border-gray-700 !bg-gray-900"
        nodeColor={(n) => {
          const d = n.data as SynoSecNodeData;
          return LAYER_BORDER[d.node.layer] ?? "#6b7280";
        }}
        maskColor="rgba(0,0,0,0.5)"
      />
    </ReactFlow>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export interface DfsGraphProps {
  graph: GraphResponse;
  findings: Finding[];
  chains: VulnerabilityChain[];
  selectedChainId: string | null;
  prioritizedTargets: string[];
  onNodeClick: (node: DfsNode) => void;
}

export function DfsGraph(props: DfsGraphProps) {
  if (props.graph.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-600">
        <p className="text-sm">No nodes yet — scan is initialising...</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <DfsGraphInner {...props} />
    </ReactFlowProvider>
  );
}
