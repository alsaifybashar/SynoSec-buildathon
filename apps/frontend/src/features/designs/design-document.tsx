import { useEffect, useRef, useState } from "react";
import { ArrowDown, Bot, Terminal, AlertTriangle, FileText, Radio, RotateCcw } from "lucide-react";
import { mockWorkflow, formatTime, type MockSeverity, type MockTurn } from "./mock-data";
import { cn } from "@/shared/lib/utils";

const REVEAL_INTERVAL_MS = 3_500;
const NEAR_BOTTOM_PX = 80;

const sevBg: Record<MockSeverity, string> = {
  critical: "bg-destructive",
  high: "bg-destructive/80",
  medium: "bg-warning",
  low: "bg-primary",
};

const sevBorder: Record<MockSeverity, string> = {
  critical: "border-l-destructive",
  high: "border-l-destructive/70",
  medium: "border-l-warning",
  low: "border-l-primary",
};

function ToolCallout({ tool }: { tool: MockTurn["tools"][number] }) {
  return (
    <figure className="my-4 rounded-sm border-l-2 border-l-primary/60 bg-muted/30 px-4 py-3">
      <figcaption className="flex items-center gap-2 pb-2">
        <Terminal className="h-3 w-3 text-primary" />
        <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-muted-foreground">Tool call</span>
        <span className="font-mono text-[0.76rem] font-medium text-foreground">{tool.name}</span>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-primary">
          {tool.status}
        </span>
        <span className="ml-auto font-mono text-[0.58rem] text-muted-foreground">{tool.durationMs}ms</span>
      </figcaption>
      <p className="text-[0.82rem] leading-[1.55] text-foreground/90">{tool.callTitle}</p>
      <pre className="mt-2 overflow-x-auto rounded bg-background px-3 py-2 font-mono text-[0.7rem] leading-5 text-foreground/80">
        {tool.input}
      </pre>
      <p className="mt-2 font-mono text-[0.72rem] leading-[1.55] text-foreground/85">{tool.output}</p>
      {tool.observations.length > 0 ? (
        <ul className="mt-2 space-y-0.5 border-t border-border/40 pt-2">
          {tool.observations.map((obs) => (
            <li key={obs} className="grid grid-cols-[12px_1fr] gap-1 text-[0.78rem] text-foreground/85">
              <span className="text-primary">+</span>
              <span>{obs}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}

function FindingCallout({ finding }: { finding: MockTurn["findings"][number] }) {
  return (
    <aside
      className={cn(
        "my-5 rounded-sm border border-border/70 border-l-[3px] bg-card px-4 py-3 shadow-[0_1px_0_hsl(var(--foreground)/0.03)]",
        sevBorder[finding.severity],
      )}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-2">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-white",
            sevBg[finding.severity],
          )}
        >
          {finding.severity}
        </span>
        <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-muted-foreground">Finding</span>
        <span className="font-mono text-[0.58rem] text-muted-foreground">conf {finding.confidence.toFixed(2)}</span>
        <span className="ml-auto font-mono text-[0.58rem] text-muted-foreground">{finding.host}</span>
      </header>
      <h3 className="mt-2 text-[0.95rem] font-semibold leading-[1.35] text-foreground">{finding.title}</h3>
      <p className="mt-2 text-[0.84rem] leading-[1.6] text-foreground/90">{finding.impact}</p>
      <p className="mt-2 text-[0.82rem] leading-[1.6] text-muted-foreground">
        <span className="font-medium text-foreground">Recommendation — </span>
        {finding.recommendation}
      </p>
    </aside>
  );
}

function TurnSection({ turn, isLatest, isRunning }: { turn: MockTurn; isLatest: boolean; isRunning: boolean }) {
  return (
    <section className="mt-9 first:mt-6">
      <header className="flex items-center gap-3 border-b border-border/60 pb-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 font-mono text-[0.58rem] font-semibold text-primary">
          {String(turn.step).padStart(2, "0")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.74rem] text-foreground">
          <Bot className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{turn.agentName}</span>
        </span>
        <span className="font-mono text-[0.6rem] text-muted-foreground">{formatTime(turn.createdAt)}</span>
        {isLatest && isRunning ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-primary">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            live
          </span>
        ) : null}
        <span className="ml-auto font-mono text-[0.58rem] text-muted-foreground">
          in {turn.usage.input} · out {turn.usage.output}
        </span>
      </header>

      {turn.promptContexts.length > 0 ? (
        <div className="mt-4 space-y-2">
          {turn.promptContexts.map((ctx) => (
            <figure
              key={ctx.id}
              className="flex items-start gap-2 rounded-sm border border-dashed border-border/60 bg-muted/30 px-3 py-2"
            >
              <FileText className="mt-[3px] h-3 w-3 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <figcaption className="font-mono text-[0.54rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {ctx.kind} · {ctx.title}
                </figcaption>
                <p className="mt-0.5 text-[0.8rem] leading-[1.55] text-foreground/85">{ctx.body}</p>
              </div>
            </figure>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-[0.95rem] leading-[1.75] text-foreground">{turn.body}</p>

      {turn.reasoning ? (
        <details className="mt-3 rounded-sm border-l-2 border-l-border bg-muted/20 px-3 py-2">
          <summary className="cursor-pointer font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
            Agent reasoning
          </summary>
          <p className="mt-2 text-[0.84rem] italic leading-[1.65] text-foreground/80">{turn.reasoning}</p>
        </details>
      ) : null}

      {turn.tools.map((tool) => (
        <ToolCallout key={tool.id} tool={tool} />
      ))}

      {turn.findings.map((finding) => (
        <FindingCallout key={finding.id} finding={finding} />
      ))}
    </section>
  );
}

export function DesignDocument() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(1);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  const total = mockWorkflow.turns.length;
  const visibleTurns = mockWorkflow.turns.slice(0, visibleCount);
  const isRunning = visibleCount < total;

  useEffect(() => {
    if (visibleCount >= total) return;
    const timer = window.setTimeout(() => {
      setVisibleCount((v) => Math.min(v + 1, total));
    }, REVEAL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [visibleCount, total]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (pinnedToBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setHasNewBelow(false);
    } else {
      setHasNewBelow(true);
    }
  }, [visibleCount, pinnedToBottom]);

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
    setVisibleCount(1);
    setPinnedToBottom(true);
    const el = containerRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "auto" });
  }

  return (
    <div className="relative flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-background text-foreground">
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <article className="mx-auto max-w-[44rem] px-6 py-10">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-muted-foreground">
            Workflow run · trace document
          </p>
          <h1 className="mt-2 text-[1.9rem] font-semibold leading-tight tracking-tight text-foreground">
            {mockWorkflow.name}
          </h1>
          <p className="mt-1 font-mono text-[0.72rem] text-muted-foreground">
            {mockWorkflow.target} · {mockWorkflow.agentName} · {formatTime(mockWorkflow.turns[0]!.createdAt)}
          </p>

          <section className="mt-8 border-l-2 border-l-border pl-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Objective</p>
            <p className="mt-1 text-[0.95rem] leading-[1.75] text-foreground">{mockWorkflow.objective}</p>
            <p className="mt-5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
              Standing orders · system prompt
            </p>
            <p className="mt-1 text-[0.88rem] leading-[1.75] text-foreground/85">{mockWorkflow.systemPrompt}</p>
          </section>

          <div className="mt-10 h-px bg-border/60" />

          <div>
            {visibleTurns.map((turn, idx) => (
              <TurnSection
                key={turn.id}
                turn={turn}
                isLatest={idx === visibleTurns.length - 1}
                isRunning={isRunning}
              />
            ))}

            {isRunning ? (
              <p className="mt-8 inline-flex items-center gap-2 font-mono text-[0.7rem] text-muted-foreground">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Agent working · turn {visibleCount + 1} of {total} incoming…
              </p>
            ) : (
              <p className="mt-10 border-t border-border/60 pt-5 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
                Run sealed · {total} turns ·{" "}
                {mockWorkflow.turns.reduce((a, t) => a + t.tools.length, 0)} tool calls ·{" "}
                {mockWorkflow.turns.reduce((a, t) => a + t.findings.length, 0)} findings
              </p>
            )}
          </div>
        </article>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 bg-card/50 px-6 py-2">
        <div className="flex items-center gap-3 font-mono text-[0.66rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Radio className={cn("h-3 w-3", isRunning ? "text-primary" : "text-muted-foreground")} />
            {isRunning ? "Streaming" : "Sealed"}
          </span>
          <span>
            Turn {visibleCount} / {total}
          </span>
          <span>{pinnedToBottom ? "Following latest" : "Paused — scroll to resume"}</span>
        </div>
        <button
          type="button"
          onClick={replay}
          className="inline-flex items-center gap-1.5 rounded border border-border/60 px-2 py-1 font-mono text-[0.64rem] text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Replay
        </button>
      </div>

      {hasNewBelow ? (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-16 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/70 bg-background/95 px-3 py-1.5 font-mono text-[0.68rem] text-foreground shadow-[0_4px_16px_-4px_hsl(var(--foreground)/0.2)] backdrop-blur transition hover:bg-accent/40"
        >
          <ArrowDown className="h-3 w-3 text-primary" />
          New content below
        </button>
      ) : null}
    </div>
  );
}
