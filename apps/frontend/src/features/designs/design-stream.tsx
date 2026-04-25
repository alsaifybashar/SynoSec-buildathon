import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, Radio, RotateCcw, Terminal } from "lucide-react";
import { mockWorkflow, formatTime, type MockSeverity, type MockTurn } from "./mock-data";
import { cn } from "@/shared/lib/utils";

const ATOM_INTERVAL_MS = 260;
const NEAR_BOTTOM_PX = 120;

const sevBg: Record<MockSeverity, string> = {
  critical: "bg-destructive",
  high: "bg-destructive/80",
  medium: "bg-warning",
  low: "bg-primary",
};

const sevDot: Record<MockSeverity, string> = {
  critical: "bg-destructive",
  high: "bg-destructive/80",
  medium: "bg-warning",
  low: "bg-primary",
};

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (!matches || matches.length === 0) return [text];
  return matches.map((s) => s.trim()).filter(Boolean);
}

type AtomKey = string;

function buildAtomTimeline(turns: MockTurn[]): AtomKey[] {
  const keys: AtomKey[] = [];
  for (const turn of turns) {
    keys.push(`${turn.id}:meta`);
    for (const ctx of turn.promptContexts) {
      keys.push(`${turn.id}:ctx:${ctx.id}`);
    }
    if (turn.reasoning) keys.push(`${turn.id}:reasoning`);
    const sentences = splitSentences(turn.body);
    sentences.forEach((_, i) => keys.push(`${turn.id}:body:${i}`));
    for (const tool of turn.tools) {
      keys.push(`${turn.id}:tool:${tool.id}:head`);
      keys.push(`${turn.id}:tool:${tool.id}:input`);
      keys.push(`${turn.id}:tool:${tool.id}:output`);
      tool.observations.forEach((_, i) => keys.push(`${turn.id}:tool:${tool.id}:obs:${i}`));
    }
    for (const f of turn.findings) {
      keys.push(`${turn.id}:finding:${f.id}`);
    }
  }
  return keys;
}

function Atom({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("stream-atom", className)}>{children}</div>;
}

function TurnMeta({ turn, toolsRevealed, findingsRevealed }: { turn: MockTurn; toolsRevealed: number; findingsRevealed: number }) {
  return (
    <aside className="sticky top-6 self-start text-right">
      <p className="font-mono text-[2rem] font-semibold leading-none text-foreground/20">
        {String(turn.step).padStart(2, "0")}
      </p>
      <p className="mt-2 font-mono text-[0.6rem] text-muted-foreground">{formatTime(turn.createdAt)}</p>
      <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{turn.agentName}</p>
      <div className="mt-3 space-y-0.5 font-mono text-[0.58rem] text-muted-foreground">
        <p>
          <span className="text-foreground/70">{turn.usage.input}</span> in
        </p>
        <p>
          <span className="text-foreground/70">{turn.usage.output}</span> out
        </p>
      </div>
      {turn.tools.length > 0 ? (
        <p className="mt-3 font-mono text-[0.58rem] text-muted-foreground">
          <span className="text-foreground/70">
            {toolsRevealed} / {turn.tools.length}
          </span>{" "}
          tools
        </p>
      ) : null}
      {turn.findings.length > 0 ? (
        <p className="mt-1 font-mono text-[0.58rem] text-muted-foreground">
          <span className="text-foreground/70">
            {findingsRevealed} / {turn.findings.length}
          </span>{" "}
          findings
        </p>
      ) : null}
    </aside>
  );
}

