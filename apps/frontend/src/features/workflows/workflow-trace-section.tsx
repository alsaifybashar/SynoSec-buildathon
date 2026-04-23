import type { ReactNode } from "react";
import type { AiAgent, AiTool, Application, Runtime, Workflow, WorkflowRun } from "@synosec/contracts";
import { AlertTriangle, Bot, CircleHelp, LoaderCircle, RotateCcw, ShieldAlert, Target } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  buildWorkflowTranscript,
  getToolLookup,
  getWorkflowAllowedToolIds,
  type AssistantTurnDetail,
  type FindingsRailItem,
  type LiveModelOutput,
  type TranscriptProjection
} from "@/features/workflows/workflow-trace";

type SummaryCardData = {
  toolCount: number;
  toolNames: string[];
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

function SeverityBadge({ severity }: { severity: string }) {
  const tone =
    severity === "critical"
      ? "border-destructive/40 bg-destructive text-destructive-foreground"
      : severity === "high"
        ? "border-destructive/25 bg-destructive/90 text-destructive-foreground"
        : severity === "medium"
          ? "border-warning/35 bg-warning text-warning-foreground"
          : "border-primary/25 bg-primary/90 text-primary-foreground";

  return (
    <span className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]", tone)}>
      {severity}
    </span>
  );
}

function ThreadAvatar() {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-primary-foreground">
      <Bot className="h-3.5 w-3.5" />
    </span>
  );
}

function InlineExpandable({
  summary,
  body,
  monospace = true
}: {
  summary: string;
  body: string;
  monospace?: boolean;
}) {
  return (
    <details className="mt-2 rounded-md border border-border/70 bg-background/60 px-3 py-2">
      <summary className="cursor-pointer font-mono text-[0.68rem] uppercase tracking-[0.12em] text-primary">{summary}</summary>
      {monospace ? (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border border-border/70 bg-background px-3 py-3 font-mono text-[0.74rem] leading-6 text-foreground">
          {body}
        </pre>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{body}</p>
      )}
    </details>
  );
}

