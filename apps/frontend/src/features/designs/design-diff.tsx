import { Bot, Terminal, AlertTriangle, ArrowRight } from "lucide-react";
import { mockWorkflow, formatTime, type MockSeverity, type MockTurn } from "./mock-data";
import { cn } from "@/shared/lib/utils";

const sevBg: Record<MockSeverity, string> = {
  critical: "bg-destructive",
  high: "bg-destructive/80",
  medium: "bg-warning",
  low: "bg-primary",
};

function DeltaPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "up" | "down" | "neutral" }) {
  const color = tone === "up" ? "text-destructive" : tone === "down" ? "text-primary" : "text-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[0.6rem] text-muted-foreground">
      <span>{label}</span>
      <span className={cn("font-semibold", color)}>{value}</span>
    </span>
  );
}

function TurnDiff({ turn, previousTokens }: { turn: MockTurn; previousTokens: number | null }) {
  const tokensTotal = turn.usage.input + turn.usage.output;
  const delta = previousTokens !== null ? tokensTotal - previousTokens : null;
  const deltaSign = delta === null ? "" : delta > 0 ? "+" : "";

  return (
    <article className="rounded-md border border-border/70 bg-card">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 font-mono text-[0.6rem] font-semibold text-primary">
            {String(turn.step).padStart(2, "0")}
          </span>
          <span className="font-mono text-[0.78rem] font-medium text-foreground">Turn {turn.step}</span>
        </div>
        <span className="font-mono text-[0.62rem] text-muted-foreground">{formatTime(turn.createdAt)}</span>
        <span className="font-mono text-[0.62rem] text-muted-foreground">
          <Bot className="mr-1 inline h-3 w-3" />
          {turn.agentName}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <DeltaPill label="in" value={String(turn.usage.input)} />
          <DeltaPill label="out" value={String(turn.usage.output)} />
          {delta !== null ? (
            <DeltaPill
              label="Δ"
              value={`${deltaSign}${delta}`}
              tone={delta > 0 ? "up" : delta < 0 ? "down" : "neutral"}
            />
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-2 divide-x divide-border/50">
        <div className="min-w-0 px-4 py-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">Input · context</p>
          {turn.promptContexts.length === 0 ? (
            <p className="mt-2 text-[0.8rem] text-muted-foreground">
              No new context injected. Prior conversation state carries over.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {turn.promptContexts.map((ctx) => (
                <li key={ctx.id} className="rounded border border-border/50 bg-muted/30 px-3 py-2">
                  <p className="font-mono text-[0.56rem] uppercase tracking-wider text-muted-foreground">
                    {ctx.kind} · {ctx.title}
                  </p>
                  <p className="mt-1 text-[0.8rem] leading-[1.5] text-foreground/85">{ctx.body}</p>
                </li>
              ))}
            </ul>
          )}

          {turn.reasoning ? (
            <div className="mt-3">
              <p className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">Reasoning</p>
              <p className="mt-1 rounded border-l-2 border-border bg-muted/30 px-3 py-2 text-[0.8rem] leading-[1.5] text-foreground/80">
                {turn.reasoning}
              </p>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 px-4 py-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">Output · response</p>
          <p className="mt-2 text-[0.86rem] leading-[1.6] text-foreground">{turn.body}</p>
        </div>
      </div>

      {turn.tools.length > 0 ? (
        <div className="border-t border-border/60">
          <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-4 py-2">
            <Terminal className="h-3 w-3 text-muted-foreground" />
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
              Tool hunks · {turn.tools.length}
            </p>
          </div>
          <ul className="divide-y divide-border/40">
            {turn.tools.map((tool) => (
              <li key={tool.id} className="grid grid-cols-2 divide-x divide-border/40 bg-background">
                <div className="min-w-0 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[0.76rem] font-medium text-foreground">{tool.name}</span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-primary">
                      {tool.status}
                    </span>
                    <span className="ml-auto font-mono text-[0.58rem] text-muted-foreground">
                      {tool.durationMs}ms
                    </span>
                  </div>
                  <p className="mt-1 text-[0.78rem] text-foreground/85">{tool.callTitle}</p>
                  <pre className="mt-1.5 overflow-x-auto rounded bg-muted/50 px-2 py-1.5 font-mono text-[0.7rem] leading-5 text-foreground/80">
                    {tool.input}
                  </pre>
                </div>
                <div className="min-w-0 px-4 py-3">
                  <p className="font-mono text-[0.56rem] uppercase tracking-wider text-muted-foreground">stdout</p>
                  <p className="mt-1 font-mono text-[0.72rem] leading-[1.55] text-foreground/85">{tool.output}</p>
                  {tool.observations.length > 0 ? (
                    <ul className="mt-2 space-y-0.5">
                      {tool.observations.map((obs) => (
                        <li
                          key={obs}
                          className="grid grid-cols-[12px_1fr] gap-1 text-[0.76rem] text-foreground/85"
                        >
                          <span className="text-primary">+</span>
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {turn.findings.length > 0 ? (
        <div className="border-t border-border/60">
          <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-4 py-2">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
              Annotations · findings added · {turn.findings.length}
            </p>
          </div>
          <ul className="divide-y divide-border/40">
            {turn.findings.map((f) => (
              <li key={f.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider text-white",
                      sevBg[f.severity],
                    )}
                  >
                    {f.severity}
                  </span>
                  <span className="font-mono text-[0.58rem] text-muted-foreground">
                    conf {f.confidence.toFixed(2)}
                  </span>
                  <span className="ml-auto font-mono text-[0.58rem] text-muted-foreground">{f.host}</span>
                </div>
                <p className="mt-1 text-[0.86rem] font-medium text-foreground">{f.title}</p>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-mono text-[0.54rem] uppercase tracking-wider text-muted-foreground">Impact</p>
                    <p className="mt-0.5 text-[0.78rem] leading-[1.5] text-foreground/85">{f.impact}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[0.54rem] uppercase tracking-wider text-muted-foreground">Remedy</p>
                    <p className="mt-0.5 text-[0.78rem] leading-[1.5] text-foreground/85">{f.recommendation}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function DesignDiff() {
  const totalFindings = mockWorkflow.turns.reduce((a, t) => a + t.findings.length, 0);
  const totalTools = mockWorkflow.turns.reduce((a, t) => a + t.tools.length, 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-[78rem] px-6 py-8">
        <header className="border-b border-border/60 pb-5">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">Trace · diff</p>
          <h1 className="mt-1 text-[1.4rem] font-semibold tracking-tight">{mockWorkflow.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-5 font-mono text-[0.7rem] text-muted-foreground">
            <span>{mockWorkflow.target}</span>
            <span>{mockWorkflow.agentName}</span>
            <span>{mockWorkflow.turns.length} turns</span>
            <span>{totalTools} tools</span>
            <span>{totalFindings} findings</span>
          </div>
        </header>

        <section className="mt-4 rounded-md border border-border/70 bg-card">
          <header className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted font-mono text-[0.6rem] text-muted-foreground">
              00
            </span>
            <span className="font-mono text-[0.78rem] font-medium text-foreground">Preamble</span>
            <span className="font-mono text-[0.62rem] text-muted-foreground">Initial state</span>
          </header>
          <div className="grid grid-cols-2 divide-x divide-border/50">
            <div className="px-4 py-3">
              <p className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">System prompt</p>
              <p className="mt-1 text-[0.8rem] leading-[1.55] text-foreground/85">{mockWorkflow.systemPrompt}</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">Objective</p>
              <p className="mt-1 text-[0.8rem] leading-[1.55] text-foreground/85">{mockWorkflow.objective}</p>
            </div>
          </div>
        </section>

        <div className="mt-5 space-y-4">
          {mockWorkflow.turns.map((turn, idx) => {
            const prev = idx > 0 ? mockWorkflow.turns[idx - 1]! : null;
            return (
              <div key={turn.id}>
                {idx > 0 ? (
                  <div className="flex items-center gap-2 py-1 font-mono text-[0.58rem] text-muted-foreground">
                    <ArrowRight className="h-3 w-3" />
                    advances from turn {prev!.step} to turn {turn.step}
                  </div>
                ) : null}
                <TurnDiff turn={turn} previousTokens={prev ? prev.usage.input + prev.usage.output : null} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
