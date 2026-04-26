import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import type { AiAgent, AiTool, Observation, Target as WorkflowTarget, Workflow, WorkflowRun } from "@synosec/contracts";
import { AlertTriangle, ChevronRight, LoaderCircle, Radio, Target } from "lucide-react";
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
  meta?: string;
  severity?: FindingsRailItem["severity"];
  code?: string;
  observations?: Observation[];
  observationSummaries?: string[];
  status?: string;
  expandableBody?: boolean;
  usedToolName?: string | null;
  fallbackUsed?: boolean;
  attempts?: Array<{
    toolId: string;
    toolName: string;
    status: string;
    exitCode?: number | undefined;
    statusReason?: string | undefined;
    outputExcerpt: string;
    selected: boolean;
  }>;
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
  status: "Lifecycle state of the workflow definition itself, separate from the currently selected run.",
  target: "Target context for the currently selected per-target run.",
  agent: "AI agent definition that provides the standing prompt, provider, and default tool grants.",
  currentRun: "Latest persisted run state and the number of workflow events currently attached to it.",
  updated: "Last time the workflow definition record changed."
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
      key: "builtin:report_finding",
      name: "report_finding",
      description: "Persist one evidence-backed workflow finding.",
      source: "builtin-action",
      inputSchema: JSON.stringify({
        type: "object",
        required: ["type", "title", "severity", "target", "evidence", "impact", "recommendation"],
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
          target: {
            type: "object",
            required: ["host"],
            properties: {
              host: { type: "string" },
              port: { type: "number" },
              url: { type: "string" }
            }
          },
          evidence: {
            type: "array",
            items: {
              type: "object"
            }
          },
          derivedFromFindingIds: {
            type: "array",
            items: { type: "string" }
          },
          relatedFindingIds: {
            type: "array",
            items: { type: "string" }
          },
          enablesFindingIds: {
            type: "array",
            items: { type: "string" }
          },
          chain: {
            type: "object"
          },
          impact: { type: "string" },
          recommendation: { type: "string" },
          confidence: { type: "number" },
          validationStatus: { type: "string" },
          explanationSummary: { type: "string" },
          confidenceReason: { type: "string" },
          relationshipExplanations: { type: "object" },
          reproduction: {
            type: "object"
          },
          tags: {
            type: "array",
            items: { type: "string" }
          }
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
          toolAtoms.push({
            key: detail.id,
            side: "left",
            kind: "tool-call",
            label: detail.toolName,
            toolCallId: detail.toolCallId,
            title: detail.title,
            meta: "requested",
            ...(detail.body ? { code: detail.body } : {})
          });
          continue;
        }

        if (detail.kind === "tool_result") {
          const matchingToolAtoms = [...toolAtoms].filter((atom) =>
            atom.kind === "tool-call"
              && atom.status === undefined
              && (
                (detail.toolCallId && atom.toolCallId === detail.toolCallId)
                || (!detail.toolCallId && atom.label === detail.toolName)
              )
          );
          const existingToolAtom = matchingToolAtoms[matchingToolAtoms.length - 1];

          if (existingToolAtom) {
            for (const atom of matchingToolAtoms) {
              atom.summaryText = detail.summary;
              atom.body = detail.body ?? detail.summary;
              atom.observations = detail.observations;
              atom.observationSummaries = detail.observationSummaries;
              atom.status = detail.status;
              atom.meta = detail.status;
              atom.usedToolName = detail.usedToolName;
              atom.fallbackUsed = detail.fallbackUsed;
              atom.attempts = detail.attempts;
            }
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
              observations: detail.observations,
              observationSummaries: detail.observationSummaries,
              status: detail.status,
              meta: detail.status,
              usedToolName: detail.usedToolName,
              fallbackUsed: detail.fallbackUsed,
              attempts: detail.attempts
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
  const preferredSource = collapseWhitespace(atom.summaryText) || collapseWhitespace(atom.body);
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

function ToolObservations({
  observations,
  observationSummaries,
  showHeading
}: {
  observations: Observation[];
  observationSummaries?: string[] | undefined;
  showHeading: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", showHeading ? "pt-1" : "")}>
      {showHeading ? (
        <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">Observations</div>
      ) : null}
      <ul className="space-y-0.5">
        {observations.length > 0 ? observations.map((observation) => (
          <li key={observation.id} className="grid grid-cols-[10px_1fr] gap-1.5 text-[0.76rem] leading-[1.5] text-foreground/85">
            <span className="text-success">+</span>
            <span>
              <span className="text-foreground">{observation.title}</span>
              <span className="text-muted-foreground"> · </span>
              <span>{observation.summary}</span>
            </span>
          </li>
        )) : (observationSummaries ?? []).map((observation) => (
          <li key={observation} className="grid grid-cols-[10px_1fr] gap-1.5 text-[0.76rem] leading-[1.5] text-foreground/85">
            <span className="text-success">+</span>
            <span>{observation}</span>
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
  const compactToolInput = isTool ? getCompactToolInput(atom) : null;
  const compactToolOutput = isTool ? getCompactToolOutput(atom, labelText) : null;
  const showTitle = Boolean(atom.title) && (!isTool || normalizeInlineText(atom.title) !== normalizeInlineText(labelText));
  const showLeadLine = Boolean(labelText) || Boolean(compactToolInput && !showFullDetails) || Boolean(showTitle);
  const isStructuredToolContext = atom.kind === "tool-context" && atom.structuredToolSegment;
  const structuredToolSegment = isStructuredToolContext ? atom.structuredToolSegment : null;
  const structuredSystemCard = atom.kind === "system" ? <StructuredSystemCard atom={atom} /> : null;
  const hideTranscriptBadge = Boolean(structuredSystemCard);
  const hasObservations = Boolean(
    (atom.observations && atom.observations.length > 0)
      || (atom.observationSummaries && atom.observationSummaries.length > 0)
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
                <span>{atom.meta}</span>
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
              {(atom.usedToolName || atom.fallbackUsed) ? (
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {atom.fallbackUsed ? `Fallback selected · ${atom.usedToolName ?? atom.label}` : `Selected tool · ${atom.usedToolName ?? atom.label}`}
                </p>
              ) : null}
              <ToolObservations observations={atom.observations ?? []} observationSummaries={atom.observationSummaries} showHeading={false} />
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
                hint="The raw tool output captured for this run before it was normalized into observations."
              >
                <p className="whitespace-pre-wrap text-[0.92rem] leading-[1.7] text-foreground/88">
                  {atom.body}
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
              <ToolObservations observations={atom.observations ?? []} observationSummaries={atom.observationSummaries} showHeading={false} />
            </ToolDetailBlock>
          ) : null}

          {showFullDetails && atom.attempts && atom.attempts.length > 0 ? (
            <ToolDetailBlock
              label="Attempts"
              hint="Candidate tool executions attempted for this tool call, including fallback provenance and failure context."
            >
              <div className="space-y-2">
                {atom.attempts.map((attempt) => (
                  <div key={`${attempt.toolId}:${attempt.status}:${attempt.selected ? "selected" : "retry"}`} className="rounded-sm border border-border/70 bg-muted/20 px-2.5 py-2">
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {attempt.selected ? "Selected" : "Not selected"} · {attempt.toolName} · {attempt.status}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[0.76rem] leading-[1.55] text-foreground/82">{attempt.outputExcerpt}</p>
                  </div>
                ))}
              </div>
            </ToolDetailBlock>
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
        <DetailMetadataPanel
          title="Metadata"
          hint="Workflow identity, linked resources, and current run state for this Duplex session."
          className="rounded-xl border-border/80 bg-card px-4 py-4"
        >
          <div className="mt-0 space-y-4">
            {metadata.map((item) => (
              <DetailSidebarItem key={item.label} label={item.label} {...(item.hint ? { hint: item.hint } : {})}>
                {item.value}
              </DetailSidebarItem>
            ))}
          </div>
        </DetailMetadataPanel>
      ) : null}
      <div className="rounded-xl border border-border/80 bg-card">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MonoLabel>Findings</MonoLabel>
              <HelpHint
                label="Findings"
                hint="This rail tracks issues the workflow explicitly reported while it was running."
              />
            </div>
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
              {findings.length} · {runStatus ?? "idle"}
            </span>
          </div>
          {findings.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No findings reported yet.</p>
          ) : null}
        </div>
        {findings.length > 0 ? (
          <ul className="divide-y divide-border/60 border-t border-border/60">
            {findings.map((finding) => (
              <li key={finding.id}>
                <details className="group">
                  <summary className="grid cursor-pointer list-none grid-cols-[5rem_minmax(0,1fr)_4rem_1rem] items-center gap-3 px-4 py-2.5 marker:hidden hover:bg-muted/30">
                    <SeverityBadge severity={finding.severity} />
                    <div className="min-w-0">
                      <p className="truncate text-[0.82rem] font-medium text-foreground">{finding.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
                        <Target className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{finding.host}</span>
                      </p>
                    </div>
                    <span className="text-right font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {finding.confidence.toFixed(2)}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="space-y-2 border-t border-dashed border-border/60 bg-background/40 px-4 py-3">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">{finding.type}</p>
                    <p className="text-[0.8rem] leading-5 text-muted-foreground">{finding.impact}</p>
                    <p className="border-t border-dashed border-border/60 pt-2 text-[0.8rem] leading-5 text-foreground/85">{finding.recommendation}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
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
  activeTarget,
  targets,
  agents,
  tools,
  run,
  running,
  transcript,
  summaryCard,
  showFullDetails = false,
  latestRunError,
  transcriptError,
  streamError
}: {
  workflow: Workflow | null;
  activeTarget: WorkflowTarget | null;
  targets: WorkflowTarget[];
  agents: AiAgent[];
  tools: AiTool[];
  run: WorkflowRun | null;
  running: boolean;
  transcript?: TranscriptProjection | null;
  summaryCard: SummaryCardData;
  showFullDetails?: boolean;
  latestRunError?: string | null;
  transcriptError?: string | null;
  streamError?: string | null;
}) {
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
  const findingsById = useMemo(
    () => new Map(effectiveTranscript.findings.map((finding) => [finding.id, finding])),
    [effectiveTranscript]
  );
  const agent = useMemo(
    () => workflow ? agents.find((item) => item.id === workflow.agentId) ?? null : null,
    [workflow, agents]
  );
  const applicationName = activeTarget?.name ?? "Unknown target";
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
      { label: "Status", value: workflow.status, hint: WORKFLOW_METADATA_HINTS.status },
      { label: "Target", value: applicationName, hint: WORKFLOW_METADATA_HINTS.target },
      { label: "Agent", value: agent?.name ?? "Unknown", hint: WORKFLOW_METADATA_HINTS.agent },
      { label: "Current Run", value: run ? `${run.status} · ${run.events.length} events` : "No active run", hint: WORKFLOW_METADATA_HINTS.currentRun },
      { label: "Updated", value: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(workflow.updatedAt)), hint: WORKFLOW_METADATA_HINTS.updated }
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

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.75fr)]">
      <div className="min-w-0">
        <div className="space-y-4">
          <div ref={transcriptRef} className="relative min-h-[38rem]">
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
                      <span>{pendingToolAtom ? `Tool running · ${pendingToolAtom.label}` : "Agent typing"}</span>
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
