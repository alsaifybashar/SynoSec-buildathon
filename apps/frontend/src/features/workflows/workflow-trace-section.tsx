import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getWorkflowRunContextTokenEstimate, getWorkflowRunModelStepCount, type AiAgent, type AiTool, type AttackPathSummary, type ExecutionReportDetail, type Observation, type Target as WorkflowTarget, type Workflow, type WorkflowRun, type WorkflowRunEvaluationResponse } from "@synosec/contracts";
import { AlertTriangle, ChevronRight, LoaderCircle, Radio, Target } from "lucide-react";
import { AttackPathsSection } from "@/features/attack-paths/attack-paths-section";
import { ExecutionReportFindingsView } from "@/features/execution-reports/findings-table-view";
import { ExecutionReportGraphMap } from "@/features/execution-reports/execution-report-graph";
import { DetailHintTrigger } from "@/shared/components/detail-page";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import { DetailMetadataPanel, DetailSidebarItem } from "@/shared/components/detail-page";
import {
  buildWorkflowTranscript,
  getToolLookup,
  getWorkflowAllowedToolIds,
  type FindingsRailItem,
  type TranscriptProjection
} from "@/features/workflows/workflow-trace";

type SummaryCardData = {
  toolCount: number;
  toolNames: string[];
};

type MetadataItem = {
  label: string;
  value: string;
  hint?: string;
};

type DuplexAtomKind =
  | "objective"
  | "system-prompt"
  | "tool-context"
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
  toolCallId?: string | null;
  title?: string;
  summaryText?: string;
  body?: string;
  rawModelOutput?: string | null;
  meta?: string;
  severity?: FindingsRailItem["severity"];
  code?: string;
  observations?: Observation[];
  status?: string;
  expandableBody?: boolean;
  structuredToolSegment?: {
    summary: string;
    tools: Array<{
      key: string;
      name: string;
      description: string;
      source: "workflow-tool" | "builtin-action";
      inputSchema: string;
    }>;
  };
};

type StructuredToolSegment = NonNullable<DuplexAtom["structuredToolSegment"]>;

type StructuredReconSummary = {
  kind: "recon";
  openPorts: Array<{ port: number; protocol: string; service: string; version?: string }>;
  technologies: string[];
  serverInfo: Record<string, string>;
};

type StructuredAttackPlanSummary = {
  kind: "attack-plan";
  overallRisk?: string;
  summary?: string;
  phases: Array<{
    id?: string;
    name?: string;
    priority?: string;
    rationale?: string;
    targetService?: string;
    tools?: string[];
    status?: string;
  }>;
};

