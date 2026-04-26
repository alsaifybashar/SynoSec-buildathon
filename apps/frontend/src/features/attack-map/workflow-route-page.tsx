import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  apiRoutes,
  getWorkflowReportedFindings,
  type Workflow,
  type WorkflowReportedFinding,
  type WorkflowRun,
  type WorkflowRunFindingsResponse
} from "@synosec/contracts";
import { useWorkflowDefinitionContext } from "@/features/workflows/context";
import { workflowsResource } from "@/features/workflows/resource";
import { useWorkflowRunState } from "@/features/workflows/use-workflow-run-state";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { fetchJson } from "@/shared/lib/api";
import { getDetailPath } from "@/app/navigation";

type Severity = "info" | "low" | "medium" | "high" | "critical";
type ThemeMode = "dark" | "white";

type AttackMapTheme = {
  appBg: string;
  panel: string;
  panelSoft: string;
  panelOverlay: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textFaint: string;
  inputBg: string;
  codeBg: string;
  button: string;
  buttonActive: string;
};

type PlanPhase = {
  id: string;
  name: string;
  priority: "critical" | "high" | "medium" | "low";
  rationale: string;
  targetService: string;
  tools: string[];
  status: "pending" | "running" | "completed" | "skipped";
};

type AttackPlan = {
  phases: PlanPhase[];
  overallRisk: "critical" | "high" | "medium" | "low";
  summary: string;
};

type ReconSummary = {
  openPorts: Array<{ port: number; protocol: string; service: string; version?: string }>;
  technologies: string[];
  serverInfo: Record<string, string>;
};

type ReasoningEntry = {
  id: string;
  phase: string;
  title: string;
  summary: string;
};

type ToolActivity = {
  id: string;
  phase: string;
  toolName: string;
  command: string;
  startedAt: string;
  completedAt?: string;
  outputPreview?: string;
  exitCode?: number | null;
  status: "running" | "completed" | "failed";
};

type TranscriptEntry = {
  id: string;
  title: string;
  summary: string;
  detail: string | null;
  createdAt: string;
};

const ATTACK_MAP_THEMES: Record<ThemeMode, AttackMapTheme> = {
  dark: {
    appBg: "#070b15",
    panel: "#0d1117",
    panelSoft: "#111827",
    panelOverlay: "#0d1117ee",
    border: "#0f172a",
    borderStrong: "#1e293b",
    text: "#e2e8f0",
    textMuted: "#94a3b8",
    textSubtle: "#64748b",
    textFaint: "#475569",
    inputBg: "#0d1117",
    codeBg: "#020617",
    button: "#2563eb",
    buttonActive: "#1d4ed8"
  },
  white: {
    appBg: "#f8fafc",
    panel: "#ffffff",
    panelSoft: "#f1f5f9",
    panelOverlay: "#fffffff0",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    text: "#0f172a",
    textMuted: "#334155",
    textSubtle: "#64748b",
    textFaint: "#94a3b8",
    inputBg: "#ffffff",
    codeBg: "#f8fafc",
    button: "#2563eb",
    buttonActive: "#1d4ed8"
  }
};

