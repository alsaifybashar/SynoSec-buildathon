import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  FileText,
  Layers3,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Sparkles,
  StepForward,
  Target,
  TerminalSquare,
  Trash2,
  Waypoints,
  Wrench
} from "lucide-react";
import { toast } from "sonner";
import {
  apiRoutes,
  deriveWorkflowRunExecutionContract,
  deriveWorkflowStageLifecycleState,
  type AiAgent,
  type AiTool,
  type Application,
  type CreateWorkflowBody,
  type Runtime,
  type Workflow,
  type WorkflowRun,
  type WorkflowRunStreamMessage,
  type WorkflowStageBody,
  type WorkflowStatus,
  type WorkflowTraceEvent
} from "@synosec/contracts";
import { fetchJson } from "@/lib/api";
import {
  aiAgentsResource,
  aiToolsResource,
  applicationsResource,
  runtimesResource,
  workflowsResource
} from "@/lib/resources";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/lib/utils";

type StageDraft = {
  id: string;
  label: string;
  agentId: string;
  objective: string;
  allowedToolIds: string[];
};

type FlowDraft = {
  name: string;
  status: WorkflowStatus;
  description: string;
  applicationId: string;
  runtimeId: string;
  stages: StageDraft[];
};

type RunAction = "starting" | "stepping" | null;
type StreamState = "idle" | "connecting" | "connected" | "disconnected";

const statusLabels: Record<WorkflowStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

function createLocalId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyStage(agentId = ""): StageDraft {
  return { id: createLocalId(), label: "", agentId, objective: "", allowedToolIds: [] };
}

function emptyDraft(applicationId = "", agentId = ""): FlowDraft {
  return {
    name: "",
    status: "draft",
    description: "",
    applicationId,
    runtimeId: "",
    stages: [emptyStage(agentId)]
  };
}

function draftFromWorkflow(workflow: Workflow): FlowDraft {
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
        agentId: stage.agentId,
        objective: stage.objective,
        allowedToolIds: stage.allowedToolIds
      }))
  };
}

function draftToBody(draft: FlowDraft): CreateWorkflowBody {
  return {
    name: draft.name.trim(),
    status: draft.status,
    description: draft.description.trim() || null,
    applicationId: draft.applicationId,
    runtimeId: draft.runtimeId || null,
    stages: draft.stages.map<WorkflowStageBody>((stage) => ({
      id: stage.id,
      label: stage.label.trim(),
      agentId: stage.agentId,
      objective: stage.objective.trim() || `Complete the ${stage.label.trim()} stage using allowed tools and structured reporting.`,
      allowedToolIds: stage.allowedToolIds,
      requiredEvidenceTypes: [],
      findingPolicy: {
        taxonomy: "typed-core-v1",
        allowedTypes: [
          "service_exposure",
          "content_discovery",
          "missing_security_header",
          "tls_weakness",
          "injection_signal",
          "auth_weakness",
          "sensitive_data_exposure",
          "misconfiguration",
          "other"
        ]
      },
      completionRule: {
        requireStageResult: true,
        requireToolCall: false,
        allowEmptyResult: true,
        minFindings: 0
      },
      resultSchemaVersion: 1,
      handoffSchema: null
    }))
  };
}

function validateDraft(draft: FlowDraft) {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors["name"] = "Flow name is required.";
  if (!draft.applicationId) errors["applicationId"] = "A target application is required.";
  if (draft.stages.length === 0) errors["stages"] = "Add at least one stage.";
  draft.stages.forEach((stage, index) => {
    if (!stage.label.trim()) errors[`stage-${index}-label`] = "Label required.";
    if (!stage.agentId) errors[`stage-${index}-agent`] = "Pick an agent.";
  });
  return errors;
}

function formatClock(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}

function formatElapsed(ms: number) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function agentInitials(name: string | undefined) {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || name.slice(0, 2).toUpperCase();
}

function formatEventType(type: WorkflowTraceEvent["type"]) {
  switch (type) {
    case "stage_started": return "stage opened";
    case "agent_input": return "agent input";
    case "model_decision": return "model decision";
    case "tool_call": return "tool call";
    case "tool_result": return "tool result";
    case "finding_reported": return "finding reported";
    case "stage_result_submitted": return "stage result";
    case "stage_contract_validation_failed": return "contract failed";
    case "agent_summary": return "agent summary";
    case "stage_completed": return "stage complete";
    case "stage_failed": return "stage failed";
    default: return "workflow event";
  }
}

function eventIcon(type: WorkflowTraceEvent["type"]) {
  switch (type) {
    case "stage_started": return Clock3;
    case "agent_input": return Bot;
    case "model_decision": return FileText;
    case "tool_call": return Wrench;
    case "tool_result": return TerminalSquare;
    case "finding_reported": return AlertCircle;
    case "stage_result_submitted": return CheckCircle2;
    case "stage_contract_validation_failed": return AlertCircle;
    case "agent_summary": return Activity;
    case "stage_completed": return CheckCircle2;
    case "stage_failed": return AlertCircle;
    default: return Activity;
  }
}