function HelpHint({ label, hint }: { label: string; hint: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DetailHintTrigger
            label={label}
            className="text-[0.62rem] tracking-[0.12em] text-primary/70 hover:text-primary focus-visible:text-primary"
          />
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

function ValidationTierBadge({ status }: { status: string | undefined }) {
  const tone =
    status === "single_source" || status === "cross_validated" || status === "reproduced"
      ? "border-success/40 bg-success/10 text-success"
      : status === "suspected"
        ? "border-warning/40 bg-warning/10 text-warning"
        : "border-border bg-muted text-muted-foreground";

  const label =
    status === "single_source" || status === "cross_validated" || status === "reproduced"
      ? "Tool-backed"
      : status === "suspected"
        ? "Suspected"
        : "Unverified";

  return (
    <span className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]", tone)}>
      {label}
    </span>
  );
}

const KIND_LABEL: Record<DuplexAtomKind, string> = {
  objective: "Objective",
  "system-prompt": "System prompt",
  "tool-context": "Tool segment",
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
  "tool-context": { label: "text-primary", dot: "bg-primary" },
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

const WORKFLOW_METADATA_HINTS = {
  evaluation: "Automatic target-aware evaluation for the selected run, scored against the documented local cyber range expectations for this repo.",
  modelSteps: "Number of persisted model step requests in this run. Each step is a new request where the model resumes with the current accumulated context.",
  tokens: "Model token usage for the currently selected per-target workflow run.",
  contextLoad: "Estimated tokens represented by the final persisted step request body sent to the model, reflecting the last effective context window."
} as const;

const PAGE_BOTTOM_THRESHOLD_PX = 24;

function isWindowNearPageBottom() {
  if (typeof window === "undefined") {
    return false;
  }

  const documentHeight = document.documentElement.scrollHeight;
  const viewportBottom = window.scrollY + window.innerHeight;
  return documentHeight - viewportBottom <= PAGE_BOTTOM_THRESHOLD_PX;
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

function formatThousandsTokenCount(value: number) {
  const thousands = Math.floor(value / 1000);
  return `${new Intl.NumberFormat("en-US").format(thousands).replaceAll(",", " ")}k`;
}

function formatTokenUsage(run: WorkflowRun) {
  return `${formatThousandsTokenCount(run.tokenUsage.inputTokens)} in · ${formatThousandsTokenCount(run.tokenUsage.outputTokens)} out · ${formatThousandsTokenCount(run.tokenUsage.totalTokens)} total`;
}

function formatContextLoad(run: WorkflowRun) {
  return `${formatThousandsTokenCount(getWorkflowRunContextTokenEstimate(run))} total`;
}

function formatModelSteps(run: WorkflowRun) {
  return String(getWorkflowRunModelStepCount(run));
}

function formatWorkflowEvaluation(value: WorkflowRunEvaluationResponse | null) {
  if (!value || value.status === "unavailable") {
    return "Not available";
  }
  return value.label;
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

function createWorkflowBuiltinToolSegment(): StructuredToolSegment["tools"] {
  return [
    {
      key: "builtin:log_progress",
      name: "log_progress",
      description: "Persist one short operator-visible progress update for the workflow transcript.",
      source: "builtin-action",
      inputSchema: JSON.stringify({
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string" }
        }
      }, null, 2),
    },
    {
      key: "builtin:report_system_graph_batch",
      name: "report_system_graph_batch",
      description: "Persist one batched workflow system graph with resources, findings, and relationships.",
      source: "builtin-action",
      inputSchema: JSON.stringify({
        type: "object",
        properties: {
          resources: { type: "array", items: { type: "object" } },
          resourceRelationships: { type: "array", items: { type: "object" } },
          findings: { type: "array", items: { type: "object" } },
          findingRelationships: { type: "array", items: { type: "object" } },
          paths: { type: "array", items: { type: "object" } }
        }
      }, null, 2),
    },
    {
      key: "builtin:complete_run",
      name: "complete_run",
      description: "Finish the workflow pipeline successfully.",
      source: "builtin-action",
      inputSchema: JSON.stringify({
        type: "object",
        required: ["summary", "recommendedNextStep", "residualRisk"],
        properties: {
          summary: { type: "string" },
          recommendedNextStep: { type: "string" },
          residualRisk: { type: "string" }
        }
      }, null, 2),
    }
  ];
}

function buildStructuredToolSegment(workflow: Workflow, agent: AiAgent | null, tools: AiTool[]): StructuredToolSegment {
  const effectiveToolIds = workflow.allowedToolIds.length > 0
    ? workflow.allowedToolIds
    : (agent?.toolIds ?? []);
  const toolLookup = new Map(tools.map((tool) => [tool.id, tool]));
  const reconstructedTools = effectiveToolIds
    .map((toolId) => toolLookup.get(toolId))
    .filter((tool): tool is AiTool => Boolean(tool))
    .map((tool) => ({
      key: tool.id,
      name: tool.name,
      description: tool.description?.trim() || "No description provided.",
      source: "workflow-tool" as const,
      inputSchema: JSON.stringify(tool.inputSchema, null, 2)
    }));
  const builtinActions = createWorkflowBuiltinToolSegment();
  const availableCount = reconstructedTools.length + builtinActions.length;

  return {
    summary: `${availableCount} tool${availableCount === 1 ? "" : "s"} and actions available to the model.`,
    tools: [...reconstructedTools, ...builtinActions]
  };
}

function buildDuplexAtoms(input: {
  workflow: Workflow;
  run: WorkflowRun | null;
  transcript: TranscriptProjection;
  agent: AiAgent | null;
  tools: AiTool[];
  findingsById: Map<string, FindingsRailItem>;
  errors: string[];
}) {
  const atoms: DuplexAtom[] = [];
  const pendingToolAtoms: DuplexAtom[] = [];

  const findPendingToolAtom = (detail: { toolCallId: string | null; toolName: string }) => {
    if (detail.toolCallId) {
      return [...pendingToolAtoms].reverse().find((atom) => atom.status === undefined && atom.toolCallId === detail.toolCallId) ?? null;
    }

    const normalizedToolName = normalizeInlineText(detail.toolName);
    return [...pendingToolAtoms].reverse().find((atom) =>
      atom.status === undefined && normalizeInlineText(atom.label) === normalizedToolName
    ) ?? null;
  };

  const stopTrackingPendingToolAtom = (atom: DuplexAtom) => {
    const index = pendingToolAtoms.indexOf(atom);
    if (index >= 0) {
      pendingToolAtoms.splice(index, 1);
    }
  };

  const applyToolResultToAtom = (
    atom: DuplexAtom,
    detail: {
      summary: string;
      body: string | null;
      rawModelOutput?: string | null;
      observations: Observation[];
      status: string;
    }
  ) => {
    atom.summaryText = detail.summary;
    atom.body = detail.body ?? detail.summary;
    if (detail.rawModelOutput !== undefined) {
      atom.rawModelOutput = detail.rawModelOutput;
    }
    atom.observations = detail.observations;
    atom.status = detail.status;
    atom.meta = detail.status;
    stopTrackingPendingToolAtom(atom);
  };

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
      if (item.title === "Tool context") {
        atoms.push({
          key: item.id,
          side: "right",
          kind: "tool-context",
          label: "Structured tool segment",
          meta: compactDate(item.createdAt),
          structuredToolSegment: buildStructuredToolSegment(input.workflow, input.agent, input.tools)
        });
        continue;
      }

      atoms.push({
        key: item.id,
        side: item.title === "Recon completed" || item.title === "Attack plan created" ? "left" : "right",
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
          label: "",
          body: assistantBody,
          meta: compactDate(item.createdAt),
          ...(item.live ? { title: "Live model output" } : {})
        });
      }

      for (const detail of item.details) {
        if (detail.kind === "tool_call") {
          const existingPendingAtom = detail.toolCallId ? findPendingToolAtom(detail) : null;
          if (existingPendingAtom) {
            existingPendingAtom.label = detail.toolName;
            existingPendingAtom.title = detail.title;
            if (detail.body) {
              existingPendingAtom.code = detail.body;
            }
            continue;
          }

          const toolAtom: DuplexAtom = {
            key: detail.id,
            side: "left",
            kind: "tool-call",
            label: detail.toolName,
            toolCallId: detail.toolCallId,
            title: detail.title,
            meta: "requested",
            ...(detail.body ? { code: detail.body } : {})
          };
          toolAtoms.push(toolAtom);
          pendingToolAtoms.push(toolAtom);
          continue;
        }

        if (detail.kind === "tool_result") {
          const existingToolAtom = findPendingToolAtom(detail);

          if (existingToolAtom) {
            applyToolResultToAtom(existingToolAtom, detail);
          } else {
            toolAtoms.push({
              key: detail.id,
              side: "left",
              kind: "tool-call",
              label: detail.toolName,
              toolCallId: detail.toolCallId,
              title: `${detail.toolName} returned`,
              summaryText: detail.summary,
              body: detail.body ?? detail.summary,
              rawModelOutput: detail.rawModelOutput,
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

    const pendingToolOutcomeStatus = item.status === "failed" ? "failed" : "no_result";
    const pendingToolOutcomeSummary = item.status === "failed"
      ? "Tool result was not recorded before the run failed."
      : "Tool result was not recorded before the run sealed.";
    for (const pendingAtom of [...pendingToolAtoms]) {
      if (pendingAtom.status !== undefined) {
        continue;
      }

      pendingAtom.status = pendingToolOutcomeStatus;
      pendingAtom.meta = pendingToolOutcomeStatus;
      pendingAtom.summaryText = pendingAtom.summaryText ?? pendingToolOutcomeSummary;
      pendingAtom.body = pendingAtom.body ?? pendingToolOutcomeSummary;
      stopTrackingPendingToolAtom(pendingAtom);
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

function getToolStatusPresentation(status: string | undefined) {
  const normalizedStatus = normalizeInlineText(status);
  if (!normalizedStatus || normalizedStatus === "requested" || normalizedStatus === "running") {
    return { label: "loading", tone: "text-blue-500", loading: true };
  }

  if (normalizedStatus === "completed" || normalizedStatus === "done") {
    return { label: "done", tone: "text-green-500", loading: false };
  }

  if (normalizedStatus === "failed") {
    return { label: "failed", tone: "text-red-500", loading: false };
  }

  if (normalizedStatus === "no_result" || normalizedStatus === "no result") {
    return { label: "no result", tone: "text-muted-foreground", loading: false };
  }

  return { label: normalizedStatus, tone: "text-muted-foreground", loading: false };
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
  const preferredSource = collapseWhitespace(atom.summaryText) || collapseWhitespace(atom.body);
  if (!preferredSource) {
    return atom.status ? `${getToolStatusPresentation(atom.status).label} with no summarized output.` : null;
  }

  const normalizedSummary = normalizeInlineText(preferredSource);
  const normalizedLabel = normalizeInlineText(labelText);
  const normalizedName = normalizeInlineText(atom.label);
  const normalizedStatus = normalizeInlineText(atom.status);

  const repeatsLabel = normalizedLabel.length > 0 && normalizedSummary.includes(normalizedLabel);
  const repeatsName = normalizedName.length > 0 && normalizedSummary.includes(normalizedName);
  const repeatsStatus = normalizedStatus.length > 0 && normalizedSummary.includes(normalizedStatus);

  if (repeatsLabel || (repeatsName && repeatsStatus)) {
    return atom.status ? `${getToolStatusPresentation(atom.status).label} with no summarized output.` : null;
  }

  const lines = preferredSource.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 2) {
    return `${lines.slice(0, 2).join("\n")}...`;
  }

  return truncateWithEllipsis(preferredSource, 100);
}

function ToolObservations({
  observations,
  showHeading
}: {
  observations: Observation[];
  showHeading: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", showHeading ? "pt-1" : "")}>
      {showHeading ? (
        <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">Observations</div>
      ) : null}
      <ul className="space-y-0.5">
        {observations.map((observation) => (
          <li key={observation.id} className="grid grid-cols-[10px_1fr] gap-1.5 text-[0.76rem] leading-[1.5] text-foreground/85">
            <span className="text-success">+</span>
            <span>
              <span className="text-foreground">{observation.title}</span>
              <span className="text-muted-foreground"> · </span>
              <span>{observation.summary}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToolDetailBlock({
  label,
  hint,
  children
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center gap-1.5">
        <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">{label}</div>
        <HelpHint label={label} hint={hint} />
      </div>
      {children}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStructuredSystemBody(atom: DuplexAtom): StructuredReconSummary | StructuredAttackPlanSummary | null {
  if (!atom.body) {
    return null;
  }

  try {
    const parsed = JSON.parse(atom.body) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    if (atom.label === "Recon completed") {
      const openPorts = Array.isArray(parsed["openPorts"]) ? parsed["openPorts"]
        .filter(isRecord)
        .map((entry) => ({
          port: typeof entry["port"] === "number" ? entry["port"] : 0,
          protocol: typeof entry["protocol"] === "string" ? entry["protocol"] : "",
          service: typeof entry["service"] === "string" ? entry["service"] : "",
          ...(typeof entry["version"] === "string" ? { version: entry["version"] } : {})
        }))
        .filter((entry) => entry.port > 0 && entry.protocol && entry.service)
        : [];

      const technologies = Array.isArray(parsed["technologies"])
        ? parsed["technologies"].filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];

      const serverInfo = isRecord(parsed["serverInfo"])
        ? Object.fromEntries(Object.entries(parsed["serverInfo"]).filter(([, value]) => typeof value === "string" && value.trim().length > 0)) as Record<string, string>
        : {};

      return { kind: "recon", openPorts, technologies, serverInfo };
    }

    if (atom.label === "Attack plan created") {
      const phases = Array.isArray(parsed["phases"]) ? parsed["phases"]
        .filter(isRecord)
        .map((phase) => ({
          ...(typeof phase["id"] === "string" ? { id: phase["id"] } : {}),
          ...(typeof phase["name"] === "string" ? { name: phase["name"] } : {}),
          ...(typeof phase["priority"] === "string" ? { priority: phase["priority"] } : {}),
          ...(typeof phase["rationale"] === "string" ? { rationale: phase["rationale"] } : {}),
          ...(typeof phase["targetService"] === "string" ? { targetService: phase["targetService"] } : {}),
          ...(typeof phase["status"] === "string" ? { status: phase["status"] } : {}),
          ...(Array.isArray(phase["tools"])
            ? { tools: phase["tools"].filter((item): item is string => typeof item === "string" && item.trim().length > 0) }
            : {})
        }))
        : [];

      return {
        kind: "attack-plan",
        ...(typeof parsed["overallRisk"] === "string" ? { overallRisk: parsed["overallRisk"] } : {}),
        ...(typeof parsed["summary"] === "string" ? { summary: parsed["summary"] } : {}),
        phases
      };
    }
  } catch {
    return null;
  }

  return null;
}

function StructuredSystemCard({ atom }: { atom: DuplexAtom }) {
  const structured = parseStructuredSystemBody(atom);
  if (!structured) {
    return null;
  }

  if (structured.kind === "recon") {
    const portSummary = structured.openPorts
      .map((port) => `${port.port}/${port.protocol} ${port.service}${port.version ? ` (${port.version})` : ""}`)
      .join(" · ");
    const serverInfoEntries = Object.entries(structured.serverInfo);

    return (
      <div className="space-y-2 py-1">
        <div className="space-y-1">
          <MonoLabel>Recon summary</MonoLabel>
          {portSummary ? <p className="text-[0.82rem] leading-[1.65] text-foreground/84">{portSummary}</p> : null}
        </div>
        {structured.technologies.length > 0 ? (
          <div className="space-y-1">
            <MonoLabel>Technologies</MonoLabel>
            <p className="text-[0.8rem] leading-[1.65] text-foreground/82">
              {structured.technologies.join(" · ")}
            </p>
          </div>
        ) : null}
        {serverInfoEntries.length > 0 ? (
          <div className="space-y-1">
            <MonoLabel>Server profile</MonoLabel>
            <div className="space-y-1 text-[0.8rem] leading-[1.6] text-foreground/82">
              {serverInfoEntries.map(([key, value]) => (
                <p key={key}>
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">{key}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span>{value}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 py-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <MonoLabel>Attack plan</MonoLabel>
          {structured.summary ? <p className="text-[0.84rem] leading-[1.6] text-foreground/82">{structured.summary}</p> : null}
        </div>
        {structured.overallRisk ? (
          <span className="rounded-sm border border-border/70 bg-card/60 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground/80">
            Risk · {structured.overallRisk}
          </span>
        ) : null}
      </div>
      <ol className="mt-1 space-y-2">
        {structured.phases.map((phase, index) => (
          <li key={phase.id ?? `${phase.name ?? "phase"}:${index}`} className="ml-5 list-decimal text-foreground/84 marker:font-mono marker:text-foreground/65">
            <div className="min-w-0 pl-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[0.86rem] text-foreground">{phase.name ?? `Phase ${index + 1}`}</div>
                <div className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {phase.priority ? <span>{phase.priority}</span> : null}
                  {phase.status ? <span>{phase.status}</span> : null}
                </div>
              </div>
              {phase.targetService ? <div className="mt-1 text-[0.74rem] text-muted-foreground">{phase.targetService}</div> : null}
              {phase.rationale ? <div className="mt-1 text-[0.8rem] leading-[1.55] text-foreground/82">{phase.rationale}</div> : null}
              {phase.tools && phase.tools.length > 0 ? (
                <div className="mt-1.5 text-[0.76rem] leading-[1.6] text-foreground/78">
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">Tools</span>
                  <span className="text-muted-foreground"> · </span>
                  <span>{phase.tools.join(", ")}</span>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function InlineTranscriptEntry({ atom, showFullDetails }: { atom: DuplexAtom; showFullDetails: boolean }) {
  const isLeft = atom.side === "left";
  const accent = KIND_ACCENT[atom.kind];
  const isTool = atom.kind === "tool-call" || atom.kind === "tool-output";
  const isSystemTone = atom.kind === "objective" || atom.kind === "system-prompt" || atom.kind === "system" || atom.kind === "verification";
  const isErrorTone = atom.kind === "error";
  const labelText = isTool ? formatToolLine(atom) : atom.label;
  const toolStatusPresentation = isTool ? getToolStatusPresentation(atom.status ?? atom.meta) : null;
  const compactToolInput = isTool ? getCompactToolInput(atom) : null;
  const compactToolOutput = isTool ? getCompactToolOutput(atom, labelText) : null;
  const showTitle = Boolean(atom.title) && (!isTool || normalizeInlineText(atom.title) !== normalizeInlineText(labelText));
  const showLeadLine = Boolean(labelText) || Boolean(compactToolInput && !showFullDetails) || Boolean(showTitle);
  const isStructuredToolContext = atom.kind === "tool-context" && atom.structuredToolSegment;
  const structuredToolSegment = isStructuredToolContext ? atom.structuredToolSegment : null;
  const structuredSystemCard = atom.kind === "system" ? <StructuredSystemCard atom={atom} /> : null;
  const hideTranscriptBadge = Boolean(structuredSystemCard);
  const hasObservations = Boolean(
    atom.observations && atom.observations.length > 0
  );
  const showObservationPreview = isTool && hasObservations && !showFullDetails && !isStructuredToolContext;
  const showCompactToolOutput = Boolean(compactToolOutput) && !showObservationPreview && !showFullDetails && !isStructuredToolContext;

  return (
    <div className={cn("flex w-full", isLeft ? "justify-start pr-[6%]" : "justify-end pl-[6%]")}>
      <article className={cn("w-full max-w-[52rem] space-y-1.5", isTool ? "max-w-[48rem]" : "")}>
        {!hideTranscriptBadge ? (
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
                {toolStatusPresentation ? (
                  <span className={cn("inline-flex items-center gap-1 font-semibold", toolStatusPresentation.tone)}>
                    {toolStatusPresentation.loading ? <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
                    {toolStatusPresentation.label}
                  </span>
                ) : (
                  <span>{atom.meta}</span>
                )}
              </>
            ) : null}
          </div>
        ) : null}
        <div className={cn("space-y-1", isTool ? "pl-4" : "")}>
          {structuredToolSegment ? (
            <details className="rounded-lg border border-border/70 bg-background/35">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-left marker:hidden">
                <div className="space-y-1">
                  <p className="text-[0.86rem] text-foreground/88">{atom.label}</p>
                  <p className="text-[0.76rem] text-muted-foreground">{structuredToolSegment.summary}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform details-open:rotate-90" />
              </summary>
              <div className="space-y-3 border-t border-border/70 px-3 py-3">
                {structuredToolSegment.tools.map((tool) => (
                  <div key={tool.key} className="rounded-md border border-border/60 bg-card/50 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
                          {tool.source === "builtin-action" ? "Built-in action" : "Workflow tool"}
                        </p>
                        <p className="mt-1 text-[0.92rem] text-foreground">{tool.name}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[0.82rem] leading-[1.6] text-foreground/78">{tool.description}</p>
                    <div className="mt-3">
                      <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">Input schema</div>
                      <pre className="mt-1 overflow-x-auto rounded-sm border border-border/70 bg-muted/35 px-2.5 py-2 font-mono text-[0.7rem] leading-5 text-foreground/85">
                        {tool.inputSchema}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {structuredSystemCard}

          {!isStructuredToolContext && !structuredSystemCard && showLeadLine ? (
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
          ) : null}

          {showCompactToolOutput && !structuredSystemCard ? (
            <p className="whitespace-pre-wrap font-mono text-[0.74rem] leading-[1.55] text-muted-foreground/90">
              {compactToolOutput}
            </p>
          ) : null}

          {showObservationPreview ? (
            <div className="space-y-2">
              <ToolObservations observations={atom.observations ?? []} showHeading={false} />
            </div>
          ) : null}

          {showFullDetails && atom.code ? (
            <ToolDetailBlock
              label="Input"
              hint="The exact payload the workflow sent to the tool for this run."
            >
              <pre className="overflow-x-auto rounded-sm border border-border/70 bg-muted/35 px-2.5 py-1.5 font-mono text-[0.7rem] leading-5 text-foreground/85">
                {atom.code}
              </pre>
            </ToolDetailBlock>
          ) : null}

          {atom.body && (!isTool || showFullDetails) && !isStructuredToolContext && !structuredSystemCard ? (
            isTool && showFullDetails ? (
              <ToolDetailBlock
                label="Output"
                hint="The exact tool result payload that was returned to the model for this run."
              >
                <p className="whitespace-pre-wrap text-[0.92rem] leading-[1.7] text-foreground/88">
                  {atom.rawModelOutput ?? atom.body}
                </p>
              </ToolDetailBlock>
            ) : (
              <p
                className={cn(
                  "whitespace-pre-wrap leading-[1.7]",
                  isSystemTone
                    ? "text-[0.86rem] font-light text-foreground/68"
                    : atom.kind === "body"
                      ? "text-[0.88rem] text-foreground/88"
                      : "text-[0.92rem] text-foreground/88"
                )}
              >
                {atom.body}
              </p>
            )
          ) : null}

          {showFullDetails && hasObservations ? (
            <ToolDetailBlock
              label="Observations"
              hint="Structured evidence summaries derived from the tool run and surfaced by default in the compact view."
            >
              <ToolObservations observations={atom.observations ?? []} showHeading={false} />
            </ToolDetailBlock>
          ) : null}
        </div>
      </article>
    </div>
  );
}

type WorkflowDetailView = "run" | "graph" | "findings" | "attacks";

const VIEW_OPTIONS: Array<{ id: WorkflowDetailView; label: string }> = [
  { id: "run", label: "Workflow run" },
  { id: "graph", label: "Workflow graph" },
  { id: "findings", label: "Findings list" },
  { id: "attacks", label: "Attack list" }
];

function FindingsRail({
  metadata,
  selectedView,
  onSelectView,
  showViewSelector
}: {
  metadata: MetadataItem[];
  selectedView: WorkflowDetailView;
  onSelectView: (view: WorkflowDetailView) => void;
  showViewSelector: boolean;
}) {
  if (metadata.length === 0 && !showViewSelector) {
    return null;
  }

  return (
    <aside className="space-y-3 lg:sticky lg:top-6">
      {metadata.length > 0 ? (
        <DetailMetadataPanel
          title="Metadata"
          hint="Workflow identity, linked resources, and current run state for this Duplex session."
          compact
          className="rounded-xl border-border/80 bg-card px-4 py-4"
        >
          <div className="mt-0 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {metadata.map((item) => (
              <DetailSidebarItem key={item.label} label={item.label} compact {...(item.hint ? { hint: item.hint } : {})}>
                {item.value}
              </DetailSidebarItem>
            ))}
          </div>
        </DetailMetadataPanel>
      ) : null}
      {showViewSelector ? (
        <div className="rounded-xl border border-border/80 bg-card px-4 py-4">
          <div className="mb-2 px-3 font-mono text-eyebrow font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Artifacts
          </div>
          <div className="grid gap-1">
            {VIEW_OPTIONS.map((option) => {
              const active = option.id === selectedView;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectView(option.id)}
                  className={cn(
                    "relative flex w-full items-center rounded-none px-3 py-2 text-left text-sm font-medium leading-none transition-colors",
                    active
                      ? "bg-muted text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary before:content-['']"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export function WorkflowTraceSection({
  workflow,
  activeTarget,
  targets,
  agents,
  tools,
  run,
  running,
  transcript,
  attackPaths,
  summaryCard,
  showFullDetails = false,
  latestRunError,
  transcriptError,
  streamError,
  executionReport,
  workflowEvaluation
}: {
  workflow: Workflow | null;
  activeTarget: WorkflowTarget | null;
  targets: WorkflowTarget[];
  agents: AiAgent[];
  tools: AiTool[];
  run: WorkflowRun | null;
  running: boolean;
  transcript?: TranscriptProjection | null;
  attackPaths?: AttackPathSummary | null;
  summaryCard: SummaryCardData;
  showFullDetails?: boolean;
  latestRunError?: string | null;
  transcriptError?: string | null;
  streamError?: string | null;
  executionReport?: ExecutionReportDetail | null;
  workflowEvaluation?: WorkflowRunEvaluationResponse | null;
}) {
  const [selectedView, setSelectedView] = useState<WorkflowDetailView>("run");
  const reportAvailable = Boolean(executionReport);
  useEffect(() => {
    if (!reportAvailable && selectedView !== "run") {
      setSelectedView("run");
    }
  }, [reportAvailable, selectedView]);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const shouldFollowRef = useRef(false);
  const hasMeasuredScrollStateRef = useRef(false);
  const previousStreamEventCountRef = useRef<number | null>(null);
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
      running
    });
  }, [workflow, run, agents, toolLookup, running]);
  const effectiveTranscript = transcript ?? derivedTranscript;
  const effectiveAttackPaths = attackPaths ?? { venues: [], vectors: [], paths: [] };
  const findingsById = useMemo(
    () => new Map(effectiveTranscript.findings.map((finding) => [finding.id, finding])),
    [effectiveTranscript]
  );
  const citedFindingIds = useMemo(() => {
    const cited = new Set<string>();
    for (const path of effectiveAttackPaths.paths) {
      for (const id of path.findingIds) cited.add(id);
      for (const id of path.supportingFindingIds) cited.add(id);
      for (const id of path.suspectedFindingIds) cited.add(id);
      for (const id of path.blockedFindingIds) cited.add(id);
    }
    return cited;
  }, [effectiveAttackPaths]);
  const standaloneFindings = useMemo(
    () => effectiveTranscript.findings.filter((finding) => !citedFindingIds.has(finding.id)),
    [effectiveTranscript, citedFindingIds]
  );
  const agent = useMemo(
    () => workflow ? agents.find((item) => item.id === workflow.agentId) ?? null : null,
    [workflow, agents]
  );
  const metadataItems = useMemo<MetadataItem[]>(() => {
    return [
      { label: "Evaluation", value: formatWorkflowEvaluation(workflowEvaluation ?? null), hint: WORKFLOW_METADATA_HINTS.evaluation },
      ...(run ? [{ label: "Model Steps", value: formatModelSteps(run), hint: WORKFLOW_METADATA_HINTS.modelSteps }] : []),
      ...(run ? [{ label: "Tokens", value: formatTokenUsage(run), hint: WORKFLOW_METADATA_HINTS.tokens }] : []),
      ...(run ? [{ label: "Context Window", value: formatContextLoad(run), hint: WORKFLOW_METADATA_HINTS.contextLoad }] : []),
    ];
  }, [run, workflowEvaluation]);
  const atoms = useMemo(() => {
    if (!workflow) {
      return [];
    }

    return buildDuplexAtoms({
      workflow,
      run,
      transcript: effectiveTranscript,
      agent,
      tools,
      findingsById,
      errors: errorMessages
    }).filter((atom) => atom.kind !== "finding");
  }, [workflow, run, effectiveTranscript, agent, findingsById, errorMessages]);
  const pendingToolAtom = useMemo(
    () => atoms.slice().reverse().find((atom) => atom.kind === "tool-call" && !atom.status) ?? null,
    [atoms]
  );
  const streamEventCount = run?.events.length ?? 0;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateFollowState = () => {
      shouldFollowRef.current = isWindowNearPageBottom();
      hasMeasuredScrollStateRef.current = true;
    };

    updateFollowState();
    window.addEventListener("scroll", updateFollowState, { passive: true });
    window.addEventListener("resize", updateFollowState);

    return () => {
      window.removeEventListener("scroll", updateFollowState);
      window.removeEventListener("resize", updateFollowState);
    };
  }, []);

  useEffect(() => {
    if (run?.status !== "running") {
      previousStreamEventCountRef.current = null;
    }
  }, [run?.status]);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || run?.status !== "running") {
      return;
    }

    const previousEventCount = previousStreamEventCountRef.current;
    previousStreamEventCountRef.current = streamEventCount;

    if (previousEventCount === null) {
      return;
    }

    if (streamEventCount <= previousEventCount || !hasMeasuredScrollStateRef.current || !shouldFollowRef.current) {
      return;
    }

    const transcriptBottom = transcriptRef.current?.getBoundingClientRect().bottom ?? document.documentElement.getBoundingClientRect().bottom;
    const targetTop = window.scrollY + transcriptBottom - window.innerHeight + PAGE_BOTTOM_THRESHOLD_PX;

    try {
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "auto"
      });
    } catch {
      return;
    }
    shouldFollowRef.current = true;
  }, [run?.status, streamEventCount]);

  if (!workflow) {
    return null;
  }

  const runView = (
    <div className="space-y-4">
      {effectiveAttackPaths.paths.length > 0 ? (
        <AttackPathsSection
          attackPaths={effectiveAttackPaths}
          findingTitles={new Map(effectiveTranscript.findings.map((finding) => [finding.id, finding.title]))}
          findingSeverities={new Map(effectiveTranscript.findings.map((finding) => [finding.id, finding.severity]))}
          summary="Ranked attack paths are the primary outcome of the run. The transcript below is the evidence trail that supports each path and finding."
          emptyMessage="No linked attack paths were derived from this run yet."
        />
      ) : null}
      <div ref={transcriptRef} className="relative min-h-[38rem]">
            <div className="mx-auto w-full max-w-[56rem] px-6 py-8">
              <div className="space-y-5">
                {atoms.map((atom) => (
                  <div key={atom.key} className="duplex-entry">
                    <InlineTranscriptEntry atom={atom} showFullDetails={showFullDetails} />
                  </div>
                ))}

                {run?.status === "running" ? (
                  <div className="flex w-full justify-start pr-[8%]">
                    {pendingToolAtom ? (
                      <div className="flex items-center gap-2 font-mono text-[0.7rem] font-semibold text-warning">
                        <span>Tool running · {pendingToolAtom.label}</span>
                        <span className="duplex-typing inline-flex items-center gap-0.5">
                          <span>•</span>
                          <span>•</span>
                          <span>•</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 font-mono text-[0.64rem] text-muted-foreground">
                        <Radio className="h-3 w-3 text-primary" />
                        <span>Agent typing</span>
                        <span className="duplex-typing inline-flex items-center gap-0.5">
                          <span>•</span>
                          <span>•</span>
                          <span>•</span>
                        </span>
                      </div>
                    )}
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
  );

  let mainContent: ReactNode = runView;
  if (executionReport && selectedView === "graph") {
    mainContent = <ExecutionReportGraphMap graph={executionReport.graph} />;
  } else if (executionReport && selectedView === "findings") {
    mainContent = (
      <ExecutionReportFindingsView
        report={executionReport}
        onJumpToToolActivity={() => undefined}
      />
    );
  } else if (executionReport && selectedView === "attacks") {
    mainContent = (
      <AttackPathsSection
        attackPaths={executionReport.attackPaths}
        findingTitles={new Map(executionReport.findings.map((finding) => [finding.id, finding.title]))}
        findingSeverities={new Map(executionReport.findings.map((finding) => [finding.id, finding.severity]))}
        summary={executionReport.attackPathExecutiveSummary}
        emptyMessage="No linked attack paths were derived for this report."
      />
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">{mainContent}</div>

      <FindingsRail
        metadata={metadataItems}
        selectedView={selectedView}
        onSelectView={setSelectedView}
        showViewSelector={reportAvailable}
      />

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
