import type { WorkflowTraceEvent } from "@synosec/contracts";
import type { AiAgent, AiTool, Application, Runtime, Workflow, WorkflowRun } from "@synosec/contracts";
import {
  BookLock,
  BrainCog,
  CircleHelp,
  Gauge,
  Orbit,
  Paperclip,
  Quote,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Stamp,
  Target,
  Terminal,
  Wrench,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatTimestamp,
  getEventPreview,
  getToolLookup,
  summarizeWorkflowStageTrace
} from "@/features/workflows/workflow-trace";

type SummaryCardData = {
  toolCount: number;
  toolNames: string[];
};

type TranscriptItem =
  | {
      kind: "stage_header";
      id: string;
      stageId: string;
      stageIndex: number;
      stageLabel: string;
      stageObjective: string;
      stageStatus: string;
      agentName: string;
      createdAt: string | null;
    }
  | {
      kind: "event";
      id: string;
      stageId: string;
      stageIndex: number;
      stageLabel: string;
      agentName: string;
      event: WorkflowTraceEvent;
    }
  | {
      kind: "dossier";
      id: string;
      stageId: string;
      stageIndex: number;
      stageLabel: string;
      agentName: string;
      createdAt: string | null;
      outcome: string;
      explicitResult: string | null;
      findings: Array<{
        id: string;
        title: string;
        severity: string;
        type: string;
        impact: string;
        recommendation: string;
        confidence: number;
      }>;
      chain: string[];
      artifacts: string[];
      confidence: number;
    };

function getRunSummary(run: WorkflowRun | null, workflow: Workflow | null) {
  if (!run || !workflow) {
    return "No workflow run has been recorded yet.";
  }

  const totalSteps = workflow.stages.length;
  const activeStep = Math.min(Math.max(run.currentStepIndex + 1, 1), Math.max(totalSteps, 1));
  const lifecycle = run.status === "completed" && run.trace.length === 0 ? "running" : run.status;

  return `${run.status} · ${lifecycle} · step ${activeStep}/${totalSteps}`;
}

function getAgentName(stageId: string, run: WorkflowRun | null, workflow: Workflow, agents: AiAgent[]) {
  const traceAgent = run?.trace.find((entry) => entry.workflowStageId === stageId)?.agentName;
  if (traceAgent) {
    return traceAgent;
  }

  const eventAgent = run?.events
    .find((event) => event.workflowStageId === stageId && typeof event.payload?.["agentName"] === "string")
    ?.payload?.["agentName"];
  if (typeof eventAgent === "string" && eventAgent.trim().length > 0) {
    return eventAgent;
  }

  const stage = workflow.stages.find((item) => item.id === stageId);
  return agents.find((agent) => agent.id === stage?.agentId)?.name ?? "Unknown agent";
}

