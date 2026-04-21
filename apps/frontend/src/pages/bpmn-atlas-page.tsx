import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Hexagon,
  Pause,
  Play,
  Printer,
  RotateCcw,
  ScrollText,
  Stamp,
  StepForward
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════
//  Process Atlas — an orchestration page rendered as a formal BPMN 2.0
//  document. Pools, lanes, events, tasks, and gateways are drawn with
//  authentic notation. A token walks the diagram during simulation.
// ═══════════════════════════════════════════════════════════════════════════

type TaskKind = "user" | "service" | "script" | "send" | "receive" | "business";
type EventKind = "startMessage" | "endPlain" | "endMessage" | "intermediateCatch" | "intermediateThrow";
type GatewayKind = "exclusive" | "parallel" | "inclusive" | "eventBased";

type BpmnNode =
  | { id: string; kind: "task"; task: TaskKind; label: string; x: number; y: number; laneId: string; annotationKey?: string }
  | { id: string; kind: "event"; event: EventKind; label: string; x: number; y: number; laneId: string; annotationKey?: string }
  | { id: string; kind: "gateway"; gateway: GatewayKind; label: string; x: number; y: number; laneId: string; annotationKey?: string };

type Pool = {
  id: string;
  label: string;
  role: string;
  y: number;
  height: number;
  lanes: Array<{ id: string; label: string; poolId: string; y: number; height: number }>;
};

type SequenceFlow = {
  id: string;
  from: string;
  to: string;
  label?: string;
  isDefault?: boolean;
  waypoints?: Array<{ x: number; y: number }>;
};

type MessageFlow = {
  id: string;
  from: string;
  to: string;
  label?: string;
  waypoints?: Array<{ x: number; y: number }>;
};

type ScenarioItinerary = {
  id: string;
  label: string;
  glyph: string;
  synopsis: string;
  sequence: string[];
  outcome: string;
  verdict: "resolved" | "escalated" | "fast-path";
};

type Annotation = {
  key: string;
  nodeId: string;
  title: string;
  body: string;
};

// ───────────────────────────────────────────────────────────────────────────
//  Geometry constants
// ───────────────────────────────────────────────────────────────────────────

const CANVAS = { w: 1280, h: 580 };
const POOL_LABEL_W = 42;
const LANE_LABEL_W = 44;

const POOLS: Pool[] = [
  {
    id: "pool-requestor",
    label: "Requestor",
    role: "External participant",
    y: 20,
    height: 100,
    lanes: [{ id: "lane-req", label: "Filing desk", poolId: "pool-requestor", y: 20, height: 100 }]
  },
  {
    id: "pool-synosec",
    label: "SynoSec Orchestrator",
    role: "Agent ensemble",
    y: 140,
    height: 420,
    lanes: [
      { id: "lane-intake", label: "Intake", poolId: "pool-synosec", y: 140, height: 130 },
      { id: "lane-exec", label: "Execution", poolId: "pool-synosec", y: 270, height: 150 },
      { id: "lane-audit", label: "Audit", poolId: "pool-synosec", y: 420, height: 140 }
    ]
  }
];

// ───────────────────────────────────────────────────────────────────────────
//  Node catalogue
// ───────────────────────────────────────────────────────────────────────────

const NODES: BpmnNode[] = [
  // Requestor
  { id: "e1", kind: "event", event: "startMessage", label: "Report filed", x: 130, y: 70, laneId: "lane-req", annotationKey: "A1" },
  { id: "e2", kind: "task", task: "user", label: "Compose brief", x: 250, y: 70, laneId: "lane-req" },
  { id: "e3", kind: "task", task: "send", label: "Submit for triage", x: 400, y: 70, laneId: "lane-req" },
  { id: "e4", kind: "event", event: "endMessage", label: "Closure received", x: 1180, y: 70, laneId: "lane-req", annotationKey: "A5" },

  // Intake
  { id: "e5", kind: "event", event: "startMessage", label: "Incoming brief", x: 260, y: 205, laneId: "lane-intake" },
  { id: "e6", kind: "task", task: "service", label: "Classify severity", x: 380, y: 205, laneId: "lane-intake" },
  { id: "e7", kind: "gateway", gateway: "exclusive", label: "severe?", x: 520, y: 205, laneId: "lane-intake", annotationKey: "A2" },

  // Execution
  { id: "e8", kind: "task", task: "user", label: "Triage & decide", x: 660, y: 345, laneId: "lane-exec" },
  { id: "e9", kind: "gateway", gateway: "exclusive", label: "auto-safe?", x: 810, y: 345, laneId: "lane-exec", annotationKey: "A3" },
  { id: "e10", kind: "task", task: "script", label: "Apply mitigation", x: 940, y: 345, laneId: "lane-exec" },
  { id: "e11", kind: "task", task: "send", label: "Request human approval", x: 940, y: 285, laneId: "lane-exec" },
  { id: "e16", kind: "event", event: "endMessage", label: "Process resolved", x: 1180, y: 345, laneId: "lane-exec" },

  // Audit
  { id: "e12", kind: "gateway", gateway: "parallel", label: "split", x: 580, y: 490, laneId: "lane-audit", annotationKey: "A4" },
  { id: "e13", kind: "task", task: "script", label: "Record evidence", x: 720, y: 490, laneId: "lane-audit" },
  { id: "e14", kind: "task", task: "send", label: "Notify stakeholders", x: 880, y: 490, laneId: "lane-audit" },
  { id: "e15", kind: "gateway", gateway: "parallel", label: "join", x: 1040, y: 490, laneId: "lane-audit" }
];

// ───────────────────────────────────────────────────────────────────────────
//  Flow catalogue — sequence & message
// ───────────────────────────────────────────────────────────────────────────

const SEQUENCE_FLOWS: SequenceFlow[] = [
  { id: "s-1", from: "e1", to: "e2" },
  { id: "s-2", from: "e2", to: "e3" },

  { id: "s-3", from: "e5", to: "e6" },
  { id: "s-4", from: "e6", to: "e7" },

  // From intake gateway into execution (severe branch)
  { id: "s-5", from: "e7", to: "e8", label: "severe", waypoints: [{ x: 555, y: 205 }, { x: 555, y: 345 }] },
  // From intake gateway into audit (low-severity fast path)
  { id: "s-6", from: "e7", to: "e12", label: "low-sev", isDefault: true, waypoints: [{ x: 520, y: 240 }, { x: 520, y: 490 }, { x: 554, y: 490 }] },

  { id: "s-7", from: "e8", to: "e9" },
  // auto-safe branch
  { id: "s-8", from: "e9", to: "e10", label: "safe" },
  // unsafe branch up
  { id: "s-9", from: "e9", to: "e11", label: "unsafe", waypoints: [{ x: 810, y: 320 }, { x: 810, y: 285 }] },

  { id: "s-10", from: "e10", to: "e16" },
  // unsafe approval returns to resolution
  {
    id: "s-11",
    from: "e11",
    to: "e16",
    waypoints: [{ x: 1120, y: 285 }, { x: 1120, y: 345 }]
  },

  { id: "s-12", from: "e12", to: "e13" },
  { id: "s-13", from: "e13", to: "e14" },
  { id: "s-14", from: "e14", to: "e15" },

  // Audit join back up into execution-end
  {
    id: "s-15",
    from: "e15",
    to: "e16",
    waypoints: [{ x: 1180, y: 490 }, { x: 1180, y: 380 }]
  }
];

