import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "@/shared/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeType = "target" | "port" | "tech" | "vector" | "scan" | "finding" | "chain";
type NodeStatus = "pending" | "scanning" | "completed" | "vulnerable" | "blocked";
type Severity = "info" | "low" | "medium" | "high" | "critical";
type ThemeMode = "dark" | "white";
type LayoutMode = "balanced" | "spread" | "compact";

type AttackMapTheme = {
  mode: ThemeMode;
  appBg: string;
  canvasBg: string;
  grid: string;
  panel: string;
  panelSoft: string;
  panelOverlay: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textFaint: string;
  inputBg: string;
  codeBg: string;
  edge: string;
  inactive: string;
  button: string;
  buttonActive: string;
  nodeLabel: string;
  nodeDotStroke: string;
};

type MapNode = {
  id: string;
  type: NodeType;
  label: string;
  status: NodeStatus;
  severity?: Severity;
  parentId?: string;
  data: Record<string, unknown>;
};

type MapEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: "discovery" | "chain";
};

type PlanPhase = {
  id: string;
  name: string;
  priority: "critical" | "high" | "medium" | "low";
  rationale: string;
  targetService: string;
  tools: string[];
  status: "pending" | "running" | "completed" | "skipped";
};

type AttackPlan = {
  phases: PlanPhase[];
  overallRisk: "critical" | "high" | "medium" | "low";
  summary: string;
};

type ReasoningEntry = {
  phase: string;
  title: string;
  summary: string;
};

type ToolActivity = {
  phase: string;
  toolId?: string;
  toolName: string;
  command: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  exitCode?: number;
  outputPreview?: string;
  status: "running" | "completed";
};

type OrchestratorRun = {
  id: string;
  targetUrl: string;
  status: string;
  phase: string;
  plan: AttackPlan | null;
  mapNodes: MapNode[] | null;
  mapEdges: MapEdge[] | null;
  summary: string | null;
  error: string | null;
  createdAt: string;
};

type AiProvider = {
  id: string;
  name: string;
  kind: "local" | "anthropic";
  status: "active" | "inactive" | "error";
  model: string;
  baseUrl: string | null;
  apiKeyConfigured: boolean;
};

type OrchestratorEvent =
  | { type: "snapshot"; run: OrchestratorRun }
  | { type: "phase_changed"; phase: string; status: string }
  | { type: "node_added"; node: MapNode }
  | { type: "node_updated"; node: MapNode }
  | { type: "edge_added"; edge: MapEdge }
  | { type: "plan_created"; plan: AttackPlan }
  | { type: "reasoning"; phase: string; title: string; summary: string }
  | { type: "tool_started"; phase: string; toolId?: string; toolName: string; command: string; startedAt: string }
  | { type: "tool_completed"; phase: string; toolId?: string; toolName: string; command: string; startedAt: string; completedAt: string; durationMs: number; exitCode: number; outputPreview: string }
  | { type: "log"; level: string; message: string }
  | { type: "completed"; summary: string }
  | { type: "failed"; error: string };

// ─── Node styling ─────────────────────────────────────────────────────────────

const NODE_RADIUS: Record<NodeType, number> = {
  target:  36,
  port:    24,
  tech:    20,
  vector:  28,
  scan:    22,
  finding: 20,
  chain:   32
};

const NODE_FILL: Record<NodeType, string> = {
  target:  "#1e3a5f",
  port:    "#14532d",
  tech:    "#164e63",
  vector:  "#431407",
  scan:    "#3b0764",
  finding: "#1c1917",
  chain:   "#2d0a0a"
};

const NODE_STROKE: Record<NodeType, string> = {
  target:  "#3b82f6",
  port:    "#22c55e",
  tech:    "#06b6d4",
  vector:  "#f97316",
  scan:    "#a855f7",
  finding: "#ef4444",
  chain:   "#dc2626"
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#3b82f6",
  info:     "#6b7280"
};

const STATUS_DOT: Record<NodeStatus, string> = {
  pending:   "#6b7280",
  scanning:  "#f59e0b",
  completed: "#22c55e",
  vulnerable:"#ef4444",
  blocked:   "#ef4444"
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#6b7280"
};

const RISK_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#ca8a04",
  low:      "#2563eb"
};

const LAYOUT_PRESETS: Record<LayoutMode, { label: string; rest: number; repulsion: number; center: number; damping: number }> = {
  balanced: { label: "Balanced", rest: 175, repulsion: 11000, center: 0.0026, damping: 0.83 },
  spread: { label: "Spread", rest: 245, repulsion: 18000, center: 0.0018, damping: 0.84 },
  compact: { label: "Compact", rest: 125, repulsion: 7000, center: 0.0042, damping: 0.8 }
};

const NODE_TYPE_ORDER: Record<NodeType, number> = {
  target: 0,
  port: 1,
  tech: 2,
  vector: 3,
  scan: 4,
  finding: 5,
  chain: 6
};

const SOURCE_TYPE_LABEL: Record<string, { icon: string; label: string }> = {
  nmap:        { icon: "⬡", label: "nmap scan" },
  http:        { icon: "⬡", label: "HTTP probe" },
  "http-header": { icon: "⬡", label: "HTTP headers" },
  ai:          { icon: "◈", label: "AI analysis" },
  probe:       { icon: "⬡", label: "Active probe" },
  curl:        { icon: "⬡", label: "curl request" },
  dns:         { icon: "⬡", label: "DNS lookup" },
  chain:       { icon: "⛓", label: "Attack chain" }
};

const ATTACK_MAP_THEMES: Record<ThemeMode, AttackMapTheme> = {
  dark: {
    mode: "dark",
    appBg: "#070b15",
    canvasBg: "#070b15",
    grid: "#0f172a",
    panel: "#0d1117",
    panelSoft: "#111827",
    panelOverlay: "#0d1117ee",
    border: "#0f172a",
    borderStrong: "#1e293b",
    text: "#e2e8f0",
    textMuted: "#94a3b8",
    textSubtle: "#64748b",
    textFaint: "#475569",
    inputBg: "#0d1117",
    codeBg: "#020617",
    edge: "#1e3a5f",
    inactive: "#1e293b",
    button: "#2563eb",
    buttonActive: "#1d4ed8",
    nodeLabel: "#cbd5e1",
    nodeDotStroke: "#070b15"
  },
  white: {
    mode: "white",
    appBg: "#f8fafc",
    canvasBg: "#ffffff",
    grid: "#e2e8f0",
    panel: "#ffffff",
    panelSoft: "#f1f5f9",
    panelOverlay: "#fffffff0",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    text: "#0f172a",
    textMuted: "#334155",
    textSubtle: "#64748b",
    textFaint: "#94a3b8",
    inputBg: "#ffffff",
    codeBg: "#f8fafc",
    edge: "#94a3b8",
    inactive: "#cbd5e1",
    button: "#2563eb",
    buttonActive: "#1d4ed8",
    nodeLabel: "#0f172a",
    nodeDotStroke: "#ffffff"
  }
};

