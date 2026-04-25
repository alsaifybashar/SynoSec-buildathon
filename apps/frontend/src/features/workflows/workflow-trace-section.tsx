import { useMemo, type ReactNode } from "react";
import type { AiAgent, AiTool, Application, Runtime, Workflow, WorkflowRun } from "@synosec/contracts";
import { AlertTriangle, CircleHelp, LoaderCircle, Radio, Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import {
  buildWorkflowTranscript,
  getToolLookup,
  getWorkflowAllowedToolIds,
  type FindingsRailItem,
  type LiveModelOutput,
  type TranscriptProjection
} from "@/features/workflows/workflow-trace";

type SummaryCardData = {
  toolCount: number;
  toolNames: string[];
};

type MetadataItem = {
  label: string;
  value: string;
};

type DuplexAtomKind =
  | "objective"
  | "system-prompt"
  | "system"
  | "reasoning"
  | "body"
  | "tool-call"
  | "tool-output"
  | "verification"
  | "finding"
  | "sealed"
  | "error";

type DuplexAtom = {
  key: string;
  side: "left" | "right";
  kind: DuplexAtomKind;
  label: string;
  title?: string;
  summaryText?: string;
  body?: string;
  meta?: string;
  severity?: FindingsRailItem["severity"];
  code?: string;
  observations?: string[];
  status?: string;
  expandableBody?: boolean;
};

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

function MonoLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground", className)}>
      {children}
    </p>
  );
}

function SeverityBadge({ severity }: { severity: FindingsRailItem["severity"] }) {
  const tone =
    severity === "critical"
      ? "border-destructive/40 bg-destructive text-destructive-foreground"
      : severity === "high"
        ? "border-destructive/25 bg-destructive/90 text-destructive-foreground"
        : severity === "medium"
          ? "border-warning/35 bg-warning text-warning-foreground"
          : severity === "low"
            ? "border-primary/25 bg-primary/90 text-primary-foreground"
            : "border-border bg-muted text-foreground";

  return (
    <span className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]", tone)}>
      {severity}
    </span>
  );
}

const KIND_LABEL: Record<DuplexAtomKind, string> = {
  objective: "Objective",
  "system-prompt": "System prompt",
  system: "System",
  reasoning: "Agent reasoning",
  body: "Agent",
  "tool-call": "Tool",
  "tool-output": "Tool output",
  verification: "Verification",
  finding: "Finding",
  sealed: "Run sealed",
  error: "Run error"
};

const KIND_ACCENT: Record<DuplexAtomKind, { label: string; dot: string }> = {
  objective: { label: "text-primary", dot: "bg-primary" },
  "system-prompt": { label: "text-primary", dot: "bg-primary" },
  system: { label: "text-foreground/75", dot: "bg-foreground/60" },
  reasoning: { label: "text-muted-foreground", dot: "bg-muted-foreground" },
  body: { label: "text-foreground/70", dot: "bg-foreground/50" },
  "tool-call": { label: "text-warning", dot: "bg-warning" },
  "tool-output": { label: "text-success", dot: "bg-success" },
  verification: { label: "text-primary", dot: "bg-primary" },
  finding: { label: "text-destructive", dot: "bg-destructive" },
  sealed: { label: "text-success", dot: "bg-success" },
  error: { label: "text-destructive", dot: "bg-destructive" }
};