function eventAccent(event: WorkflowTraceEvent) {
  if (event.status === "failed" || event.type === "stage_failed") return "text-rose-500 ring-rose-500/40";
  if (event.type === "stage_completed") return "text-emerald-500 ring-emerald-500/40";
  if (event.type === "tool_call" || event.type === "tool_result") return "text-amber-600 dark:text-amber-400 ring-amber-500/40";
  if (event.type === "model_decision") return "text-primary ring-primary/40";
  return "text-sky-600 dark:text-sky-400 ring-sky-500/40";
}

function truncate(value: string, max = 140) {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

async function fetchLatestRun(workflowId: string) {
  return fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflowId}/runs/latest`);
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-muted-foreground/80", className)}>
      {children}
    </p>
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

function StageNumeral({ index, tone }: { index: number; tone: "pending" | "current" | "running" | "completed" | "failed" }) {
  const display = String(index + 1).padStart(2, "0");
  const palette =
    tone === "running"
      ? "text-primary"
      : tone === "completed"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "failed"
          ? "text-rose-500"
          : tone === "current"
            ? "text-foreground"
            : "text-muted-foreground/60";
  return (
    <span className={cn("font-mono text-[2.25rem] font-semibold leading-none tabular-nums tracking-tight", palette)}>
      {display}
    </span>
  );
}

function AgentPortrait({ name, tone = "idle", className }: { name: string | undefined; tone?: "idle" | "active" | "success" | "failed"; className?: string }) {
  const initials = agentInitials(name);
  const ring =
    tone === "active"
      ? "ring-primary/60 shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
      : tone === "success"
        ? "ring-emerald-500/50"
        : tone === "failed"
          ? "ring-rose-500/50"
          : "ring-border";
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-background to-muted font-mono text-sm font-semibold tracking-[0.2em] text-foreground ring-2 ring-offset-2 ring-offset-background transition-shadow",
          ring
        )}
        style={{ clipPath: "polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)" }}
      >
        {initials}
      </div>
      {tone === "active" ? (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-primary/80"
        />
      ) : null}
      {tone === "active" ? (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary"
        />
      ) : null}
    </div>
  );
}

function KeycapHint({ combo, label }: { combo: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/80">
      <kbd className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[0.625rem] font-semibold text-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]">
        {combo}
      </kbd>
      <span>{label}</span>
    </span>
  );
}

function ToolBead({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-foreground">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary/80" />
      {label}
    </span>
  );
}

function RunPill({ status, streaming }: { status: WorkflowRun["status"] | "idle"; streaming: boolean }) {
  const tone =
    status === "running"
      ? "bg-primary/12 text-primary ring-primary/30"
      : status === "completed"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30"
        : status === "failed"
          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/30"
          : status === "pending"
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30"
            : "bg-muted text-muted-foreground ring-border";
  const label = status === "idle" ? "idle" : status;
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.18em] ring-1", tone)}>
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "running"
            ? "animate-pulse bg-primary"
            : status === "completed"
              ? "bg-emerald-500"
              : status === "failed"
                ? "bg-rose-500"
                : status === "pending"
                  ? "bg-amber-500"
                  : "bg-muted-foreground/60"
        )}
      />
      {label}
      {streaming ? <span className="font-mono text-[0.6rem] tracking-[0.2em] text-primary">· live</span> : null}
    </span>
  );
}

export function FlowStudioPage({
  workflowId,
  onNavigateToRoot,
  onNavigateToFlow
}: {
  workflowId?: string;
  onNavigateToRoot: () => void;
  onNavigateToFlow: (id: string) => void;
}) {
  const [workflowList, setWorkflowList] = useState<Workflow[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [draft, setDraft] = useState<FlowDraft>(() => emptyDraft());
  const [baseline, setBaseline] = useState<FlowDraft>(() => emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dependenciesReady, setDependenciesReady] = useState(false);
  const [flowLoading, setFlowLoading] = useState(false);

  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);
  const [runAction, setRunAction] = useState<RunAction>(null);
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);

  const ledgerRef = useRef<HTMLDivElement | null>(null);

  const isCreateMode = workflowId === "new";
  const selectedWorkflowId = workflowId && workflowId !== "new" ? workflowId : null;

  const applicationLookup = useMemo(() => Object.fromEntries(applications.map((item) => [item.id, item])), [applications]);
  const runtimeLookup = useMemo(() => Object.fromEntries(runtimes.map((item) => [item.id, item])), [runtimes]);
  const agentLookup = useMemo(() => Object.fromEntries(agents.map((item) => [item.id, item])), [agents]);
  const toolLookup = useMemo(() => Object.fromEntries(tools.map((item) => [item.id, item])), [tools]);
  const filteredRuntimes = useMemo(
    () => runtimes.filter((runtime) => !draft.applicationId || runtime.applicationId === draft.applicationId),
    [draft.applicationId, runtimes]
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      workflowsResource.list({ ...workflowsResource.defaultQuery, pageSize: 100 }),
      applicationsResource.list({ ...applicationsResource.defaultQuery, pageSize: 100 }),
      runtimesResource.list({ ...runtimesResource.defaultQuery, pageSize: 100 }),
      aiAgentsResource.list({ ...aiAgentsResource.defaultQuery, pageSize: 100 }),
      aiToolsResource.list({ ...aiToolsResource.defaultQuery, pageSize: 100 })
    ])
      .then(([flowsResult, appsResult, runtimesResult, agentsResult, toolsResult]) => {
        if (!active) return;
        setWorkflowList(flowsResult.items);
        setApplications(appsResult.items);
        setRuntimes(runtimesResult.items);
        setAgents(agentsResult.items);
        setTools(toolsResult.items);
        setDependenciesReady(true);
      })
      .catch((error) => {
        toast.error("Failed to load studio", { description: error instanceof Error ? error.message : "Unknown error" });
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshFlowList = useCallback(async () => {
    try {
      const response = await workflowsResource.list({ ...workflowsResource.defaultQuery, pageSize: 100 });
      setWorkflowList(response.items);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (!dependenciesReady) return;

    if (isCreateMode) {
      const values = emptyDraft(applications[0]?.id ?? "", agents[0]?.id ?? "");
      setWorkflow(null);
      setDraft(values);
      setBaseline(values);
      setActiveStageId(values.stages[0]?.id ?? null);
      setCurrentRun(null);
      setStreamState("idle");
      setErrors({});
      return;
    }

    if (!selectedWorkflowId) {
      const preferred = workflowList.find((item) => item.status === "active") ?? workflowList[0];
      if (preferred) {
        onNavigateToFlow(preferred.id);
        return;
      }
      const values = emptyDraft(applications[0]?.id ?? "", agents[0]?.id ?? "");
      setWorkflow(null);
      setDraft(values);
      setBaseline(values);
      setActiveStageId(null);
      setCurrentRun(null);
      setStreamState("idle");
      setErrors({});
      return;
    }

    let active = true;
    setFlowLoading(true);
    workflowsResource
      .detail(selectedWorkflowId)
      .then((record) => {
        if (!active) return;
        const values = draftFromWorkflow(record);
        setWorkflow(record);
        setDraft(values);
        setBaseline(values);
        setActiveStageId(values.stages[0]?.id ?? null);
        setErrors({});
      })
      .catch((error) => {
        toast.error("Flow not found", { description: error instanceof Error ? error.message : "Unknown error" });
        onNavigateToRoot();
      })
      .finally(() => {
        if (active) setFlowLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedWorkflowId, isCreateMode, dependenciesReady, applications, agents, workflowList, onNavigateToRoot, onNavigateToFlow]);

  useEffect(() => {
    if (!workflow) {
      setCurrentRun(null);
      return;
    }
    let active = true;
    fetchLatestRun(workflow.id)
      .then((run) => {
        if (active) setCurrentRun(run);
      })
      .catch(() => {
        if (active) setCurrentRun(null);
      });
    return () => {
      active = false;
    };
  }, [workflow]);

  useEffect(() => {
    if (!currentRun || currentRun.status !== "running") {
      setStreamState("idle");
      return;
    }
    const url = `${apiRoutes.workflowRuns}/${currentRun.id}/events`;
    const es = new EventSource(url);
    setStreamState("connecting");
    es.onopen = () => setStreamState("connected");
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WorkflowRunStreamMessage;
        setCurrentRun(payload.run);
      } catch {
        setStreamState("disconnected");
      }
    };
    es.onerror = () => setStreamState("disconnected");
    return () => {
      es.close();
    };
  }, [currentRun?.id, currentRun?.status]);

  useEffect(() => {
    if (!currentRun || currentRun.status !== "running") {
      return;
    }
    const started = new Date(currentRun.startedAt).getTime();
    setElapsedMs(Date.now() - started);
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - started);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [currentRun?.id, currentRun?.status, currentRun?.startedAt]);

  useEffect(() => {
    if (ledgerRef.current) {
      ledgerRef.current.scrollTop = 0;
    }
  }, [currentRun?.events.length]);

  const orderedStages = draft.stages;
  const runStages = useMemo(() => workflow?.stages.slice().sort((left, right) => left.ord - right.ord) ?? [], [workflow]);
  const orderedEvents = useMemo(() => currentRun?.events.slice().sort((left, right) => right.ord - left.ord) ?? [], [currentRun]);
  const runContract = useMemo(() => deriveWorkflowRunExecutionContract(currentRun, runStages), [currentRun, runStages]);

  const currentRunStepIndex = currentRun?.currentStepIndex ?? 0;
  const derivedActiveStageId = runStages[Math.min(currentRunStepIndex, runStages.length - 1)]?.id
    ?? runStages[0]?.id
    ?? activeStageId;

  const focusStageId = currentRun && currentRun.status === "running" ? derivedActiveStageId : activeStageId ?? derivedActiveStageId;
  const focusStage = orderedStages.find((stage) => stage.id === focusStageId) ?? orderedStages[0] ?? null;
  const focusStageIndex = focusStage ? orderedStages.indexOf(focusStage) : 0;
  const focusAgent = focusStage ? agentLookup[focusStage.agentId] : undefined;
  const focusWorkflowStage = workflow?.stages.find((stage) => stage.id === focusStage?.id);
  const focusLifecycle = focusWorkflowStage ? deriveWorkflowStageLifecycleState(currentRun, focusWorkflowStage) : "pending";
  const focusEvents = useMemo(() => {
    if (!focusStage || !currentRun) return [] as WorkflowTraceEvent[];
    return currentRun.events
      .filter((event) => event.workflowStageId === focusStage.id)
      .sort((left, right) => left.ord - right.ord);
  }, [currentRun, focusStage]);
  const focusTrace = useMemo(() => {
    if (!focusStage || !currentRun) return undefined;
    return currentRun.trace.find((entry) => entry.workflowStageId === focusStage.id);
  }, [currentRun, focusStage]);

  const focusDecision = focusEvents.find((event) => event.type === "model_decision");
  const focusSummary = focusEvents.find((event) => event.type === "agent_summary");
  const focusTerminal = [...focusEvents].reverse().find((event) => event.type === "stage_completed" || event.type === "stage_failed");
  const focusIntent = focusTrace?.targetSummary ?? "Stage intent will appear once the run begins.";
  const focusReason = focusDecision?.detail ?? focusTrace?.toolSelectionReason ?? "Awaiting model decision.";
  const focusOutcome = focusTerminal?.summary ?? focusSummary?.summary ?? (focusLifecycle === "running" ? "In flight." : "No outcome yet.");
  const inheritedTools = focusAgent?.toolIds.map((toolId) => toolLookup[toolId]?.name ?? toolId) ?? [];
  const stageTools = focusTrace?.selectedToolIds?.length
    ? focusTrace.selectedToolIds.map((toolId) => toolLookup[toolId]?.name ?? toolId)
    : inheritedTools;

  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const runBusy = runAction !== null;
  const canStart = Boolean(workflow) && !runBusy && (!currentRun || currentRun.status !== "running");
  const canStep = Boolean(currentRun) && currentRun?.status === "running" && !runBusy;

  function patchDraft<Key extends keyof FlowDraft>(field: Key, value: FlowDraft[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[String(field)];
      return next;
    });
  }

  function patchStage(index: number, next: StageDraft) {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((stage, stageIndex) => (stageIndex === index ? next : stage))
    }));
    setErrors((current) => {
      const clone = { ...current };
      delete clone[`stage-${index}-label`];
      delete clone[`stage-${index}-agent`];
      return clone;
    });
  }

  function moveStage(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.stages.length) return current;
      const stages = current.stages.slice();
      const [moved] = stages.splice(index, 1);
      if (!moved) return current;
      stages.splice(nextIndex, 0, moved);
      return { ...current, stages };
    });
  }

  function addStage() {
    const stage = emptyStage(agents[0]?.id ?? "");
    setDraft((current) => ({ ...current, stages: [...current.stages, stage] }));
    setActiveStageId(stage.id);
  }

  function removeStage(index: number) {
    setDraft((current) => {
      if (current.stages.length === 1) return current;
      const stages = current.stages.filter((_, i) => i !== index);
      return { ...current, stages };
    });
  }

  async function saveDraft() {
    const nextErrors = validateDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Validation failed", { description: "Fix the highlighted fields before saving." });
      return;
    }
    setSaving(true);
    try {
      const body = JSON.stringify(draftToBody(draft));
      if (isCreateMode || !workflow) {
        const created = await fetchJson<Workflow>(apiRoutes.workflows, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        toast.success("Flow created", { description: `${created.name} is live in the studio.` });
        await refreshFlowList();
        onNavigateToFlow(created.id);
      } else {
        const updated = await fetchJson<Workflow>(`${apiRoutes.workflows}/${workflow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body
        });
        const values = draftFromWorkflow(updated);
        setWorkflow(updated);
        setDraft(values);
        setBaseline(values);
        toast.success("Flow updated");
        await refreshFlowList();
      }
    } catch (error) {
      toast.error("Save failed", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  }

  async function startRun() {
    if (!workflow) return;
    setRunAction("starting");
    try {
      const run = await fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflow.id}/runs`, { method: "POST" });
      setCurrentRun(run);
      toast.success("Run initiated", { description: "Live ledger armed." });
    } catch (error) {
      toast.error("Failed to start run", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setRunAction(null);
    }
  }

  async function stepRun() {
    if (!currentRun) return;
    setRunAction("stepping");
    try {
      const run = await fetchJson<WorkflowRun>(`${apiRoutes.workflowRuns}/${currentRun.id}/step`, { method: "POST" });
      setCurrentRun(run);
      toast.success(run.status === "completed" ? "Run completed" : "Stage advanced");
    } catch (error) {
      toast.error("Step failed", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setRunAction(null);
    }
  }

  async function reloadRun() {
    if (!workflow) return;
    setRunAction("stepping");
    try {
      const run = await fetchLatestRun(workflow.id);
      setCurrentRun(run);
      toast.success("Run reloaded");
    } catch (error) {
      setCurrentRun(null);
      toast.error("No persisted run", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setRunAction(null);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === " " && canStep) {
        event.preventDefault();
        void stepRun();
        return;
      }
      if (event.key === "Enter" && canStart) {
        event.preventDefault();
        void startRun();
        return;
      }
      if (event.key === "Escape" && currentRun && !runBusy) {
        event.preventDefault();
        void reloadRun();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canStep, canStart, currentRun, runBusy]);

  const runStatus = currentRun?.status ?? "idle";

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)/0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.35) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at top, black 40%, transparent 85%)"
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: "radial-gradient(ellipse at top, hsl(var(--primary)/0.08), transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 pb-10 pt-5 md:gap-6 md:px-5 2xl:px-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.32em] text-muted-foreground">
            <span>Studio</span>
            <ChevronRight aria-hidden className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-foreground/80">Flow Composer</span>
            <span aria-hidden className="mx-1 hidden h-px w-8 bg-border md:block" />
            <span className="hidden font-sans text-[0.6875rem] italic tracking-normal text-muted-foreground/70 md:inline">
              blueprint · drafting · live ops
            </span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="relative min-w-0">
              <span aria-hidden className="absolute -left-3 top-1 h-10 w-0.5 bg-gradient-to-b from-primary/80 to-transparent" />
              <h1 className="font-mono text-[2rem] font-semibold leading-none tracking-[-0.02em] text-foreground lg:text-[2.25rem] 2xl:text-[2.5rem]">
                flow<span className="text-primary">·</span>studio
              </h1>
              <p className="mt-2 max-w-xl text-[0.8125rem] leading-6 text-muted-foreground lg:text-sm">
                Compose agent flows stage by stage, run them, watch the trace unfold — blank slate to live execution in one room.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-3 border-l border-border/70 pl-3 2xl:flex">
                <KeycapHint combo="⏎" label="start" />
                <KeycapHint combo="␣" label="step" />
                <KeycapHint combo="⎋" label="reload" />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigateToFlow("new")}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                New Flow
              </Button>
              <Button type="button" onClick={saveDraft} disabled={!isDirty || saving} className="h-9 gap-2">
                {saving ? <Spinner className="h-4 w-4 text-current" /> : <Sparkles className="h-4 w-4" />}
                {saving ? "Saving…" : isCreateMode ? "Commit Flow" : "Save Flow"}
              </Button>
            </div>
          </div>
        </header>

        {/* flow strip */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/70 px-4 py-3 backdrop-blur">
          <CornerMarks />
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <Waypoints aria-hidden className="h-4 w-4 text-primary" />
              <SectionLabel>Library</SectionLabel>
              <span className="font-mono text-[0.6875rem] text-muted-foreground">
                {workflowList.length.toString().padStart(2, "0")} flow{workflowList.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5">
              {workflowList.length === 0 ? (
                <span className="px-2 py-1 font-mono text-[0.6875rem] italic text-muted-foreground">
                  no flows yet — spin up a new blueprint ↗
                </span>
              ) : null}
              {workflowList.map((item) => {
                const isSelected = item.id === workflow?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigateToFlow(item.id)}
                    className={cn(
                      "group relative inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition-colors",
                      isSelected
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-border/80 bg-background/60 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-primary" : "bg-muted-foreground/40")} />
                    <span className="font-medium text-[0.8125rem] text-foreground">{item.name}</span>
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {statusLabels[item.status]} · {item.stages.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* main canvas */}
        {!workflowId && !flowLoading ? (
          <EmptyCanvas onCreate={() => onNavigateToFlow("new")} flowsAvailable={workflowList.length > 0} />
        ) : flowLoading ? (
          <div className="flex h-[32rem] items-center justify-center rounded-2xl border border-border/70 bg-card/60">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Loading blueprint…
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,22rem)]">
            {/* === LEFT: design rail === */}
            <section className="relative space-y-4 rounded-2xl border border-border/80 bg-card/70 p-4 backdrop-blur md:p-5 lg:row-span-2 2xl:row-span-1">
              <CornerMarks />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <SectionLabel>Design</SectionLabel>
                  <p className="text-sm font-medium text-foreground">Blueprint</p>
                </div>
                <Layers3 aria-hidden className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                    Flow name{errors["name"] ? <span className="ml-1 text-destructive">·{errors["name"]}</span> : null}
                  </label>
                  <Input
                    value={draft.name}
                    onChange={(event) => patchDraft("name", event.target.value)}
                    placeholder="untitled blueprint"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                      Status
                    </label>
                    <Select value={draft.status} onValueChange={(value) => patchDraft("status", value as WorkflowStatus)}>
                      <SelectTrigger className="h-9 text-[0.75rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                      Stages
                    </label>
                    <div className="flex h-9 items-center rounded-md border border-border bg-background/60 px-3 font-mono text-[0.75rem] tabular-nums text-foreground">
                      {String(draft.stages.length).padStart(2, "0")}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                    Target application{errors["applicationId"] ? <span className="ml-1 text-destructive">·required</span> : null}
                  </label>
                  <Select value={draft.applicationId || ""} onValueChange={(value) => patchDraft("applicationId", value)}>
                    <SelectTrigger className="h-9 text-[0.75rem]">
                      <SelectValue placeholder="pick application" />
                    </SelectTrigger>
                    <SelectContent>
                      {applications.map((app) => (
                        <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                    Runtime
                  </label>
                  <Select
                    value={draft.runtimeId || "__none__"}
                    onValueChange={(value) => patchDraft("runtimeId", value === "__none__" ? "" : value)}
                  >
                    <SelectTrigger className="h-9 text-[0.75rem]">
                      <SelectValue placeholder="runtime" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— none —</SelectItem>
                      {filteredRuntimes.map((runtime) => (
                        <SelectItem key={runtime.id} value={runtime.id}>{runtime.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                    Notes
                  </label>
                  <Textarea
                    value={draft.description}
                    onChange={(event) => patchDraft("description", event.target.value)}
                    placeholder="the story behind this flow…"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/70 pt-4">
                <div className="space-y-1">
                  <SectionLabel>Stage Deck</SectionLabel>
                  <p className="text-[0.6875rem] text-muted-foreground">Reorder · remix · delete</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addStage} className="h-8 gap-1.5 px-2.5">
                  <Plus className="h-3.5 w-3.5" />
                  Stage
                </Button>
              </div>

              <div className="relative space-y-2">
                {orderedStages.map((stage, index) => {
                  const agent = agentLookup[stage.agentId];
                  const isFocused = stage.id === activeStageId;
                  const workflowStage = workflow?.stages.find((item) => item.id === stage.id);
                  const lifecycle = workflowStage ? deriveWorkflowStageLifecycleState(currentRun, workflowStage) : "pending";
                  const isLiveCurrent = runStages[currentRunStepIndex]?.id === stage.id && currentRun?.status === "running";
                  const tone: "pending" | "current" | "running" | "completed" | "failed" =
                    lifecycle === "failed"
                      ? "failed"
                      : lifecycle === "completed"
                        ? "completed"
                        : isLiveCurrent
                          ? "running"
                          : isFocused
                            ? "current"
                            : "pending";
                  return (
                    <div key={stage.id} className="relative">
                      {index < orderedStages.length - 1 ? (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-[1.4rem] top-[4.5rem] h-3 w-px",
                            tone === "completed" ? "bg-emerald-500/60" : tone === "running" ? "bg-primary/60" : "bg-border"
                          )}
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setActiveStageId(stage.id)}
                        className={cn(
                          "group w-full rounded-xl border px-3 py-3 text-left transition-all",
                          isFocused
                            ? "border-primary/60 bg-primary/5 shadow-[0_0_0_2px_hsl(var(--primary)/0.12)]"
                            : "border-border/80 bg-background/55 hover:border-border hover:bg-background"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex w-10 shrink-0 flex-col items-center gap-1 pt-1">
                            <StageNumeral index={index} tone={tone} />
                            {tone === "running" ? (
                              <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                            ) : tone === "completed" ? (
                              <CheckCircle2 aria-hidden className="h-3 w-3 text-emerald-500" />
                            ) : tone === "failed" ? (
                              <AlertCircle aria-hidden className="h-3 w-3 text-rose-500" />
                            ) : null}
                          </div>

                          <div className="min-w-0 flex-1 space-y-2">
                            <Input
                              value={stage.label}
                              onChange={(event) => patchStage(index, { ...stage, label: event.target.value })}
                              onClick={(event) => event.stopPropagation()}
                              placeholder={`stage ${String(index + 1).padStart(2, "0")} label`}
                              className="h-8 bg-background/80 px-2 text-[0.8125rem]"
                            />
                            <Select
                              value={stage.agentId || ""}
                              onValueChange={(value) => patchStage(index, { ...stage, agentId: value })}
                            >
                              <SelectTrigger
                                onClick={(event) => event.stopPropagation()}
                                className="h-8 bg-background/80 text-[0.75rem]"
                              >
                                <SelectValue placeholder="pick agent" />
                              </SelectTrigger>
                              <SelectContent>
                                {agents.map((agentOption) => (
                                  <SelectItem key={agentOption.id} value={agentOption.id}>{agentOption.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {agent?.toolIds.length ? (
                                agent.toolIds.slice(0, 3).map((toolId) => (
                                  <span
                                    key={toolId}
                                    className="rounded-full border border-border/80 bg-background/70 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-muted-foreground"
                                  >
                                    {toolLookup[toolId]?.name ?? toolId}
                                  </span>
                                ))
                              ) : (
                                <span className="font-mono text-[0.625rem] italic text-muted-foreground/70">no tools wired</span>
                              )}
                              {agent && agent.toolIds.length > 3 ? (
                                <span className="font-mono text-[0.625rem] text-muted-foreground">+{agent.toolIds.length - 3}</span>
                              ) : null}
                            </div>

                            {errors[`stage-${index}-label`] ? (
                              <p className="text-[0.6875rem] text-destructive">{errors[`stage-${index}-label`]}</p>
                            ) : null}
                            {errors[`stage-${index}-agent`] ? (
                              <p className="text-[0.6875rem] text-destructive">{errors[`stage-${index}-agent`]}</p>
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveStage(index, -1);
                              }}
                              disabled={index === 0}
                              aria-label="Move stage up"
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background/80 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveStage(index, 1);
                              }}
                              disabled={index === orderedStages.length - 1}
                              aria-label="Move stage down"
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background/80 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeStage(index);
                              }}
                              disabled={orderedStages.length === 1}
                              aria-label="Remove stage"
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background/80 text-muted-foreground transition hover:text-destructive disabled:opacity-40"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
                {errors["stages"] ? <p className="text-xs text-destructive">{errors["stages"]}</p> : null}
              </div>
            </section>

            {/* === CENTER: now playing === */}
            <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/80 via-card/60 to-card/50 p-4 backdrop-blur md:p-5 2xl:p-6">
              <CornerMarks />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <SectionLabel>Now Playing</SectionLabel>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-mono text-[1.25rem] font-semibold tracking-tight text-foreground lg:text-[1.375rem] 2xl:text-[1.5rem]">
                      {draft.name || <span className="text-muted-foreground">untitled blueprint</span>}
                    </h2>
                    <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-muted-foreground">
                      {applicationLookup[draft.applicationId]?.name ?? "no target"} ·{" "}
                      {draft.runtimeId ? runtimeLookup[draft.runtimeId]?.name ?? "runtime" : "no runtime"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <RunPill status={runStatus} streaming={streamState === "connected"} />
                  <div className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {currentRun ? `step ${String(currentRun.currentStepIndex + 1).padStart(2, "0")} / ${String(runStages.length).padStart(2, "0")}` : "ready"}
                    {currentRun && currentRun.status === "running" ? ` · ${formatElapsed(elapsedMs)}` : ""}
                  </div>
                </div>
              </div>

              {/* stage progression strip */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {orderedStages.map((stage, index) => {
                  const workflowStage = workflow?.stages.find((item) => item.id === stage.id);
                  const lifecycle = workflowStage ? deriveWorkflowStageLifecycleState(currentRun, workflowStage) : "pending";
                  const isLiveCurrent = runStages[currentRunStepIndex]?.id === stage.id && currentRun?.status === "running";
                  const isFocus = focusStage?.id === stage.id;
                  const tone =
                    lifecycle === "failed"
                      ? "bg-rose-500/80 text-rose-50"
                      : lifecycle === "completed"
                        ? "bg-emerald-500/80 text-emerald-50"
                        : isLiveCurrent
                          ? "bg-primary text-primary-foreground animate-pulse"
                          : isFocus
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground";
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setActiveStageId(stage.id)}
                      className={cn(
                        "group inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.75rem] transition",
                        isFocus ? "border-primary/60" : "border-transparent",
                        "hover:border-primary/40"
                      )}
                    >
                      <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold tabular-nums", tone)}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={cn("text-[0.75rem]", isFocus ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                        {stage.label || `stage ${index + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* focus card */}
              {focusStage ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] lg:gap-5">
                  <div className="flex flex-col items-center gap-3">
                    <AgentPortrait
                      name={focusAgent?.name}
                      tone={
                        focusLifecycle === "failed"
                          ? "failed"
                          : focusLifecycle === "completed"
                            ? "success"
                            : currentRun?.status === "running" && runStages[currentRunStepIndex]?.id === focusStage.id
                              ? "active"
                              : "idle"
                      }
                    />
                    <div className="text-center">
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">Agent</p>
                      <p className="font-medium text-[0.8125rem] text-foreground">{focusAgent?.name ?? "unassigned"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/80 bg-background/70 p-4">
                      <div className="flex items-start gap-2">
                        <Target aria-hidden className="mt-0.5 h-3.5 w-3.5 text-primary" />
                        <div>
                          <SectionLabel>Intent</SectionLabel>
                          <p className="mt-1 text-[0.875rem] leading-6 text-foreground">
                            {focusIntent}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border/80 bg-background/70 p-4">
                        <div className="flex items-start gap-2">
                          <Cpu aria-hidden className="mt-0.5 h-3.5 w-3.5 text-primary" />
                          <div>
                            <SectionLabel>Reasoning</SectionLabel>
                            <p className="mt-1 text-[0.8125rem] leading-6 text-foreground">{truncate(focusReason, 220)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/80 bg-background/70 p-4">
                        <div className="flex items-start gap-2">
                          <Wrench aria-hidden className="mt-0.5 h-3.5 w-3.5 text-primary" />
                          <div className="space-y-2">
                            <SectionLabel>Tools in play</SectionLabel>
                            {stageTools.length ? (
                              <div className="flex flex-wrap gap-1.5">
                                {stageTools.map((tool) => (
                                  <ToolBead key={`${focusStage.id}-${tool}`} label={tool} />
                                ))}
                              </div>
                            ) : (
                              <p className="text-[0.8125rem] italic text-muted-foreground">no tools selected yet</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/70 p-4">
                      <div className="flex items-start gap-2">
                        {focusLifecycle === "failed" ? (
                          <AlertCircle aria-hidden className="mt-0.5 h-3.5 w-3.5 text-rose-500" />
                        ) : focusLifecycle === "completed" ? (
                          <CheckCircle2 aria-hidden className="mt-0.5 h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Clock3 aria-hidden className="mt-0.5 h-3.5 w-3.5 text-primary" />
                        )}
                        <div className="flex-1">
                          <SectionLabel>Outcome</SectionLabel>
                          <p className="mt-1 text-[0.875rem] leading-6 text-foreground">{focusOutcome}</p>
                          {focusTrace?.evidenceHighlights.length ? (
                            <ul className="mt-3 space-y-1 text-[0.8125rem] leading-6 text-muted-foreground">
                              {focusTrace.evidenceHighlights.slice(0, 3).map((highlight, idx) => (
                                <li key={`${focusStage.id}-highlight-${idx}`} className="flex items-start gap-2">
                                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-10 flex flex-col items-center justify-center gap-3 text-center">
                  <Waypoints aria-hidden className="h-10 w-10 text-muted-foreground/40" />
                  <p className="font-mono text-[0.75rem] uppercase tracking-[0.24em] text-muted-foreground">
                    add a stage to ignite the canvas
                  </p>
                </div>
              )}

              {/* run controls */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
                <div className="flex items-center gap-3">
                  <Button type="button" onClick={startRun} disabled={!canStart} className="h-9 gap-2">
                    {runAction === "starting" ? <Spinner className="h-4 w-4 text-current" /> : <Play className="h-4 w-4" />}
                    {runAction === "starting" ? "arming…" : currentRun && currentRun.status !== "running" ? "Rerun Flow" : "Start Run"}
                  </Button>
                  <Button type="button" variant="outline" onClick={stepRun} disabled={!canStep} className="h-9 gap-2">
                    {runAction === "stepping" && currentRun?.status === "running" ? (
                      <Spinner className="h-4 w-4 text-current" />
                    ) : (
                      <StepForward className="h-4 w-4" />
                    )}
                    Advance Stage
                  </Button>
                  <Button type="button" variant="ghost" onClick={reloadRun} disabled={!workflow || runBusy} className="h-9 gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reload
                  </Button>
                </div>
                <div className="flex items-center gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {currentRun ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3 w-3" />
                      started {formatClock(currentRun.startedAt)}
                    </span>
                  ) : (
                    <span className="italic">no runs yet</span>
                  )}
                  <span className="h-px w-6 bg-border" />
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        streamState === "connected"
                          ? "animate-pulse bg-primary"
                          : streamState === "connecting"
                            ? "bg-amber-500"
                            : streamState === "disconnected"
                              ? "bg-rose-500"
                              : "bg-muted-foreground/50"
                      )}
                    />
                    {streamState}
                  </span>
                </div>
              </div>
            </section>

            {/* === RIGHT: live ledger === */}
            <section className="relative flex max-h-[28rem] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-4 backdrop-blur md:p-5 lg:max-h-[32rem] 2xl:max-h-[calc(100vh-10rem)]">
              <CornerMarks />
              <div className="flex items-center justify-between pb-3">
                <div className="space-y-1">
                  <SectionLabel>Live Ledger</SectionLabel>
                  <p className="text-sm font-medium text-foreground">Stream</p>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
                  <Radio
                    aria-hidden
                    className={cn(
                      "h-3.5 w-3.5",
                      streamState === "connected" ? "animate-pulse text-primary" : "text-muted-foreground/50"
                    )}
                  />
                  {streamState === "connected" ? "receiving" : streamState}
                </div>
              </div>

              <div className="border-t border-dashed border-border/70" />

              <div ref={ledgerRef} className="flex-1 overflow-y-auto pr-1 pt-4 [scrollbar-width:thin]">
                {orderedEvents.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                    <Pause aria-hidden className="h-6 w-6 text-muted-foreground/50" />
                    <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground">
                      no ledger entries yet
                    </p>
                    <p className="max-w-[18ch] text-[0.75rem] leading-5 text-muted-foreground/70">
                      start a run to light up the tape
                    </p>
                  </div>
                ) : (
                  <ol className="relative space-y-0">
                    <span aria-hidden className="absolute left-[0.75rem] top-1 h-full w-px bg-border/80" />
                    {orderedEvents.map((event, index) => {
                      const Icon = eventIcon(event.type);
                      const accent = eventAccent(event);
                      const stageIndex = runStages.findIndex((stage) => stage.id === event.workflowStageId);
                      return (
                        <li
                          key={event.id}
                          className="relative pl-7 pb-4"
                          style={{ animation: index === 0 ? "flow-studio-pop 220ms ease-out" : undefined }}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "absolute left-[0.375rem] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-background ring-2",
                              accent
                            )}
                          >
                            <span className={cn("h-1 w-1 rounded-full", accent.split(" ")[0])} />
                          </span>
                          <div className="flex items-start gap-2">
                            <Icon className={cn("mt-0.5 h-3.5 w-3.5", accent.split(" ")[0])} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-foreground">
                                  {formatEventType(event.type)}
                                </span>
                                <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground/80">
                                  {formatClock(event.createdAt)}
                                </span>
                                {stageIndex >= 0 ? (
                                  <span className="rounded border border-border bg-background px-1.5 py-[0.05rem] font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                                    st {String(stageIndex + 1).padStart(2, "0")}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-[0.8125rem] font-medium leading-5 text-foreground">
                                {event.title}
                              </p>
                              <p className="mt-0.5 text-[0.75rem] leading-5 text-muted-foreground">
                                {truncate(event.summary, 160)}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              <div className="mt-2 border-t border-dashed border-border/70 pt-2 font-mono text-[0.6rem] uppercase tracking-[0.26em] text-muted-foreground/70">
                {currentRun ? (
                  <>
                    run id · <span className="text-foreground/70">{currentRun.id.slice(0, 8)}…</span>
                    <span className="mx-2">·</span>
                    {runContract.completionState}
                  </>
                ) : (
                  "awaiting run"
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <style>{`
        @keyframes flow-studio-pop {
          from { transform: translateY(-4px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function EmptyCanvas({ onCreate, flowsAvailable }: { onCreate: () => void; flowsAvailable: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/80 bg-card/50 p-12">
      <CornerMarks />
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 -m-4 rounded-full bg-primary/10 blur-xl"
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background">
            <Waypoints className="h-7 w-7 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-mono text-xl font-semibold tracking-tight text-foreground">
            blueprint<span className="text-primary">·</span>zero
          </h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
            {flowsAvailable
              ? "Pick a flow from the library above — or conjure a new one from scratch."
              : "The studio is quiet. Draft your first agent flow to get the ledger humming."}
          </p>
        </div>
        <Button type="button" onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Start a new flow
        </Button>
      </div>
    </div>
  );
}
