import { useEffect, useMemo, useRef, useState } from "react";
import { mockWorkflow, formatTime, type MockSeverity, type MockTurn } from "./mock-data";
import { cn } from "@/lib/utils";

const ATOM_INTERVAL_MS = 220;
const STREAM_TICK_MS = 20;
const STREAM_CHARS_PER_TICK = 3;
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
  code?: string;
  stream?: boolean;
};

const KIND_LABEL: Record<AtomKind, string> = {
  "system-prompt": "System · prompt",
  directive: "System · directive",
  memory: "System · memory",
  objective: "System · objective",
  reasoning: "Agent · reasoning",
  body: "Agent",
  "tool-call": "Agent · tool call",
  "tool-output": "Tool · output",
  observation: "Tool · observation",
  finding: "System · finding",
  sealed: "System · sealed",
};

const SEVERITY_LABEL: Record<MockSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

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
      const kind: AtomKind =
        ctx.kind === "directive" ? "directive" : ctx.kind === "memory" ? "memory" : "system-prompt";
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
        stream: true,
      });
    }

    atoms.push({
      key: `${turn.id}:body`,
      side: "left",
      kind: "body",
      label: `Step ${String(turn.step).padStart(2, "0")}`,
      body: turn.body,
      meta: formatTime(turn.createdAt),
      stream: true,
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
        stream: true,
      });
      atoms.push({
        key: `${turn.id}:tool:${tool.id}:output`,
        side: "left",
        kind: "tool-output",
        label: `${tool.name} · result`,
        body: tool.output,
        meta: tool.status,
        stream: true,
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
        meta: `Confidence ${f.confidence.toFixed(2)} · Recommendation: ${f.recommendation}`,
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

function Bubble({
  atom,
  progress,
  streaming,
}: {
  atom: Atom;
  progress: number;
  streaming: boolean;
}) {
  const isLeft = atom.side === "left";
  const showCode = atom.kind === "tool-call" && atom.code;
  const fullText = showCode ? (atom.code ?? "") : (atom.body ?? "");
  const shownText = atom.stream ? fullText.slice(0, progress) : fullText;
  const isStillStreaming = atom.stream === true && streaming && progress < fullText.length;

  const severityClass = atom.severity
    ? {
        critical: "text-destructive",
        high: "text-destructive/80",
        medium: "text-warning",
        low: "text-primary",
      }[atom.severity]
    : "";

  return (
    <div className={cn("flex w-full", isLeft ? "justify-start pr-[15%]" : "justify-end pl-[15%]")}>
      <div className="flex min-w-0 max-w-full flex-col gap-1.5">
        <div
          className={cn(
            "flex items-center gap-2 px-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground",
            isLeft ? "" : "flex-row-reverse",
          )}
        >
          <span className="text-foreground/70">{KIND_LABEL[atom.kind]}</span>
          {atom.severity ? (
            <>
              <span className="text-border">·</span>
              <span className={cn("font-semibold", severityClass)}>
                {SEVERITY_LABEL[atom.severity]}
              </span>
            </>
          ) : null}
          {atom.meta ? (
            <>
              <span className="text-border">·</span>
              <span>{atom.meta}</span>
            </>
          ) : null}
        </div>

        <div
          className={cn(
            "rounded-md border bg-card px-3.5 py-2.5",
            isLeft ? "rounded-tl-sm" : "rounded-tr-sm",
          )}
        >
          {atom.label ? (
            <div className="text-[0.82rem] font-medium leading-tight text-foreground">
              {atom.label}
            </div>
          ) : null}
          {atom.title ? (
            <div className="mt-0.5 text-[0.72rem] text-muted-foreground">{atom.title}</div>
          ) : null}
          {showCode ? (
            <pre className="mt-2 overflow-x-auto rounded-sm border bg-muted/40 px-2.5 py-1.5 font-mono text-[0.7rem] leading-5 text-foreground/85">
              {shownText}
              {isStillStreaming ? <span className="duplex-caret">▋</span> : null}
            </pre>
          ) : atom.body ? (
            <p
              className={cn(
                atom.label ? "mt-1.5" : "",
                "text-[0.8rem] leading-[1.55] text-foreground/85",
              )}
            >
              {shownText}
              {isStillStreaming ? (
                <span className="duplex-caret ml-0.5 inline-block align-baseline text-foreground/60">
                  ▋
                </span>
              ) : null}
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

  const [atomIndex, setAtomIndex] = useState(0);
  const [charProgress, setCharProgress] = useState(0);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isRunning = atomIndex < total;
  const currentAtom = atoms[atomIndex];
  const nextAtom = atoms[atomIndex + 1];

  const currentFullText = currentAtom
    ? currentAtom.kind === "tool-call" && currentAtom.code
      ? currentAtom.code
      : (currentAtom.body ?? "")
    : "";
  const currentStreaming =
    isRunning && currentAtom?.stream === true && charProgress < currentFullText.length;

  useEffect(() => {
    if (!isRunning) return;

    if (currentAtom?.stream && charProgress < currentFullText.length) {
      const t = window.setTimeout(
        () =>
          setCharProgress((p) => Math.min(p + STREAM_CHARS_PER_TICK, currentFullText.length)),
        STREAM_TICK_MS,
      );
      return () => window.clearTimeout(t);
    }

    const t = window.setTimeout(() => {
      setAtomIndex((i) => Math.min(i + 1, total));
      setCharProgress(0);
    }, ATOM_INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [isRunning, currentAtom, charProgress, currentFullText, total]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (pinnedToBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setHasNewBelow(false);
    } else {
      setHasNewBelow(true);
    }
  }, [atomIndex, charProgress, pinnedToBottom]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    setPinnedToBottom(atBottom);
    if (atBottom) setHasNewBelow(false);
  }

  function jumpToLatest() {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }

  function replay() {
    setAtomIndex(0);
    setCharProgress(0);
    setPinnedToBottom(true);
    containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }

  const visibleAtoms = atoms.slice(0, Math.min(atomIndex + 1, total));
  const leftCount = visibleAtoms.filter((a) => a.side === "left").length;
  const rightCount = visibleAtoms.filter((a) => a.side === "right").length;
  const findingCount = visibleAtoms.filter((a) => a.kind === "finding").length;
  const criticalCount = visibleAtoms.filter((a) => a.severity === "critical").length;

  const typingSide: Side | null =
    isRunning && !currentStreaming && nextAtom ? nextAtom.side : null;
  const revealedCount = Math.min(atomIndex + 1, total);

  return (
    <div className="relative flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-background text-foreground">
      <style>{`
        @keyframes duplex-in {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: none; }
        }
        .duplex-bubble { animation: duplex-in 260ms ease-out both; }
        @keyframes duplex-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
        .duplex-caret { animation: duplex-blink 900ms steps(1, end) infinite; }
        @keyframes duplex-dot { 0%, 80%, 100% { opacity: 0.25 } 40% { opacity: 1 } }
        .duplex-typing span { animation: duplex-dot 1.1s infinite; }
        .duplex-typing span:nth-child(2) { animation-delay: 0.15s; }
        .duplex-typing span:nth-child(3) { animation-delay: 0.3s; }
      `}</style>

      <header className="flex flex-none items-center justify-between border-b px-6 py-3">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">
            Workflow · duplex trace
          </p>
          <h1 className="mt-1 text-[1.05rem] font-semibold leading-tight tracking-tight text-foreground">
            {mockWorkflow.name}
          </h1>
          <p className="mt-0.5 font-mono text-[0.68rem] text-muted-foreground">
            {mockWorkflow.target} · {mockWorkflow.agentName}
          </p>
        </div>
        <div className="flex items-center gap-5 font-mono text-[0.64rem] text-muted-foreground">
          <span>
            <span className="text-foreground">{leftCount}</span> agent
          </span>
          <span>
            <span className="text-foreground">{rightCount}</span> system
          </span>
          <span>
            <span className="text-foreground">{findingCount}</span> findings
          </span>
          {criticalCount > 0 ? (
            <span className="text-destructive">
              <span>{criticalCount}</span> critical
            </span>
          ) : null}
        </div>
      </header>

      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[56rem] px-6 py-8">
          <div className="space-y-3.5">
            {visibleAtoms.map((atom, i) => {
              const isCurrent = i === atomIndex;
              const full =
                atom.kind === "tool-call" && atom.code ? atom.code : (atom.body ?? "");
              const progress = isCurrent ? charProgress : full.length;
              return (
                <div key={atom.key} className="duplex-bubble">
                  <Bubble
                    atom={atom}
                    progress={progress}
                    streaming={isCurrent && currentStreaming}
                  />
                </div>
              );
            })}

            {typingSide ? (
              <div
                className={cn(
                  "flex w-full",
                  typingSide === "left" ? "justify-start pr-[15%]" : "justify-end pl-[15%]",
                )}
              >
                <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 font-mono text-[0.64rem] text-muted-foreground">
                  <span>{typingSide === "left" ? "Agent typing" : "System registering"}</span>
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

      <div className="flex flex-none items-center justify-between border-t px-6 py-2 font-mono text-[0.64rem] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{isRunning ? "Streaming" : "Sealed"}</span>
          <span>
            {revealedCount} / {total}
          </span>
          <span>{pinnedToBottom ? "Following" : "Paused — scroll to resume"}</span>
        </div>
        <button
          type="button"
          onClick={replay}
          className="rounded border px-2 py-1 text-[0.62rem] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          Replay
        </button>
      </div>

      {hasNewBelow ? (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-14 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 font-mono text-[0.64rem] text-foreground shadow-sm backdrop-blur transition hover:bg-muted/40"
        >
          ↓ New messages
        </button>
      ) : null}
    </div>
  );
}