function compactDate(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatDuration(run: WorkflowRun | null) {
  if (!run?.startedAt) {
    return "00:00";
  }

  const start = Date.parse(run.startedAt);
  const end = Date.parse(run.completedAt ?? new Date().toISOString());
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return "00:00";
  }

  const seconds = Math.round((end - start) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function getVerificationToneLabel(status: string | undefined, title: string) {
  if (status === "failed") {
    return "failed";
  }
  if (/retry/i.test(title)) {
    return "retry";
  }
  return "accepted";
}

function buildDuplexAtoms(input: {
  workflow: Workflow;
  run: WorkflowRun | null;
  transcript: TranscriptProjection;
  agent: AiAgent | null;
  findingsById: Map<string, FindingsRailItem>;
  errors: string[];
}) {
  const atoms: DuplexAtom[] = [];

  atoms.push({
    key: `${input.workflow.id}:objective`,
    side: "right",
    kind: "objective",
    label: "Objective",
    body: input.workflow.objective,
    meta: input.workflow.name
  });

  if (input.agent?.systemPrompt) {
    atoms.push({
      key: `${input.workflow.id}:system-prompt`,
      side: "right",
      kind: "system-prompt",
      label: "System prompt",
      body: input.agent.systemPrompt,
      meta: input.agent.name
    });
  }

  for (const error of input.errors) {
    atoms.push({
      key: `error:${error}`,
      side: "right",
      kind: "error",
      label: "Run state issue",
      body: error
    });
  }

  for (const item of input.transcript.items) {
    if (item.kind === "system_message") {
      atoms.push({
        key: item.id,
        side: "right",
        kind: item.title.toLowerCase().includes("prompt") ? "system-prompt" : "system",
        label: item.title,
        body: item.body ?? item.summary,
        meta: compactDate(item.createdAt),
        expandableBody: Boolean(item.body && item.body !== item.summary)
      });
      continue;
    }

    if (item.kind === "assistant_turn") {
      const toolAtoms: DuplexAtom[] = [];

      if (item.reasoning) {
        atoms.push({
          key: `${item.id}:reasoning`,
          side: "left",
          kind: "reasoning",
          label: "Reasoning",
          body: item.reasoning,
          meta: item.agentName
        });
      }

      const assistantBody = (item.body ?? item.summary).trim();
      if (assistantBody) {
        atoms.push({
          key: `${item.id}:body`,
          side: "left",
          kind: "body",
          label: item.title,
          body: assistantBody,
          meta: compactDate(item.createdAt),
          ...(item.live ? { title: "Live model output" } : {})
        });
      }

      for (const detail of item.details) {
        if (detail.kind === "tool_call") {
          toolAtoms.push({
            key: detail.id,
            side: "left",
            kind: "tool-call",
            label: detail.toolName,
            title: detail.title,
            meta: "requested",
            ...(detail.body ? { code: detail.body } : {})
          });
          continue;
        }

        if (detail.kind === "tool_result") {
          const existingToolAtom = [...toolAtoms].reverse().find((atom) =>
            atom.kind === "tool-call" && atom.label === detail.toolName && atom.status === undefined
          );

          if (existingToolAtom) {
            existingToolAtom.summaryText = detail.summary;
            existingToolAtom.body = detail.body ?? detail.summary;
            existingToolAtom.observations = detail.observations;
            existingToolAtom.status = detail.status;
            existingToolAtom.meta = detail.status;
          } else {
            toolAtoms.push({
              key: detail.id,
              side: "left",
              kind: "tool-call",
              label: detail.toolName,
              title: `${detail.toolName} returned`,
              summaryText: detail.summary,
              body: detail.body ?? detail.summary,
              observations: detail.observations,
              status: detail.status,
              meta: detail.status
            });
          }
          continue;
        }

        if (detail.kind === "verification") {
          atoms.push({
            key: detail.id,
            side: "right",
            kind: "verification",
            label: detail.title,
            body: detail.body ?? detail.summary,
            meta: getVerificationToneLabel(detail.status, detail.title),
            status: detail.status,
            ...(detail.toolName ? { title: detail.toolName } : {})
          });
          continue;
        }

        atoms.push({
          key: detail.id,
          side: "left",
          kind: "body",
          label: detail.title,
          body: detail.body ?? detail.summary,
          meta: "note"
        });
      }

      atoms.push(...toolAtoms);

      for (const findingId of item.findingIds) {
        const finding = input.findingsById.get(findingId);
        if (!finding) {
          continue;
        }

        atoms.push({
          key: `finding:${finding.id}`,
          side: "right",
          kind: "finding",
          label: finding.title,
          title: finding.host,
          body: finding.impact,
          meta: `conf ${finding.confidence.toFixed(2)} · ${finding.recommendation}`,
          severity: finding.severity
        });
      }

      continue;
    }

    atoms.push({
      key: item.id,
      side: "right",
      kind: item.status === "failed" ? "error" : "sealed",
      label: item.title,
      body: item.body ?? item.summary,
      meta: compactDate(item.createdAt)
    });
  }

  return atoms;
}

function formatToolLine(atom: DuplexAtom) {
  const verb = atom.status ? "Called" : "Calling";
  return `${verb} ${atom.label}`;
}

function normalizeInlineText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function collapseWhitespace(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncateWithEllipsis(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxChars)).trimEnd()}...`;
}

function getCompactToolInput(atom: DuplexAtom) {
  if (!atom.code) {
    return null;
  }

  const collapsed = collapseWhitespace(atom.code);
  if (!collapsed) {
    return null;
  }

  return truncateWithEllipsis(collapsed, 30);
}

function getCompactToolOutput(atom: DuplexAtom, labelText: string) {
  const preferredSource = collapseWhitespace(atom.body) || collapseWhitespace(atom.summaryText);
  if (!preferredSource) {
    return atom.status ? `${atom.status} with no summarized output.` : null;
  }

  const normalizedSummary = normalizeInlineText(preferredSource);
  const normalizedLabel = normalizeInlineText(labelText);
  const normalizedName = normalizeInlineText(atom.label);
  const normalizedStatus = normalizeInlineText(atom.status);

  const repeatsLabel = normalizedLabel.length > 0 && normalizedSummary.includes(normalizedLabel);
  const repeatsName = normalizedName.length > 0 && normalizedSummary.includes(normalizedName);
  const repeatsStatus = normalizedStatus.length > 0 && normalizedSummary.includes(normalizedStatus);

  if (repeatsLabel || (repeatsName && repeatsStatus)) {
    return atom.status ? `${atom.status} with no summarized output.` : null;
  }

  const lines = preferredSource.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 2) {
    return `${lines.slice(0, 2).join("\n")}...`;
  }

  return truncateWithEllipsis(preferredSource, 100);
}

function InlineTranscriptEntry({ atom, showFullDetails }: { atom: DuplexAtom; showFullDetails: boolean }) {
  const isLeft = atom.side === "left";
  const accent = KIND_ACCENT[atom.kind];
  const isTool = atom.kind === "tool-call" || atom.kind === "tool-output";
  const isSystemTone = atom.kind === "objective" || atom.kind === "system-prompt" || atom.kind === "system" || atom.kind === "verification";
  const isErrorTone = atom.kind === "error";
  const labelText = isTool ? formatToolLine(atom) : atom.label;
  const compactToolInput = isTool ? getCompactToolInput(atom) : null;
  const compactToolOutput = isTool ? getCompactToolOutput(atom, labelText) : null;
  const showTitle = Boolean(atom.title) && (!isTool || normalizeInlineText(atom.title) !== normalizeInlineText(labelText));

  return (
    <div className={cn("flex w-full", isLeft ? "justify-start pr-[6%]" : "justify-end pl-[6%]")}>
      <article className={cn("w-full max-w-[52rem] space-y-1.5", isTool ? "max-w-[48rem]" : "")}>
        <div
          className={cn(
            "flex items-center gap-2 px-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground",
            isLeft ? "" : "flex-row-reverse"
          )}
        >
          <span className={cn("inline-flex items-center gap-1.5 font-semibold", accent.label)}>
            <span className={cn("h-1 w-1 rounded-full", accent.dot)} />
            {KIND_LABEL[atom.kind]}
          </span>
          {atom.severity ? (
            <>
              <span className="text-border">·</span>
              <span className="font-semibold text-destructive">{atom.severity}</span>
            </>
          ) : null}
          {atom.meta ? (
            <>
              <span className="text-border">·</span>
              <span>{atom.meta}</span>
            </>
          ) : null}
        </div>
        <div className={cn("space-y-1", isTool ? "pl-4" : "")}>
          <p
            className={cn(
              "whitespace-pre-wrap leading-[1.65] text-foreground/90",
              isTool
                ? "text-[0.78rem] text-muted-foreground"
                : isSystemTone
                  ? "text-[0.86rem] font-normal text-foreground/70"
                  : "text-[0.96rem] font-normal text-foreground",
              isErrorTone ? "text-destructive" : ""
            )}
          >
            <span className={cn("font-medium", isSystemTone ? "font-normal text-foreground/65" : "text-foreground")}>{labelText}</span>
            {compactToolInput && !showFullDetails ? <span className="font-mono text-[0.74rem] text-muted-foreground/90"> {compactToolInput}</span> : null}
            {showTitle ? <span className="text-muted-foreground"> · {atom.title}</span> : null}
          </p>

          {compactToolOutput && !showFullDetails ? (
            <p className="whitespace-pre-wrap font-mono text-[0.74rem] leading-[1.55] text-muted-foreground/90">
              {compactToolOutput}
            </p>
          ) : null}

          {atom.body && (!isTool || showFullDetails) ? (
            <p
              className={cn(
                "whitespace-pre-wrap leading-[1.7]",
                isSystemTone
                  ? "text-[0.86rem] font-light text-foreground/68"
                  : "text-[0.92rem] text-foreground/88"
              )}
            >
              {atom.body}
            </p>
          ) : null}

          {showFullDetails && atom.code ? (
            <pre className="overflow-x-auto rounded-sm border border-border/70 bg-muted/35 px-2.5 py-1.5 font-mono text-[0.7rem] leading-5 text-foreground/85">
              {atom.code}
            </pre>
          ) : null}

          {showFullDetails && atom.observations && atom.observations.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">Observations</div>
              <ul className="space-y-0.5">
                {atom.observations.map((observation) => (
                  <li key={observation} className="grid grid-cols-[10px_1fr] gap-1.5 text-[0.76rem] leading-[1.5] text-foreground/85">
                    <span className="text-success">+</span>
                    <span>{observation}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function FindingsRail({
  findings,
  runStatus,
  metadata
}: {
  findings: TranscriptProjection["findings"];
  runStatus: WorkflowRun["status"] | null;
  metadata: MetadataItem[];
}) {
  const shouldRender = metadata.length > 0 || findings.length > 0 || runStatus === "completed" || runStatus === "failed";
  if (!shouldRender) {
    return null;
  }

  return (
    <aside className="space-y-3 lg:sticky lg:top-6">
      {metadata.length > 0 ? (
        <div className="rounded-xl border border-border/80 bg-card px-4 py-4">
          <div className="flex items-center gap-2">
            <MonoLabel>Metadata</MonoLabel>
            <HelpHint
              label="Metadata"
              hint="Workflow identity, linked resources, and current run state for this Duplex session."
            />
          </div>
          <div className="mt-4 space-y-4">
            {metadata.map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  {item.label}
                </p>
                <div className="text-xs text-foreground">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="rounded-xl border border-border/80 bg-card px-4 py-4">
        <div className="flex items-center gap-2">
          <MonoLabel>Findings</MonoLabel>
          <HelpHint
            label="Findings"
            hint="This rail tracks issues the workflow explicitly reported while it was running."
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {findings.length === 0 ? "No findings reported yet." : `${findings.length} finding${findings.length === 1 ? "" : "s"} reported.`}
        </p>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
          run status · {runStatus ?? "idle"}
        </p>
      </div>
      {findings.map((finding) => (
        <div key={finding.id} className="rounded-xl border border-border/80 bg-background/80 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">{finding.type}</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">{finding.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{finding.impact}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span>{finding.host}</span>
            <span className="font-mono">conf {finding.confidence.toFixed(2)}</span>
          </div>
          <p className="mt-3 border-t border-dashed border-border pt-3 text-sm leading-6 text-foreground/85">{finding.recommendation}</p>
        </div>
      ))}
    </aside>
  );
}

function EmptyRunState({
  toolNames
}: {
  toolNames: string[];
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 px-5 py-5">
      <MonoLabel className="text-foreground">No run yet</MonoLabel>
      <h3 className="mt-2 text-lg font-medium text-foreground">Start the first Duplex session</h3>
      <p className="mt-2 max-w-[56ch] text-sm leading-6 text-muted-foreground">
        This workflow has configuration and execution context, but no persisted run yet. Launch a run from the toolbar to start streaming the agent transcript into this thread.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {toolNames.length > 0 ? toolNames.map((toolName) => (
          <span key={toolName} className="inline-flex items-center rounded-full border border-border/70 bg-background px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-foreground/85">
            {toolName}
          </span>
        )) : (
          <span className="text-sm text-muted-foreground">No tools granted yet.</span>
        )}
      </div>
    </div>
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
  liveModelOutput,
  transcript,
  summaryCard,
  showFullDetails = false,
  latestRunError,
  transcriptError,
  streamError
}: {
  workflow: Workflow | null;
  applications: Application[];
  runtimes: Runtime[];
  agents: AiAgent[];
  tools: AiTool[];
  run: WorkflowRun | null;
  running: boolean;
  liveModelOutput?: LiveModelOutput | null;
  transcript?: TranscriptProjection | null;
  summaryCard: SummaryCardData;
  showFullDetails?: boolean;
  latestRunError?: string | null;
  transcriptError?: string | null;
  streamError?: string | null;
}) {
  const errorMessages = [latestRunError, transcriptError, streamError].filter((value): value is string => Boolean(value));
  const toolLookup = useMemo(() => getToolLookup(tools), [tools]);
  const derivedTranscript = useMemo<TranscriptProjection>(() => {
    if (!workflow) {
      return { items: [], findings: [] };
    }

    return buildWorkflowTranscript({
      workflow,
      run,
      agents,
      toolLookup,
      running,
      liveModelOutput: liveModelOutput ?? null
    });
  }, [workflow, run, agents, toolLookup, running, liveModelOutput]);
  const effectiveTranscript = transcript ?? derivedTranscript;
  const findingsById = useMemo(
    () => new Map(effectiveTranscript.findings.map((finding) => [finding.id, finding])),
    [effectiveTranscript]
  );
  const agent = useMemo(
    () => workflow ? agents.find((item) => item.id === workflow.agentId) ?? null : null,
    [workflow, agents]
  );
  const applicationName = workflow
    ? (applications.find((item) => item.id === workflow.applicationId)?.name ?? "Unknown application")
    : "Unknown application";
  const visibleToolNames = workflow
    ? (summaryCard.toolNames.length > 0
      ? summaryCard.toolNames
      : getWorkflowAllowedToolIds(workflow).map((toolId) => toolLookup[toolId] ?? toolId))
    : [];
  const metadataItems = useMemo<MetadataItem[]>(() => {
    if (!workflow) {
      return [];
    }

    return [
      { label: "Status", value: workflow.status },
      { label: "Target", value: applicationName },
      { label: "Agent", value: agent?.name ?? "Unknown" },
      { label: "Current Run", value: run ? `${run.status} · ${run.events.length} events` : "No active run" },
      { label: "Updated", value: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(workflow.updatedAt)) }
    ];
  }, [workflow, applicationName, agent, run]);
  const atoms = useMemo(() => {
    if (!workflow) {
      return [];
    }

    return buildDuplexAtoms({
      workflow,
      run,
      transcript: effectiveTranscript,
      agent,
      findingsById,
      errors: errorMessages
    }).filter((atom) => atom.kind !== "finding");
  }, [workflow, run, effectiveTranscript, agent, findingsById, errorMessages]);

  if (!workflow) {
    return null;
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.75fr)]">
      <div className="min-w-0">
        <div className="space-y-4">
          <div className="relative min-h-[38rem]">
            <div className="mx-auto w-full max-w-[56rem] px-6 py-8">
              <div className="space-y-5">
                {atoms.map((atom) => (
                  <div key={atom.key} className="duplex-entry">
                    <InlineTranscriptEntry atom={atom} showFullDetails={showFullDetails} />
                  </div>
                ))}

                {!run ? <EmptyRunState toolNames={visibleToolNames} /> : null}

                {run?.status === "running" ? (
                  <div className="flex w-full justify-start pr-[8%]">
                    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 font-mono text-[0.64rem] text-muted-foreground">
                      <Radio className="h-3 w-3 text-primary" />
                      <span>Agent typing</span>
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

          {errorMessages.length > 0 ? (
            <div className="px-4 pb-4 md:px-6">
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessages[errorMessages.length - 1]}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <FindingsRail findings={effectiveTranscript.findings} runStatus={run?.status ?? null} metadata={metadataItems} />

      <style>{`
        @keyframes duplex-in {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: none; }
        }
        .duplex-entry { animation: duplex-in 260ms ease-out both; }
        @keyframes duplex-dot { 0%, 80%, 100% { opacity: 0.25 } 40% { opacity: 1 } }
        .duplex-typing span { animation: duplex-dot 1.1s infinite; }
        .duplex-typing span:nth-child(2) { animation-delay: 0.15s; }
        .duplex-typing span:nth-child(3) { animation-delay: 0.3s; }
      `}</style>
    </section>
  );
}