// ─── Force Simulation ─────────────────────────────────────────────────────────

type SimNode = { x: number; y: number; vx: number; vy: number; pinned?: boolean };

function useForceSimulation(
  nodes: MapNode[],
  edges: MapEdge[],
  width: number,
  height: number,
  layoutMode: LayoutMode,
  layoutRevision: number
) {
  const simRef = useRef<Map<string, SimNode>>(new Map());
  const rafRef = useRef<number | null>(null);
  const iterRef = useRef(0);
  const lastLayoutRevisionRef = useRef(layoutRevision);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const preset = LAYOUT_PRESETS[layoutMode];

  const restartSim = useCallback(() => {
    iterRef.current = 0;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const tick = () => {
      if (iterRef.current >= 220) return;
      iterRef.current++;
      const alpha = Math.max(0, 1 - iterRef.current / 180);
      const sim = simRef.current;
      const arr = [...sim.entries()];

      // Repulsion between all pairs
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const [, pa] = arr[i]!;
          const [, pb] = arr[j]!;
          const dx = pb.x - pa.x || 0.01;
          const dy = pb.y - pa.y || 0.01;
          const d2 = dx * dx + dy * dy;
          const d = Math.sqrt(d2);
          const f = Math.min(preset.repulsion / d2, 75) * alpha;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          if (!pa.pinned) { pa.vx -= fx; pa.vy -= fy; }
          if (!pb.pinned) { pb.vx += fx; pb.vy += fy; }
        }
      }

      // Spring attraction along edges
      for (const edge of edges) {
        const src = sim.get(edge.source);
        const tgt = sim.get(edge.target);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const rest = preset.rest;
        const f = (d - rest) * 0.07 * alpha;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        if (!src.pinned) { src.vx += fx; src.vy += fy; }
        if (!tgt.pinned) { tgt.vx -= fx; tgt.vy -= fy; }
      }

      // Weak center gravity
      for (const [, p] of arr) {
        if (p.pinned) continue;
        p.vx += (width / 2 - p.x) * preset.center * alpha;
        p.vy += (height / 2 - p.y) * preset.center * alpha;
      }

      // Integrate
      for (const [, p] of arr) {
        if (p.pinned) continue;
        p.vx *= preset.damping;
        p.vy *= preset.damping;
        p.x = Math.max(50, Math.min(width - 50, p.x + p.vx));
        p.y = Math.max(50, Math.min(height - 50, p.y + p.vy));
      }

      if (iterRef.current % 4 === 0) {
        setPositions(new Map([...sim.entries()].map(([id, p]) => [id, { x: p.x, y: p.y }])));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [edges, preset.center, preset.damping, preset.repulsion, preset.rest, width, height]);

  useEffect(() => {
    const sim = simRef.current;
    if (lastLayoutRevisionRef.current !== layoutRevision) {
      sim.clear();
      lastLayoutRevisionRef.current = layoutRevision;
      setPinnedIds(new Set(nodes.filter((node) => node.type === "target").map((node) => node.id)));
      setPositions(new Map());
    }

    const typeCounts = new Map<NodeType, number>();
    const typeIndexes = new Map<NodeType, number>();
    for (const node of nodes) typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);

    // Seed new nodes
    for (const node of nodes) {
      if (!sim.has(node.id)) {
        const index = typeIndexes.get(node.type) ?? 0;
        typeIndexes.set(node.type, index + 1);
        if (node.type === "target") {
          sim.set(node.id, { x: width / 2, y: height / 2, vx: 0, vy: 0, pinned: true });
        } else {
          const column = NODE_TYPE_ORDER[node.type];
          const totalInType = Math.max(typeCounts.get(node.type) ?? 1, 1);
          const columns = Object.keys(NODE_TYPE_ORDER).length - 1;
          const x = Math.max(70, Math.min(width - 70, 90 + (column / columns) * (width - 180)));
          const y = Math.max(70, Math.min(height - 70, ((index + 1) / (totalInType + 1)) * height));
          sim.set(node.id, { x, y, vx: 0, vy: 0 });
        }
      }
    }
    // Remove stale
    for (const id of sim.keys()) {
      if (!nodes.some((n) => n.id === id)) sim.delete(id);
    }
    setPinnedIds((prev) => {
      const nodeIds = new Set(nodes.map((node) => node.id));
      const next = new Set([...prev].filter((id) => nodeIds.has(id)));
      for (const node of nodes) {
        if (node.type === "target") next.add(node.id);
      }
      return next;
    });

    restartSim();
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [nodes, restartSim, width, height, layoutRevision]);

  const pinNode = useCallback((id: string, x: number, y: number) => {
    const p = simRef.current.get(id);
    if (p) { p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.pinned = true; }
    setPinnedIds((prev) => new Set([...prev, id]));
    setPositions((prev) => new Map([...prev, [id, { x, y }]]));
  }, []);

  const unpinNode = useCallback((id: string) => {
    const isTarget = nodes.some((node) => node.id === id && node.type === "target");
    if (isTarget) return;
    const p = simRef.current.get(id);
    if (p) p.pinned = false;
    setPinnedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    restartSim();
  }, [nodes, restartSim]);

  const unpinAll = useCallback(() => {
    const targetIds = new Set(nodes.filter((node) => node.type === "target").map((node) => node.id));
    for (const [id, p] of simRef.current.entries()) {
      if (!targetIds.has(id)) p.pinned = false;
    }
    setPinnedIds(targetIds);
    restartSim();
  }, [nodes, restartSim]);

  return { positions, pinnedIds, pinNode, unpinNode, unpinAll };
}

// ─── Network Map SVG ──────────────────────────────────────────────────────────

function NetworkMap({
  nodes, edges, selectedId, onSelect, width, height, theme
}: {
  nodes: MapNode[];
  edges: MapEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  width: number;
  height: number;
  theme: AttackMapTheme;
}) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("spread");
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [curvedEdges, setCurvedEdges] = useState(true);
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const { positions, pinnedIds, pinNode, unpinNode, unpinAll } = useForceSimulation(nodes, edges, width, height, layoutMode, layoutRevision);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const panning = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const moved = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const selectedPinned = selectedId ? pinnedIds.has(selectedId) : false;

  function svgCoords(e: React.MouseEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * (width / rect.width) - viewport.x) / viewport.scale,
      y: ((e.clientY - rect.top) * (height / rect.height) - viewport.y) / viewport.scale
    };
  }

  function screenCoords(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (width / rect.width),
      y: (clientY - rect.top) * (height / rect.height)
    };
  }

  function setZoom(nextScale: number, anchor = { x: width / 2, y: height / 2 }) {
    const scale = Math.max(0.45, Math.min(2.6, nextScale));
    setViewport((prev) => {
      const worldX = (anchor.x - prev.x) / prev.scale;
      const worldY = (anchor.y - prev.y) / prev.scale;
      return { scale, x: anchor.x - worldX * scale, y: anchor.y - worldY * scale };
    });
  }

  function onNodeDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    moved.current = false;
    const coords = svgCoords(e);
    const pos = positions.get(id);
    dragging.current = { id, ox: coords.x - (pos?.x ?? 0), oy: coords.y - (pos?.y ?? 0) };
    pinNode(id, pos?.x ?? coords.x, pos?.y ?? coords.y);
  }

  function onSvgMove(e: React.MouseEvent) {
    if (dragging.current) {
      moved.current = true;
      const { x, y } = svgCoords(e);
      pinNode(dragging.current.id, x - dragging.current.ox, y - dragging.current.oy);
      return;
    }
    if (panning.current) {
      moved.current = true;
      const current = screenCoords(e.clientX, e.clientY);
      const start = screenCoords(panning.current.clientX, panning.current.clientY);
      setViewport((prev) => ({
        ...prev,
        x: panning.current!.x + current.x - start.x,
        y: panning.current!.y + current.y - start.y
      }));
    }
  }

  function onSvgUp() {
    dragging.current = null;
    panning.current = null;
  }

  function onSvgDown(e: React.MouseEvent) {
    if (e.target !== svgRef.current && (e.target as SVGElement).tagName !== "rect") return;
    moved.current = false;
    panning.current = { clientX: e.clientX, clientY: e.clientY, x: viewport.x, y: viewport.y };
  }

  function onSvgClick() {
    if (!moved.current) onSelect(null);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const anchor = screenCoords(e.clientX, e.clientY);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(viewport.scale * delta, anchor);
  }

  function resetView() {
    setViewport({ scale: 1, x: 0, y: 0 });
  }

  return (
    <>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ background: theme.canvasBg, display: "block", cursor: panning.current ? "grabbing" : "default" }}
        onClick={onSvgClick}
        onMouseDown={onSvgDown}
        onMouseMove={onSvgMove}
        onMouseUp={onSvgUp}
        onMouseLeave={onSvgUp}
        onWheel={onWheel}
      >
      {/* Subtle grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme.grid} strokeWidth="0.5" />
        </pattern>
        <radialGradient id="glow-blue" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill="url(#grid)" />

      <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>

      {/* Edges */}
      {edges.map((edge, index) => {
        const src = positions.get(edge.source);
        const tgt = positions.get(edge.target);
        if (!src || !tgt) return null;
        const isChain = edge.kind === "chain";
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const offset = curvedEdges ? ((index % 5) - 2) * 12 : 0;
        const mx = (src.x + tgt.x) / 2 - (dy / d) * offset;
        const my = (src.y + tgt.y) / 2 + (dx / d) * offset;
        const path = curvedEdges
          ? `M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`
          : `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
        return (
          <g key={edge.id}>
            <path
              d={path}
              fill="none"
              stroke={isChain ? "#dc2626" : theme.edge}
              strokeWidth={isChain ? 2 : 1.5}
              strokeDasharray={isChain ? "none" : "4 6"}
              opacity={isChain ? 0.85 : 0.7}
            />
            {isChain && (() => {
              return (
                <text x={mx} y={my - 5} textAnchor="middle" fill="#dc2626" fontSize={7} fontFamily="ui-monospace,monospace" opacity={0.9}>
                  CHAIN
                </text>
              );
            })()}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const r = NODE_RADIUS[node.type];
        const fill = NODE_FILL[node.type];
        const stroke = node.severity ? SEVERITY_COLOR[node.severity] : NODE_STROKE[node.type];
        const dot = STATUS_DOT[node.status];
        const isSelected = node.id === selectedId;
        const label = node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label;

        return (
          <g
            key={node.id}
            transform={`translate(${pos.x},${pos.y})`}
            style={{ cursor: "grab" }}
            onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
            onMouseDown={(e) => onNodeDown(e, node.id)}
          >
            {/* Glow ring when selected */}
            {isSelected && (
              <circle r={r + 8} fill="none" stroke={stroke} strokeWidth={1.5} opacity={0.5} />
            )}
            {/* Scanning pulse */}
            {node.status === "scanning" && (
              <circle r={r + 4} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.5}>
                <animate attributeName="r" values={`${r + 4};${r + 14};${r + 4}`} dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Main circle */}
            <circle r={r} fill={fill} stroke={stroke} strokeWidth={isSelected ? 2.5 : 1.5} />
            {/* Inner ring for target */}
            {node.type === "target" && (
              <circle r={r - 10} fill="none" stroke={stroke} strokeWidth={0.8} opacity={0.4} />
            )}
            {/* Chain node: pulsing outer ring */}
            {node.type === "chain" && (
              <>
                <circle r={r + 6} fill="none" stroke="#dc2626" strokeWidth={1} opacity={0.4}>
                  <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
                <text y={4} textAnchor="middle" fill="#dc2626" fontSize={10} fontFamily="ui-monospace,monospace" fontWeight={700} opacity={0.9} style={{ userSelect: "none" }}>⛓</text>
              </>
            )}
            {/* Status dot */}
            <circle cx={r - 4} cy={-(r - 4)} r={4} fill={dot} stroke={theme.nodeDotStroke} strokeWidth={1} />
            {/* Label */}
            {showLabels && (
              <>
                <text
                  y={r + 14}
                  textAnchor="middle"
                  fill={theme.nodeLabel}
                  fontSize={node.type === "target" ? 11 : 9}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={node.type === "target" ? 700 : 500}
                  style={{ userSelect: "none" }}
                >
                  {label}
                </text>
                {/* Type micro-label */}
                <text
                  y={r + 24}
                  textAnchor="middle"
                  fill={stroke}
                  fontSize={7}
                  fontFamily="ui-monospace, monospace"
                  opacity={0.7}
                  style={{ userSelect: "none" }}
                >
                  {node.type.toUpperCase()}
                </text>
              </>
            )}
          </g>
        );
      })}
      </g>

      {/* Empty state */}
      {nodes.length === 0 && (
        <text x={width / 2} y={height / 2} textAnchor="middle" fill={theme.textFaint} fontSize={13} fontFamily="ui-monospace, monospace">
          Enter a target and launch orchestration
        </text>
      )}
      </svg>

      <div className="absolute top-32 left-3 flex flex-col gap-2">
        <div className="rounded-lg border px-3 py-2 backdrop-blur-sm" style={{ background: theme.panelOverlay, borderColor: theme.border }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.55rem] uppercase tracking-wider font-semibold" style={{ color: theme.textSubtle }}>Zoom</span>
            <span className="text-[0.55rem] font-mono" style={{ color: theme.textMuted }}>{Math.round(viewport.scale * 100)}%</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <button className="h-7 w-7 rounded border text-sm font-semibold" style={{ borderColor: theme.borderStrong, color: theme.text }} onClick={() => setZoom(viewport.scale / 1.18)}>−</button>
            <input
              type="range"
              min="45"
              max="260"
              value={Math.round(viewport.scale * 100)}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className="w-24 accent-blue-600"
            />
            <button className="h-7 w-7 rounded border text-sm font-semibold" style={{ borderColor: theme.borderStrong, color: theme.text }} onClick={() => setZoom(viewport.scale * 1.18)}>+</button>
            <button className="rounded border px-2 py-1 text-[0.55rem] font-mono" style={{ borderColor: theme.borderStrong, color: theme.textSubtle }} onClick={resetView}>fit</button>
          </div>
        </div>

        <div className="rounded-lg border px-3 py-2 backdrop-blur-sm" style={{ background: theme.panelOverlay, borderColor: theme.border }}>
          <div className="text-[0.55rem] uppercase tracking-wider font-semibold mb-1.5" style={{ color: theme.textSubtle }}>Layout</div>
          <div className="flex gap-1">
            {(Object.entries(LAYOUT_PRESETS) as [LayoutMode, (typeof LAYOUT_PRESETS)[LayoutMode]][]).map(([mode, presetOption]) => (
              <button
                key={mode}
                type="button"
                className="rounded border px-2 py-1 text-[0.55rem] font-mono"
                style={{
                  background: layoutMode === mode ? theme.button : "transparent",
                  borderColor: layoutMode === mode ? theme.button : theme.borderStrong,
                  color: layoutMode === mode ? "#ffffff" : theme.textSubtle
                }}
                onClick={() => {
                  setLayoutMode(mode);
                  setLayoutRevision((value) => value + 1);
                }}
              >
                {presetOption.label}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button className="rounded border px-2 py-1 text-[0.55rem] font-mono" style={{ borderColor: theme.borderStrong, color: theme.textSubtle }} onClick={() => setLayoutRevision((value) => value + 1)}>reflow</button>
            <button className="rounded border px-2 py-1 text-[0.55rem] font-mono" style={{ borderColor: theme.borderStrong, color: theme.textSubtle }} onClick={unpinAll}>release all</button>
            <button className="rounded border px-2 py-1 text-[0.55rem] font-mono" style={{ borderColor: theme.borderStrong, color: showLabels ? theme.textMuted : theme.borderStrong }} onClick={() => setShowLabels((value) => !value)}>labels</button>
            <button className="rounded border px-2 py-1 text-[0.55rem] font-mono" style={{ borderColor: theme.borderStrong, color: curvedEdges ? theme.textMuted : theme.borderStrong }} onClick={() => setCurvedEdges((value) => !value)}>curves</button>
            {selectedId && selectedPinned && (
              <button className="rounded border px-2 py-1 text-[0.55rem] font-mono" style={{ borderColor: theme.borderStrong, color: theme.textSubtle }} onClick={() => unpinNode(selectedId)}>release selected</button>
            )}
          </div>
          <div className="mt-1.5 text-[0.52rem] font-mono" style={{ color: theme.textFaint }}>
            Drag nodes to pin. Drag canvas to pan.
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Node Detail Panel ────────────────────────────────────────────────────────

function NodeDetail({ node, onClose, theme }: { node: MapNode; onClose: () => void; theme: AttackMapTheme }) {
  const [rawExpanded, setRawExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const stroke = node.severity ? SEVERITY_COLOR[node.severity] : NODE_STROKE[node.type];
  const sourceType = String(node.data["sourceType"] ?? "");
  const sourceLabel = SOURCE_TYPE_LABEL[sourceType] ?? { icon: "⬡", label: sourceType || "unknown" };
  const command = String(node.data["command"] ?? "");
  const source = String(node.data["source"] ?? "");
  const rawOutput = String(node.data["rawOutput"] ?? "");

  function copyCommand() {
    if (!command) return;
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className="absolute top-3 right-3 w-[340px] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
      style={{ background: theme.panel, borderColor: stroke + "55", maxHeight: "calc(100% - 24px)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b" style={{ borderColor: stroke + "33" }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[0.6rem] font-semibold font-mono uppercase tracking-wider rounded px-1.5 py-0.5 border"
              style={{ background: NODE_FILL[node.type], color: NODE_STROKE[node.type], borderColor: stroke + "66" }}
            >
              {node.type}
            </span>
            {node.severity && (
              <span className="text-[0.6rem] font-bold font-mono uppercase" style={{ color: SEVERITY_COLOR[node.severity] }}>
                {node.severity}
              </span>
            )}
            <span className="text-[0.55rem] font-mono" style={{ color: theme.textSubtle }}>{node.status}</span>
          </div>
          <div className="text-sm font-semibold leading-tight break-all" style={{ color: theme.text }}>{node.label}</div>
        </div>
        <button onClick={onClose} className="flex-none text-xl leading-none mt-0.5" style={{ color: theme.textSubtle }}>×</button>
      </div>

      <div className="overflow-y-auto flex-1" style={{ color: theme.text }}>
        {/* Source */}
        {(source || sourceType) && (
          <div className="px-4 py-2.5">
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textSubtle }}>Discovered via</div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: theme.textSubtle }}>{sourceLabel.icon}</span>
              <span className="text-xs font-mono" style={{ color: theme.text }}>{sourceLabel.label}</span>
            </div>
            {source && (
              <div className="text-[0.65rem] font-mono mt-1 break-all" style={{ color: theme.textSubtle }}>{source}</div>
            )}
          </div>
        )}

        {/* Command */}
        {command && (
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Command</div>
              <button
                onClick={copyCommand}
                className="text-[0.55rem] font-mono transition-colors"
                style={{ color: theme.textSubtle }}
              >
                {copied ? "copied!" : "copy"}
              </button>
            </div>
            <div className="rounded border px-2.5 py-1.5" style={{ background: theme.codeBg, borderColor: theme.border }}>
              <pre className="text-[0.65rem] font-mono text-green-400 whitespace-pre-wrap break-all leading-relaxed">
                {"$ "}{command}
              </pre>
            </div>
          </div>
        )}

        {/* Description / rationale */}
        {Boolean(node.data["description"]) && (
          <div className="px-4 py-2.5">
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textSubtle }}>Finding</div>
            <p className="text-[0.7rem] leading-relaxed" style={{ color: theme.text }}>{String(node.data["description"])}</p>
            {Boolean(node.data["vector"]) && (
              <p className="text-[0.65rem] text-orange-400 font-mono mt-1.5">↳ {String(node.data["vector"])}</p>
            )}
          </div>
        )}

        {Boolean(node.data["rationale"]) && !node.data["description"] && (
          <div className="px-4 py-2.5">
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textSubtle }}>Rationale</div>
            <p className="text-[0.7rem] leading-relaxed" style={{ color: theme.text }}>{String(node.data["rationale"])}</p>
          </div>
        )}

        {/* Chain-specific: exploitation steps */}
        {Boolean(node.data["exploitation"]) && (
          <div className="px-4 py-2.5">
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#dc2626" }}>Attack Chain</div>
            <pre className="text-[0.65rem] font-mono leading-relaxed whitespace-pre-wrap" style={{ color: theme.text }}>{String(node.data["exploitation"])}</pre>
          </div>
        )}

        {/* Chain-specific: impact */}
        {Boolean(node.data["impact"]) && (
          <div className="px-4 py-2.5">
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textSubtle }}>Impact</div>
            <p className="text-[0.7rem] text-orange-300 leading-relaxed">{String(node.data["impact"])}</p>
          </div>
        )}

        {/* Tools */}
        {Array.isArray(node.data["tools"]) && (node.data["tools"] as string[]).length > 0 && (
          <div className="px-4 py-2.5">
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textSubtle }}>Suggested tools</div>
            <div className="flex flex-wrap gap-1">
              {(node.data["tools"] as string[]).map((t) => (
                <span key={t} className="rounded border px-1.5 py-0.5 text-[0.6rem] font-mono" style={{ background: theme.panelSoft, borderColor: theme.border, color: theme.textMuted }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Raw output */}
        {rawOutput && (
          <div className="px-4 py-2.5">
            <button
              onClick={() => setRawExpanded((v) => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Raw output</div>
              <span className="text-[0.55rem] font-mono" style={{ color: theme.textSubtle }}>{rawExpanded ? "▲ collapse" : "▼ expand"}</span>
            </button>
            {rawExpanded && (
              <div className="mt-1.5 rounded border px-2.5 py-1.5 max-h-48 overflow-y-auto" style={{ background: theme.codeBg, borderColor: theme.border }}>
                <pre className="text-[0.62rem] font-mono whitespace-pre-wrap break-all leading-relaxed" style={{ color: theme.textMuted }}>
                  {rawOutput}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Phase Badge ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  pending:       "Idle",
  recon:         "Reconnaissance",
  planning:      "Planning",
  execution:     "Execution",
  deep_analysis: "Deep Analysis",
  correlation:   "Chain Correlation",
  complete:      "Complete"
};

function PhaseBadge({ phase, status, theme }: { phase: string; status: string; theme: AttackMapTheme }) {
  const active = status === "running";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-semibold font-mono uppercase tracking-wider border"
      style={{
        background: active ? (theme.mode === "dark" ? "#451a03" : "#fffbeb") : theme.panelSoft,
        color: active ? (theme.mode === "dark" ? "#fcd34d" : "#92400e") : theme.textSubtle,
        borderColor: active ? (theme.mode === "dark" ? "#92400e" : "#f59e0b") : theme.borderStrong
      }}
    >
      {active && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
      {PHASE_LABELS[phase] ?? phase}
    </span>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ theme }: { theme: AttackMapTheme }) {
  return (
    <div className="absolute top-3 left-3 rounded-lg border px-3 py-2 backdrop-blur-sm" style={{ background: theme.panelOverlay, borderColor: theme.border }}>
      <div className="text-[0.55rem] uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textSubtle }}>Legend</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {(Object.entries(NODE_STROKE) as [NodeType, string][]).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full flex-none border" style={{ background: NODE_FILL[type], borderColor: color }} />
            <span className="text-[0.6rem] font-mono capitalize" style={{ color: theme.textSubtle }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AttackMapPage() {
  const [targetUrl, setTargetUrl] = useState("http://localhost:3000");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [runs, setRuns] = useState<OrchestratorRun[]>([]);
  const [activeRun, setActiveRun] = useState<OrchestratorRun | null>(null);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [edges, setEdges] = useState<MapEdge[]>([]);
  const [plan, setPlan] = useState<AttackPlan | null>(null);
  const [reasoning, setReasoning] = useState<ReasoningEntry[]>([]);
  const [toolActivity, setToolActivity] = useState<ToolActivity[]>([]);
  const [logs, setLogs] = useState<{ level: string; message: string }[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<{ command: string | null; output: string } | null>(null);
  const [clockTick, setClockTick] = useState(Date.now());
  const [mapSize, setMapSize] = useState({ w: 900, h: 600 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const bottomOutputRef = useRef<HTMLDivElement>(null);

  // Track map container size
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setMapSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const loadRuns = useCallback(async () => {
    try {
      const data = await fetchJson<{ runs: OrchestratorRun[] }>("/api/orchestrator/runs");
      setRuns(data.runs);
    } catch { /* ignore */ }
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const data = await fetchJson<{ providers: AiProvider[] }>("/api/ai-providers?status=active&page=1&pageSize=100");
      setProviders(data.providers);
      setSelectedProviderId((current) => {
        if (current) {
          return current;
        }
        const preferredAnthropic = data.providers.find((provider) => provider.kind === "anthropic" && provider.apiKeyConfigured);
        return preferredAnthropic?.id ?? data.providers[0]?.id ?? "";
      });
    } catch {
      setProviders([]);
      setSelectedProviderId("");
    }
  }, []);

  useEffect(() => { void loadRuns(); }, [loadRuns]);
  useEffect(() => { void loadProviders(); }, [loadProviders]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    if (bottomOutputRef.current) {
      bottomOutputRef.current.scrollTop = bottomOutputRef.current.scrollHeight;
    }
  }, [lastOutput]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const connectToRun = useCallback((run: OrchestratorRun) => {
    eventSourceRef.current?.close();
    setActiveRun(run);
    setNodes((run.mapNodes as MapNode[]) ?? []);
    setEdges((run.mapEdges as MapEdge[]) ?? []);
    setPlan((run.plan as AttackPlan) ?? null);
    setReasoning([]);
    setToolActivity([]);
    setLogs([]);
    setSelectedNodeId(null);
    setCurrentCommand(null);
    setLastOutput(null);

    if (run.status === "completed" || run.status === "failed") return;

    const es = new EventSource(`/api/orchestrator/runs/${run.id}/events`);
    eventSourceRef.current = es;

    es.onmessage = (evt) => {
      const event = JSON.parse(evt.data as string) as OrchestratorEvent;
      if (event.type === "snapshot") {
        const s = event.run;
        setActiveRun(s);
        setNodes((s.mapNodes as MapNode[]) ?? []);
        setEdges((s.mapEdges as MapEdge[]) ?? []);
        setPlan((s.plan as AttackPlan) ?? null);
      } else if (event.type === "node_added") {
        setNodes((prev) => [...prev.filter((n) => n.id !== event.node.id), event.node]);
        if (event.node.status === "scanning" && event.node.data["command"]) {
          setCurrentCommand(String(event.node.data["command"]));
        }
      } else if (event.type === "node_updated") {
        setNodes((prev) => prev.map((n) => n.id === event.node.id ? event.node : n));
        if (event.node.status === "scanning" && event.node.data["command"]) {
          setCurrentCommand(String(event.node.data["command"]));
        }
        if (event.node.status === "completed" && event.node.data["rawOutput"]) {
          setLastOutput({
            command: event.node.data["command"] ? String(event.node.data["command"]) : null,
            output: String(event.node.data["rawOutput"])
          });
          setCurrentCommand(null);
        }
      } else if (event.type === "edge_added") {
        setEdges((prev) => [...prev, event.edge]);
      } else if (event.type === "plan_created") {
        setPlan(event.plan);
      } else if (event.type === "reasoning") {
        setReasoning((prev) => [...prev.slice(-23), { phase: event.phase, title: event.title, summary: event.summary }]);
      } else if (event.type === "tool_started") {
        setCurrentCommand(event.command);
        setToolActivity((prev) => [
          {
            phase: event.phase,
            ...(event.toolId ? { toolId: event.toolId } : {}),
            toolName: event.toolName,
            command: event.command,
            startedAt: event.startedAt,
            status: "running"
          },
          ...prev.filter((item) => !(item.command === event.command && item.startedAt === event.startedAt)).slice(0, 11)
        ]);
      } else if (event.type === "tool_completed") {
        setCurrentCommand(null);
        setLastOutput({ command: event.command, output: event.outputPreview });
        setToolActivity((prev) => [
          {
            phase: event.phase,
            ...(event.toolId ? { toolId: event.toolId } : {}),
            toolName: event.toolName,
            command: event.command,
            startedAt: event.startedAt,
            completedAt: event.completedAt,
            durationMs: event.durationMs,
            exitCode: event.exitCode,
            outputPreview: event.outputPreview,
            status: "completed"
          },
          ...prev.filter((item) => !(item.command === event.command && item.startedAt === event.startedAt)).slice(0, 11)
        ]);
      } else if (event.type === "phase_changed") {
        setActiveRun((prev) => prev ? { ...prev, phase: event.phase, status: event.status } : prev);
      } else if (event.type === "log") {
        setLogs((prev) => [...prev.slice(-199), { level: event.level, message: event.message }]);
      } else if (event.type === "completed") {
        setActiveRun((prev) => prev ? { ...prev, status: "completed", phase: "complete", summary: event.summary } : prev);
        void loadRuns();
        es.close();
      } else if (event.type === "failed") {
        setActiveRun((prev) => prev ? { ...prev, status: "failed", error: event.error } : prev);
        void loadRuns();
        es.close();
      }
    };
    es.onerror = () => es.close();
  }, [loadRuns]);

  const startRun = async () => {
    if (!targetUrl.trim() || !selectedProviderId || isStarting) return;
    setIsStarting(true);
    setLogs([]);
    setCurrentCommand(null);
    setLastOutput(null);
    try {
      const run = await fetchJson<OrchestratorRun>("/api/orchestrator/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: targetUrl.trim(), providerId: selectedProviderId })
      });
      await loadRuns();
      connectToRun(run);
    } catch (error) {
      setLogs((prev) => [...prev, { level: "error", message: error instanceof Error ? error.message : "Failed to start" }]);
    } finally {
      setIsStarting(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) ?? null;
  const activeTool = toolActivity.find((item) => item.status === "running") ?? null;
  const findings = nodes.filter((n) => n.type === "finding");
  const critCount = findings.filter((n) => n.severity === "critical").length;
  const highCount = findings.filter((n) => n.severity === "high").length;
  const chainCount = nodes.filter((n) => n.type === "chain").length;
  const theme = ATTACK_MAP_THEMES[themeMode];

  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60_000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const getElapsedLabel = (item: ToolActivity) => {
    const end = item.completedAt ? new Date(item.completedAt).getTime() : clockTick;
    const start = new Date(item.startedAt).getTime();
    return formatDuration(Math.max(0, (item.durationMs ?? (end - start))));
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: theme.appBg, color: theme.text }}>
      {/* ── Left Sidebar ── */}
      <div className="w-72 flex-none flex flex-col border-r overflow-hidden" style={{ borderColor: theme.border }}>
        {/* Branding */}
        <div className="px-4 py-3.5 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded flex items-center justify-center text-[0.65rem]" style={{ background: "#1e3a5f", border: "1px solid #3b82f6" }}>AI</div>
            <div>
              <div className="text-xs font-bold font-mono tracking-widest uppercase" style={{ color: theme.text }}>Orchestrator</div>
              <div className="text-[0.6rem]" style={{ color: theme.textSubtle }}>Autonomous pentesting</div>
            </div>
          </div>
        </div>

        {/* Target + launch */}
        <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Theme</div>
            <div className="flex rounded border p-0.5" style={{ background: theme.panelSoft, borderColor: theme.border }}>
              {(["dark", "white"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setThemeMode(mode)}
                  className="rounded px-2 py-0.5 text-[0.55rem] font-mono uppercase transition-colors"
                  style={{
                    background: themeMode === mode ? theme.button : "transparent",
                    color: themeMode === mode ? "#ffffff" : theme.textSubtle
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Target URL</div>
          <input
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void startRun(); }}
            className="w-full rounded border px-3 py-1.5 text-xs font-mono focus:outline-none"
            style={{ background: theme.inputBg, borderColor: theme.borderStrong, color: theme.text }}
            placeholder="http://target.com"
          />
          <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Decision AI</div>
          <select
            value={selectedProviderId}
            onChange={(e) => setSelectedProviderId(e.target.value)}
            className="w-full rounded border px-3 py-1.5 text-xs font-mono focus:outline-none"
            style={{ background: theme.inputBg, borderColor: theme.borderStrong, color: theme.text }}
          >
            <option value="" disabled>Select provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name} · {provider.kind} · {provider.model}
              </option>
            ))}
          </select>
          {selectedProvider && (
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full flex-none"
                style={{
                  background: selectedProvider.kind === "anthropic"
                    ? (selectedProvider.apiKeyConfigured ? "#22c55e" : "#ef4444")
                    : (selectedProvider.baseUrl ? "#22c55e" : "#ef4444")
                }}
              />
              <span className="text-[0.58rem] font-mono" style={{ color: theme.textSubtle }}>
                {selectedProvider.kind === "local" ? "local" : "anthropic"} · {selectedProvider.model}
              </span>
              {selectedProvider.kind === "anthropic" && !selectedProvider.apiKeyConfigured && (
                <span className="text-[0.55rem] font-mono text-red-500">no key</span>
              )}
            </div>
          )}
          <div className="text-[0.55rem] font-mono" style={{ color: theme.textFaint }}>
            70+ tools: network · web · content · subdomain · password · forensics
          </div>
          <button
            onClick={() => void startRun()}
            disabled={isStarting || !targetUrl.trim() || !selectedProviderId}
            className="w-full rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: isStarting ? theme.buttonActive : theme.button }}
          >
            {isStarting ? "Launching…" : "Launch Orchestration"}
          </button>
        </div>

        {/* Phase + stats */}
        {activeRun && (
          <div className="px-4 py-2 border-b space-y-1.5" style={{ borderColor: theme.border }}>
            <PhaseBadge phase={activeRun.phase} status={activeRun.status} theme={theme} />
            <div className="flex gap-3 text-[0.6rem] font-mono">
              <span style={{ color: theme.textSubtle }}>{nodes.length} nodes</span>
              <span style={{ color: theme.textSubtle }}>{edges.length} edges</span>
              {critCount > 0 && <span style={{ color: "#ef4444" }}>{critCount} crit</span>}
              {highCount > 0 && <span style={{ color: "#f97316" }}>{highCount} high</span>}
              {chainCount > 0 && <span style={{ color: "#dc2626" }}>⛓ {chainCount} chain{chainCount > 1 ? "s" : ""}</span>}
            </div>
            {activeRun.status === "failed" && (
              <div className="text-[0.6rem] font-mono" style={{ color: "#ef4444" }}>{activeRun.error?.slice(0, 60)}</div>
            )}
          </div>
        )}

        {/* Attack plan */}
        {plan && (
          <div className="px-4 py-2 border-b overflow-y-auto" style={{ borderColor: theme.border, maxHeight: 200 }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Attack Plan</span>
              <span className="text-[0.6rem] font-semibold" style={{ color: RISK_COLOR[plan.overallRisk] ?? theme.textMuted }}>
                {plan.overallRisk.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1">
              {plan.phases.map((phase) => (
                <div key={phase.id} className="flex items-start gap-2 px-2 py-1.5 rounded" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="mt-1 h-1.5 w-1.5 rounded-full flex-none" style={{ background: PRIORITY_COLOR[phase.priority] ?? "#6b7280" }} />
                  <div className="min-w-0">
                    <div className="text-[0.65rem] font-semibold truncate" style={{ color: theme.text }}>{phase.name}</div>
                    <div className="text-[0.55rem] line-clamp-1 mt-0.5" style={{ color: theme.textSubtle }}>{phase.rationale}</div>
                    {phase.tools.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {phase.tools.slice(0, 4).map((t) => (
                          <span key={t} className="rounded border px-1 py-px text-[0.5rem] font-mono" style={{ background: theme.codeBg, borderColor: theme.border, color: theme.textSubtle }}>{t}</span>
                        ))}
                        {phase.tools.length > 4 && (
                          <span className="text-[0.5rem] font-mono" style={{ color: theme.textFaint }}>+{phase.tools.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reasoning.length > 0 && (
          <div className="px-4 py-2 border-b overflow-y-auto" style={{ borderColor: theme.border, maxHeight: 200 }}>
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textSubtle }}>AI Reasoning</div>
            <div className="space-y-1">
              {reasoning.slice().reverse().map((entry, index) => (
                <div key={`${entry.phase}:${entry.title}:${index}`} className="rounded px-2 py-1.5" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[0.62rem] font-semibold" style={{ color: theme.text }}>{entry.title}</div>
                    <div className="text-[0.52rem] font-mono uppercase" style={{ color: theme.textSubtle }}>{entry.phase.replace("_", " ")}</div>
                  </div>
                  <div className="mt-1 text-[0.58rem] leading-relaxed" style={{ color: theme.textMuted }}>{entry.summary}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {toolActivity.length > 0 && (
          <div className="px-4 py-2 border-b overflow-y-auto" style={{ borderColor: theme.border, maxHeight: 220 }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Tool Activity</div>
              {activeTool ? <div className="text-[0.55rem] font-mono text-amber-400">running · {getElapsedLabel(activeTool)}</div> : null}
            </div>
            <div className="space-y-1">
              {toolActivity.map((item, index) => (
                <div key={`${item.command}:${item.startedAt}:${index}`} className="rounded px-2 py-1.5" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[0.62rem] font-semibold" style={{ color: theme.text }}>{item.toolName}</div>
                    <div className="text-[0.52rem] font-mono" style={{ color: item.status === "running" ? "#f59e0b" : item.exitCode === 0 ? "#22c55e" : "#ef4444" }}>
                      {item.status === "running" ? `running · ${getElapsedLabel(item)}` : `exit ${item.exitCode ?? "?"} · ${getElapsedLabel(item)}`}
                    </div>
                  </div>
                  <div className="mt-1 text-[0.55rem] font-mono truncate" style={{ color: theme.textSubtle }}>{item.phase}</div>
                  <div className="mt-1 text-[0.55rem] font-mono truncate" style={{ color: theme.textMuted }}>{item.command}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live log */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {logs.length === 0 && !activeRun && (
            <div className="text-[0.6rem] font-mono mt-1" style={{ color: theme.textFaint }}>No active run.</div>
          )}
          <div className="space-y-0.5">
            {logs.map((log, i) => (
              <div
                key={i}
                className="text-[0.58rem] font-mono leading-relaxed"
                style={{ color: log.level === "error" ? "#ef4444" : log.level === "warn" ? "#ca8a04" : theme.textFaint }}
              >
                › {log.message}
              </div>
            ))}
          </div>
          <div ref={logsEndRef} />
        </div>

        {/* History */}
        {runs.length > 0 && (
          <div className="border-t overflow-y-auto px-4 py-2" style={{ borderColor: theme.border, maxHeight: 130 }}>
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1" style={{ color: theme.textSubtle }}>History</div>
            <div className="space-y-0.5">
              {runs.slice(0, 8).map((run) => (
                <button
                  key={run.id}
                  onClick={() => connectToRun(run)}
                  className="w-full text-left rounded px-2 py-1 text-[0.6rem] font-mono transition-colors"
                  style={{ border: `1px solid ${activeRun?.id === run.id ? theme.borderStrong : "transparent"}` }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate" style={{ color: theme.textMuted }}>{run.targetUrl.replace(/^https?:\/\//, "")}</span>
                    <span style={{ color: run.status === "completed" ? "#22c55e" : run.status === "failed" ? "#ef4444" : "#f59e0b", fontSize: "0.55rem" }}>
                      {run.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Map canvas ── */}
      <div ref={mapContainerRef} className="flex-1 relative overflow-hidden">
        {mapSize.w > 0 && (
          <NetworkMap
            nodes={nodes}
            edges={edges}
            selectedId={selectedNodeId}
            onSelect={setSelectedNodeId}
            width={mapSize.w}
            height={mapSize.h}
            theme={theme}
          />
        )}

        {/* Legend overlay */}
        <Legend theme={theme} />

        {/* Phase progress bar — floats above the bottom bar */}
        {activeRun && (
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border px-4 py-1.5 backdrop-blur-sm"
            style={{ bottom: (currentCommand || lastOutput) ? "148px" : "16px", background: theme.panelOverlay, borderColor: theme.borderStrong, transition: "bottom 0.2s" }}
          >
            {(["recon", "planning", "execution", "deep_analysis", "correlation", "complete"] as const).map((ph, i, arr) => {
              const phases = ["recon", "planning", "execution", "deep_analysis", "correlation", "complete"];
              const cur = phases.indexOf(activeRun.phase);
              const done = i < cur;
              const active = i === cur;
              const isChainPhase = ph === "deep_analysis" || ph === "correlation";
              const label = ph === "deep_analysis" ? "deep" : ph === "correlation" ? "chains" : ph;
              return (
                <div key={ph} className="flex items-center gap-1">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: done ? "#22c55e" : active ? (isChainPhase ? "#dc2626" : "#f59e0b") : theme.inactive }}
                  />
                  <span
                    className="text-[0.55rem] font-mono"
                    style={{ color: active ? (isChainPhase ? "#dc2626" : "#d97706") : done ? "#16a34a" : theme.textSubtle }}
                  >
                    {label}
                  </span>
                  {i < arr.length - 1 && (
                    <div className="h-px w-3" style={{ background: done ? "#166534" : theme.borderStrong }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary bar */}
        {activeRun?.summary && (
          <div className="absolute top-0 left-0 right-0 px-4 py-1.5 border-b text-[0.6rem] font-mono truncate"
            style={{ background: theme.panelOverlay, borderColor: theme.border, color: theme.textMuted }}>
            {activeRun.summary}
          </div>
        )}

        {/* Node detail overlay */}
        {selectedNode && (
          <NodeDetail node={selectedNode} onClose={() => setSelectedNodeId(null)} theme={theme} />
        )}

        {/* Bottom activity bar */}
        {(currentCommand || lastOutput) && (
          <div
            className="absolute bottom-0 left-0 right-0 border-t flex flex-col"
            style={{ background: theme.panelOverlay, borderColor: theme.borderStrong, height: "136px", backdropFilter: "blur(4px)" }}
          >
            {/* Command row */}
            <div className="flex items-center gap-3 px-4 py-1.5 border-b flex-none" style={{ borderColor: theme.border }}>
              <span className="text-[0.55rem] font-semibold font-mono uppercase tracking-widest flex-none" style={{ color: theme.textSubtle }}>CMD</span>
              <pre className="text-[0.68rem] font-mono text-green-400 truncate flex-1">
                {currentCommand
                  ? <><span style={{ color: theme.textSubtle }}>$</span> {currentCommand}</>
                  : lastOutput?.command
                    ? <><span style={{ color: theme.textFaint }}>$</span> <span style={{ color: theme.textMuted }}>{lastOutput.command}</span></>
                    : <span style={{ color: theme.textFaint }}>—</span>
                }
              </pre>
              {currentCommand && (
                <span className="flex-none flex items-center gap-1 text-[0.55rem] font-mono text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                  running
                </span>
              )}
              {!currentCommand && lastOutput && (
                <span className="flex-none text-[0.55rem] font-mono text-green-600">done</span>
              )}
            </div>

            {/* Output area */}
            <div ref={bottomOutputRef} className="flex-1 overflow-y-auto px-4 py-1.5">
              {lastOutput?.output ? (
                <pre className="text-[0.62rem] font-mono whitespace-pre-wrap break-all leading-relaxed" style={{ color: theme.textMuted }}>
                  {lastOutput.output}
                </pre>
              ) : currentCommand ? (
                <div className="text-[0.6rem] font-mono italic" style={{ color: theme.textFaint }}>waiting for output…</div>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