function ToolStream({
  turnId,
  tool,
  isVisible,
}: {
  turnId: string;
  tool: MockTurn["tools"][number];
  isVisible: (k: AtomKey) => boolean;
}) {
  const headerVis = isVisible(`${turnId}:tool:${tool.id}:head`);
  if (!headerVis) return null;
  const inputVis = isVisible(`${turnId}:tool:${tool.id}:input`);
  const outputVis = isVisible(`${turnId}:tool:${tool.id}:output`);

  return (
    <Atom className="my-3">
      <div className="border-l-2 border-l-primary/60 pl-3">
        <div className="flex flex-wrap items-center gap-2">
          <Terminal className="h-3 w-3 text-primary" />
          <span className="font-mono text-[0.72rem] font-medium text-foreground">{tool.name}</span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.54rem] uppercase tracking-wider text-primary">
            {tool.status}
          </span>
          <span className="ml-auto font-mono text-[0.56rem] text-muted-foreground">{tool.durationMs}ms</span>
        </div>
        <p className="mt-0.5 text-[0.8rem] leading-[1.5] text-foreground/85">{tool.callTitle}</p>

        {inputVis ? (
          <Atom>
            <pre className="mt-1.5 overflow-x-auto rounded-sm bg-muted/40 px-2 py-1 font-mono text-[0.68rem] leading-5 text-foreground/80">
              {tool.input}
            </pre>
          </Atom>
        ) : null}

        {outputVis ? (
          <Atom>
            <p className="mt-1.5 font-mono text-[0.7rem] leading-[1.55] text-foreground/85">{tool.output}</p>
          </Atom>
        ) : null}

        {tool.observations.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {tool.observations.map((obs, i) =>
              isVisible(`${turnId}:tool:${tool.id}:obs:${i}`) ? (
                <Atom key={obs}>
                  <li className="grid grid-cols-[12px_1fr] gap-1 text-[0.76rem] text-foreground/85">
                    <span className="text-primary">+</span>
                    <span>{obs}</span>
                  </li>
                </Atom>
              ) : null,
            )}
          </ul>
        ) : null}
      </div>
    </Atom>
  );
}

function FindingPill({ finding }: { finding: MockTurn["findings"][number] }) {
  return (
    <div className="my-3 rounded-sm border border-border/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", sevDot[finding.severity])} />
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[0.54rem] uppercase tracking-wider text-white",
            sevBg[finding.severity],
          )}
        >
          {finding.severity}
        </span>
        <span className="text-[0.8rem] font-medium text-foreground">{finding.title}</span>
        <AlertTriangle className="h-3 w-3 text-destructive" />
        <span className="ml-auto font-mono text-[0.56rem] text-muted-foreground">
          conf {finding.confidence.toFixed(2)}
        </span>
      </div>
      <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground">{finding.host}</p>
      <p className="mt-1.5 text-[0.78rem] leading-[1.5] text-foreground/80">{finding.impact}</p>
      <p className="mt-1 text-[0.75rem] leading-[1.5] text-muted-foreground">
        <span className="font-medium text-foreground">Fix — </span>
        {finding.recommendation}
      </p>
    </div>
  );
}

function TurnSection({
  turn,
  isVisible,
}: {
  turn: MockTurn;
  isVisible: (k: AtomKey) => boolean;
}) {
  const metaVisible = isVisible(`${turn.id}:meta`);
  if (!metaVisible) return null;

  const sentences = splitSentences(turn.body);
  const toolsRevealed = turn.tools.filter((t) => isVisible(`${turn.id}:tool:${t.id}:head`)).length;
  const findingsRevealed = turn.findings.filter((f) => isVisible(`${turn.id}:finding:${f.id}`)).length;

  return (
    <section className="grid grid-cols-[7rem_minmax(0,1fr)] gap-6 border-t border-border/40 py-6 first:border-t-0 first:pt-3">
      <TurnMeta turn={turn} toolsRevealed={toolsRevealed} findingsRevealed={findingsRevealed} />

      <div className="min-w-0">
        {turn.promptContexts.map((ctx) =>
          isVisible(`${turn.id}:ctx:${ctx.id}`) ? (
            <Atom key={ctx.id} className="mb-2">
              <div className="rounded-sm border border-dashed border-border/60 bg-muted/30 px-3 py-2">
                <p className="font-mono text-[0.54rem] uppercase tracking-wider text-muted-foreground">
                  {ctx.kind} · {ctx.title}
                </p>
                <p className="mt-0.5 text-[0.78rem] leading-[1.5] text-foreground/85">{ctx.body}</p>
              </div>
            </Atom>
          ) : null,
        )}

        <div className="text-[0.9rem] leading-[1.7] text-foreground">
          {sentences.map((sentence, i) =>
            isVisible(`${turn.id}:body:${i}`) ? (
              <Atom key={i} className="inline">
                <span>{sentence} </span>
              </Atom>
            ) : null,
          )}
        </div>

        {turn.reasoning && isVisible(`${turn.id}:reasoning`) ? (
          <Atom>
            <details className="mt-2 border-l-2 border-l-border bg-muted/20 px-3 py-1.5">
              <summary className="cursor-pointer font-mono text-[0.56rem] uppercase tracking-wider text-muted-foreground">
                Reasoning
              </summary>
              <p className="mt-1 text-[0.8rem] italic leading-[1.6] text-foreground/80">{turn.reasoning}</p>
            </details>
          </Atom>
        ) : null}

        {turn.tools.map((tool) => (
          <ToolStream key={tool.id} turnId={turn.id} tool={tool} isVisible={isVisible} />
        ))}

        {turn.findings.map((f) =>
          isVisible(`${turn.id}:finding:${f.id}`) ? (
            <Atom key={f.id}>
              <FindingPill finding={f} />
            </Atom>
          ) : null,
        )}
      </div>
    </section>
  );
}