const RISK_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#ca8a04",
  low: "#2563eb"
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280"
};

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function compactTime(value: string | null | undefined) {
  if (!value) {
    return "pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function durationLabel(activity: ToolActivity) {
  const start = Date.parse(activity.startedAt);
  const end = Date.parse(activity.completedAt ?? new Date().toISOString());
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return "00:00";
  }
  const seconds = Math.round((end - start) / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function parseObject(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}
  return null;
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getSystemMessageBody(run: WorkflowRun | null, title: string) {
  if (!run) {
    return null;
  }

  const event = [...run.events].reverse().find((candidate) => candidate.type === "system_message" && candidate.title === title);
  return stringValue(event?.payload["body"] ?? event?.detail ?? "");
}

function parseReconSummary(body: string | null) {
  const parsed = parseObject(body);
  if (!parsed) {
    return null;
  }

  const openPorts = Array.isArray(parsed["openPorts"])
    ? parsed["openPorts"]
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
        .map((item) => ({
          port: typeof item["port"] === "number" ? item["port"] : 0,
          protocol: typeof item["protocol"] === "string" ? item["protocol"] : "",
          service: typeof item["service"] === "string" ? item["service"] : "",
          ...(typeof item["version"] === "string" ? { version: item["version"] } : {})
        }))
        .filter((item) => item.port > 0 && item.protocol && item.service)
    : [];

  const technologies = Array.isArray(parsed["technologies"])
    ? parsed["technologies"].filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const serverInfo = typeof parsed["serverInfo"] === "object" && parsed["serverInfo"] !== null && !Array.isArray(parsed["serverInfo"])
    ? Object.fromEntries(Object.entries(parsed["serverInfo"]).filter(([, value]) => typeof value === "string" && value.trim().length > 0)) as Record<string, string>
    : {};

  return {
    openPorts,
    technologies,
    serverInfo
  } satisfies ReconSummary;
}

function parseAttackPlan(body: string | null) {
  const parsed = parseObject(body);
  if (!parsed || !Array.isArray(parsed["phases"])) {
    return null;
  }

  const phases = parsed["phases"]
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    .map((item, index) => ({
      id: typeof item["id"] === "string" ? item["id"] : `phase-${index}`,
      name: typeof item["name"] === "string" ? item["name"] : `Phase ${index + 1}`,
      priority: item["priority"] === "critical" || item["priority"] === "high" || item["priority"] === "medium" || item["priority"] === "low"
        ? item["priority"]
        : "medium",
      rationale: typeof item["rationale"] === "string" ? item["rationale"] : "No rationale provided.",
      targetService: typeof item["targetService"] === "string" ? item["targetService"] : "Target surface",
      tools: Array.isArray(item["tools"]) ? item["tools"].filter((tool): tool is string => typeof tool === "string" && tool.trim().length > 0) : [],
      status: item["status"] === "pending" || item["status"] === "running" || item["status"] === "completed" || item["status"] === "skipped"
        ? item["status"]
        : "pending"
    }));

  return {
    phases,
    overallRisk: parsed["overallRisk"] === "critical" || parsed["overallRisk"] === "high" || parsed["overallRisk"] === "medium" || parsed["overallRisk"] === "low"
      ? parsed["overallRisk"]
      : "medium",
    summary: typeof parsed["summary"] === "string" ? parsed["summary"] : "No attack plan summary recorded."
  } satisfies AttackPlan;
}

function buildToolActivity(run: WorkflowRun | null) {
  if (!run) {
    return [];
  }

  const activity: ToolActivity[] = [];
  for (const event of run.events) {
    if (event.type === "tool_call") {
      activity.push({
        id: event.id,
        phase: typeof event.payload["phase"] === "string" ? event.payload["phase"] : "execution",
        toolName: typeof event.payload["toolName"] === "string" ? event.payload["toolName"] : "Tool",
        command: stringValue(event.payload["toolInput"] ?? event.payload["input"] ?? event.detail),
        startedAt: event.createdAt,
        status: "running"
      });
      continue;
    }

    if (event.type === "tool_result") {
      const toolName = typeof event.payload["toolName"] === "string" ? event.payload["toolName"] : "Tool";
      const running = [...activity].reverse().find((item) => item.toolName === toolName && item.status === "running");
      const nextStatus = event.status === "failed" ? "failed" : "completed";
      const preview = stringValue(event.payload["output"] ?? event.payload["summary"] ?? event.detail).trim();
      if (running) {
        running.status = nextStatus;
        running.completedAt = event.createdAt;
        running.outputPreview = preview || undefined;
        running.exitCode = typeof event.payload["exitCode"] === "number" ? event.payload["exitCode"] : null;
      } else {
        activity.push({
          id: event.id,
          phase: typeof event.payload["phase"] === "string" ? event.payload["phase"] : "execution",
          toolName,
          command: stringValue(event.payload["toolInput"] ?? event.payload["input"] ?? event.detail),
          startedAt: event.createdAt,
          completedAt: event.createdAt,
          outputPreview: preview || undefined,
          exitCode: typeof event.payload["exitCode"] === "number" ? event.payload["exitCode"] : null,
          status: nextStatus
        });
      }
    }
  }

  return activity.slice(-12).reverse();
}

function buildReasoning(run: WorkflowRun | null) {
  if (!run) {
    return [];
  }

  return run.events
    .filter((event) => event.type === "reasoning")
    .slice(-8)
    .reverse()
    .map((event) => ({
      id: event.id,
      phase: typeof event.payload["phase"] === "string" ? event.payload["phase"] : "analysis",
      title: event.title,
      summary: event.summary
    })) satisfies ReasoningEntry[];
}

function buildTranscript(run: WorkflowRun | null) {
  if (!run) {
    return [];
  }

  return [...run.events]
    .sort((left, right) => right.ord - left.ord)
    .slice(0, 14)
    .map((event) => ({
      id: event.id,
      title: event.title,
      summary: event.summary,
      detail: event.detail,
      createdAt: event.createdAt
    })) satisfies TranscriptEntry[];
}

function StatusBadge({ status }: { status: WorkflowRun["status"] | "idle" }) {
  const color = status === "completed"
    ? "#22c55e"
    : status === "failed"
      ? "#ef4444"
      : status === "running"
        ? "#f59e0b"
        : "#6b7280";
  return (
    <div className="inline-flex items-center gap-2 rounded border px-2 py-1 text-[0.62rem] font-mono uppercase" style={{ borderColor: `${color}55`, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </div>
  );
}

function EmptyState({
  title,
  message,
  theme
}: {
  title: string;
  message: string;
  theme: AttackMapTheme;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: theme.appBg, color: theme.text }}>
      <div className="max-w-xl rounded-2xl border p-6" style={{ background: theme.panel, borderColor: theme.borderStrong }}>
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>{message}</div>
      </div>
    </div>
  );
}

export function AttackMapPage() {
  const params = useParams();
  const context = useWorkflowDefinitionContext();
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(params["workflowId"] ?? null);
  const [workflowSelectionError, setWorkflowSelectionError] = useState<string | null>(null);
  const [persistedFindings, setPersistedFindings] = useState<WorkflowReportedFinding[] | null>(null);
  const [findingsError, setFindingsError] = useState<string | null>(null);
  const theme = ATTACK_MAP_THEMES[themeMode];

  useEffect(() => {
    if (params["workflowId"]) {
      setSelectedWorkflowId(params["workflowId"]);
      setWorkflowSelectionError(null);
      return;
    }

    let active = true;
    void workflowsResource.list({
      ...workflowsResource.defaultQuery,
      pageSize: 100,
      sortBy: "updatedAt",
      sortDirection: "desc"
    }).then((result) => {
      if (!active) {
        return;
      }

      const workflow = result.items.find((item) => item.executionKind === "attack-map");
      if (!workflow) {
        setSelectedWorkflowId(null);
        setWorkflowSelectionError("No workflow with execution kind attack-map is available yet.");
        return;
      }

      setSelectedWorkflowId(workflow.id);
      setWorkflowSelectionError(null);
    }).catch((error) => {
      if (active) {
        setSelectedWorkflowId(null);
        setWorkflowSelectionError(error instanceof Error ? error.message : "Unable to load attack-map workflows.");
      }
    });

    return () => {
      active = false;
    };
  }, [params]);

  const workflowDetail = useResourceDetail(workflowsResource, selectedWorkflowId);
  const workflow = workflowDetail.state === "loaded" ? workflowDetail.item : null;
  const {
    currentRun,
    liveModelOutput,
    persistedTranscript,
    runPending,
    latestRunError,
    transcriptError,
    streamError,
    startRun
  } = useWorkflowRunState({
    workflow,
    targets: context.targets
  });

  useEffect(() => {
    if (!currentRun || currentRun.status === "running") {
      setPersistedFindings(null);
      setFindingsError(null);
      return;
    }

    let active = true;
    void fetchJson<WorkflowRunFindingsResponse>(`${apiRoutes.workflowRuns}/${currentRun.id}/findings`)
      .then((payload) => {
        if (active) {
          setPersistedFindings(payload.findings);
          setFindingsError(null);
        }
      })
      .catch((error) => {
        if (active) {
          setPersistedFindings(null);
          setFindingsError(error instanceof Error ? error.message : "Unable to load workflow findings.");
        }
      });

    return () => {
      active = false;
    };
  }, [currentRun?.id, currentRun?.status]);

  if (workflowSelectionError) {
    return <EmptyState title="Attack Map Copy" message={workflowSelectionError} theme={theme} />;
  }

  if (workflowDetail.state === "loading" || workflowDetail.state === "idle") {
    return <EmptyState title="Attack Map Copy" message="Loading the transition workflow context." theme={theme} />;
  }

  if (workflowDetail.state === "error") {
    return <EmptyState title="Attack Map Copy" message={workflowDetail.message} theme={theme} />;
  }

  if (workflow.executionKind !== "attack-map") {
    return <EmptyState title="Attack Map Copy" message={`The selected workflow is configured as ${workflow.executionKind ?? "workflow"}, not attack-map.`} theme={theme} />;
  }

  const target = context.targets.find((item) => item.id === workflow.targetId) ?? null;
  const agent = context.agents.find((item) => item.id === workflow.agentId) ?? null;
  const findings = currentRun?.status === "running"
    ? getWorkflowReportedFindings(currentRun)
    : (persistedFindings ?? (currentRun ? getWorkflowReportedFindings(currentRun) : []));
  const reconSummary = parseReconSummary(getSystemMessageBody(currentRun, "Recon completed"));
  const attackPlan = parseAttackPlan(getSystemMessageBody(currentRun, "Attack plan created"));
  const toolActivity = buildToolActivity(currentRun);
  const reasoning = buildReasoning(currentRun);
  const transcript = buildTranscript(currentRun);
  const highSeverityCount = findings.filter((finding) => finding.severity === "high" || finding.severity === "critical").length;
  const chainCount = new Set(findings.map((finding) => finding.chain?.title).filter((value): value is string => Boolean(value))).size;
  const lastOutput = toolActivity.find((item) => item.outputPreview)?.outputPreview ?? null;
  const approvedToolCount = workflow.allowedToolIds.length > 0 ? workflow.allowedToolIds.length : agent?.toolIds.length ?? 0;
  const latestSummary = [...(currentRun?.events ?? [])].reverse().find((event) => event.type === "run_completed" || event.type === "run_failed")?.summary ?? null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: theme.appBg, color: theme.text }}>
      <div className="w-72 flex-none flex flex-col border-r overflow-hidden" style={{ borderColor: theme.border }}>
        <div className="px-4 py-3.5 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded flex items-center justify-center text-[0.65rem]" style={{ background: "#1e3a5f", border: "1px solid #3b82f6" }}>WF</div>
            <div>
              <div className="text-xs font-bold font-mono tracking-widest uppercase" style={{ color: theme.text }}>Workflow Copy</div>
              <div className="text-[0.6rem]" style={{ color: theme.textSubtle }}>Transition surface</div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Theme</div>
            <div className="flex rounded border p-0.5" style={{ background: theme.panelSoft, borderColor: theme.border }}>
              {(["dark", "white"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setThemeMode(mode)}
                  className="rounded px-2 py-0.5 text-[0.55rem] font-mono uppercase transition-colors"
                  style={{
                    background: themeMode === mode ? theme.button : "transparent",
                    color: themeMode === mode ? "#ffffff" : theme.textSubtle
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Workflow</div>
          <div className="w-full rounded border px-3 py-1.5 text-xs font-mono" style={{ background: theme.inputBg, borderColor: theme.borderStrong, color: theme.text }}>
            {workflow.name}
          </div>
          <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Target URL</div>
          <div className="w-full rounded border px-3 py-1.5 text-xs font-mono" style={{ background: theme.inputBg, borderColor: theme.borderStrong, color: theme.text }}>
            {target?.baseUrl ?? "No target URL configured"}
          </div>
          <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Agent</div>
          <div className="w-full rounded border px-3 py-1.5 text-xs font-mono" style={{ background: theme.inputBg, borderColor: theme.borderStrong, color: theme.text }}>
            {agent?.name ?? "Unknown agent"}
          </div>
          <div className="text-[0.55rem] font-mono" style={{ color: theme.textFaint }}>
            workflow-backed copy · latest attack-map workflow · latest run
          </div>
          <button
            type="button"
            onClick={() => void startRun()}
            disabled={runPending || !target?.baseUrl?.trim()}
            className="w-full rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: runPending ? theme.buttonActive : theme.button }}
          >
            {runPending ? "Launching…" : "Launch Orchestration"}
          </button>
        </div>

        <div className="px-4 py-2 border-b space-y-1.5" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={currentRun?.status ?? "idle"} />
            <span className="text-[0.55rem] font-mono" style={{ color: theme.textSubtle }}>{compactTime(currentRun?.startedAt)}</span>
          </div>
          <div className="flex gap-3 text-[0.6rem] font-mono">
            <span style={{ color: theme.textSubtle }}>{findings.length} findings</span>
            <span style={{ color: theme.textSubtle }}>{chainCount} chains</span>
            {highSeverityCount > 0 ? <span style={{ color: "#ef4444" }}>{highSeverityCount} high+</span> : null}
          </div>
          {latestRunError ? <div className="text-[0.6rem] font-mono" style={{ color: "#ef4444" }}>{latestRunError}</div> : null}
          {streamError ? <div className="text-[0.6rem] font-mono" style={{ color: "#f59e0b" }}>{streamError}</div> : null}
        </div>

        {attackPlan ? (
          <div className="px-4 py-2 border-b overflow-y-auto" style={{ borderColor: theme.border, maxHeight: 200 }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Attack Plan</span>
              <span className="text-[0.6rem] font-semibold" style={{ color: RISK_COLOR[attackPlan.overallRisk] ?? theme.textMuted }}>
                {attackPlan.overallRisk.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1">
              {attackPlan.phases.map((phase) => (
                <div key={phase.id} className="flex items-start gap-2 px-2 py-1.5 rounded" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="mt-1 h-1.5 w-1.5 rounded-full flex-none" style={{ background: RISK_COLOR[phase.priority] ?? "#6b7280" }} />
                  <div className="min-w-0">
                    <div className="text-[0.65rem] font-semibold truncate" style={{ color: theme.text }}>{phase.name}</div>
                    <div className="text-[0.55rem] line-clamp-1 mt-0.5" style={{ color: theme.textSubtle }}>{phase.rationale}</div>
                    {phase.tools.length > 0 ? (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {phase.tools.slice(0, 4).map((tool) => (
                          <span key={tool} className="rounded border px-1 py-px text-[0.5rem] font-mono" style={{ background: theme.codeBg, borderColor: theme.border, color: theme.textSubtle }}>
                            {tool}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {liveModelOutput && (liveModelOutput.reasoning || liveModelOutput.text) ? (
          <div className="px-4 py-2 border-b overflow-y-auto" style={{ borderColor: theme.border, maxHeight: 220 }}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Live Model Output</div>
              <div className="text-[0.52rem] font-mono uppercase text-amber-400">streaming</div>
            </div>
            <div className="space-y-1.5">
              {liveModelOutput.reasoning ? (
                <div className="rounded px-2 py-1.5" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="text-[0.55rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Reasoning</div>
                  <div className="mt-1 text-[0.58rem] leading-relaxed whitespace-pre-wrap" style={{ color: theme.textMuted }}>{liveModelOutput.reasoning}</div>
                </div>
              ) : null}
              {liveModelOutput.text ? (
                <div className="rounded px-2 py-1.5" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="text-[0.55rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Model text</div>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-[0.58rem] leading-relaxed font-mono" style={{ color: theme.text }}>{liveModelOutput.text}</pre>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {reasoning.length > 0 ? (
          <div className="px-4 py-2 border-b overflow-y-auto" style={{ borderColor: theme.border, maxHeight: 200 }}>
            <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textSubtle }}>AI Reasoning</div>
            <div className="space-y-1">
              {reasoning.map((entry) => (
                <div key={entry.id} className="rounded px-2 py-1.5" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[0.62rem] font-semibold" style={{ color: theme.text }}>{entry.title}</div>
                    <div className="text-[0.52rem] font-mono uppercase" style={{ color: theme.textSubtle }}>{entry.phase.replace("_", " ")}</div>
                  </div>
                  <div className="mt-1 text-[0.58rem] leading-relaxed" style={{ color: theme.textMuted }}>{entry.summary}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {toolActivity.length > 0 ? (
          <div className="px-4 py-2 border-b overflow-y-auto" style={{ borderColor: theme.border, maxHeight: 220 }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Tool Activity</div>
            </div>
            <div className="space-y-1">
              {toolActivity.map((item) => (
                <div key={item.id} className="rounded px-2 py-1.5" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[0.62rem] font-semibold" style={{ color: theme.text }}>{item.toolName}</div>
                    <div className="text-[0.52rem] font-mono" style={{ color: item.status === "running" ? "#f59e0b" : item.status === "failed" ? "#ef4444" : "#22c55e" }}>
                      {item.status} · {durationLabel(item)}
                    </div>
                  </div>
                  <div className="mt-1 text-[0.55rem] font-mono truncate" style={{ color: theme.textSubtle }}>{item.phase}</div>
                  <div className="mt-1 text-[0.55rem] font-mono truncate" style={{ color: theme.textMuted }}>{item.command}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {transcript.length === 0 ? (
            <div className="text-[0.6rem] font-mono mt-1" style={{ color: theme.textFaint }}>No workflow run transcript yet.</div>
          ) : (
            <div className="space-y-1">
              {transcript.map((entry) => (
                <div key={entry.id} className="rounded px-2 py-1.5" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[0.62rem] font-semibold" style={{ color: theme.text }}>{entry.title}</div>
                    <div className="text-[0.52rem] font-mono" style={{ color: theme.textSubtle }}>{compactTime(entry.createdAt)}</div>
                  </div>
                  <div className="mt-1 text-[0.55rem] leading-relaxed" style={{ color: theme.textMuted }}>
                    {entry.detail ?? entry.summary}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-y-auto">
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.panelOverlay} 0%, ${theme.appBg} 32%)` }} />
        <div className="relative px-6 py-5">
          <div className="rounded border px-4 py-3 mb-4" style={{ background: theme.panelOverlay, borderColor: theme.borderStrong }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Attack Map Copy</div>
                <div className="mt-1 text-lg font-semibold">{workflow.name}</div>
                <div className="mt-1 text-[0.72rem]" style={{ color: theme.textMuted }}>
                  Latest updated workflow with execution kind `attack-map`
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={currentRun?.status ?? "idle"} />
                <Link
                  to={getDetailPath("workflows", workflow.id)}
                  className="rounded border px-3 py-1.5 text-[0.72rem] font-medium"
                  style={{ borderColor: theme.borderStrong, background: theme.panel, color: theme.text }}
                >
                  Open workflow
                </Link>
              </div>
            </div>
            {latestSummary ? (
              <div className="mt-3 border-t pt-3 text-[0.72rem]" style={{ borderColor: theme.border, color: theme.textMuted }}>
                {latestSummary}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="rounded border p-4" style={{ background: theme.panelOverlay, borderColor: theme.borderStrong }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Attack path overview</div>
                  {attackPlan ? (
                    <div className="text-[0.62rem] font-semibold uppercase" style={{ color: RISK_COLOR[attackPlan.overallRisk] ?? theme.textMuted }}>
                      Risk · {attackPlan.overallRisk}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded border p-3" style={{ background: theme.panel, borderColor: theme.border }}>
                    <div className="text-[0.58rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Workflow target</div>
                    <div className="mt-2 text-[0.8rem]" style={{ color: theme.text }}>{target?.name ?? "Unknown target"}</div>
                    <div className="mt-1 text-[0.7rem] font-mono break-all" style={{ color: theme.textMuted }}>{target?.baseUrl ?? "No base URL configured"}</div>
                  </div>
                  <div className="rounded border p-3" style={{ background: theme.panel, borderColor: theme.border }}>
                    <div className="text-[0.58rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Run timing</div>
                    <div className="mt-2 text-[0.8rem]" style={{ color: theme.text }}>{formatTime(currentRun?.startedAt)}</div>
                    <div className="mt-1 text-[0.7rem]" style={{ color: theme.textMuted }}>{currentRun?.completedAt ? `Completed ${formatTime(currentRun.completedAt)}` : "Latest run still active or missing."}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {(["critical", "high", "medium", "low"] as const).map((severity) => {
                    const count = findings.filter((finding) => finding.severity === severity).length;
                    return (
                      <div key={severity} className="rounded border px-3 py-2" style={{ background: theme.panel, borderColor: theme.border }}>
                        <div className="text-[0.55rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>{severity}</div>
                        <div className="mt-1 text-lg font-semibold" style={{ color: SEVERITY_COLOR[severity] }}>{count}</div>
                      </div>
                    );
                  })}
                </div>

                {attackPlan ? (
                  <div className="mt-4 space-y-2">
                    {attackPlan.phases.map((phase) => (
                      <div key={phase.id} className="rounded border p-3" style={{ background: theme.panel, borderColor: theme.border }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[0.8rem] font-semibold" style={{ color: theme.text }}>{phase.name}</div>
                          <div className="text-[0.58rem] font-mono uppercase" style={{ color: theme.textSubtle }}>{phase.status}</div>
                        </div>
                        <div className="mt-1 text-[0.72rem]" style={{ color: theme.textMuted }}>{phase.rationale}</div>
                        <div className="mt-1 text-[0.62rem] font-mono" style={{ color: theme.textSubtle }}>{phase.targetService}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded border p-4" style={{ background: theme.panel, borderColor: theme.border }}>
                    <div className="text-[0.75rem]" style={{ color: theme.textMuted }}>
                      No structured attack plan has been recorded for this workflow run yet.
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded border p-4" style={{ background: theme.panelOverlay, borderColor: theme.borderStrong }}>
                <div className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Transcript-driven output</div>
                <div className="mt-4 rounded border p-3" style={{ background: theme.codeBg, borderColor: theme.border }}>
                  <pre className="text-[0.68rem] whitespace-pre-wrap break-words font-mono" style={{ color: lastOutput ? theme.textMuted : theme.textFaint }}>
                    {lastOutput ?? (transcriptError ?? "No workflow tool output has been summarized yet.")}
                  </pre>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded border p-4" style={{ background: theme.panelOverlay, borderColor: theme.borderStrong }}>
                <div className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Recon summary</div>
                {reconSummary ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="text-[0.55rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Open ports</div>
                      <div className="mt-1 text-[0.75rem]" style={{ color: theme.textMuted }}>
                        {reconSummary.openPorts.length > 0
                          ? reconSummary.openPorts.map((item) => `${item.port}/${item.protocol} ${item.service}${item.version ? ` (${item.version})` : ""}`).join(" · ")
                          : "No open ports recorded."}
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.55rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Technologies</div>
                      <div className="mt-1 text-[0.75rem]" style={{ color: theme.textMuted }}>
                        {reconSummary.technologies.length > 0 ? reconSummary.technologies.join(" · ") : "No technologies recorded."}
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.55rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Server profile</div>
                      <div className="mt-1 space-y-1 text-[0.75rem]" style={{ color: theme.textMuted }}>
                        {Object.keys(reconSummary.serverInfo).length > 0
                          ? Object.entries(reconSummary.serverInfo).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-mono uppercase">{key}</span>
                                <span> · {value}</span>
                              </div>
                            ))
                          : "No server profile recorded."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-[0.75rem]" style={{ color: theme.textMuted }}>
                    No structured recon summary is available yet.
                  </div>
                )}
              </div>

              <div className="rounded border p-4" style={{ background: theme.panelOverlay, borderColor: theme.borderStrong }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: theme.textSubtle }}>Findings</div>
                  <div className="text-[0.58rem] font-mono" style={{ color: theme.textSubtle }}>{findings.length} total</div>
                </div>
                {findingsError ? <div className="mt-2 text-[0.72rem]" style={{ color: "#ef4444" }}>{findingsError}</div> : null}
                <div className="mt-3 space-y-2">
                  {findings.length > 0 ? findings.map((finding) => (
                    <div key={finding.id} className="rounded border p-3" style={{ background: theme.panel, borderColor: theme.border }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[0.8rem] font-semibold" style={{ color: theme.text }}>{finding.title}</div>
                        <div className="text-[0.58rem] font-semibold uppercase" style={{ color: SEVERITY_COLOR[finding.severity] }}>{finding.severity}</div>
                      </div>
                      <div className="mt-1 text-[0.68rem] font-mono" style={{ color: theme.textSubtle }}>{finding.target.host}</div>
                      <div className="mt-2 text-[0.72rem]" style={{ color: theme.textMuted }}>{finding.impact}</div>
                    </div>
                  )) : (
                    <div className="text-[0.75rem]" style={{ color: theme.textMuted }}>
                      {currentRun ? "No findings have been reported for the latest run yet." : "No workflow run exists yet for this workflow."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