function getEventPayloadString(event: WorkflowTraceEvent, key: string) {
  const value = event.payload?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getEventPayloadStringList(event: WorkflowTraceEvent, key: string) {
  const value = event.payload?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getRunContextName(run: WorkflowRun | null, key: "applicationName" | "runtimeName") {
  const value = run?.events.find((event) => typeof event.payload?.[key] === "string")?.payload?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getExplicitResultStatus(terminalType: string | undefined) {
  if (terminalType === "stage_failed") {
    return "failure";
  }
  if (terminalType === "stage_completed") {
    return "success";
  }
  return null;
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-muted-foreground/80", className)}>
      {children}
    </p>
  );
}

function HelpHint({ label, hint }: { label: string; hint: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex cursor-default items-center text-muted-foreground transition hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
            aria-label={`Show guidance for ${label}`}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Bracket({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono", className)}>
      <span aria-hidden className="text-muted-foreground/70">[</span>
      {children}
      <span aria-hidden className="text-muted-foreground/70">]</span>
    </span>
  );
}

function CornerMarks({ className }: { className?: string }) {
  return (
    <>
      <span aria-hidden className={cn("pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-foreground/25", className)} />
      <span aria-hidden className={cn("pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-foreground/25", className)} />
      <span aria-hidden className={cn("pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l border-foreground/25", className)} />
      <span aria-hidden className={cn("pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-foreground/25", className)} />
    </>
  );
}

function TimelineSpine({ tone = "idle", live = false }: { tone?: "idle" | "active" | "done" | "warn"; live?: boolean }) {
  const dotTone =
    tone === "active"
      ? "bg-primary ring-primary/30"
      : tone === "done"
        ? "bg-emerald-500 ring-emerald-500/30"
        : tone === "warn"
          ? "bg-amber-500 ring-amber-500/30"
          : "bg-muted-foreground/40 ring-muted-foreground/20";
  return (
    <div className="relative flex w-10 shrink-0 justify-center">
      <span aria-hidden className="absolute inset-y-0 w-px bg-gradient-to-b from-border via-border/70 to-border/10" />
      <span aria-hidden className={cn("relative mt-3 h-2.5 w-2.5 rounded-full ring-4", dotTone)}>
        {live ? <span aria-hidden className="absolute -inset-1 animate-ping rounded-full bg-current opacity-50" /> : null}
      </span>
    </div>
  );
}

function SeverityPip({ severity }: { severity: string }) {
  const tone =
    severity === "critical"
      ? "bg-rose-600 text-rose-50 ring-rose-500/40"
      : severity === "high"
        ? "bg-rose-500/90 text-rose-50 ring-rose-500/30"
        : severity === "medium"
          ? "bg-amber-500/90 text-amber-950 ring-amber-500/30"
          : "bg-sky-500/80 text-sky-50 ring-sky-500/30";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] ring-1", tone)}>
      <span aria-hidden className="h-1 w-1 rounded-full bg-current" />
      {severity}
    </span>
  );
}

function buildTranscriptItems(input: {
  workflow: Workflow;
  run: WorkflowRun | null;
  agents: AiAgent[];
  toolLookup: Record<string, string>;
}) {
  const items: TranscriptItem[] = [];
  const orderedStages = input.workflow.stages.slice().sort((left, right) => left.ord - right.ord);

  for (const [stageIndex, stage] of orderedStages.entries()) {
    const summary = summarizeWorkflowStageTrace({
      workflow: input.workflow,
      run: input.run,
      stageId: stage.id,
      stageIndex,
      toolLookup: input.toolLookup
    });

    if (!summary) {
      continue;
    }

    const stageEvents = (input.run?.events ?? [])
      .filter((event) => event.workflowStageId === stage.id)
      .sort((left, right) => left.ord - right.ord)
      .filter((event) => !(event.type === "system_message" && event.title === "Single-agent runtime bootstrapped"))
      .filter((event) => event.type !== "stage_started");

    const agentName = getAgentName(stage.id, input.run, input.workflow, input.agents);
    const explicitResult = summary.stageResult?.status ?? getExplicitResultStatus(summary.terminalEvent?.type);

    if (stageEvents.length === 0 && !summary.terminalEvent) {
      continue;
    }

    items.push({
      kind: "stage_header",
      id: `header-${stage.id}`,
      stageId: stage.id,
      stageIndex,
      stageLabel: stage.label,
      stageObjective: stage.objective,
      stageStatus: summary.visualState,
      agentName,
      createdAt: summary.startedEvent?.createdAt ?? stageEvents[0]?.createdAt ?? null
    });

    for (const event of stageEvents) {
      items.push({
        kind: "event",
        id: event.id,
        stageId: stage.id,
        stageIndex,
        stageLabel: stage.label,
        agentName,
        event
      });
    }

    if (summary.stageResultEvent || summary.terminalEvent || explicitResult) {
      items.push({
        kind: "dossier",
        id: `dossier-${stage.id}`,
        stageId: stage.id,
        stageIndex,
        stageLabel: stage.label,
        agentName,
        createdAt: summary.terminalEvent?.createdAt ?? summary.stageResultEvent?.createdAt ?? stageEvents.at(-1)?.createdAt ?? null,
        outcome: summary.stageOutcome,
        explicitResult,
        findings: summary.findings.map((finding) => ({
          id: finding.id,
          title: finding.title,
          severity: finding.severity,
          type: finding.type,
          impact: finding.impact,
          recommendation: finding.recommendation,
          confidence: finding.confidence
        })),
        chain: [
          summary.stageIntent,
          summary.stageAction,
          summary.stageReasoning,
          summary.handoffSummary.why
        ],
        artifacts: summary.toolResultEvents.flatMap((event) => {
          const refs = getEventPayloadStringList(event, "observationSummaries");
          return refs.length > 0 ? refs : [event.summary];
        }).filter((value, index, values) => values.indexOf(value) === index),
        confidence: summary.findings.length > 0
          ? summary.findings.reduce((max, finding) => Math.max(max, finding.confidence), 0)
          : 0.65
      });
    }
  }

  return items.sort((left, right) => {
    const leftTime = left.kind === "event"
      ? left.event.ord
      : left.kind === "stage_header"
        ? ((input.run?.events ?? []).find((event) => event.workflowStageId === left.stageId)?.ord ?? left.stageIndex * 1000) - 0.5
        : (((input.run?.events ?? []).filter((event) => event.workflowStageId === left.stageId).at(-1)?.ord ?? left.stageIndex * 1000) + 0.5);
    const rightTime = right.kind === "event"
      ? right.event.ord
      : right.kind === "stage_header"
        ? ((input.run?.events ?? []).find((event) => event.workflowStageId === right.stageId)?.ord ?? right.stageIndex * 1000) - 0.5
        : (((input.run?.events ?? []).filter((event) => event.workflowStageId === right.stageId).at(-1)?.ord ?? right.stageIndex * 1000) + 0.5);
    return leftTime - rightTime;
  });
}

function StageHeaderCard({
  workflow,
  run,
  applicationName,
  runtimeName,
  summaryCard,
  item
}: {
  workflow: Workflow;
  run: WorkflowRun | null;
  applicationName: string;
  runtimeName: string;
  summaryCard: SummaryCardData;
  item: Extract<TranscriptItem, { kind: "stage_header" }>;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span>{workflow.stages.length === 1 ? "Workflow Trace" : `Step ${item.stageIndex + 1}`}</span>
              <HelpHint
                label={workflow.stages.length === 1 ? "Workflow Trace" : `Step ${item.stageIndex + 1}`}
                hint={workflow.stages.length === 1
                  ? "This is the full recorded transcript of one workflow run: what the agent was told, which tool it chose, what came back, and how it closed out."
                  : "A step is one execution segment in the workflow transcript, including its objective, tool activity, and closeout."}
              />
            </span>
          </p>
          <Bracket className="text-[0.65rem] uppercase tracking-[0.2em] text-primary">
            <span>{item.stageStatus}</span>
          </Bracket>
        </div>
        <p className="text-[0.75rem] text-muted-foreground">{formatTimestamp(item.createdAt)}</p>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-base font-semibold text-foreground">{item.stageLabel}</p>
        <p className="text-sm text-muted-foreground">{item.agentName}</p>
      </div>
      <div className="mt-4 rounded-xl border border-border/70 bg-card/70 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <SectionLabel>Instructions</SectionLabel>
          <HelpHint
            label="Instructions"
            hint="These are the workflow instructions given to the linked agent for this run. They define the objective and boundaries the agent should follow."
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground">{item.stageObjective}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
          {getRunSummary(run, workflow)}
        </span>
        <span className="text-sm text-muted-foreground">{applicationName} via {runtimeName}</span>
      </div>
      {summaryCard.toolNames.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
            {summaryCard.toolCount} approved
          </span>
          {summaryCard.toolNames.map((toolName) => (
            <span key={toolName} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-foreground/85">
              <Orbit className="h-3 w-3 text-primary" />
              {toolName}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getEventBody(event: WorkflowTraceEvent) {
  if (event.type === "system_message") {
    return getEventPayloadString(event, "fullPrompt") ?? event.detail ?? event.summary;
  }
  if (event.type === "model_decision") {
    return getEventPayloadString(event, "modelReasoning") ?? getEventPayloadString(event, "reasoning") ?? event.detail ?? event.summary;
  }
  if (event.type === "tool_call") {
    const toolInput = event.payload?.["toolInput"];
    return toolInput && typeof toolInput === "object" ? JSON.stringify(toolInput, null, 2) : (event.detail ?? event.summary);
  }
  if (event.type === "tool_result") {
    return getEventPayloadString(event, "fullOutput") ?? event.detail ?? event.summary;
  }
  return event.detail ?? event.summary;
}

function TranscriptCell({
  item,
  live
}: {
  item: Extract<TranscriptItem, { kind: "event" }>;
  live: boolean;
}) {
  const { event } = item;
  const lane = typeof event.payload?.["lane"] === "string" ? event.payload["lane"] : null;
  const body = getEventBody(event);
  const preview = getEventPreview(event);
  const toolObservations = getEventPayloadStringList(event, "observationSummaries");
  const Icon: LucideIcon =
    lane === "system" ? BookLock :
      lane === "verification" ? ShieldAlert :
        event.type === "model_decision" ? BrainCog :
          (event.type === "tool_call" || event.type === "tool_result") ? Terminal : Wrench;

  if (event.type === "model_decision") {
    return (
      <article className="flex gap-3">
        <TimelineSpine tone={live ? "active" : "done"} live={live} />
        <div className="flex-1 space-y-2 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.26em] text-foreground">
              <BrainCog className="h-3.5 w-3.5 text-primary" />
              <span>reasoning</span>
              <HelpHint
                label="reasoning"
                hint="This is the model's own short explanation for why it chose the next action. It is model-generated trace text, not token usage and not a placeholder."
              />
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono text-[0.6875rem] text-muted-foreground">{item.agentName}</span>
          </div>
          <div className="relative rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-3">
            <span aria-hidden className="absolute -left-[3px] top-3 h-6 w-0.5 rounded-full bg-primary/70" />
            <p className="text-[0.875rem] font-medium leading-6 text-foreground">{event.title}</p>
            <p className="mt-2 text-[0.875rem] leading-7 text-foreground/90">{preview ?? event.summary}</p>
            {body && body !== preview && body !== event.summary ? (
              <pre className="mt-3 overflow-x-auto rounded-md border border-border/70 bg-background px-3 py-2 text-xs leading-5 text-foreground whitespace-pre-wrap">
                {body}
              </pre>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  if (event.type === "tool_call") {
    return (
      <article className="flex gap-3">
        <TimelineSpine tone="done" />
        <div className="flex-1 space-y-2 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.26em] text-foreground">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              tool call
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono text-[0.6875rem] text-muted-foreground">{getEventPayloadString(event, "toolName") ?? event.title}</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/80 bg-gradient-to-b from-muted/60 to-muted/20">
            <div className="flex items-center justify-between border-b border-border/60 bg-background/40 px-3 py-1.5">
              <div className="inline-flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[0.75rem] font-semibold text-foreground">{event.title}</span>
              </div>
              <Bracket className="text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
                <span>invoke</span>
              </Bracket>
            </div>
            <pre className="overflow-x-auto px-4 py-3 font-mono text-[0.75rem] leading-6 text-foreground whitespace-pre-wrap">
              {body ?? event.summary}
            </pre>
          </div>
        </div>
      </article>
    );
  }

  if (event.type === "tool_result") {
    return (
      <article className="flex gap-3">
        <TimelineSpine tone="done" />
        <div className="flex-1 space-y-2 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.26em] text-emerald-600 dark:text-emerald-300">
              <Wrench className="h-3.5 w-3.5" />
              returned · {event.status}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono text-[0.6875rem] text-muted-foreground">{getEventPayloadString(event, "toolName") ?? event.title}</span>
          </div>
          <div className="rounded-xl border border-border/80 bg-card/80 px-4 py-3">
            <p className="text-[0.8125rem] font-medium leading-6 text-foreground">{preview ?? event.summary}</p>
            {toolObservations.length > 0 ? (
              <ul className="mt-2 space-y-1.5 border-l border-border/60 pl-3">
                {toolObservations.map((snippet, idx) => (
                  <li key={`${event.id}-${idx}`} className="flex items-start gap-2 font-mono text-[0.75rem] leading-6 text-muted-foreground">
                    <span aria-hidden className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                    <span className="text-foreground/85">{snippet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {body && body !== preview ? (
              <details className="mt-3 rounded-md border border-border/70 bg-background px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-foreground">View tool output</summary>
                <pre className="mt-2 overflow-x-auto text-xs leading-5 text-foreground whitespace-pre-wrap">{body}</pre>
              </details>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  const palette =
    lane === "verification"
      ? {
          border: "border-amber-500/60",
          bg: "bg-amber-500/10",
          accent: "text-amber-700 dark:text-amber-300",
          ribbon: "bg-amber-500",
          label: "system · verification"
        }
      : {
          border: "border-primary/60",
          bg: "bg-primary/10",
          accent: "text-primary",
          ribbon: "bg-primary",
          label: "system · prompt"
        };

  return (
    <article className="flex gap-3">
      <TimelineSpine tone={lane === "verification" ? "warn" : "active"} />
      <div className="flex-1 pb-6">
        <div className={cn("relative overflow-hidden rounded-2xl border-2 border-dashed px-5 py-4 shadow-[0_10px_36px_-20px_hsl(var(--foreground)/0.22)]", palette.border, palette.bg)}>
          <div className="relative flex items-start gap-4">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-background/70", palette.accent)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Bracket className={cn("text-[0.6rem] font-semibold uppercase tracking-[0.32em]", palette.accent)}>
                  <span>inject</span>
                </Bracket>
                <span className={cn("font-mono text-[0.6rem] uppercase tracking-[0.28em]", palette.accent)}>
                  {palette.label}
                </span>
              </div>
              <h3 className="font-mono text-[0.9375rem] font-semibold tracking-tight text-foreground">{event.title}</h3>
              <p className="text-[0.8125rem] leading-6 text-foreground/80">{event.summary}</p>
              {body && body !== event.summary ? (
                <pre className="overflow-x-auto rounded-md border border-border/70 bg-background/70 px-3 py-2 text-xs leading-5 text-foreground whitespace-pre-wrap">
                  {body}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function DossierCell({ item }: { item: Extract<TranscriptItem, { kind: "dossier" }> }) {
  return (
    <article className="flex gap-3">
      <TimelineSpine tone="done" />
      <div className="flex-1 pb-4">
        <div className="relative overflow-hidden rounded-2xl border border-foreground/25 bg-gradient-to-br from-background via-card to-background shadow-[0_24px_80px_-40px_hsl(var(--foreground)/0.55)]">
          <CornerMarks className="!border-foreground/40" />
          <div className="relative p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-border/60 pb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">
                  <Stamp className="h-3 w-3 text-primary" />
                  <span className="inline-flex items-center gap-1.5">
                    <span>evidence dossier · sealed</span>
                    <HelpHint
                      label="evidence dossier"
                      hint="This is the workflow closeout card. It summarizes the outcome, findings, evidence chain, and the final state the run ended with."
                    />
                  </span>
                </div>
                <h2 className="mt-2 font-mono text-[1.5rem] font-semibold tracking-tight text-foreground">{item.stageLabel}</h2>
                <p className="mt-1 text-[0.8125rem] text-muted-foreground">{item.outcome}</p>
              </div>
              <div className="flex flex-col items-end gap-2 text-right font-mono text-[0.625rem] uppercase tracking-[0.24em] text-muted-foreground">
                <Bracket className="text-foreground">
                  <span className="text-primary">dossier</span>
                  <span className="mx-1 text-muted-foreground/60">·</span>
                  <span>{item.stageIndex + 1}</span>
                </Bracket>
                <span>signed · {formatTimestamp(item.createdAt)}</span>
                <span className="flex items-center gap-1.5 tabular-nums text-foreground">
                  <Gauge className="h-3 w-3" />
                  confidence {item.confidence.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
              <div className="space-y-3">
                <SectionLabel>Findings</SectionLabel>
                {item.findings.length === 0 ? (
                  <div className="rounded-xl border border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
                    No findings were recorded for this stage. The dossier reflects the final structured closeout and evidence chain only.
                  </div>
                ) : (
                  <ol className="space-y-3">
                    {item.findings.map((finding, idx) => (
                      <li key={finding.id} className="relative overflow-hidden rounded-xl border border-border/80 bg-background/70 p-4">
                        <span aria-hidden className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-primary/70 to-primary/10" />
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">{String(idx + 1).padStart(2, "0")}</span>
                            <SeverityPip severity={finding.severity} />
                          </div>
                          <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">{finding.type}</span>
                        </div>
                        <p className="mt-2 text-[0.9375rem] font-semibold leading-6 text-foreground">{finding.title}</p>
                        <p className="mt-1.5 text-[0.8125rem] leading-6 text-muted-foreground">{finding.impact}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border/70 pt-3">
                          <Quote className="h-3 w-3 text-primary" />
                          <span className="font-mono text-[0.6875rem] text-foreground/85">{finding.recommendation}</span>
                          <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-muted-foreground">conf {finding.confidence.toFixed(2)}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <SectionLabel>Chain of reasoning</SectionLabel>
                    <HelpHint
                      label="Chain of reasoning"
                      hint="This is the condensed decision trail extracted from the run: intent, action taken, model justification, and the handoff or stopping reason."
                    />
                  </div>
                  <ol className="space-y-2">
                    {item.chain.map((step, idx) => (
                      <li key={`${item.id}-${idx}`} className="flex items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-[0.625rem] tabular-nums text-foreground">{idx + 1}</span>
                        <p className="text-[0.8125rem] leading-6 text-foreground/85">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <SectionLabel className="mb-2">Attached artifacts</SectionLabel>
                  <ul className="space-y-1.5">
                    {item.artifacts.map((artifact) => (
                      <li key={artifact} className="flex items-center gap-2 rounded-md border border-dashed border-border/70 bg-background/50 px-2.5 py-1.5 font-mono text-[0.75rem] text-foreground/85">
                        <Paperclip className="h-3 w-3 text-primary" />
                        <span className="truncate">{artifact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <SectionLabel className="!text-primary/90">Verdict</SectionLabel>
                  </div>
                  <p className="mt-1.5 text-[0.8125rem] leading-6 text-foreground/90">
                    {item.explicitResult ? `Explicit result: ${item.explicitResult}. ` : ""}
                    {item.outcome}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 pt-5">
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5">
                  <ScrollText className="h-3.5 w-3.5" />
                  Dossier View
                </Button>
              </div>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
                {item.agentName} · terminal artifact
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function WorkflowTraceSection({
  workflow,
  applications,
  runtimes,
  agents,
  tools,
  run,
  running,
  summaryCard
}: {
  workflow: Workflow | null;
  applications: Application[];
  runtimes: Runtime[];
  agents: AiAgent[];
  tools: AiTool[];
  run: WorkflowRun | null;
  running: boolean;
  summaryCard: SummaryCardData;
}) {
  if (!workflow) {
    return null;
  }

  const toolLookup = getToolLookup(tools);
  const applicationName = applications.find((item) => item.id === workflow.applicationId)?.name
    ?? getRunContextName(run, "applicationName")
    ?? "Unknown application";
  const runtimeName = workflow.runtimeId
    ? runtimes.find((item) => item.id === workflow.runtimeId)?.name
      ?? getRunContextName(run, "runtimeName")
      ?? "Unknown runtime"
    : "No runtime";
  const transcriptItems = buildTranscriptItems({
    workflow,
    run,
    agents,
    toolLookup
  });
  const fallbackStage = workflow.stages.slice().sort((left, right) => left.ord - right.ord)[0];

  return (
    <section className="space-y-5">
      {transcriptItems.length === 0 ? (
        fallbackStage ? (
          <StageHeaderCard
            workflow={workflow}
            run={run}
            applicationName={applicationName}
            runtimeName={runtimeName}
            summaryCard={summaryCard}
            item={{
              kind: "stage_header",
              id: `header-${fallbackStage.id}`,
              stageId: fallbackStage.id,
              stageIndex: 0,
              stageLabel: fallbackStage.label,
              stageObjective: fallbackStage.objective,
              stageStatus: run?.status ?? "pending",
              agentName: getAgentName(fallbackStage.id, run, workflow, agents),
              createdAt: run?.startedAt ?? null
            }}
          />
        ) : null
      ) : (
        <div className="space-y-3">
          {transcriptItems.map((item, index) => {
            if (item.kind === "stage_header") {
              return (
                <StageHeaderCard
                  key={item.id}
                  workflow={workflow}
                  run={run}
                  applicationName={applicationName}
                  runtimeName={runtimeName}
                  summaryCard={summaryCard}
                  item={item}
                />
              );
            }

            if (item.kind === "dossier") {
              return <DossierCell key={item.id} item={item} />;
            }

            return <TranscriptCell key={item.id} item={item} live={running && index === transcriptItems.length - 1} />;
          })}
        </div>
      )}
    </section>
  );
}