export function DesignStream() {
  const atomKeys = useMemo(() => buildAtomTimeline(mockWorkflow.turns), []);
  const atomIndexByKey = useMemo(() => {
    const m = new Map<AtomKey, number>();
    atomKeys.forEach((k, i) => m.set(k, i));
    return m;
  }, [atomKeys]);

  const [revealed, setRevealed] = useState(1);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = atomKeys.length;
  const isRunning = revealed < total;

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
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  function replay() {
    setRevealed(1);
    setPinnedToBottom(true);
    containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }

  function isVisible(key: AtomKey) {
    const idx = atomIndexByKey.get(key);
    return idx !== undefined && revealed > idx;
  }

  const visibleTurnCount = mockWorkflow.turns.filter((t) => isVisible(`${t.id}:meta`)).length;

  return (
    <div className="relative flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-background text-foreground">
      <style>{`
        @keyframes stream-in {
          from { opacity: 0; transform: translateY(2px); filter: blur(0.5px); }
          to   { opacity: 1; transform: none; filter: none; }
        }
        .stream-atom {
          animation: stream-in 480ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
      `}</style>

      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[52rem] px-6 py-10">
          <header>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-muted-foreground">
              Workflow · streaming trace
            </p>
            <h1 className="mt-2 text-[1.6rem] font-semibold leading-tight tracking-tight text-foreground">
              {mockWorkflow.name}
            </h1>
            <p className="mt-1 font-mono text-[0.7rem] text-muted-foreground">
              {mockWorkflow.target} · {mockWorkflow.agentName}
            </p>
          </header>

          <section className="mt-6 grid grid-cols-[7rem_minmax(0,1fr)] gap-6 border-t border-border/40 pt-6">
            <aside className="text-right">
              <p className="font-mono text-[2rem] font-semibold leading-none text-foreground/20">00</p>
              <p className="mt-2 font-mono text-[0.6rem] text-muted-foreground">Preamble</p>
            </aside>
            <div className="min-w-0">
              <p className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">Objective</p>
              <p className="mt-1 text-[0.9rem] leading-[1.7] text-foreground">{mockWorkflow.objective}</p>
              <p className="mt-4 font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">
                System prompt
              </p>
              <p className="mt-1 text-[0.82rem] leading-[1.7] text-foreground/85">{mockWorkflow.systemPrompt}</p>
            </div>
          </section>

          <div className="mt-2">
            {mockWorkflow.turns.map((turn) => (
              <TurnSection key={turn.id} turn={turn} isVisible={isVisible} />
            ))}

            {isRunning ? (
              <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-6 border-t border-border/40 py-6">
                <aside className="text-right">
                  <p className="font-mono text-[2rem] font-semibold leading-none text-foreground/10">
                    {String(visibleTurnCount + 1).padStart(2, "0")}
                  </p>
                </aside>
                <div className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
                  <span className="relative inline-flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  <span className="font-mono text-[0.68rem]">streaming…</span>
                  <span className="ml-auto font-mono text-[0.62rem]">
                    {revealed} / {total} atoms
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 bg-card/50 px-6 py-2">
        <div className="flex items-center gap-3 font-mono text-[0.64rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Radio className={cn("h-3 w-3", isRunning ? "text-primary" : "text-muted-foreground")} />
            {isRunning ? "Streaming" : "Sealed"}
          </span>
          <span>
            {visibleTurnCount} / {mockWorkflow.turns.length} turns
          </span>
          <span>{pinnedToBottom ? "Following" : "Paused — scroll to resume"}</span>
        </div>
        <button
          type="button"
          onClick={replay}
          className="inline-flex items-center gap-1.5 rounded border border-border/60 px-2 py-1 font-mono text-[0.62rem] text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Replay
        </button>
      </div>

      {hasNewBelow ? (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-14 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/70 bg-background/95 px-3 py-1.5 font-mono text-[0.66rem] text-foreground shadow-[0_4px_16px_-4px_hsl(var(--foreground)/0.2)] backdrop-blur transition hover:bg-accent/40"
        >
          <ArrowDown className="h-3 w-3 text-primary" />
          New content below
        </button>
      ) : null}
    </div>
  );
}
