import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowDown, ArrowUp, Bot, CheckCircle2, ChevronDown, ChevronUp, Clock3, FileText, Play, RotateCcw, StepForward, TerminalSquare, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiAgent,
  type AiTool,
  type Application,
  type CreateWorkflowBody,
  type Runtime,
  type Workflow,
  type WorkflowRun,
  type WorkflowRunStreamMessage,
  type WorkflowTraceEvent,
  type WorkflowStageBody,
  type WorkflowStatus
} from "@synosec/contracts";
import { fetchJson } from "@/lib/api";
import { useResourceDetail } from "@/hooks/useResourceDetail";
import { useResourceList } from "@/hooks/useResourceList";
import { aiAgentsResource, aiToolsResource, applicationsResource, runtimesResource, workflowsResource } from "@/lib/resources";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/components/list-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type WorkflowFormStage = {
  id: string;
  label: string;
  agentId: string;
};

type WorkflowFormValues = {
  name: string;
  status: WorkflowStatus;
  description: string;
  applicationId: string;
  runtimeId: string;
  stages: WorkflowFormStage[];
};

type RunAction = "starting" | "stepping" | null;
type StepVisualState = "completed" | "current" | "pending" | "running";
type RunStreamState = "idle" | "connecting" | "connected" | "disconnected";

const statusLabels: Record<WorkflowStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

function createStage(agentId = ""): WorkflowFormStage {
  return {
    id: crypto.randomUUID(),
    label: "",
    agentId
  };
}

function createEmptyFormValues(defaultApplicationId = "", defaultRuntimeId = "", defaultAgentId = ""): WorkflowFormValues {
  return {
    name: "",
    status: "draft",
    description: "",
    applicationId: defaultApplicationId,
    runtimeId: defaultRuntimeId,
    stages: [createStage(defaultAgentId)]
  };
}

function toFormValues(workflow: Workflow): WorkflowFormValues {
  return {
    name: workflow.name,
    status: workflow.status,
    description: workflow.description ?? "",
    applicationId: workflow.applicationId,
    runtimeId: workflow.runtimeId ?? "",
    stages: workflow.stages
      .slice()
      .sort((left, right) => left.ord - right.ord)
      .map((stage) => ({
        id: stage.id,
        label: stage.label,
        agentId: stage.agentId
      }))
  };
}

function toRequestBody(values: WorkflowFormValues): CreateWorkflowBody {
  return {
    name: values.name.trim(),
    status: values.status,
    description: values.description.trim() || null,
    applicationId: values.applicationId,
    runtimeId: values.runtimeId || null,
    stages: values.stages.map<WorkflowStageBody>((stage) => ({
      id: stage.id,
      label: stage.label.trim(),
      agentId: stage.agentId
    }))
  };
}

function validateForm(values: WorkflowFormValues) {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors["name"] = "Name is required.";
  }
  if (!values.applicationId) {
    errors["applicationId"] = "Application is required.";
  }
  if (values.stages.length === 0) {
    errors["stages"] = "At least one workflow stage is required.";
  }

  values.stages.forEach((stage, index) => {
    if (!stage.label.trim()) {
      errors[`stage-${index}-label`] = "Stage label is required.";
    }
    if (!stage.agentId) {
      errors[`stage-${index}-agentId`] = "Agent is required.";
    }
  });

  return errors;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