const MESSAGE_FLOWS: MessageFlow[] = [
  {
    id: "m-1",
    from: "e3",
    to: "e5",
    label: "IncidentReport",
    waypoints: [{ x: 400, y: 95 }, { x: 400, y: 170 }, { x: 260, y: 170 }]
  },
  {
    id: "m-2",
    from: "e16",
    to: "e4",
    label: "ClosureBundle",
    waypoints: [{ x: 1180, y: 325 }, { x: 1180, y: 95 }]
  }
];

// ───────────────────────────────────────────────────────────────────────────
//  Annotations — engineering-drawing margin notes
// ───────────────────────────────────────────────────────────────────────────

const ANNOTATIONS: Annotation[] = [
  {
    key: "A1",
    nodeId: "e1",
    title: "Instanced by message",
    body: "A message start event opens the process. The requestor's payload is the first binding fact in the trace."
  },
  {
    key: "A2",
    nodeId: "e7",
    title: "Severity routing",
    body: "Exclusive gateway — exactly one outgoing path fires. High-severity cases conscript the execution lane; the rest fall to the audit fast-path."
  },
  {
    key: "A3",
    nodeId: "e9",
    title: "Automated-safety gate",
    body: "The agent ensemble may only apply a mitigation when the bounded-change contract permits it. Otherwise the path escalates to human approval."
  },
  {
    key: "A4",
    nodeId: "e12",
    title: "Non-blocking audit",
    body: "Parallel split · evidence capture and stakeholder notice run alongside the primary mitigation. The join re-aligns them before closure."
  },
  {
    key: "A5",
    nodeId: "e4",
    title: "Closure across the boundary",
    body: "A message end event emits the closure bundle to the requestor pool. The two instances terminate in synchrony."
  }
];

// ───────────────────────────────────────────────────────────────────────────
//  Scenarios (token itineraries)
// ───────────────────────────────────────────────────────────────────────────

const SCENARIOS: ScenarioItinerary[] = [
  {
    id: "scn-autosafe",
    label: "Auto-safe mitigation",
    glyph: "§α",
    synopsis: "Severe finding · agents apply a bounded change within the safety contract.",
    sequence: ["e1", "e2", "e3", "e5", "e6", "e7", "e8", "e9", "e10", "e16", "e4"],
    outcome: "Mitigation applied. Closure bundle returned to requestor.",
    verdict: "resolved"
  },
  {
    id: "scn-escalate",
    label: "Human escalation",
    glyph: "§β",
    synopsis: "Severe finding · safety contract declines; path escalates for human approval.",
    sequence: ["e1", "e2", "e3", "e5", "e6", "e7", "e8", "e9", "e11", "e16", "e4"],
    outcome: "Escalated to human reviewer. Closure deferred pending approval.",
    verdict: "escalated"
  },
  {
    id: "scn-fastpath",
    label: "Audit fast-path",
    glyph: "§γ",
    synopsis: "Low-severity — skip execution entirely, record and notify in parallel, close.",
    sequence: ["e1", "e2", "e3", "e5", "e6", "e7", "e12", "e13", "e14", "e15", "e16", "e4"],
    outcome: "Recorded without intervention. Stakeholders notified in parallel.",
    verdict: "fast-path"
  }
];

const nodeById = (id: string) => NODES.find((node) => node.id === id);

// ───────────────────────────────────────────────────────────────────────────
//  Shape primitives — authentic BPMN 2.0 notation
// ───────────────────────────────────────────────────────────────────────────

const INK = "hsl(var(--foreground))";
const PAPER = "hsl(var(--card))";
const PRIMARY = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground))";
const AMBER = "hsl(38 92% 52%)";

function EventShape({ node, active, ghost }: { node: Extract<BpmnNode, { kind: "event" }>; active: boolean; ghost: boolean }) {
  const isEnd = node.event === "endPlain" || node.event === "endMessage";
  const isIntermediate = node.event === "intermediateCatch" || node.event === "intermediateThrow";
  const r = 22;
  const stroke = active ? PRIMARY : ghost ? MUTED : INK;
  const strokeWidth = isEnd ? 3.2 : isIntermediate ? 1.2 : 1.2;

  const hasMessage = node.event === "startMessage" || node.event === "endMessage";
  const filled = node.event === "endMessage" || node.event === "intermediateThrow";

  return (
    <g>
      {isIntermediate ? (
        <>
          <circle cx={node.x} cy={node.y} r={r} fill={PAPER} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={node.x} cy={node.y} r={r - 4} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </>
      ) : (
        <circle cx={node.x} cy={node.y} r={r} fill={PAPER} stroke={stroke} strokeWidth={strokeWidth} />
      )}
      {hasMessage ? <EnvelopeGlyph x={node.x} y={node.y} stroke={stroke} fill={filled ? stroke : PAPER} /> : null}
      {active ? (
        <circle cx={node.x} cy={node.y} r={r + 6} fill="none" stroke={PRIMARY} strokeOpacity={0.25} strokeWidth={2} />
      ) : null}
    </g>
  );
}

function EnvelopeGlyph({ x, y, stroke, fill }: { x: number; y: number; stroke: string; fill: string }) {
  // 18x12 envelope centered on (x,y)
  const w = 18;
  const h = 12;
  const left = x - w / 2;
  const top = y - h / 2;
  return (
    <g>
      <rect x={left} y={top} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={0.9} />
      <polyline
        points={`${left},${top} ${x},${y + 1} ${left + w},${top}`}
        fill="none"
        stroke={stroke === fill ? PAPER : stroke}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
    </g>
  );
}

