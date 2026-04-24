import { useEffect, useMemo, useRef, useState } from "react";
import { mockWorkflow, formatTime, type MockSeverity, type MockTurn } from "./mock-data";

const ATOM_INTERVAL_MS = 280;
const NEAR_BOTTOM_PX = 140;

type Side = "left" | "right";

type AtomKind =
  | "system-prompt"
  | "directive"
  | "memory"
  | "objective"
  | "reasoning"
  | "body"
  | "tool-call"
  | "tool-output"
  | "observation"
  | "finding"
  | "sealed";

type Atom = {
  key: string;
  side: Side;
  kind: AtomKind;
  label: string;
  title?: string;
  body?: string;
  meta?: string;
  severity?: MockSeverity;
  status?: "scanning" | "completed";
  code?: string;
};

const KIND_STROKE: Record<AtomKind, string> = {
  "system-prompt": "#3b82f6",
  directive: "#06b6d4",
  memory: "#a855f7",
  objective: "#3b82f6",
  reasoning: "#64748b",
  body: "#cbd5e1",
  "tool-call": "#f97316",
  "tool-output": "#22c55e",
  observation: "#eab308",
  finding: "#ef4444",
  sealed: "#475569",
};

const KIND_FILL: Record<AtomKind, string> = {
  "system-prompt": "#1e3a5f",
  directive: "#164e63",
  memory: "#3b0764",
  objective: "#1e3a5f",
  reasoning: "#0f172a",
  body: "#0d1117",
  "tool-call": "#431407",
  "tool-output": "#14532d",
  observation: "#422006",
  finding: "#450a0a",
  sealed: "#111827",
};

const KIND_LABEL: Record<AtomKind, string> = {
  "system-prompt": "system · context",
  directive: "system · directive",
  memory: "system · memory",
  objective: "system · objective",
  reasoning: "agent · reasoning",
  body: "agent",
  "tool-call": "agent · tool call",
  "tool-output": "tool · output",
  observation: "tool · observation",
  finding: "system · finding",
  sealed: "system · sealed",
};

const SEVERITY_COLOR: Record<MockSeverity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (!matches || matches.length === 0) return [text];
  return matches.map((s) => s.trim()).filter(Boolean);
}

function buildAtoms(turns: MockTurn[]): Atom[] {
  const atoms: Atom[] = [];

  atoms.push({
    key: "preamble:objective",
    side: "right",
    kind: "objective",
    label: "Objective",
    body: mockWorkflow.objective,
    meta: mockWorkflow.target,
  });
  atoms.push({
    key: "preamble:system",
    side: "right",
    kind: "system-prompt",
    label: "System prompt",
    body: mockWorkflow.systemPrompt,
    meta: mockWorkflow.agentName,
  });

  for (const turn of turns) {
    for (const ctx of turn.promptContexts) {
      const kind: AtomKind = ctx.kind === "directive" ? "directive" : ctx.kind === "memory" ? "memory" : "system-prompt";
      atoms.push({
        key: `${turn.id}:ctx:${ctx.id}`,
        side: "right",
        kind,
        label: ctx.title,
        body: ctx.body,
        meta: formatTime(turn.createdAt),
      });
    }

    if (turn.reasoning) {
      atoms.push({
        key: `${turn.id}:reasoning`,
        side: "left",
        kind: "reasoning",
        label: "Reasoning",
        body: turn.reasoning,
        meta: turn.agentName,
      });
    }

    const sentences = splitSentences(turn.body);
    sentences.forEach((sentence, i) => {
      atoms.push({
        key: `${turn.id}:body:${i}`,
        side: "left",
        kind: "body",
        label: i === 0 ? `Step ${String(turn.step).padStart(2, "0")}` : "",
        body: sentence,
        ...(i === 0 ? { meta: formatTime(turn.createdAt) } : {}),
      });
    });

    for (const tool of turn.tools) {
      atoms.push({
        key: `${turn.id}:tool:${tool.id}:call`,
        side: "left",
        kind: "tool-call",
        label: tool.name,
        title: tool.callTitle,
        code: tool.input,
        meta: `${tool.durationMs}ms`,
        status: "scanning",
      });
      atoms.push({
        key: `${turn.id}:tool:${tool.id}:output`,
        side: "left",
        kind: "tool-output",
        label: `${tool.name} → result`,
        body: tool.output,
        meta: tool.status,
        status: "completed",
      });
      tool.observations.forEach((obs, i) => {
        atoms.push({
          key: `${turn.id}:tool:${tool.id}:obs:${i}`,
          side: "left",
          kind: "observation",
          label: "Observation",
          body: obs,
        });
      });
    }

    for (const f of turn.findings) {
      atoms.push({
        key: `${turn.id}:finding:${f.id}`,
        side: "right",
        kind: "finding",
        label: f.title,
        title: f.host,
        body: f.impact,
        meta: `conf ${f.confidence.toFixed(2)} · fix: ${f.recommendation}`,
        severity: f.severity,
      });
    }
  }

  atoms.push({
    key: "sealed:final",
    side: "right",
    kind: "sealed",
    label: "Run sealed",
    body: "Ledger frozen. Evidence hashes recorded.",
  });

  return atoms;
}