async function fetchLatestWorkflowRun(workflowId: string) {
  return fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflowId}/runs/latest`);
}

function ToolChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[0.6875rem] font-medium text-foreground">
      {label}
    </span>
  );
}

function getStepVisualState(state: StepVisualState) {
  if (state === "completed") {
    return {
      dot: "bg-emerald-500",
      rail: "border-emerald-500/30",
      card: "border-emerald-500/20 bg-emerald-500/[0.05]",
      badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    };
  }

  if (state === "running") {
    return {
      dot: "bg-primary",
      rail: "border-primary/40",
      card: "border-primary/25 bg-primary/[0.06]",
      badge: "border-primary/30 bg-primary/10 text-primary"
    };
  }

  if (state === "current") {
    return {
      dot: "bg-sky-500",
      rail: "border-sky-500/30",
      card: "border-sky-500/20 bg-sky-500/[0.05]",
      badge: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    };
  }

  return {
    dot: "bg-border",
    rail: "border-border",
    card: "border-border bg-background/60",
    badge: "border-border bg-background text-muted-foreground"
  };
}

function summarizeReason(value: string) {
  const firstSentence = value.split(/(?<=[.!?])\s+/)[0]?.trim();
  return firstSentence && firstSentence.length > 0 ? firstSentence : value;
}

function truncateText(value: string, maxLength = 180) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function formatEventType(type: WorkflowTraceEvent["type"]) {
  switch (type) {
    case "stage_started":
      return "Stage Started";
    case "agent_input":
      return "Agent Input";
    case "model_decision":
      return "Model Decision";
    case "tool_call":
      return "Tool Call";
    case "tool_result":
      return "Tool Result";
    case "agent_summary":
      return "Agent Summary";
    case "stage_completed":
      return "Stage Completed";
    case "stage_failed":
      return "Stage Failed";
  }
}

function getEventIcon(type: WorkflowTraceEvent["type"]) {
  switch (type) {
    case "stage_started":
      return Clock3;
    case "agent_input":
      return Bot;
    case "model_decision":
      return FileText;
    case "tool_call":
      return Wrench;
    case "tool_result":
      return TerminalSquare;
    case "agent_summary":
      return Activity;
    case "stage_completed":
      return CheckCircle2;
    case "stage_failed":
      return AlertCircle;
  }
}

function getEventTone(event: WorkflowTraceEvent) {
  if (event.status === "failed" || event.type === "stage_failed") {
    return {
      rail: "border-rose-500/35",
      dot: "bg-rose-500 text-white",
      card: "border-rose-500/20 bg-rose-500/[0.04]",
      badge: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    };
  }

  if (event.status === "running") {
    return {
      rail: "border-primary/35",
      dot: "bg-primary text-primary-foreground",
      card: "border-primary/20 bg-primary/[0.04]",
      badge: "border-primary/20 bg-primary/10 text-primary"
    };
  }

  if (event.type === "tool_call" || event.type === "tool_result") {
    return {
      rail: "border-amber-500/35",
      dot: "bg-amber-500 text-white",
      card: "border-amber-500/20 bg-amber-500/[0.04]",
      badge: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    };
  }

  if (event.type === "stage_completed") {
    return {
      rail: "border-emerald-500/35",
      dot: "bg-emerald-500 text-white",
      card: "border-emerald-500/20 bg-emerald-500/[0.04]",
      badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    };
  }

  return {
    rail: "border-sky-500/30",
    dot: "bg-sky-500 text-white",
    card: "border-sky-500/20 bg-sky-500/[0.04]",
    badge: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  };
}

function getEventToolLabels(event: WorkflowTraceEvent, toolLookup: Record<string, string>) {
  const payload = event.payload ?? {};

  if (Array.isArray(payload["selectedToolIds"])) {
    return payload["selectedToolIds"].map((toolId) => toolLookup[String(toolId)] ?? String(toolId));
  }

  if (typeof payload["toolName"] === "string" && payload["toolName"].length > 0) {
    return [payload["toolName"]];
  }

  return [];
}

function getEventPreview(event: WorkflowTraceEvent) {
  const payload = event.payload ?? {};

  if (typeof payload["outputPreview"] === "string" && payload["outputPreview"].length > 0) {
    return truncateText(payload["outputPreview"], 220);
  }

  if (typeof payload["reasoning"] === "string" && payload["reasoning"].length > 0) {
    return truncateText(payload["reasoning"], 220);
  }

  if (typeof payload["rawModelOutput"] === "string" && payload["rawModelOutput"].length > 0) {
    return truncateText(payload["rawModelOutput"], 220);
  }

  if (typeof event.detail === "string" && event.detail.length > 0) {
    return truncateText(event.detail, 220);
  }

  return null;
}

function getEventDetailText(event: WorkflowTraceEvent) {
  const payload = event.payload ?? {};

  if (typeof payload["fullOutput"] === "string" && payload["fullOutput"].length > 0) {
    return payload["fullOutput"];
  }

  if (typeof payload["rawModelOutput"] === "string" && payload["rawModelOutput"].length > 0) {
    return payload["rawModelOutput"];
  }

  if (typeof event.detail === "string" && event.detail.length > 0) {
    return event.detail;
  }

  return JSON.stringify(payload, null, 2);
}

function TraceSection({
  workflow,
  applications,
  runtimes,
  agents,
  tools,
  run,
  running,
  runAction,
  streamState,
  onStartRun,
  onNextStep,
  onReloadRun
}: {
  workflow: Workflow | null;
  applications: Application[];
  runtimes: Runtime[];
  agents: AiAgent[];
  tools: AiTool[];
  run: WorkflowRun | null;
  running: boolean;
  runAction: RunAction;
  streamState: RunStreamState;
  onStartRun: () => void;
  onNextStep: () => void;
  onReloadRun: () => void;
}) {
  const applicationLookup = useMemo(() => Object.fromEntries(applications.map((item) => [item.id, item.name])), [applications]);
  const runtimeLookup = useMemo(() => Object.fromEntries(runtimes.map((item) => [item.id, item.name])), [runtimes]);
  const agentLookup = useMemo(() => Object.fromEntries(agents.map((item) => [item.id, item])), [agents]);
  const toolLookup = useMemo(() => Object.fromEntries(tools.map((item) => [item.id, item.name])), [tools]);
  const [expandedEventIds, setExpandedEventIds] = useState<Record<string, boolean>>({});

  const orderedStages = workflow?.stages.slice().sort((left, right) => left.ord - right.ord) ?? [];
  const orderedEvents = run?.events.slice().sort((left, right) => left.ord - right.ord) ?? [];
  const eventsByStage = useMemo(() => {
    const grouped = new Map<string, WorkflowTraceEvent[]>();

    for (const event of orderedEvents) {
      const key = event.workflowStageId ?? `step-${event.stepIndex}`;
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(event);
      } else {
        grouped.set(key, [event]);
      }
    }

    return grouped;
  }, [orderedEvents]);
  const activeStageIndex = run?.status === "running" ? run.currentStepIndex : null;
  const activeActionLabel = runAction === "starting"
    ? "Starting workflow run..."
    : runAction === "stepping"
      ? "Executing current stage..."
      : null;
  const streamLabel = streamState === "connected"
    ? "Live stream connected"
    : streamState === "connecting"
      ? "Connecting live stream..."
      : streamState === "disconnected"
        ? "Live stream disconnected"
        : "Live stream idle";
  const streamTone = streamState === "connected"
    ? "bg-emerald-500"
    : streamState === "connecting"
      ? "bg-primary"
      : streamState === "disconnected"
        ? "bg-amber-500"
        : "bg-border";

  function toggleEvent(eventId: string) {
    setExpandedEventIds((current) => ({
      ...current,
      [eventId]: !current[eventId]
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">Agent Flow</p>
          <p className="text-sm text-muted-foreground">
            Start a run, advance one stage at a time, and inspect the tool choices and rationale below.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onStartRun} disabled={!workflow || running}>
            {runAction === "starting" ? <Spinner className="h-4 w-4 text-current" /> : <Play className="h-4 w-4" />}
            {runAction === "starting" ? "Starting Run..." : "Start Run"}
          </Button>
          <Button type="button" variant="outline" onClick={onNextStep} disabled={!run || run.status !== "running" || running}>
            {runAction === "stepping" ? <Spinner className="h-4 w-4 text-current" /> : <StepForward className="h-4 w-4" />}
            {runAction === "stepping" ? "Running Step..." : "Run Next Step"}
          </Button>
          <Button type="button" variant="outline" onClick={onReloadRun} disabled={!workflow || running}>
            <RotateCcw className="h-4 w-4" />
            Reload Run
          </Button>
        </div>
      </div>

      {activeActionLabel ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/50 px-3 py-2 text-sm text-foreground">
          <Spinner className="h-4 w-4" />
          <span>{activeActionLabel}</span>
        </div>
      ) : null}

      {workflow ? (
        <div className="grid gap-3 rounded-xl border border-border/80 bg-background/40 p-3 md:grid-cols-3">
          <div>
            <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Target</p>
            <p className="text-sm text-foreground">{applicationLookup[workflow.applicationId] ?? "Unknown application"}</p>
          </div>
          <div>
            <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Runtime</p>
            <p className="text-sm text-foreground">{workflow.runtimeId ? (runtimeLookup[workflow.runtimeId] ?? "Unknown runtime") : "Not set"}</p>
          </div>
          <div>
            <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Run Status</p>
            <p className="flex items-center gap-2 text-sm text-foreground">
              {running ? <Spinner className="h-4 w-4" /> : null}
              <span>{run ? `${run.status} · step ${run.currentStepIndex}/${orderedStages.length}` : "Idle"}</span>
            </p>
          </div>
          <div>
            <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Stream</p>
            <p className="flex items-center gap-2 text-sm text-foreground">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${streamTone}`} />
              <span>{streamLabel}</span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {orderedStages.map((stage, index) => {
          const agent = agentLookup[stage.agentId];
          const stageTrace = run?.trace.find((entry) => entry.workflowStageId === stage.id);
          const stageState = stageTrace
            ? "completed"
            : run && run.status === "running" && run.currentStepIndex === index
              ? "current"
              : run && run.currentStepIndex > index
                ? "completed"
                : "pending";
          const isActiveStage = activeStageIndex === index;
          const stageStatusLabel = isActiveStage && running ? "running" : stageState;

          return (
            <div
              key={stage.id}
              className={[
                "rounded-xl border border-border bg-background/50 p-3 transition-colors",
                isActiveStage ? "border-primary/50 bg-primary/5" : ""
              ].join(" ").trim()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Stage {index + 1}</p>
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {stage.label}
                    {isActiveStage && running ? <Spinner className="h-4 w-4" /> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{agent?.name ?? "Unknown agent"}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {stageStatusLabel}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Inherited Tools</p>
                <p className="text-sm text-foreground">
                  {agent?.toolIds.length
                    ? agent.toolIds.map((toolId) => toolLookup[toolId] ?? toolId).join(", ")
                    : "No tools assigned"}
                </p>
              </div>

              {isActiveStage ? (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  {running
                    ? "This stage is currently being executed. The trace entry will appear below when this step completes."
                    : "This is the active stage for the current run. Use Run Next Step to execute it and append a trace entry below."}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {orderedEvents.length ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">Run Timeline</p>
              <p className="text-sm text-muted-foreground">Chronological event stream grouped by stage, with hover detail and expandable raw output.</p>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{orderedEvents.length} event{orderedEvents.length === 1 ? "" : "s"}</p>
          </div>

          <div className="space-y-4">
            {orderedStages.map((stage, index) => {
              const stageEvents = eventsByStage.get(stage.id) ?? [];
              if (stageEvents.length === 0) {
                return null;
              }

              const agent = agentLookup[stage.agentId];
              const latestStageEvent = stageEvents[stageEvents.length - 1];
              const nextStage = orderedStages[index + 1];
              const stageState =
                latestStageEvent?.type === "stage_failed"
                  ? "failed"
                  : latestStageEvent?.type === "stage_completed"
                    ? "completed"
                    : run?.status === "running" && run.currentStepIndex === index
                      ? "running"
                      : "current";

              return (
                <div key={stage.id} className="rounded-2xl border border-border bg-background/60 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground">
                          Step {index + 1}
                        </span>
                        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground">
                          {stageState}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-foreground">{stage.label}</p>
                      <p className="text-sm text-muted-foreground">{agent?.name ?? "Unknown agent"}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Next handoff</p>
                      <p className="text-sm text-foreground">{nextStage?.label ?? "Workflow complete after this stage"}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {stageEvents.map((event, eventIndex) => {
                      const tone = getEventTone(event);
                      const Icon = getEventIcon(event.type);
                      const preview = getEventPreview(event);
                      const toolLabels = getEventToolLabels(event, toolLookup);
                      const isExpanded = expandedEventIds[event.id] ?? false;
                      const detailText = getEventDetailText(event);

                      return (
                        <div key={event.id} className="relative pl-10">
                          {eventIndex < stageEvents.length - 1 ? (
                            <div className={`absolute left-[0.95rem] top-7 h-[calc(100%-0.25rem)] border-l border-dashed ${tone.rail}`} />
                          ) : null}

                          <div className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-background shadow-sm ${tone.dot}`}>
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className={`group relative rounded-xl border p-3 ${tone.card}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-2 py-1 text-[0.625rem] uppercase tracking-[0.16em] ${tone.badge}`}>
                                    {formatEventType(event.type)}
                                  </span>
                                  <span className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">{event.status}</span>
                                  <span className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">{formatTimestamp(event.createdAt)}</span>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                                  <p className="text-sm text-muted-foreground">{event.summary}</p>
                                </div>

                                {toolLabels.length ? (
                                  <div className="flex flex-wrap gap-2">
                                    {toolLabels.map((label) => (
                                      <ToolChip key={`${event.id}-${label}`} label={label} />
                                    ))}
                                  </div>
                                ) : null}

                                {preview ? (
                                  <div className="rounded-lg border border-border/80 bg-background/70 px-3 py-2">
                                    <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Preview</p>
                                    <p className="mt-1 text-xs leading-6 text-foreground">{preview}</p>
                                  </div>
                                ) : null}
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={() => toggleEvent(event.id)}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                {isExpanded ? "Hide" : "Details"}
                              </Button>
                            </div>

                            <div className="pointer-events-none absolute right-4 top-12 z-10 hidden w-[26rem] rounded-xl border border-border bg-background p-3 shadow-xl lg:group-hover:block">
                              <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Hover Detail</p>
                              <p className="mt-2 text-xs leading-6 text-foreground">{truncateText(detailText, 420)}</p>
                            </div>

                            {isExpanded ? (
                              <div className="mt-3 grid gap-3 border-t border-border/70 pt-3 lg:grid-cols-[1.2fr_1fr]">
                                <div>
                                  <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Detail</p>
                                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-xs leading-6 text-foreground">
                                    {detailText}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Payload</p>
                                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-xs leading-6 text-foreground">
                                    {JSON.stringify(event.payload, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No run timeline yet. Start a workflow run to inspect stage-by-stage agent input, tool calls, tool results, and handoffs.
        </div>
      )}
    </div>
  );
}

export function WorkflowsPage({
  workflowId,
  workflowNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  workflowId?: string;
  workflowNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [formValues, setFormValues] = useState<WorkflowFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<WorkflowFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);
  const [runPending, setRunPending] = useState(false);
  const [runAction, setRunAction] = useState<RunAction>(null);
  const [runStreamState, setRunStreamState] = useState<RunStreamState>("idle");
  const isCreateMode = workflowId === "new";
  const workflowList = useResourceList(workflowsResource);
  const workflowDetail = useResourceDetail(workflowsResource, workflowId && workflowId !== "new" ? workflowId : null);

  useEffect(() => {
    let active = true;

    Promise.all([
      applicationsResource.list({ ...applicationsResource.defaultQuery, pageSize: 100 }),
      runtimesResource.list({ ...runtimesResource.defaultQuery, pageSize: 100 }),
      aiAgentsResource.list({ ...aiAgentsResource.defaultQuery, pageSize: 100 }),
      aiToolsResource.list({ ...aiToolsResource.defaultQuery, pageSize: 100 })
    ])
      .then(([applicationsResult, runtimesResult, agentsResult, toolsResult]) => {
        if (!active) {
          return;
        }

        setApplications(applicationsResult.items);
        setRuntimes(runtimesResult.items);
        setAgents(agentsResult.items);
        setTools(toolsResult.items);

        setFormValues((current) => {
          const defaultApplicationId = current.applicationId || applicationsResult.items[0]?.id || "";
          const defaultRuntimeId = current.runtimeId || "";
          const defaultAgentId = current.stages[0]?.agentId || agentsResult.items[0]?.id || "";

          return {
            ...current,
            applicationId: defaultApplicationId,
            runtimeId: defaultRuntimeId,
            stages: current.stages.length
              ? current.stages.map((stage) => ({ ...stage, agentId: stage.agentId || defaultAgentId }))
              : [createStage(defaultAgentId)]
          };
        });
      })
      .catch((error) => {
        toast.error("Failed to load workflow dependencies", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!workflowId) {
      return;
    }

    if (workflowId === "new") {
      const nextValues = createEmptyFormValues(applications[0]?.id ?? "", "", agents[0]?.id ?? "");
      setWorkflow(null);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      setCurrentRun(null);
      setRunAction(null);
      setRunStreamState("idle");
      setErrors({});
      return;
    }

    if (workflowDetail.state === "error") {
      toast.error("Workflow not found", { description: workflowDetail.message });
      onNavigateToList();
      return;
    }

    if (workflowDetail.state !== "loaded") {
      const nextValues = createEmptyFormValues(applications[0]?.id ?? "", "", agents[0]?.id ?? "");
      setWorkflow(null);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      setCurrentRun(null);
      setRunAction(null);
      setRunStreamState("idle");
      setErrors({});
      return;
    }

    const nextValues = toFormValues(workflowDetail.item);
    setWorkflow(workflowDetail.item);
    setFormValues(nextValues);
    setInitialValues(nextValues);
    setRunAction(null);
    setRunStreamState("idle");
    setErrors({});
  }, [workflowDetail, workflowId, onNavigateToList, applications, agents]);

  useEffect(() => {
    if (!workflow || isCreateMode) {
      setCurrentRun(null);
      return;
    }

    let active = true;

    fetchLatestWorkflowRun(workflow.id)
      .then((run) => {
        if (active) {
          setCurrentRun(run);
        }
      })
      .catch(() => {
        if (active) {
          setCurrentRun(null);
        }
      });

    return () => {
      active = false;
    };
  }, [workflow, isCreateMode]);

  useEffect(() => {
    if (!currentRun || currentRun.status !== "running") {
      setRunStreamState("idle");
      return;
    }

    const streamUrl = `${apiRoutes.workflowRuns}/${currentRun.id}/events`;
    const eventSource = new EventSource(streamUrl);
    setRunStreamState("connecting");

    eventSource.onopen = () => {
      setRunStreamState("connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WorkflowRunStreamMessage;
        setCurrentRun(payload.run);
      } catch {
        setRunStreamState("disconnected");
      }
    };

    eventSource.onerror = () => {
      setRunStreamState("disconnected");
    };

    return () => {
      eventSource.close();
    };
  }, [currentRun?.id, currentRun?.status]);

  const applicationLookup = useMemo(() => Object.fromEntries(applications.map((item) => [item.id, item.name])), [applications]);
  const agentLookup = useMemo(() => Object.fromEntries(agents.map((item) => [item.id, item])), [agents]);
  const toolLookup = useMemo(() => Object.fromEntries(tools.map((item) => [item.id, item.name])), [tools]);
  const filteredRuntimes = useMemo(
    () => runtimes.filter((runtime) => !formValues.applicationId || runtime.applicationId === formValues.applicationId),
    [formValues.applicationId, runtimes]
  );

  const columns = useMemo<ListPageColumn<Workflow>[]>(() => [
    { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { id: "applicationId", header: "Target", sortable: false, cell: (row) => <span className="text-muted-foreground">{applicationLookup[row.applicationId] ?? "Unknown"}</span> },
    { id: "status", header: "Status", cell: (row) => <span className="text-muted-foreground">{statusLabels[row.status]}</span> },
    { id: "stages", header: "Stages", sortable: false, cell: (row) => <span className="text-muted-foreground">{row.stages.length}</span> }
  ], [applicationLookup]);

  const filters = useMemo<ListPageFilter[]>(() => [
    {
      id: "status",
      label: "Filter by workflow status",
      placeholder: "Filter by status",
      allLabel: "All statuses",
      options: Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
    }
  ], []);

  const isDirty = JSON.stringify(formValues) !== JSON.stringify(initialValues);

  function handleFieldChange<Key extends keyof WorkflowFormValues>(field: Key, value: WorkflowFormValues[Key]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[String(field)];
      return next;
    });
  }

  function handleStageChange(index: number, nextStage: WorkflowFormStage) {
    setFormValues((current) => ({
      ...current,
      stages: current.stages.map((stage, stageIndex) => stageIndex === index ? nextStage : stage)
    }));
  }

  function moveStage(index: number, direction: -1 | 1) {
    setFormValues((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.stages.length) {
        return current;
      }

      const stages = current.stages.slice();
      const [stage] = stages.splice(index, 1);
      if (!stage) {
        return current;
      }
      stages.splice(nextIndex, 0, stage);
      return { ...current, stages };
    });
  }

  function addStage() {
    setFormValues((current) => ({
      ...current,
      stages: [...current.stages, createStage(agents[0]?.id ?? "")]
    }));
  }

  function removeStage(index: number) {
    setFormValues((current) => ({
      ...current,
      stages: current.stages.filter((_, stageIndex) => stageIndex !== index)
    }));
  }

  async function handleSave() {
    const nextErrors = validateForm(formValues);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Validation failed", { description: "Fix the highlighted workflow fields before saving." });
      return;
    }

    setSaving(true);

    try {
      const body = JSON.stringify(toRequestBody(formValues));

      if (isCreateMode || !workflow) {
        const created = await fetchJson<Workflow>(apiRoutes.workflows, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        toast.success("Workflow created");
        workflowList.refetch();
        onNavigateToDetail(created.id, created.name);
        return;
      }

      const updated = await fetchJson<Workflow>(`${apiRoutes.workflows}/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body
      });

      const nextValues = toFormValues(updated);
      setWorkflow(updated);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      workflowList.refetch();
      toast.success("Workflow updated");
    } catch (error) {
      toast.error("Workflow request failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleStartRun() {
    if (!workflow) {
      return;
    }

    setRunPending(true);
    setRunAction("starting");
    try {
      const run = await fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflow.id}/runs`, {
        method: "POST"
      });
      setCurrentRun(run);
      toast.success("Workflow run started");
    } catch (error) {
      toast.error("Failed to start workflow run", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRunPending(false);
      setRunAction(null);
    }
  }

  async function handleNextStep() {
    if (!currentRun) {
      return;
    }

    setRunPending(true);
    setRunAction("stepping");
    try {
      const run = await fetchJson<WorkflowRun>(`${apiRoutes.workflowRuns}/${currentRun.id}/step`, {
        method: "POST"
      });
      setCurrentRun(run);
      toast.success(run.status === "completed" ? "Workflow run completed" : "Workflow step completed");
    } catch (error) {
      toast.error("Failed to advance workflow run", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRunPending(false);
      setRunAction(null);
    }
  }

  async function handleReloadRun() {
    if (!workflow) {
      setCurrentRun(null);
      return;
    }

    setRunPending(true);
    try {
      const run = await fetchLatestWorkflowRun(workflow.id);
      setCurrentRun(run);
      toast.success("Workflow run reloaded");
    } catch (error) {
      setCurrentRun(null);
      toast.error("No persisted workflow run found", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRunPending(false);
      setRunAction(null);
    }
  }

  if (!workflowId) {
    return (
      <ListPage
        title="Workflows"
        recordLabel="Workflow"
        columns={columns}
        query={workflowList.query}
        dataState={workflowList.dataState}
        items={workflowList.items}
        meta={workflowList.meta}
        filters={filters}
        emptyMessage="No workflows have been configured yet."
        onSearchChange={workflowList.setSearch}
        onFilterChange={workflowList.setFilter}
        onSortChange={workflowList.setSort}
        onPageChange={workflowList.setPage}
        onPageSizeChange={workflowList.setPageSize}
        onRetry={workflowList.refetch}
        onAddRecord={onNavigateToCreate}
        onRowClick={(row) => onNavigateToDetail(row.id, row.name)}
      />
    );
  }

  if (!isCreateMode && workflowDetail.state !== "loaded") {
    return (
      <DetailLoadingState
        title={workflowNameHint ?? "Workflow detail"}
        breadcrumbs={["Start", "Workflows", workflowNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message="Loading workflow..."
      />
    );
  }

  return (
    <DetailPage
      title={isCreateMode ? "New workflow" : workflow?.name ?? "Workflow detail"}
      breadcrumbs={["Start", "Workflows", isCreateMode ? "New" : workflow?.name ?? "Detail"]}
      isDirty={isDirty}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={handleSave}
      onDismiss={() => {
        setFormValues(initialValues);
        setErrors({});
      }}
      sidebar={workflow ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
          <DetailSidebarItem label="Status">{statusLabels[workflow.status]}</DetailSidebarItem>
          <DetailSidebarItem label="Target">{applicationLookup[workflow.applicationId] ?? "Unknown"}</DetailSidebarItem>
          <DetailSidebarItem label="Stages">{workflow.stages.length}</DetailSidebarItem>
          <DetailSidebarItem label="Current Run">
            {currentRun ? `${currentRun.status} · ${currentRun.trace.length} traced` : "No active run"}
          </DetailSidebarItem>
          <DetailSidebarItem label="Updated">{formatTimestamp(workflow.updatedAt)}</DetailSidebarItem>
        </div>
      ) : undefined}
      relatedContent={
        <TraceSection
          workflow={workflow}
          applications={applications}
          runtimes={runtimes}
          agents={agents}
          tools={tools}
          run={currentRun}
          running={runPending}
          runAction={runAction}
          streamState={runStreamState}
          onStartRun={handleStartRun}
          onNextStep={handleNextStep}
          onReloadRun={handleReloadRun}
        />
      }
    >
      <DetailFieldGroup title="Workflow Configuration" className="bg-card/70">
        <DetailField label="Name" required {...definedString(errors["name"])}>
          <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>
        <DetailField label="Status" required>
          <Select value={formValues.status} onValueChange={(value) => handleFieldChange("status", value as WorkflowStatus)}>
            <SelectTrigger aria-label="Status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Application" required {...definedString(errors["applicationId"])}>
          <Select value={formValues.applicationId} onValueChange={(value) => handleFieldChange("applicationId", value)}>
            <SelectTrigger aria-label="Application">
              <SelectValue placeholder="Select application" />
            </SelectTrigger>
            <SelectContent>
              {applications.map((application) => (
                <SelectItem key={application.id} value={application.id}>{application.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Runtime">
          <Select value={formValues.runtimeId || "__none__"} onValueChange={(value) => handleFieldChange("runtimeId", value === "__none__" ? "" : value)}>
            <SelectTrigger aria-label="Runtime">
              <SelectValue placeholder="Select runtime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No runtime</SelectItem>
              {filteredRuntimes.map((runtime) => (
                <SelectItem key={runtime.id} value={runtime.id}>{runtime.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Description" className="md:col-span-2">
          <Textarea value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" rows={4} />
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Stages" className="bg-card/70">
        <div className="space-y-3 md:col-span-2">
          {formValues.stages.map((stage, index) => {
            const agent = agentLookup[stage.agentId];
            const inheritedTools = agent?.toolIds.map((toolId) => toolLookup[toolId] ?? toolId).join(", ") ?? "No tools assigned";

            return (
              <div key={stage.id} className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Stage {index + 1}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => moveStage(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => moveStage(index, 1)} disabled={index === formValues.stages.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => removeStage(index)} disabled={formValues.stages.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <DetailField label="Stage label" required {...definedString(errors[`stage-${index}-label`])}>
                    <Input
                      value={stage.label}
                      onChange={(event) => handleStageChange(index, { ...stage, label: event.target.value })}
                      aria-label={`Stage ${index + 1} label`}
                    />
                  </DetailField>
                  <DetailField label="Agent" required {...definedString(errors[`stage-${index}-agentId`])}>
                    <Select value={stage.agentId} onValueChange={(value) => handleStageChange(index, { ...stage, agentId: value })}>
                      <SelectTrigger aria-label={`Stage ${index + 1} agent`}>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agentOption) => (
                          <SelectItem key={agentOption.id} value={agentOption.id}>{agentOption.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DetailField>
                </div>

                <div className="space-y-1">
                  <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Inherited tools</p>
                  <p className="text-sm text-foreground">{inheritedTools}</p>
                </div>
              </div>
            );
          })}

          {errors["stages"] ? <p className="text-xs text-destructive">{errors["stages"]}</p> : null}

          <Button type="button" variant="outline" onClick={addStage}>
            Add Stage
          </Button>
        </div>
      </DetailFieldGroup>
    </DetailPage>
  );
}