function MarkdownBlock({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn(
      "prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-medium prose-headings:text-foreground prose-p:my-3 prose-p:text-foreground prose-p:leading-7 prose-strong:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.9em] prose-pre:border prose-pre:border-border/70 prose-pre:bg-background prose-pre:text-foreground prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-foreground prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:text-foreground prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-hr:border-border prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-muted-foreground",
      className
    )}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function sanitizeAssistantBody(body: string, hasRenderedToolDetails: boolean) {
  const withoutWrapper = body
    .split("\n")
    .filter((line) => !/^The agent selected .*\.$/i.test(line.trim()))
    .join("\n")
    .trim();

  if (!hasRenderedToolDetails) {
    return withoutWrapper;
  }

  const withoutStructuredAction = withoutWrapper.replace(/\{[\s\S]*?"action"\s*:\s*"[^"]+"[\s\S]*?\}\s*/m, "").trim();
  return withoutStructuredAction;
}

function sanitizeAssistantSummary(summary: string, body: string) {
  const normalized = summary
    .split("\n")
    .filter((line) => !/^The agent selected .*\.$/i.test(line.trim()))
    .join("\n")
    .trim();
  if (!normalized || normalized === body) {
    return "";
  }
  return normalized;
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

function RunBar({
  workflow,
  run
}: {
  workflow: Workflow;
  run: WorkflowRun | null;
}) {
  const shortId = run?.id ? run.id.slice(0, 8) : workflow.id.slice(0, 8);
  const inFlight = run?.status === "running";
  return (
    <header className="sticky top-0 z-10 -mx-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
        Workflows · {workflow.name}
      </span>
      <span className="text-center text-sm font-medium tracking-[-0.01em] text-foreground">
        Run {shortId}
      </span>
      <span className="justify-self-end font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          {inFlight ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" /> : null}
          <span className={cn("h-1.5 w-1.5 rounded-full", run?.status === "failed" ? "bg-destructive" : "bg-success")} />
          {(run?.status ?? "idle")} · {formatDuration(run)}
        </span>
      </span>
    </header>
  );
}

function ThreadHeader({
  workflow,
  applicationName,
  runtimeName,
  toolNames
}: {
  workflow: Workflow;
  applicationName: string;
  runtimeName: string;
  toolNames: string[];
}) {
  return (
    <section className="space-y-5 pt-8">
      <div>
        <MonoLabel>Thread · Workflow Transcript · Hybrid Flow</MonoLabel>
        <h2 className="mt-4 text-[1.85rem] font-medium tracking-[-0.03em] text-foreground">{workflow.name}</h2>
        <p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted-foreground">
          {workflow.description || workflow.objective}
        </p>
      </div>
      <div className="flex flex-wrap border-y border-border/80">
        {[
          ["Target", applicationName],
          ["Runtime", runtimeName],
          ["Status", workflow.status],
          ["Tools", `${toolNames.length}`]
        ].map(([label, value]) => (
          <div key={label} className="min-w-[120px] border-r border-border/60 px-4 py-3 last:border-r-0">
            <MonoLabel>{label}</MonoLabel>
            <p className="mt-1 font-mono text-[0.78rem] font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PromptSections({
  items
}: {
  items: Extract<TranscriptProjection["items"][number], { kind: "system_message" }>[];
}) {
  if (items.length === 0) {
    return null;
  }

  const promptItems = items.filter((item) => {
    const title = item.title.toLowerCase();
    return title.includes("prompt");
  });

  if (promptItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 space-y-2">
      {promptItems.map((item) => {
        const body = item.body && item.body !== item.summary ? item.body : null;
        if (!body) {
          return null;
        }

        return (
          <div key={item.id} className="rounded-lg border border-border/80 bg-card px-4 py-3">
            <div className="mb-2 flex items-baseline gap-3">
              <MonoLabel className="text-foreground">{item.title}</MonoLabel>
              <span className="font-mono text-[0.68rem] text-muted-foreground">
                {compactDate(item.createdAt)}
              </span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{item.summary}</p>
            <InlineExpandable
              summary={`Show ${item.title}`}
              body={body}
            />
          </div>
        );
      })}
    </section>
  );
}

function FindingChip({ finding }: { finding: FindingsRailItem }) {
  return (
    <div className={cn(
      "mt-3 inline-grid max-w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border bg-card px-3 py-2",
      finding.severity === "high" || finding.severity === "critical"
        ? "border-destructive/25"
        : "border-warning/25"
    )}>
      <SeverityBadge severity={finding.severity} />
      <span className="min-w-0 text-sm font-medium text-foreground">{finding.title}</span>
      <span className="font-mono text-[0.68rem] text-muted-foreground">
        conf {finding.confidence.toFixed(2)}
      </span>
    </div>
  );
}

function ToolBlock({
  detail,
  tool
}: {
  detail: Extract<AssistantTurnDetail, { kind: "tool_call" | "tool_result" }>;
  tool: AiTool | undefined;
}) {
  const command = tool?.executorType === "bash" ? tool.bashSource : null;
  const statusText = detail.kind === "tool_result" ? detail.status : "running";
  const body = detail.kind === "tool_result" ? detail.body : detail.body;
  const failed = statusText === "failed";
  const running = statusText === "running";

  return (
    <div className={cn(
      "mt-4 overflow-hidden rounded-lg border bg-card",
      failed ? "border-destructive/35" : "border-border/80"
    )}>
      <div className={cn(
        "flex items-center gap-3 border-b px-4 py-2.5",
        failed ? "border-destructive/20 bg-destructive/8" : "border-border/70 bg-muted/35"
      )}>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">Tool</span>
        <span className="font-mono text-[0.76rem] font-semibold text-foreground">{detail.toolName}</span>
        {running ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" aria-label="Tool running" /> : null}
        {failed ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-label="Tool error" /> : null}
        <span className={cn(
          "ml-auto font-mono text-[0.62rem] uppercase tracking-[0.12em]",
          failed ? "text-destructive" : running ? "text-primary" : "text-success"
        )}>
          {running ? "running" : statusText}
        </span>
      </div>
      {command ? (
        <div className="border-b border-border/70 bg-background px-4 py-2 font-mono text-[0.74rem] text-muted-foreground">
          <span className="text-border">$ </span>
          {tool.binary}
        </div>
      ) : null}
      <div className="px-4 py-3">
        <p className="font-mono text-[0.72rem] text-foreground">{detail.title}</p>
        {detail.kind === "tool_result" && detail.summary ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail.summary}</p>
        ) : null}
        {detail.kind === "tool_result" && detail.observations.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {detail.observations.map((observation) => (
              <li key={observation} className="grid grid-cols-[14px_1fr] gap-2 text-sm leading-6 text-muted-foreground">
                <span className="font-mono text-border">—</span>
                <span>{observation}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {detail.kind === "tool_call" && detail.body ? (
          <InlineExpandable summary="Show tool input" body={detail.body} />
        ) : null}
        {command ? <InlineExpandable summary="Show tool command" body={command} /> : null}
        {detail.kind === "tool_result" && body ? (
          <InlineExpandable summary="Show tool response" body={body} />
        ) : null}
      </div>
    </div>
  );
}

function VerificationBlock({
  detail
}: {
  detail: Extract<AssistantTurnDetail, { kind: "verification" }>;
}) {
  const isFailure = detail.status === "failed";
  const isModelError = detail.tone === "model_error";
  const isToolError = detail.tone === "tool_error";
  const isRetry = detail.tone === "retry";

  return (
    <div className={cn(
      "mt-4 rounded-lg border px-4 py-3",
      isFailure
        ? "border-destructive/35 bg-destructive/8"
        : "border-border/70 bg-background/50"
    )}>
      <div className="flex items-center gap-2">
        {isFailure ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : <ShieldAlert className="h-3.5 w-3.5 text-primary" />}
        <MonoLabel className={cn("text-foreground", isFailure ? "text-destructive" : undefined)}>
          {isModelError ? "Model Error" : isToolError ? "Tool Error" : isRetry ? "Retry" : "Verification"}
        </MonoLabel>
        {isRetry ? <RotateCcw className="h-3.5 w-3.5 text-warning" /> : null}
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{detail.title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail.summary}</p>
      {isToolError ? (
        <p className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-destructive">
          retry policy · retry the tool, switch tools, or mark the layer as blocked
        </p>
      ) : null}
      {isModelError ? (
        <p className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-destructive">
          supported actions · call_tool, report_vulnerability, update_layer_coverage, submit_scan_completion
        </p>
      ) : null}
      {detail.body && detail.body !== detail.summary ? (
        <InlineExpandable summary="Show verification detail" body={detail.body} monospace={false} />
      ) : null}
    </div>
  );
}

function NoteBlock({
  detail
}: {
  detail: Extract<AssistantTurnDetail, { kind: "note" }>;
}) {
  return (
    <div className="mt-4 border-t border-border/70 pt-3">
      <MonoLabel className="text-foreground">Summary</MonoLabel>
      <p className="mt-2 text-sm font-medium text-foreground">{detail.title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail.summary}</p>
      {detail.body && detail.body !== detail.summary ? (
        <p className="mt-2 text-sm leading-6 text-foreground/90">{detail.body}</p>
      ) : null}
    </div>
  );
}

function ThreadTurn({
  item,
  ord,
  toolsById,
  toolsByName,
  findingsById
}: {
  item: Extract<TranscriptProjection["items"][number], { kind: "assistant_turn" }>;
  ord: number;
  toolsById: Map<string, AiTool>;
  toolsByName: Map<string, AiTool>;
  findingsById: Map<string, FindingsRailItem>;
}) {
  const toolDetails = item.details.filter((detail): detail is Extract<AssistantTurnDetail, { kind: "tool_call" | "tool_result" }> =>
    detail.kind === "tool_call" || detail.kind === "tool_result");
  const verificationDetails = item.details.filter((detail): detail is Extract<AssistantTurnDetail, { kind: "verification" }> => detail.kind === "verification");
  const noteDetails = item.details.filter((detail): detail is Extract<AssistantTurnDetail, { kind: "note" }> => detail.kind === "note");
  const hasModelError = verificationDetails.some((detail) => detail.tone === "model_error");
  const rawBodyText = item.body?.trim() ?? "";
  const suppressStructuredPrelude = toolDetails.length > 0 && rawBodyText.includes('"action"');
  const bodyText = suppressStructuredPrelude ? "" : sanitizeAssistantBody(rawBodyText, toolDetails.length > 0);
  const summaryText = sanitizeAssistantSummary(item.summary, bodyText);
  const hideBodyAsRawModelOutput = hasModelError && bodyText.startsWith("{") && bodyText.endsWith("}");

  return (
    <article className="border-b border-border/60 py-8 last:border-b-0">
      <div className="flex items-center gap-3">
        <ThreadAvatar />
        <span className="text-sm font-medium text-foreground">
          {item.agentName}
          <span className="ml-2 text-[0.82rem] font-normal text-muted-foreground">· workflow agent</span>
        </span>
        {item.live ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" aria-label="Run step in progress" /> : null}
        <span className="ml-auto font-mono text-[0.66rem] text-muted-foreground">
          <span className="mr-2 text-border">ord {String(ord).padStart(2, "0")}</span>
          {compactDate(item.createdAt)}
        </span>
      </div>
      <div className="mt-4 max-w-[62ch] space-y-3">
        {summaryText ? (
          <p className="text-[0.95rem] leading-7 text-foreground">{summaryText}</p>
        ) : null}
        {item.body && !hideBodyAsRawModelOutput ? (
          <MarkdownBlock content={item.body} className="text-[0.95rem]" />
        ) : null}
        {hideBodyAsRawModelOutput ? <InlineExpandable summary="Show raw model output" body={item.body ?? ""} /> : null}
        {item.live ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-sm text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" />
            Waiting for the next model step or tool result…
          </div>
        ) : null}
      </div>
      <div className="max-w-[42rem]">
        {toolDetails.map((detail) => {
          const tool = (detail.toolId ? toolsById.get(detail.toolId) : undefined) ?? toolsByName.get(detail.toolName);
          return <ToolBlock key={detail.id} detail={detail} tool={tool} />;
        })}
        {verificationDetails.map((detail) => <VerificationBlock key={detail.id} detail={detail} />)}
        {noteDetails.map((detail) => <NoteBlock key={detail.id} detail={detail} />)}
      </div>
      {item.findingIds.map((findingId) => {
        const finding = findingsById.get(findingId);
        return finding ? <FindingChip key={finding.id} finding={finding} /> : null;
      })}
    </article>
  );
}

function CloseoutSection({
  item,
  turnCount,
  toolCount,
  observationCount,
  findingCount
}: {
  item: Extract<TranscriptProjection["items"][number], { kind: "closeout" }>;
  turnCount: number;
  toolCount: number;
  observationCount: number;
  findingCount: number;
}) {
  return (
    <section className="mt-10 rounded-xl border border-border/80 bg-card px-6 py-6">
      <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-success">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />
        Run complete · sealed {compactDate(item.createdAt)}
      </div>
      <h3 className="mt-3 text-xl font-medium tracking-[-0.02em] text-foreground">{item.title}</h3>
      <p className="mt-2 max-w-[60ch] text-sm leading-6 text-muted-foreground">{item.summary}</p>
      {item.body && item.body !== item.summary ? (
        <p className="mt-2 max-w-[60ch] text-sm leading-6 text-foreground/90">{item.body}</p>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/70 pt-4 md:grid-cols-4">
        {[
          ["Turns", `${turnCount}`],
          ["Tools", `${toolCount}`],
          ["Observations", `${observationCount}`],
          ["Findings", `${findingCount}`]
        ].map(([label, value]) => (
          <div key={label} className="border-r border-border/60 pr-4 last:border-r-0">
            <MonoLabel>{label}</MonoLabel>
            <p className="mt-1 text-xl font-medium tracking-[-0.02em] text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FindingsRail({
  findings,
  runStatus
}: {
  findings: TranscriptProjection["findings"];
  runStatus: WorkflowRun["status"] | null;
}) {
  const shouldRender = findings.length > 0 || runStatus === "completed" || runStatus === "failed";
  if (!shouldRender) {
    return null;
  }

  return (
    <aside className="space-y-3 lg:sticky lg:top-6">
      <div className="rounded-xl border border-border/80 bg-card px-4 py-4">
        <div className="flex items-center gap-2">
          <MonoLabel>Findings</MonoLabel>
          <HelpHint
            label="Findings"
            hint="This side rail tracks issues the workflow explicitly reported while it was running. Inline chips in the thread show where they appeared."
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

export function WorkflowTraceSection({
  workflow,
  applications,
  runtimes,
  agents,
  tools,
  run,
  running,
  liveModelOutput,
  summaryCard
}: {
  workflow: Workflow | null;
  applications: Application[];
  runtimes: Runtime[];
  agents: AiAgent[];
  tools: AiTool[];
  run: WorkflowRun | null;
  running: boolean;
  liveModelOutput: LiveModelOutput | null;
  summaryCard: SummaryCardData;
}) {
  if (!workflow) {
    return null;
  }

  const toolLookup = getToolLookup(tools);
  const toolsById = new Map(tools.map((tool) => [tool.id, tool]));
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const transcript = buildWorkflowTranscript({
    workflow,
    run,
    agents,
    toolLookup,
    running,
    liveModelOutput
  });
  const findingsById = new Map(transcript.findings.map((finding) => [finding.id, finding]));
  const applicationName = applications.find((item) => item.id === workflow.applicationId)?.name ?? "Unknown application";
  const runtimeName = workflow.runtimeId
    ? (runtimes.find((item) => item.id === workflow.runtimeId)?.name ?? "Unknown runtime")
    : "No runtime";
  const inheritedToolIds = getWorkflowAllowedToolIds(workflow);
  const visibleToolNames = summaryCard.toolNames.length > 0
    ? summaryCard.toolNames
    : inheritedToolIds.map((toolId) => toolLookup[toolId] ?? toolId);

  const systemItems = transcript.items.filter((item): item is Extract<TranscriptProjection["items"][number], { kind: "system_message" }> => item.kind === "system_message");
  const threadItems = transcript.items.filter((item) => item.kind !== "system_message");
  const assistantTurns = threadItems.filter((item): item is Extract<TranscriptProjection["items"][number], { kind: "assistant_turn" }> => item.kind === "assistant_turn");
  const closeout = threadItems.find((item): item is Extract<TranscriptProjection["items"][number], { kind: "closeout" }> => item.kind === "closeout") ?? null;
  const toolCount = assistantTurns.reduce((total, turn) => total + turn.details.filter((detail) => detail.kind === "tool_call").length, 0);
  const observationCount = assistantTurns.reduce(
    (total, turn) => total + turn.details.reduce((turnTotal, detail) => detail.kind === "tool_result" ? turnTotal + detail.observations.length : turnTotal, 0),
    0
  );

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.75fr)]">
      <div className="min-w-0">
        <div className="overflow-hidden rounded-[1.25rem] border border-border/80 bg-background px-4 shadow-[0_16px_50px_-36px_hsl(var(--foreground)/0.18)] md:px-6">
          <RunBar workflow={workflow} run={run} />
          <div className="mx-auto max-w-[54rem] pb-12">
            <ThreadHeader
              workflow={workflow}
              applicationName={applicationName}
              runtimeName={runtimeName}
              toolNames={visibleToolNames}
            />
            <PromptSections items={systemItems} />
            <div className="mt-2">
              {assistantTurns.map((item, index) => (
                <ThreadTurn
                  key={item.id}
                  item={item}
                  ord={index + 1}
                  toolsById={toolsById}
                  toolsByName={toolsByName}
                  findingsById={findingsById}
                />
              ))}
            </div>
            {closeout ? (
              <CloseoutSection
                item={closeout}
                turnCount={assistantTurns.length}
                toolCount={toolCount}
                observationCount={observationCount}
                findingCount={transcript.findings.length}
              />
            ) : null}
            <div className="sticky bottom-0 mt-10 bg-gradient-to-b from-transparent to-background px-2 pt-8">
              <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 shadow-[0_1px_0_hsl(var(--foreground)/0.04)]">
                {run?.status === "running" ? <LoaderCircle className="h-4 w-4 animate-spin text-primary" aria-label="Run in progress" /> : null}
                <input
                  disabled
                  value=""
                  placeholder={run?.status === "completed" || run?.status === "failed"
                    ? "Run is sealed — replay, branch, or spawn a follow-up probe…"
                    : "Collecting evidence, waiting for the next agent step…"}
                  className="flex-1 bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground"
                />
                <span className="rounded border border-border/70 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                  run
                </span>
                <button
                  type="button"
                  disabled
                  className="h-7 w-7 rounded-md bg-foreground text-[0.85rem] text-background opacity-40"
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <FindingsRail findings={transcript.findings} runStatus={run?.status ?? null} />
    </section>
  );
}
