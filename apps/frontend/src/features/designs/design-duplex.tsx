import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { mockWorkflow, formatTime, type MockSeverity, type MockTurn } from "./mock-data";
import { cn } from "@/shared/lib/utils";

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
  toolOutput?: string;
  toolObservations?: string[];
  toolStatus?: string;
  toolDurationMs?: number;
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

const KIND_ACCENT: Record<AtomKind, { label: string; border: string; dot: string; bg: string }> = {
  "system-prompt": { label: "text-primary", border: "border-primary/30", dot: "bg-primary", bg: "" },
  directive:      { label: "text-primary", border: "border-primary/30", dot: "bg-primary", bg: "" },
  memory:         { label: "text-primary/80", border: "border-primary/25", dot: "bg-primary/80", bg: "" },
  objective:      { label: "text-primary", border: "border-primary/30", dot: "bg-primary", bg: "" },
  reasoning:      { label: "text-muted-foreground", border: "border-border", dot: "bg-muted-foreground", bg: "bg-muted/30" },
  body:           { label: "text-foreground/70", border: "border-border", dot: "bg-foreground/50", bg: "" },
  "tool-call":    { label: "text-warning", border: "border-warning/35", dot: "bg-warning", bg: "" },
  "tool-output":  { label: "text-success", border: "border-success/35", dot: "bg-success", bg: "" },
  observation:    { label: "text-success/80", border: "border-success/25", dot: "bg-success/80", bg: "" },
  finding:        { label: "text-destructive", border: "border-destructive/40", dot: "bg-destructive", bg: "" },
  sealed:         { label: "text-muted-foreground", border: "border-border", dot: "bg-muted-foreground", bg: "bg-muted/20" },
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
        key: `${turn.id}:tool:${tool.id}`,
        side: "left",
        kind: "tool-call",
        label: tool.name,
        title: tool.callTitle,
        code: tool.input,
        meta: `${tool.durationMs}ms`,
        stream: true,
        toolOutput: tool.output,
        toolObservations: tool.observations,
        toolStatus: tool.status,
        toolDurationMs: tool.durationMs,
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
  const [outputOpen, setOutputOpen] = useState(false);
  const isLeft = atom.side === "left";
  const showCode = atom.kind === "tool-call" && atom.code;
  const fullText = showCode ? (atom.code ?? "") : (atom.body ?? "");
  const shownText = atom.stream ? fullText.slice(0, progress) : fullText;
  const isStillStreaming = atom.stream === true && streaming && progress < fullText.length;
  const isTool = atom.kind === "tool-call";
  const toolReady = isTool && !isStillStreaming;

  const severityClass = atom.severity
    ? {
        critical: "text-destructive",
        high: "text-destructive/80",
        medium: "text-warning",
        low: "text-primary",
      }[atom.severity]
    : "";

  const accent = KIND_ACCENT[atom.kind];
  const borderClass = atom.severity
    ? atom.severity === "medium"
      ? "border-warning/40"
      : atom.severity === "low"
        ? "border-primary/40"
        : "border-destructive/45"
    : accent.border;

  return (
    <div className={cn("flex w-full", isLeft ? "justify-start pr-[15%]" : "justify-end pl-[15%]")}>
      <div
        className={cn(
          "flex min-w-0 max-w-full flex-col gap-1.5",
          isTool ? "w-[32rem]" : "",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground",
            isLeft ? "" : "flex-row-reverse",
          )}
        >
          <span className={cn("inline-flex items-center gap-1.5 font-semibold", accent.label)}>
            <span className={cn("h-1 w-1 rounded-full", accent.dot)} />
            {KIND_LABEL[atom.kind]}
          </span>
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
            borderClass,
            accent.bg,
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
          ) : null}

          {isTool ? (
            <div className="mt-2 flex items-center gap-2 font-mono text-[0.62rem] text-muted-foreground">
              {isStillStreaming ? (
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <span className="relative inline-flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning/50" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
                  </span>
                  Running
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                  Completed
                </span>
              )}
              {atom.toolDurationMs ? <span>· {atom.toolDurationMs}ms</span> : null}
              {toolReady && atom.toolObservations && atom.toolObservations.length > 0 ? (
                <span>· {atom.toolObservations.length} observation{atom.toolObservations.length === 1 ? "" : "s"}</span>
              ) : null}
              {toolReady && atom.toolOutput ? (
                <button
                  type="button"
                  onClick={() => setOutputOpen((v) => !v)}
                  aria-expanded={outputOpen}
                  className={cn(
                    "ml-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-wider transition-colors",
                    outputOpen
                      ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
                      : "border-border bg-muted/40 text-foreground hover:bg-muted/60 hover:border-foreground/30",
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform",
                      outputOpen ? "rotate-90" : "",
                    )}
                  />
                  {outputOpen ? "Hide output" : "Show output"}
                </button>
              ) : null}
            </div>
          ) : null}

          {isTool && toolReady && outputOpen ? (
            <div className="mt-2 space-y-2 border-t pt-2">
              {atom.toolOutput ? (
                <div>
                  <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">
                    Output
                  </div>
                  <p className="mt-1 font-mono text-[0.7rem] leading-[1.55] text-foreground/85">
                    {atom.toolOutput}
                  </p>
                </div>
              ) : null}
              {atom.toolObservations && atom.toolObservations.length > 0 ? (
                <div>
                  <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">
                    Observations
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {atom.toolObservations.map((obs, i) => (
                      <li
                        key={i}
                        className="grid grid-cols-[10px_1fr] gap-1.5 text-[0.76rem] leading-[1.5] text-foreground/85"
                      >
                        <span className="text-success">+</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {!showCode && atom.body ? (
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

  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (pinnedToBottom) {
      el.scrollTop = el.scrollHeight;
      lastScrollTopRef.current = el.scrollTop;
      setHasNewBelow(false);
    } else {
      setHasNewBelow(true);
    }
  }, [atomIndex, charProgress, pinnedToBottom]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const currentTop = el.scrollTop;
    const atBottom = el.scrollHeight - currentTop - el.clientHeight < NEAR_BOTTOM_PX;
    const scrolledUp = currentTop < lastScrollTopRef.current - 1;
    lastScrollTopRef.current = currentTop;

    if (atBottom) {
      setPinnedToBottom(true);
      setHasNewBelow(false);
    } else if (scrolledUp) {
      setPinnedToBottom(false);
    }
  }

  function jumpToLatest() {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    lastScrollTopRef.current = el.scrollTop;
    setPinnedToBottom(true);
    setHasNewBelow(false);
  }

  const visibleAtoms = atoms.slice(0, Math.min(atomIndex + 1, total));

  const typingSide: Side | null =
    isRunning && !currentStreaming && nextAtom ? nextAtom.side : null;

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
