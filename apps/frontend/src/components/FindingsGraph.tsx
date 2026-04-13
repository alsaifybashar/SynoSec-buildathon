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
import {
  Shield,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  Info
} from "lucide-react";
import type {
  Finding,
  Severity,
  VulnerabilityChain
} from "@synosec/contracts";

// ─── Severity colours ──────────────────────────────────────────────────────────
const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ef4444", // red-500
  high: "#f97316",     // orange-500
  medium: "#eab308",   // yellow-500
  low: "#3b82f6",      // blue-500
  info: "#6b7280",     // gray-500
};

const SEVERITY_BG: Record<Severity, string> = {
  critical: "rgba(239, 68, 68, 0.15)",
  high: "rgba(249, 115, 22, 0.15)",
  medium: "rgba(234, 179, 8, 0.15)",
  low: "rgba(59, 130, 246, 0.15)",
  info: "rgba(107, 114, 128, 0.15)",
};

// ─── Custom Node ──────────────────────────────────────────────────────────────
interface FindingNodeData extends Record<string, unknown> {
  finding: Finding;
  isChainNode: boolean;
  chainTechnique?: string;
}

function FindingNode({ data }: NodeProps) {
  const { finding, isChainNode, chainTechnique } = data as FindingNodeData;
  const color = SEVERITY_COLOR[finding.severity] ?? "#6b7280";
  const bg = SEVERITY_BG[finding.severity] ?? "rgba(107, 114, 128, 0.15)";

  const Icon = finding.severity === "critical"
    ? AlertTriangle
    : finding.severity === "high"
    ? Shield
    : finding.severity === "medium" 
    ? HelpCircle 
    : finding.severity === "low"
    ? CheckCircle
    : Info;

  return (
    <div
      style={{
        border: `2px solid ${isChainNode ? "#10b981" : color}`,
        backgroundColor: "rgba(17, 24, 39, 0.95)", // gray-900 with opacity
        boxShadow: isChainNode
          ? "0 0 16px 2px rgba(16,185,129,0.3)"
          : `0 0 12px 0px ${color}30`,
      }}
      className="min-w-[180px] max-w-[240px] rounded-xl p-3 backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={14} style={{ color }} />
          <span
            style={{ color, backgroundColor: bg, borderColor: color }}
            className="rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
          >
            {finding.severity}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {finding.validated && (
            <span className="h-2 w-2 rounded-full bg-emerald-500" title="Validated" />
          )}
          <span className="font-mono text-[9px] text-gray-500">
            {finding.confidence * 100}%
          </span>
        </div>
      </div>

      <h4 className="line-clamp-2 text-[11px] font-bold text-gray-100">{finding.title}</h4>
      
      <p className="mt-1 line-clamp-1 font-mono text-[9px] text-gray-500">
        {finding.technique}
      </p>

      {chainTechnique && (
        <p className="mt-2 truncate rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300 border border-emerald-500/20">
          {chainTechnique}
        </p>
      )}

      <Handle type="target" position={Position.Top} className="!border-0 !bg-gray-700" />
      <Handle type="source" position={Position.Bottom} className="!border-0 !bg-gray-700" />
    </div>
  );
}

const nodeTypes = { finding: FindingNode };

// ─── Layout helpers ──────────────────────────────────────────────────────────
function buildFindingLayout(
  findings: Finding[],
  chains: VulnerabilityChain[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Track chain membership
  const chainFindings = new Map<string, { chainId: string; technique: string }>();
  for (const chain of chains) {
    for (const fId of chain.findingIds) {
      chainFindings.set(fId, { chainId: chain.id, technique: chain.technique });
    }
  }

  // Group findings by nodeId to cluster them
  const byNodeId = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byNodeId.has(f.nodeId)) byNodeId.set(f.nodeId, []);
    byNodeId.get(f.nodeId)!.push(f);
  }

  const X_GAP = 280;
  const Y_GAP = 180;
  
  // Simple grid layout based on discovery order (createdAt)
  const sortedFindings = [...findings].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  
  // We'll arrange them in a "tree-ish" way:
  // Roots are findings from nodes with no parent in the DFS graph (not ideal, let's just use discovery order)
  
  sortedFindings.forEach((f, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    
    nodes.push({
      id: f.id,
      type: "finding",
      position: { x: col * X_GAP, y: row * Y_GAP },
      data: {
        finding: f,
        isChainNode: chainFindings.has(f.id),
        chainTechnique: chainFindings.get(f.id)?.technique
      } as FindingNodeData,
    });
  });

  // Link findings that belong to the same chain
  for (const chain of chains) {
    for (const link of chain.links) {
      edges.push({
        id: `link-${link.fromFindingId}-${link.toFindingId}`,
        source: link.fromFindingId,
        target: link.toFindingId,
        animated: true,
        label: `${Math.round(link.probability * 100)}%`,
        labelStyle: { fill: "#10b981", fontSize: 10, fontWeight: 700, fontFamily: "monospace" },
        style: { stroke: "#10b981", strokeWidth: 2, strokeDasharray: "5 5" },
      });
    }
  }

  // Also link findings within the same node if they were discovered sequentially
  byNodeId.forEach((nodeFindings) => {
    const sorted = [...nodeFindings].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (let i = 0; i < sorted.length - 1; i++) {
      const source = sorted[i]!;
      const target = sorted[i + 1]!;
      // Only add edge if not already added by chain
      if (!edges.find(e => e.source === source.id && e.target === target.id)) {
        edges.push({
          id: `seq-${source.id}-${target.id}`,
          source: source.id,
          target: target.id,
          style: { stroke: "#374151", strokeWidth: 1 },
        });
      }
    }
  });

  return { nodes, edges };
}

// ─── Inner component ──────────────────────────────────────────────────────────
interface FindingsGraphInnerProps {
  findings: Finding[];
  chains: VulnerabilityChain[];
  onFindingClick: (finding: Finding) => void;
}

function FindingsGraphInner({ findings, chains, onFindingClick }: FindingsGraphInnerProps) {
  const { fitView } = useReactFlow();

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => buildFindingLayout(findings, chains),
    [findings, chains]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      const raw = findings.find((f) => f.id === node.id);
      if (raw) onFindingClick(raw);
    },
    [findings, onFindingClick]
  );

  const handleInit = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.2 }), 50);
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
      <Background color="#111827" gap={20} />
      <Controls className="!border-gray-700 !bg-gray-900 !text-gray-300" />
      <MiniMap
        className="!border-gray-700 !bg-gray-900"
        nodeColor={(n) => {
          const d = n.data as FindingNodeData;
          return SEVERITY_COLOR[d.finding.severity] ?? "#6b7280";
        }}
        maskColor="rgba(0,0,0,0.5)"
      />
    </ReactFlow>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export interface FindingsGraphProps {
  findings: Finding[];
  chains: VulnerabilityChain[];
  onFindingClick: (finding: Finding) => void;
}

export function FindingsGraph(props: FindingsGraphProps) {
  if (props.findings.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950 text-gray-600">
        <p className="text-sm">Waiting for findings to propagate...</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <FindingsGraphInner {...props} />
    </ReactFlowProvider>
  );
}