function TaskShape({ node, active, ghost }: { node: Extract<BpmnNode, { kind: "task" }>; active: boolean; ghost: boolean }) {
  const w = 116;
  const h = 56;
  const stroke = active ? PRIMARY : ghost ? MUTED : INK;
  const fill = active ? "hsl(var(--primary) / 0.07)" : PAPER;
  const x = node.x - w / 2;
  const y = node.y - h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} ry={8} fill={fill} stroke={stroke} strokeWidth={active ? 2.2 : 1.2} />
      <TaskMarker task={node.task} x={x + 6} y={y + 6} stroke={stroke} />
      <text
        x={node.x}
        y={node.y + 4}
        textAnchor="middle"
        fill={INK}
        style={{ fontFamily: "Manrope, system-ui", fontSize: "11.5px", fontWeight: 500 }}
      >
        {wrapText(node.label, 18).map((line, index, lines) => (
          <tspan key={index} x={node.x} dy={index === 0 ? -((lines.length - 1) * 7) : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function TaskMarker({ task, x, y, stroke }: { task: TaskKind; x: number; y: number; stroke: string }) {
  // 14x14 marker in top-left of a task
  switch (task) {
    case "user":
      return (
        <g transform={`translate(${x} ${y})`}>
          <circle cx={6} cy={5} r={2.6} fill="none" stroke={stroke} strokeWidth={0.9} />
          <path d={`M 1.5 12 Q 6 8 10.5 12`} fill="none" stroke={stroke} strokeWidth={0.9} />
        </g>
      );
    case "service":
      return (
        <g transform={`translate(${x} ${y})`}>
          <circle cx={6} cy={7} r={2.4} fill="none" stroke={stroke} strokeWidth={0.9} />
          {[0, 45, 90, 135].map((rot) => (
            <rect
              key={rot}
              x={5}
              y={0.5}
              width={2}
              height={13}
              rx={0.5}
              fill="none"
              stroke={stroke}
              strokeWidth={0.9}
              transform={`rotate(${rot} 6 7)`}
            />
          ))}
        </g>
      );
    case "script":
      return (
        <g transform={`translate(${x} ${y})`}>
          <path
            d="M 2 1 h 6 l 2 2 v 10 h -8 z"
            fill="none"
            stroke={stroke}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <line x1={3.5} y1={5} x2={8} y2={5} stroke={stroke} strokeWidth={0.7} />
          <line x1={3.5} y1={7.5} x2={8} y2={7.5} stroke={stroke} strokeWidth={0.7} />
          <line x1={3.5} y1={10} x2={7} y2={10} stroke={stroke} strokeWidth={0.7} />
        </g>
      );
    case "send":
      return (
        <g transform={`translate(${x} ${y})`}>
          <rect x={1.5} y={3} width={11} height={8} fill={stroke} stroke={stroke} strokeWidth={0.9} />
          <polyline points="1.5,3 7,7.5 12.5,3" fill="none" stroke={PAPER} strokeWidth={0.9} />
        </g>
      );
    case "receive":
      return (
        <g transform={`translate(${x} ${y})`}>
          <rect x={1.5} y={3} width={11} height={8} fill="none" stroke={stroke} strokeWidth={0.9} />
          <polyline points="1.5,3 7,7.5 12.5,3" fill="none" stroke={stroke} strokeWidth={0.9} />
        </g>
      );
    case "business":
      return (
        <g transform={`translate(${x} ${y})`}>
          <rect x={1.5} y={2} width={11} height={10} fill="none" stroke={stroke} strokeWidth={0.9} />
          <line x1={1.5} y1={5} x2={12.5} y2={5} stroke={stroke} strokeWidth={0.7} />
        </g>
      );
  }
}

function GatewayShape({ node, active, ghost }: { node: Extract<BpmnNode, { kind: "gateway" }>; active: boolean; ghost: boolean }) {
  const r = 28;
  const stroke = active ? PRIMARY : ghost ? MUTED : INK;
  const fill = active ? "hsl(var(--primary) / 0.07)" : PAPER;
  const points = `${node.x},${node.y - r} ${node.x + r},${node.y} ${node.x},${node.y + r} ${node.x - r},${node.y}`;
  return (
    <g>
      <polygon points={points} fill={fill} stroke={stroke} strokeWidth={active ? 2.2 : 1.2} strokeLinejoin="miter" />
      <GatewayMarker gateway={node.gateway} cx={node.x} cy={node.y} stroke={stroke} />
    </g>
  );
}

function GatewayMarker({ gateway, cx, cy, stroke }: { gateway: GatewayKind; cx: number; cy: number; stroke: string }) {
  switch (gateway) {
    case "exclusive":
      return (
        <g>
          <line x1={cx - 7} y1={cy - 7} x2={cx + 7} y2={cy + 7} stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
          <line x1={cx - 7} y1={cy + 7} x2={cx + 7} y2={cy - 7} stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case "parallel":
      return (
        <g>
          <line x1={cx - 9} y1={cy} x2={cx + 9} y2={cy} stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
          <line x1={cx} y1={cy - 9} x2={cx} y2={cy + 9} stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case "inclusive":
      return <circle cx={cx} cy={cy} r={8} fill="none" stroke={stroke} strokeWidth={2.4} />;
    case "eventBased":
      return (
        <g>
          <circle cx={cx} cy={cy} r={10} fill="none" stroke={stroke} strokeWidth={1.2} />
          <polygon
            points={`${cx},${cy - 6} ${cx + 6},${cy - 1.5} ${cx + 3.5},${cy + 5.5} ${cx - 3.5},${cy + 5.5} ${cx - 6},${cy - 1.5}`}
            fill="none"
            stroke={stroke}
            strokeWidth={1.2}
          />
        </g>
      );
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────────────────────────────────────

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function nodeOutEdgePoint(node: BpmnNode, target: BpmnNode, shapeHalf: { w: number; h: number }) {
  // Compute a point on the bounding box towards `target`
  const dx = target.x - node.x;
  const dy = target.y - node.y;
  const absDx = Math.abs(dx) || 1;
  const absDy = Math.abs(dy) || 1;
  const scaleX = shapeHalf.w / absDx;
  const scaleY = shapeHalf.h / absDy;
  const scale = Math.min(scaleX, scaleY);
  return { x: node.x + dx * scale, y: node.y + dy * scale };
}

function nodeHalfBox(node: BpmnNode) {
  if (node.kind === "task") return { w: 58, h: 28 };
  if (node.kind === "event") return { w: 22, h: 22 };
  return { w: 28, h: 28 };
}

function flowPath(flow: SequenceFlow | MessageFlow) {
  const from = nodeById(flow.from);
  const to = nodeById(flow.to);
  if (!from || !to) return "";
  const startHalf = nodeHalfBox(from);
  const endHalf = nodeHalfBox(to);

  if (flow.waypoints && flow.waypoints.length > 0) {
    const startTarget = flow.waypoints[0]!;
    const endSource = flow.waypoints[flow.waypoints.length - 1]!;
    const start = nodeOutEdgePoint(from, { ...from, x: startTarget.x, y: startTarget.y }, startHalf);
    const end = nodeOutEdgePoint(to, { ...to, x: endSource.x, y: endSource.y }, endHalf);
    const inner = flow.waypoints.map((p) => `L ${p.x} ${p.y}`).join(" ");
    return `M ${start.x} ${start.y} ${inner} L ${end.x} ${end.y}`;
  }

  const start = nodeOutEdgePoint(from, to, startHalf);
  const end = nodeOutEdgePoint(to, from, endHalf);
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

function lerpAlongPath(pathEl: SVGPathElement | null, t: number) {
  if (!pathEl) return null;
  const length = pathEl.getTotalLength();
  return pathEl.getPointAtLength(length * t);
}

function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = window.setInterval(() => saved.current(), delay);
    return () => window.clearInterval(id);
  }, [delay]);
}

// ───────────────────────────────────────────────────────────────────────────
//  The page
// ───────────────────────────────────────────────────────────────────────────

export function BpmnAtlasPage() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0]!.id);
  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]!, [scenarioId]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("e7");

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [scenarioId]);

  useInterval(
    () => {
      setStep((current) => {
        const next = current + 1;
        if (next >= scenario.sequence.length) {
          setPlaying(false);
          return scenario.sequence.length - 1;
        }
        return next;
      });
    },
    playing ? 1100 : null
  );

  const activeNodeId = scenario.sequence[Math.min(step, scenario.sequence.length - 1)] ?? null;
  const visitedIds = useMemo(() => new Set(scenario.sequence.slice(0, step + 1)), [scenario, step]);
  const activeFlowIds = useMemo(() => {
    const ids = new Set<string>();
    for (let index = 0; index < step; index += 1) {
      const from = scenario.sequence[index];
      const to = scenario.sequence[index + 1];
      if (!from || !to) continue;
      const matchSeq = SEQUENCE_FLOWS.find((flow) => flow.from === from && flow.to === to);
      if (matchSeq) {
        ids.add(matchSeq.id);
        continue;
      }
      const matchMsg = MESSAGE_FLOWS.find((flow) => flow.from === from && flow.to === to);
      if (matchMsg) ids.add(matchMsg.id);
    }
    return ids;
  }, [scenario, step]);

  const currentFlowId = useMemo(() => {
    const from = scenario.sequence[step - 1];
    const to = scenario.sequence[step];
    if (!from || !to) return null;
    return (
      SEQUENCE_FLOWS.find((flow) => flow.from === from && flow.to === to)?.id ??
      MESSAGE_FLOWS.find((flow) => flow.from === from && flow.to === to)?.id ??
      null
    );
  }, [scenario, step]);

  const selectedNode = useMemo(() => nodeById(selectedNodeId), [selectedNodeId]);
  const laneById = useMemo(() => {
    const map = new Map<string, (typeof POOLS)[number]["lanes"][number]>();
    for (const pool of POOLS) for (const lane of pool.lanes) map.set(lane.id, lane);
    return map;
  }, []);

  function reset() {
    setStep(0);
    setPlaying(false);
  }

  function stepForward() {
    setPlaying(false);
    setStep((current) => Math.min(current + 1, scenario.sequence.length - 1));
  }

  function stepBackward() {
    setPlaying(false);
    setStep((current) => Math.max(current - 1, 0));
  }

  return (
    <div className="relative min-h-screen overflow-hidden bpmn-atlas">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,500&display=swap");
        .bpmn-atlas .font-display { font-family: "Fraunces", "Playfair Display", Georgia, serif; font-variation-settings: "opsz" 144, "SOFT" 100; }
        .bpmn-atlas .font-display-italic { font-family: "Fraunces", "Playfair Display", Georgia, serif; font-style: italic; font-variation-settings: "opsz" 144, "SOFT" 60; }
        @keyframes atlas-token-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          50% { transform: scale(1.15); filter: drop-shadow(0 0 4px hsl(var(--primary))); }
        }
        @keyframes atlas-token-march {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes atlas-seal-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes atlas-nib-drop {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Paper texture — fine crosshatch plus faint dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.08) 1px, transparent 0), repeating-linear-gradient(135deg, hsl(var(--foreground) / 0.025) 0 1px, transparent 1px 9px)",
          backgroundSize: "30px 30px, auto"
        }}
      />
      {/* Corner vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 15%, transparent 40%, hsl(var(--foreground) / 0.04) 100%)"
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-5 pb-16 pt-8 md:px-8 2xl:px-10">
        <OrdinanceHeader
          scenario={scenario}
          scenarioOptions={SCENARIOS}
          onSelectScenario={setScenarioId}
        />

        <ControlsBar
          playing={playing}
          step={step}
          totalSteps={scenario.sequence.length}
          onTogglePlay={() => setPlaying((current) => !current)}
          onStepBack={stepBackward}
          onStepForward={stepForward}
          onReset={reset}
          scenarioGlyph={scenario.glyph}
          scenarioLabel={scenario.label}
        />

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] 2xl:gap-8">
          <Diagram
            activeNodeId={activeNodeId}
            visitedIds={visitedIds}
            activeFlowIds={activeFlowIds}
            currentFlowId={currentFlowId}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            laneById={laneById}
          />

          <div className="flex flex-col gap-6">
            <ElementInspector node={selectedNode ?? null} laneById={laneById} />
            <PaletteLegend />
          </div>
        </div>

        <AnnotationDossier activeNodeId={activeNodeId} onFocus={setSelectedNodeId} />

        <DocumentFooter scenario={scenario} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Header — ordinance-style title block
// ═══════════════════════════════════════════════════════════════════════════

function OrdinanceHeader({
  scenario,
  scenarioOptions,
  onSelectScenario
}: {
  scenario: ScenarioItinerary;
  scenarioOptions: ScenarioItinerary[];
  onSelectScenario: (id: string) => void;
}) {
  return (
    <header className="relative">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[0.625rem] uppercase tracking-[0.38em] text-muted-foreground">
            <ScrollText aria-hidden className="h-3.5 w-3.5 text-primary" />
            <span>Ordinance</span>
            <span aria-hidden className="h-px w-8 bg-border" />
            <span className="text-foreground/80">№ SYN-2026-017</span>
            <span aria-hidden className="h-px w-8 bg-border" />
            <span className="italic tracking-[0.2em] text-muted-foreground/70">filed · 21 · iv · mmxxvi</span>
          </div>

          <h1 className="font-display text-[3rem] font-normal leading-[0.95] tracking-tight text-foreground md:text-[3.75rem] 2xl:text-[4.25rem]">
            <span className="font-display-italic text-muted-foreground/80">a</span> process
            <span className="text-primary">.</span>{" "}
            <span className="block md:inline">atlas</span>
          </h1>

          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-7 text-muted-foreground md:text-[1rem]">
            <span className="font-display-italic text-foreground/85">Rendered in BPMN 2.0.</span> Pools, lanes, events, gateways —
            the orchestration score, sealed and reviewable. Audit a scenario end-to-end before any agent touches production.
          </p>

          <div className="mt-6 flex flex-wrap items-stretch gap-3">
            {scenarioOptions.map((option) => {
              const isActive = option.id === scenario.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectScenario(option.id)}
                  className={cn(
                    "group relative flex items-start gap-3 overflow-hidden rounded-[6px] border px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-primary/60 bg-primary/[0.05] shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
                      : "border-border/70 bg-card/60 hover:border-primary/35 hover:bg-card"
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-[1.65rem] leading-none",
                      isActive ? "text-primary" : "text-foreground/70"
                    )}
                  >
                    {option.glyph}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
                      scenario
                    </span>
                    <span className={cn("block font-medium", isActive ? "text-foreground" : "text-foreground/85")}>
                      {option.label}
                    </span>
                    <span className="mt-1 block max-w-[20rem] text-[0.75rem] italic leading-5 text-muted-foreground">
                      {option.synopsis}
                    </span>
                  </span>
                  {isActive ? (
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-primary via-primary to-transparent" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <TitleBlock scenario={scenario} />
      </div>
    </header>
  );
}

function TitleBlock({ scenario }: { scenario: ScenarioItinerary }) {
  return (
    <aside className="relative flex w-full flex-col gap-4 rounded-[6px] border border-border/80 bg-card/70 p-4 md:w-[22rem]">
      <span aria-hidden className="pointer-events-none absolute left-3 top-3 h-2 w-2 border-l border-t border-foreground/30" />
      <span aria-hidden className="pointer-events-none absolute right-3 top-3 h-2 w-2 border-r border-t border-foreground/30" />
      <span aria-hidden className="pointer-events-none absolute left-3 bottom-3 h-2 w-2 border-l border-b border-foreground/30" />
      <span aria-hidden className="pointer-events-none absolute right-3 bottom-3 h-2 w-2 border-r border-b border-foreground/30" />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.38em] text-muted-foreground">Title block</p>
          <p className="font-display text-[1.125rem] leading-tight text-foreground">
            Incident Mitigation · rev.&nbsp;<span className="text-primary">003</span>
          </p>
        </div>
        <OfficialSeal verdict={scenario.verdict} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
        <dt className="text-muted-foreground/70">Classification</dt>
        <dd className="text-foreground/85">Orchestration · formal</dd>
        <dt className="text-muted-foreground/70">Notation</dt>
        <dd className="text-foreground/85">BPMN 2.0 · executable</dd>
        <dt className="text-muted-foreground/70">Pools</dt>
        <dd className="text-foreground/85">02 · participants</dd>
        <dt className="text-muted-foreground/70">Lanes</dt>
        <dd className="text-foreground/85">04 · cross-role</dd>
        <dt className="text-muted-foreground/70">Elements</dt>
        <dd className="text-foreground/85">16 · nodes + flows</dd>
        <dt className="text-muted-foreground/70">Approved</dt>
        <dd className="text-foreground/85">
          <span className="font-display italic text-foreground">M. Valente</span> · Ensemble Lead
        </dd>
      </dl>
    </aside>
  );
}

function OfficialSeal({ verdict }: { verdict: ScenarioItinerary["verdict"] }) {
  const sealColor =
    verdict === "resolved" ? "hsl(158 64% 34%)" : verdict === "escalated" ? "hsl(0 72% 52%)" : "hsl(38 92% 48%)";
  const sealLabel = verdict === "resolved" ? "Sealed · Approved" : verdict === "escalated" ? "Open · Escalated" : "Noted · Fast-Path";
  return (
    <div className="relative">
      <svg width="88" height="88" viewBox="0 0 88 88" className="block">
        <defs>
          <path id="sealTextPath" d="M 44,44 m -30,0 a 30,30 0 1,1 60,0 a 30,30 0 1,1 -60,0" />
        </defs>
        <g style={{ transformOrigin: "44px 44px", animation: "atlas-seal-spin 40s linear infinite" }}>
          <circle cx={44} cy={44} r={36} fill="none" stroke={sealColor} strokeWidth={1.2} strokeOpacity={0.35} />
          <circle cx={44} cy={44} r={30} fill="none" stroke={sealColor} strokeWidth={0.8} strokeDasharray="2 3" />
          <text fill={sealColor} fontSize="7" letterSpacing="3">
            <textPath href="#sealTextPath" startOffset="0">
              {`§ SYN-2026-017 · ${sealLabel} · `}
            </textPath>
          </text>
        </g>
        <circle cx={44} cy={44} r={20} fill={sealColor} fillOpacity={0.08} stroke={sealColor} strokeWidth={1} />
        <text x={44} y={40} textAnchor="middle" fill={sealColor} fontSize="7" style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", letterSpacing: "1.5px" }}>
          certified
        </text>
        <text x={44} y={50} textAnchor="middle" fill={sealColor} fontSize="9" style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
          BPMN
        </text>
        <text x={44} y={58} textAnchor="middle" fill={sealColor} fontSize="5.5" style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: "1.5px" }}>
          MMXXVI
        </text>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Controls
// ═══════════════════════════════════════════════════════════════════════════

function ControlsBar({
  playing,
  step,
  totalSteps,
  onTogglePlay,
  onStepBack,
  onStepForward,
  onReset,
  scenarioGlyph,
  scenarioLabel
}: {
  playing: boolean;
  step: number;
  totalSteps: number;
  onTogglePlay: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onReset: () => void;
  scenarioGlyph: string;
  scenarioLabel: string;
}) {
  const progress = totalSteps > 1 ? (step / (totalSteps - 1)) * 100 : 0;
  return (
    <section className="relative flex flex-wrap items-center gap-6 rounded-[6px] border border-border/70 bg-card/70 px-5 py-4 shadow-[0_1px_0_hsl(var(--border))]">
      <div className="flex items-center gap-3">
        <span className="font-display text-[1.35rem] leading-none text-primary">{scenarioGlyph}</span>
        <div>
          <p className="font-mono text-[0.575rem] uppercase tracking-[0.3em] text-muted-foreground">Simulation</p>
          <p className="font-display italic text-[0.95rem] text-foreground">{scenarioLabel}</p>
        </div>
      </div>

      <div className="h-10 w-px bg-border" aria-hidden />

      <div className="flex items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={onStepBack} disabled={step === 0} className="h-9 w-9 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button type="button" onClick={onTogglePlay} className="h-9 gap-2 px-4">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : step === 0 ? "Begin trace" : "Resume"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onStepForward}
          disabled={step >= totalSteps - 1}
          className="h-9 w-9 p-0"
        >
          <StepForward className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="h-9 gap-1.5 px-2.5 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          Rewind
        </Button>
      </div>

      <div className="flex min-w-[12rem] flex-1 items-center gap-3">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.3em] text-muted-foreground">
          step <span className="text-foreground">{String(step + 1).padStart(2, "0")}</span> / {String(totalSteps).padStart(2, "0")}
        </span>
        <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-border/60">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all"
            style={{ width: `${progress}%` }}
          />
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-border"
              style={{ left: `${(i / Math.max(totalSteps - 1, 1)) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div className="hidden items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground md:flex">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> token live
        </span>
        <span aria-hidden className="h-px w-6 bg-border" />
        <span>auditable · deterministic</span>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Diagram — the main BPMN 2.0 canvas
// ═══════════════════════════════════════════════════════════════════════════

function Diagram({
  activeNodeId,
  visitedIds,
  activeFlowIds,
  currentFlowId,
  selectedNodeId,
  onSelectNode,
  laneById
}: {
  activeNodeId: string | null;
  visitedIds: Set<string>;
  activeFlowIds: Set<string>;
  currentFlowId: string | null;
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  laneById: Map<string, (typeof POOLS)[number]["lanes"][number]>;
}) {
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const [tokenPosition, setTokenPosition] = useState<{ x: number; y: number } | null>(null);

  // Place the token at the active node center (or along the incoming flow for a moment)
  useEffect(() => {
    const node = activeNodeId ? nodeById(activeNodeId) : null;
    if (!node) {
      setTokenPosition(null);
      return;
    }
    setTokenPosition({ x: node.x, y: node.y });
  }, [activeNodeId]);

  return (
    <section
      className="relative overflow-hidden rounded-[6px] border border-border/80 bg-card/75"
      style={{ boxShadow: "0 1px 0 hsl(var(--border)), 0 12px 32px -24px hsl(var(--foreground) / 0.15)" }}
    >
      {/* Scale ruler along top — engineering drawing flavor */}
      <div className="flex items-center justify-between border-b border-dashed border-border/70 px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.32em] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Hexagon className="h-3 w-3 text-primary" />
          Sheet · 01 / 01
        </span>
        <span className="hidden md:inline">scale · 1 : 1 · units · px · bpmn 2.0</span>
        <span className="inline-flex items-center gap-2">
          <Printer className="h-3 w-3 text-muted-foreground" />
          plotted · xmmxxvi
        </span>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
          className="block h-auto w-full min-w-[1120px]"
          role="img"
          aria-label="Incident mitigation BPMN 2.0 diagram"
        >
          <defs>
            {/* Sequence arrow */}
            <marker id="seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={INK} />
            </marker>
            <marker id="seq-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={PRIMARY} />
            </marker>
            {/* Message arrow — open head */}
            <marker id="msg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke={AMBER} strokeWidth={1.2} />
            </marker>
            {/* Message flow source — small open circle */}
            <marker id="msg-start" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <circle cx="5" cy="5" r="2.4" fill={PAPER} stroke={AMBER} strokeWidth={1} />
            </marker>
          </defs>

          {/* Pools */}
          {POOLS.map((pool) => (
            <g key={pool.id}>
              {/* outer rect */}
              <rect
                x={0}
                y={pool.y}
                width={CANVAS.w}
                height={pool.height}
                fill="none"
                stroke={INK}
                strokeWidth={1.2}
              />
              {/* pool label column */}
              <rect x={0} y={pool.y} width={POOL_LABEL_W} height={pool.height} fill="hsl(var(--muted) / 0.6)" stroke={INK} strokeWidth={1.2} />
              <text
                transform={`translate(${POOL_LABEL_W / 2} ${pool.y + pool.height / 2}) rotate(-90)`}
                textAnchor="middle"
                style={{ fontFamily: "Fraunces, serif", fontSize: "13px", fontStyle: "italic", letterSpacing: "1px" }}
                fill={INK}
              >
                {pool.label}
              </text>
              <text
                transform={`translate(${POOL_LABEL_W / 2 + 14} ${pool.y + pool.height / 2}) rotate(-90)`}
                textAnchor="middle"
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", letterSpacing: "1.8px", textTransform: "uppercase" }}
                fill={MUTED}
              >
                {pool.role}
              </text>

              {/* Lanes */}
              {pool.lanes.map((lane, laneIndex) => {
                const isFirst = laneIndex === 0;
                return (
                  <g key={lane.id}>
                    {/* Lane top separator */}
                    {!isFirst ? (
                      <line x1={POOL_LABEL_W} y1={lane.y} x2={CANVAS.w} y2={lane.y} stroke={INK} strokeWidth={0.9} />
                    ) : null}
                    {/* Lane label column */}
                    <rect
                      x={POOL_LABEL_W}
                      y={lane.y}
                      width={LANE_LABEL_W}
                      height={lane.height}
                      fill="hsl(var(--muted) / 0.3)"
                      stroke={INK}
                      strokeWidth={0.8}
                    />
                    <text
                      transform={`translate(${POOL_LABEL_W + LANE_LABEL_W / 2} ${lane.y + lane.height / 2}) rotate(-90)`}
                      textAnchor="middle"
                      style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", letterSpacing: "2.6px", textTransform: "uppercase" }}
                      fill={INK}
                    >
                      {lane.label}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}

          {/* Sequence flows */}
          {SEQUENCE_FLOWS.map((flow) => {
            const d = flowPath(flow);
            const isActive = activeFlowIds.has(flow.id);
            const isCurrent = currentFlowId === flow.id;
            const color = isActive || isCurrent ? PRIMARY : INK;
            const opacity = isActive || isCurrent ? 1 : 0.75;
            return (
              <g key={flow.id}>
                <path
                  ref={(element) => {
                    pathRefs.current[flow.id] = element;
                  }}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isCurrent ? 2.2 : isActive ? 1.6 : 1.1}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd={isActive || isCurrent ? "url(#seq-arrow-active)" : "url(#seq-arrow)"}
                  style={isCurrent ? { strokeDasharray: "6 6", animation: "atlas-token-march 1s linear infinite" } : undefined}
                />
                {flow.label ? <FlowLabel flow={flow} /> : null}
                {flow.isDefault ? <DefaultMarker flow={flow} /> : null}
              </g>
            );
          })}

          {/* Message flows */}
          {MESSAGE_FLOWS.map((flow) => {
            const d = flowPath(flow);
            const isActive = activeFlowIds.has(flow.id);
            const isCurrent = currentFlowId === flow.id;
            return (
              <g key={flow.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={AMBER}
                  strokeOpacity={isActive || isCurrent ? 1 : 0.7}
                  strokeWidth={isCurrent ? 1.8 : 1.1}
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                  markerStart="url(#msg-start)"
                  markerEnd="url(#msg-arrow)"
                  style={isCurrent ? { animation: "atlas-token-march 1s linear infinite" } : undefined}
                />
                {flow.label ? <MessageFlowLabel flow={flow} /> : null}
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isActive = node.id === activeNodeId;
            const isVisited = visitedIds.has(node.id);
            const isSelected = node.id === selectedNodeId;
            const ghost = false;
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => onSelectNode(node.id)}
                style={{ transition: "filter 200ms" }}
              >
                {isSelected ? <SelectionRing node={node} /> : null}
                {node.kind === "event" ? <EventShape node={node} active={isActive} ghost={ghost} /> : null}
                {node.kind === "task" ? <TaskShape node={node} active={isActive} ghost={ghost} /> : null}
                {node.kind === "gateway" ? <GatewayShape node={node} active={isActive} ghost={ghost} /> : null}

                {/* External label for events + gateways (below) */}
                {node.kind === "event" || node.kind === "gateway" ? (
                  <text
                    x={node.x}
                    y={node.kind === "event" ? node.y + 42 : node.y + 48}
                    textAnchor="middle"
                    fill={isActive ? PRIMARY : INK}
                    style={{
                      fontFamily: node.kind === "gateway" ? "Fraunces, serif" : "JetBrains Mono, monospace",
                      fontSize: node.kind === "gateway" ? "11.5px" : "10px",
                      fontStyle: node.kind === "gateway" ? "italic" : "normal",
                      letterSpacing: node.kind === "gateway" ? "0.3px" : "1.2px",
                      textTransform: node.kind === "gateway" ? undefined : "uppercase"
                    }}
                  >
                    {node.label}
                  </text>
                ) : null}

                {/* Visited indicator — small tick */}
                {isVisited && !isActive ? (
                  <g transform={`translate(${node.x + (node.kind === "task" ? 50 : 18)}, ${node.y - (node.kind === "task" ? 22 : 18)})`}>
                    <circle r={5} fill={PRIMARY} fillOpacity={0.15} stroke={PRIMARY} strokeWidth={0.9} />
                    <path d="M -2 0 L -0.5 1.6 L 2.2 -1.6" fill="none" stroke={PRIMARY} strokeWidth={1.1} strokeLinecap="round" />
                  </g>
                ) : null}

                {/* Annotation tag */}
                {node.annotationKey ? (
                  <AnnotationTag
                    x={node.kind === "task" ? node.x + 58 : node.x + 22}
                    y={node.kind === "task" ? node.y - 28 : node.y - 24}
                    label={node.annotationKey}
                  />
                ) : null}
              </g>
            );
          })}

          {/* Token */}
          {tokenPosition ? (
            <g style={{ transform: `translate(${tokenPosition.x}px, ${tokenPosition.y}px)`, animation: "atlas-token-pulse 1.4s ease-in-out infinite" }}>
              <circle r={9} fill={PRIMARY} fillOpacity={0.14} stroke={PRIMARY} strokeWidth={1.1} />
              <circle r={3.2} fill={PRIMARY} />
            </g>
          ) : null}
        </svg>
      </div>

      {/* Bottom strip: active node summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/70 px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
        {activeNodeId ? (
          <ActiveNodeChip node={nodeById(activeNodeId)!} laneById={laneById} />
        ) : (
          <span className="italic">token dormant — press begin trace</span>
        )}
        <span className="hidden md:inline text-muted-foreground/60">drawing · INCIDENT-MITIGATION-003 · sheet 01</span>
      </div>
    </section>
  );
}

function SelectionRing({ node }: { node: BpmnNode }) {
  const radius =
    node.kind === "task" ? 70 : node.kind === "event" ? 32 : 38;
  return (
    <g>
      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill="none"
        stroke={PRIMARY}
        strokeOpacity={0.28}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
    </g>
  );
}

function AnnotationTag({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <rect x={x - 1} y={y - 1} width={22} height={14} fill={PAPER} stroke={INK} strokeWidth={0.8} />
      <text x={x + 10} y={y + 9} textAnchor="middle" fill={INK} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8.5px", letterSpacing: "0.5px", fontWeight: 600 }}>
        {label}
      </text>
    </g>
  );
}

function FlowLabel({ flow }: { flow: SequenceFlow }) {
  const from = nodeById(flow.from);
  const to = nodeById(flow.to);
  if (!from || !to || !flow.label) return null;
  const mid = computeFlowMidpoint(flow);
  const width = Math.max(50, flow.label.length * 6.5 + 14);
  return (
    <g transform={`translate(${mid.x - width / 2} ${mid.y - 9})`}>
      <rect x={0} y={0} width={width} height={16} rx={2.5} fill={PAPER} stroke={INK} strokeWidth={0.7} />
      <text x={width / 2} y={11} textAnchor="middle" fill={INK} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", letterSpacing: "0.6px", textTransform: "uppercase" }}>
        {flow.label}
      </text>
    </g>
  );
}

function MessageFlowLabel({ flow }: { flow: MessageFlow }) {
  const from = nodeById(flow.from);
  const to = nodeById(flow.to);
  if (!from || !to || !flow.label) return null;
  const mid = computeFlowMidpoint({ from: flow.from, to: flow.to, ...(flow.waypoints ? { waypoints: flow.waypoints } : {}) });
  const width = Math.max(70, flow.label.length * 6.5 + 14);
  return (
    <g transform={`translate(${mid.x - width / 2} ${mid.y - 9})`}>
      <rect x={0} y={0} width={width} height={16} rx={2.5} fill={PAPER} stroke={AMBER} strokeWidth={0.8} />
      <text
        x={width / 2}
        y={11}
        textAnchor="middle"
        fill={AMBER}
        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8.5px", letterSpacing: "0.7px", textTransform: "uppercase", fontWeight: 600 }}
      >
        {flow.label}
      </text>
    </g>
  );
}

function computeFlowMidpoint(flow: { from: string; to: string; waypoints?: Array<{ x: number; y: number }> }) {
  const from = nodeById(flow.from)!;
  const to = nodeById(flow.to)!;
  if (flow.waypoints && flow.waypoints.length >= 1) {
    const midIdx = Math.floor(flow.waypoints.length / 2);
    const wp = flow.waypoints[midIdx]!;
    return { x: wp.x, y: wp.y };
  }
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

function DefaultMarker({ flow }: { flow: SequenceFlow }) {
  const from = nodeById(flow.from);
  const to = nodeById(flow.to);
  if (!from || !to) return null;
  // small slash near source end
  const startHalf = nodeHalfBox(from);
  const targetPoint = flow.waypoints?.[0] ?? { x: to.x, y: to.y };
  const p = nodeOutEdgePoint(from, { ...from, x: targetPoint.x, y: targetPoint.y }, startHalf);
  return (
    <line
      x1={p.x + 5}
      y1={p.y + 5}
      x2={p.x - 1}
      y2={p.y - 5}
      stroke={INK}
      strokeWidth={1.1}
      strokeLinecap="round"
    />
  );
}

function ActiveNodeChip({
  node,
  laneById
}: {
  node: BpmnNode;
  laneById: Map<string, (typeof POOLS)[number]["lanes"][number]>;
}) {
  const lane = laneById.get(node.laneId);
  const kindLabel = node.kind === "task" ? `${node.task} task` : node.kind === "event" ? node.event : `${node.gateway} gateway`;
  return (
    <div className="flex items-center gap-3">
      <CircleDot className="h-3.5 w-3.5 animate-pulse text-primary" />
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.28em] text-foreground/80">{kindLabel}</span>
      <span aria-hidden className="h-px w-4 bg-border" />
      <span className="font-display italic text-[0.95rem] normal-case tracking-normal text-foreground">{node.label}</span>
      {lane ? (
        <span className="hidden sm:inline font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
          · {lane.label}
        </span>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Inspector & Palette (right column)
// ═══════════════════════════════════════════════════════════════════════════

function ElementInspector({
  node,
  laneById
}: {
  node: BpmnNode | null;
  laneById: Map<string, (typeof POOLS)[number]["lanes"][number]>;
}) {
  if (!node) return null;
  const lane = laneById.get(node.laneId);
  const kindLabel = node.kind === "task" ? `${node.task} task` : node.kind === "event" ? node.event : `${node.gateway} gateway`;
  const icon =
    node.kind === "task"
      ? "▭"
      : node.kind === "event"
        ? node.event === "endMessage" || node.event === "endPlain"
          ? "●"
          : "○"
        : "◇";

  const properties = buildProperties(node);

  return (
    <section className="relative rounded-[6px] border border-border/80 bg-card/75 p-5" style={{ animation: "atlas-nib-drop 300ms ease-out" }}>
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[0.575rem] uppercase tracking-[0.32em] text-muted-foreground">Element</p>
          <p className="font-display text-[1.1rem] leading-tight text-foreground">
            {node.label}
            <span className="font-display-italic ml-2 text-muted-foreground">· {node.id}</span>
          </p>
        </div>
        <span className="font-display text-[1.65rem] leading-none text-primary">{icon}</span>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 font-mono text-[0.7rem] uppercase tracking-[0.12em]">
        <dt className="text-muted-foreground/70">Kind</dt>
        <dd className="text-foreground/85">{kindLabel}</dd>
        <dt className="text-muted-foreground/70">Lane</dt>
        <dd className="text-foreground/85">{lane?.label ?? "—"}</dd>
        {properties.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-muted-foreground/70">{key}</dt>
            <dd className="text-foreground/85">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-[4px] border border-dashed border-border bg-background/60 px-3 py-2.5 font-mono text-[0.7rem] leading-5 text-muted-foreground">
        <span className="mr-2 font-display-italic text-foreground/80">{node.id}</span>
        {"// "}
        {node.kind === "task"
          ? "consumes data via task I/O; emits completion + artifacts"
          : node.kind === "event"
            ? "instantiates / continues / terminates the process instance"
            : "routes the token by evaluating the outgoing conditions"}
      </div>
    </section>
  );
}

function buildProperties(node: BpmnNode): Array<[string, string]> {
  if (node.kind === "task") {
    const impl: Record<TaskKind, string> = {
      user: "human · form-driven",
      service: "agent · tool-invoked",
      script: "deterministic · code",
      send: "message · outbound",
      receive: "message · inbound",
      business: "decision · rule-set"
    };
    return [
      ["Implementation", impl[node.task]],
      ["Compensation", "n/a"],
      ["Loop", "none"]
    ];
  }
  if (node.kind === "event") {
    const trigger: Record<EventKind, string> = {
      startMessage: "message · catching",
      endPlain: "none",
      endMessage: "message · throwing",
      intermediateCatch: "catch",
      intermediateThrow: "throw"
    };
    return [
      ["Trigger", trigger[node.event]],
      ["Interrupting", node.event === "endMessage" || node.event === "endPlain" ? "terminal" : "non-terminal"]
    ];
  }
  const markers: Record<GatewayKind, string> = {
    exclusive: "× · one path fires",
    parallel: "+ · all paths fire",
    inclusive: "○ · one-or-more paths",
    eventBased: "⬠ · waits on events"
  };
  return [
    ["Semantics", markers[node.gateway]],
    ["Default", node.gateway === "exclusive" ? "low-sev" : "—"]
  ];
}

function PaletteLegend() {
  return (
    <section className="relative rounded-[6px] border border-border/80 bg-card/70 p-5">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[0.575rem] uppercase tracking-[0.32em] text-muted-foreground">Symbology</p>
          <p className="font-display text-[1.05rem] leading-tight text-foreground">
            BPMN 2.0 <span className="font-display-italic text-muted-foreground">·</span> legend
          </p>
        </div>
        <Stamp aria-hidden className="h-4 w-4 text-primary" />
      </header>

      <div className="space-y-3 font-mono text-[0.7rem] uppercase tracking-[0.12em]">
        {LEGEND_ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <svg viewBox="0 0 40 28" width={46} height={30} className="shrink-0">
              {row.render()}
            </svg>
            <div className="flex-1">
              <p className="text-foreground/85">{row.label}</p>
              <p className="font-sans text-[0.7rem] normal-case tracking-normal text-muted-foreground">{row.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const LEGEND_ROWS: Array<{ label: string; hint: string; render: () => ReactElement }> = [
  {
    label: "Start · message",
    hint: "Instances this process when the named message arrives.",
    render: () => (
      <>
        <circle cx={20} cy={14} r={10} fill={PAPER} stroke={INK} strokeWidth={1} />
        <EnvelopeGlyph x={20} y={14} stroke={INK} fill={PAPER} />
      </>
    )
  },
  {
    label: "End · message",
    hint: "Terminal node that emits a closing message across the pool.",
    render: () => (
      <>
        <circle cx={20} cy={14} r={10} fill={PAPER} stroke={INK} strokeWidth={2.6} />
        <EnvelopeGlyph x={20} y={14} stroke={INK} fill={INK} />
      </>
    )
  },
  {
    label: "Task · service",
    hint: "Agent invokes a tool; auto-completes on return.",
    render: () => (
      <>
        <rect x={4} y={6} width={32} height={16} rx={3} fill={PAPER} stroke={INK} strokeWidth={1} />
        <TaskMarker task="service" x={6} y={8} stroke={INK} />
      </>
    )
  },
  {
    label: "Task · user",
    hint: "Awaits a human. Blocks the path until form is submitted.",
    render: () => (
      <>
        <rect x={4} y={6} width={32} height={16} rx={3} fill={PAPER} stroke={INK} strokeWidth={1} />
        <TaskMarker task="user" x={6} y={8} stroke={INK} />
      </>
    )
  },
  {
    label: "Gateway · exclusive",
    hint: "Exactly one outgoing path is taken.",
    render: () => (
      <>
        <polygon points="20,4 34,14 20,24 6,14" fill={PAPER} stroke={INK} strokeWidth={1} />
        <line x1={16} y1={10} x2={24} y2={18} stroke={INK} strokeWidth={1.6} />
        <line x1={16} y1={18} x2={24} y2={10} stroke={INK} strokeWidth={1.6} />
      </>
    )
  },
  {
    label: "Gateway · parallel",
    hint: "Split — all outgoing; Join — wait for all incoming.",
    render: () => (
      <>
        <polygon points="20,4 34,14 20,24 6,14" fill={PAPER} stroke={INK} strokeWidth={1} />
        <line x1={14} y1={14} x2={26} y2={14} stroke={INK} strokeWidth={1.8} />
        <line x1={20} y1={8} x2={20} y2={20} stroke={INK} strokeWidth={1.8} />
      </>
    )
  },
  {
    label: "Sequence flow",
    hint: "Solid — token steps between nodes in one process.",
    render: () => (
      <>
        <path d="M 4 14 L 32 14" fill="none" stroke={INK} strokeWidth={1.1} markerEnd="url(#seq-arrow)" />
      </>
    )
  },
  {
    label: "Message flow",
    hint: "Dashed — crosses the pool boundary; carries a message.",
    render: () => (
      <>
        <path d="M 4 14 L 32 14" fill="none" stroke={AMBER} strokeWidth={1.1} strokeDasharray="4 3" markerStart="url(#msg-start)" markerEnd="url(#msg-arrow)" />
      </>
    )
  }
];

// ═══════════════════════════════════════════════════════════════════════════
//  Annotation dossier (margin notes)
// ═══════════════════════════════════════════════════════════════════════════

function AnnotationDossier({
  activeNodeId,
  onFocus
}: {
  activeNodeId: string | null;
  onFocus: (nodeId: string) => void;
}) {
  return (
    <section className="relative rounded-[6px] border border-border/80 bg-card/70 p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-dashed border-border/70 pb-4">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.34em] text-muted-foreground">Margin notes</p>
          <h2 className="mt-1 font-display text-[1.5rem] leading-tight text-foreground">
            annotated dossier <span className="font-display-italic text-primary">·</span> A1 — A5
          </h2>
        </div>
        <p className="max-w-lg font-display-italic text-[0.875rem] leading-6 text-muted-foreground">
          Every lettered tag on the sheet has a note in the margin. Click a tag to pull it into the inspector.
        </p>
      </header>

      <ol className="grid gap-x-10 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
        {ANNOTATIONS.map((annotation) => {
          const relatedActive = activeNodeId === annotation.nodeId;
          return (
            <li key={annotation.key}>
              <button
                type="button"
                onClick={() => onFocus(annotation.nodeId)}
                className="group flex w-full gap-3 text-left"
              >
                <span
                  className={cn(
                    "relative mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-mono text-[0.75rem] font-bold tracking-wide transition-all",
                    relatedActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-foreground/35 bg-background text-foreground group-hover:border-primary group-hover:text-primary"
                  )}
                >
                  {annotation.key}
                  {relatedActive ? (
                    <span aria-hidden className="absolute -inset-1 rounded-full border border-primary/40 animate-pulse" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[1rem] leading-tight text-foreground">{annotation.title}</p>
                  <p className="mt-1 text-[0.8125rem] leading-6 text-muted-foreground">{annotation.body}</p>
                  <p className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.26em] text-muted-foreground/70">
                    ↳ refers · {annotation.nodeId}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Footer — revision ledger
// ═══════════════════════════════════════════════════════════════════════════

function DocumentFooter({ scenario }: { scenario: ScenarioItinerary }) {
  return (
    <footer className="relative overflow-hidden rounded-[6px] border border-border/80 bg-gradient-to-br from-card/90 via-card/70 to-card/50 p-6">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.34em] text-muted-foreground">Revision ledger</p>
          <h3 className="mt-1 font-display text-[1.4rem] leading-tight text-foreground">
            the long record <span className="font-display-italic text-muted-foreground">of</span> this process
          </h3>

          <table className="mt-4 w-full border-collapse font-mono text-[0.7rem]">
            <thead>
              <tr className="border-b border-border/80 text-left uppercase tracking-[0.2em] text-muted-foreground/80">
                <th className="py-2 pr-3 font-medium">Rev</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Author</th>
                <th className="py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="text-foreground/85">
              {REVISIONS.map((rev, idx) => (
                <tr key={rev.rev} className={cn("border-b border-dashed border-border/50", idx === REVISIONS.length - 1 && "bg-primary/[0.03]")}>
                  <td className="py-2 pr-3 font-semibold tabular-nums">{rev.rev}</td>
                  <td className="py-2 pr-3 uppercase tracking-[0.12em] text-muted-foreground">{rev.date}</td>
                  <td className="py-2 pr-3 font-display italic">{rev.author}</td>
                  <td className="py-2 normal-case tracking-normal">{rev.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="flex min-w-[16rem] flex-col justify-between gap-4 border-l border-dashed border-border/80 pl-6">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.34em] text-muted-foreground">Verdict · this run</p>
            <p
              className={cn(
                "mt-2 font-display text-[1.9rem] leading-none",
                scenario.verdict === "resolved"
                  ? "text-[hsl(158_64%_34%)]"
                  : scenario.verdict === "escalated"
                    ? "text-destructive"
                    : "text-[hsl(38_92%_42%)]"
              )}
            >
              {scenario.verdict === "resolved" ? "resolved." : scenario.verdict === "escalated" ? "escalated." : "fast-pathed."}
            </p>
            <p className="mt-2 text-[0.8125rem] leading-6 text-muted-foreground">{scenario.outcome}</p>
          </div>
          <div className="space-y-1 font-mono text-[0.6rem] uppercase tracking-[0.26em] text-muted-foreground/80">
            <p>{`witness · m. valente`}</p>
            <p>{`countersign · r. okafor`}</p>
            <p>{`plot · sheet 01 / 01`}</p>
            <p className="pt-2 italic tracking-[0.18em] text-muted-foreground/60">— end of ordinance —</p>
          </div>
        </aside>
      </div>
    </footer>
  );
}

const REVISIONS: Array<{ rev: string; date: string; author: string; note: string }> = [
  { rev: "001", date: "2026·02·14", author: "m. valente", note: "initial filing — pools, lanes, happy-path" },
  { rev: "002", date: "2026·03·08", author: "r. okafor", note: "added auto-safe gateway and human-escalation sub-path" },
  { rev: "003", date: "2026·04·21", author: "n. wickman", note: "parallel audit added; low-severity fast-path formalised" }
];

export default BpmnAtlasPage;