function Bubble({ atom }: { atom: Atom }) {
  const stroke = atom.severity ? SEVERITY_COLOR[atom.severity] : KIND_STROKE[atom.kind];
  const fill = KIND_FILL[atom.kind];
  const isLeft = atom.side === "left";
  const showCode = atom.kind === "tool-call" && atom.code;

  return (
    <div className={`flex w-full ${isLeft ? "justify-start pr-[18%]" : "justify-end pl-[18%]"}`}>
      <div className="flex max-w-full flex-col gap-1">
        <div
          className={`flex items-center gap-2 px-1 font-mono text-[0.56rem] uppercase tracking-wider text-slate-500 ${
            isLeft ? "" : "flex-row-reverse"
          }`}
        >
          <span
            className="rounded border px-1.5 py-0.5 font-semibold"
            style={{ background: fill, color: stroke, borderColor: stroke + "66" }}
          >
            {KIND_LABEL[atom.kind]}
          </span>
          {atom.severity ? (
            <span
              className="rounded px-1.5 py-0.5 font-bold"
              style={{ background: SEVERITY_COLOR[atom.severity], color: "#0d1117" }}
            >
              {atom.severity}
            </span>
          ) : null}
          {atom.status === "scanning" ? (
            <span className="relative inline-flex h-1.5 w-1.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full"
                style={{ background: "#f59e0b", opacity: 0.7 }}
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "#f59e0b" }} />
            </span>
          ) : null}
          {atom.meta ? <span className="text-slate-600">{atom.meta}</span> : null}
        </div>

        <div
          className={`rounded-lg border px-3 py-2 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.8)] ${
            isLeft ? "rounded-tl-sm" : "rounded-tr-sm"
          }`}
          style={{
            background: "#0d1117",
            borderColor: stroke + "55",
          }}
        >
          {atom.label ? (
            <div className="text-[0.82rem] font-semibold leading-tight text-slate-100">{atom.label}</div>
          ) : null}
          {atom.title ? (
            <div className="mt-0.5 font-mono text-[0.62rem] text-slate-400">{atom.title}</div>
          ) : null}
          {showCode ? (
            <pre
              className="mt-1.5 overflow-x-auto rounded-sm border px-2 py-1 font-mono text-[0.66rem] leading-5 text-emerald-300"
              style={{ background: "#020617", borderColor: "#0f172a" }}
            >
              {atom.code}
            </pre>
          ) : atom.body ? (
            <p
              className={`${atom.label ? "mt-1.5" : ""} text-[0.78rem] leading-[1.55] text-slate-200`}
            >
              {atom.body}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DesignDuplex() {
  const atoms = useMemo(() => buildAtoms(mockWorkflow.turns), []);
  const total = atoms.length;

  const [revealed, setRevealed] = useState(1);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isRunning = revealed < total;
  const currentAtom = atoms[revealed - 1];
  const nextAtom = atoms[revealed];

  useEffect(() => {
    if (revealed >= total) return;
    const t = window.setTimeout(() => setRevealed((v) => Math.min(v + 1, total)), ATOM_INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [revealed, total]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (pinnedToBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setHasNewBelow(false);
    } else {
      setHasNewBelow(true);
    }
  }, [revealed, pinnedToBottom]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    setPinnedToBottom(atBottom);
    if (atBottom) setHasNewBelow(false);
  }

  function jumpToLatest() {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }

  function replay() {
    setRevealed(1);
    setPinnedToBottom(true);
    containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }

  const visibleAtoms = atoms.slice(0, revealed);
  const leftCount = visibleAtoms.filter((a) => a.side === "left").length;
  const rightCount = visibleAtoms.filter((a) => a.side === "right").length;
  const findingCount = visibleAtoms.filter((a) => a.kind === "finding").length;
  const criticalCount = visibleAtoms.filter((a) => a.severity === "critical").length;

  const typingSide: Side | null = isRunning && nextAtom ? nextAtom.side : null;

  return (
    <div
      className="relative flex h-[calc(100vh-4rem)] min-h-0 flex-col"
      style={{ background: "#070b15", color: "#e2e8f0" }}
    >
      <style>{`
        @keyframes duplex-pop-left {
          from { opacity: 0; transform: translate(-6px, 4px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes duplex-pop-right {
          from { opacity: 0; transform: translate(6px, 4px); }
          to   { opacity: 1; transform: none; }
        }
        .duplex-bubble-left  { animation: duplex-pop-left  360ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }
        .duplex-bubble-right { animation: duplex-pop-right 360ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }
        @keyframes duplex-dot { 0%, 80%, 100% { opacity: 0.2 } 40% { opacity: 1 } }
        .duplex-typing span { animation: duplex-dot 1.1s infinite; }
        .duplex-typing span:nth-child(2) { animation-delay: 0.15s; }
        .duplex-typing span:nth-child(3) { animation-delay: 0.3s; }
      `}</style>

      <header
        className="flex flex-none items-center justify-between border-b px-6 py-3"
        style={{ borderColor: "#0f172a", background: "#0d1117" }}
      >
        <div>
          <p className="font-mono text-[0.56rem] uppercase tracking-[0.24em] text-slate-500">
            Workflow · duplex chat · system ↔ agent
          </p>
          <h1 className="mt-0.5 text-[1.1rem] font-semibold leading-tight tracking-tight text-slate-100">
            {mockWorkflow.name}
          </h1>
          <p className="mt-0.5 font-mono text-[0.66rem] text-slate-500">
            {mockWorkflow.target} · {mockWorkflow.agentName}
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono text-[0.62rem] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3b82f6" }} />
            <span className="text-slate-100">{leftCount}</span> system
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#f97316" }} />
            <span className="text-slate-100">{rightCount}</span> agent
          </span>
          <span>
            <span className="text-slate-100">{findingCount}</span> findings
          </span>
          {criticalCount > 0 ? <span style={{ color: "#ef4444" }}>{criticalCount} critical</span> : null}
        </div>
      </header>

      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[56rem] px-6 py-8">
          <div className="space-y-4">
            {visibleAtoms.map((atom) => (
              <div
                key={atom.key}
                className={atom.side === "left" ? "duplex-bubble-left" : "duplex-bubble-right"}
              >
                <Bubble atom={atom} />
              </div>
            ))}

            {typingSide ? (
              <div className={`flex w-full ${typingSide === "left" ? "justify-start pr-[18%]" : "justify-end pl-[18%]"}`}>
                <div
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[0.62rem] text-slate-500"
                  style={{ background: "#0d1117", borderColor: "#1e293b" }}
                >
                  <span>{typingSide === "left" ? "system registering" : "agent typing"}</span>
                  <span className="duplex-typing inline-flex items-center gap-0.5">
                    <span>•</span>
                    <span>•</span>
                    <span>•</span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="flex flex-none items-center justify-between border-t px-6 py-2 font-mono text-[0.62rem]"
        style={{ borderColor: "#0f172a", background: "#0d1117", color: "#94a3b8" }}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: isRunning ? "#f59e0b" : "#22c55e" }} />
            {isRunning ? "Streaming" : "Sealed"}
          </span>
          <span>
            {revealed} / {total} atoms
          </span>
          <span>{currentAtom ? KIND_LABEL[currentAtom.kind] : ""}</span>
          <span>{pinnedToBottom ? "Following" : "Paused — scroll to resume"}</span>
        </div>
        <button
          type="button"
          onClick={replay}
          className="rounded border px-2 py-1 text-[0.6rem] uppercase tracking-wider transition-colors"
          style={{ borderColor: "#1e293b", color: "#94a3b8" }}
        >
          Replay
        </button>
      </div>

      {hasNewBelow ? (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-14 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[0.62rem] backdrop-blur"
          style={{ borderColor: "#1e293b", background: "#0d1117ee", color: "#e2e8f0" }}
        >
          ↓ new messages below
        </button>
      ) : null}
    </div>
  );
}
