import { z } from "zod";
import { executionKindSchema } from "./shared.js";
import {
  coverageStatusSchema,
  scanLayerCoverageSchema
} from "./scan-core.js";
import { observationSchema } from "./tooling.js";
import {
  type AiAgent,
  type AiTool,
  type Workflow,
  type WorkflowReportedFinding,
  type WorkflowRun,
  type WorkflowTraceEvent,
  workflowReportedFindingSchema
} from "./resources.js";

export const workflowTranscriptSystemMessageSchema = z.object({
  kind: z.literal("system_message"),
  id: z.string().min(1),
  ord: z.number().int(),
  createdAt: z.string().datetime(),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().nullable()
});
export type WorkflowTranscriptSystemMessage = z.infer<typeof workflowTranscriptSystemMessageSchema>;

export const workflowTranscriptToolCallDetailSchema = z.object({
  kind: z.literal("tool_call"),
  id: z.string().min(1),
  ord: z.number().int(),
  title: z.string().min(1),
  toolCallId: z.string().nullable(),
  toolId: z.string().nullable(),
  toolName: z.string().min(1),
  body: z.string().nullable()
});
export type WorkflowTranscriptToolCallDetail = z.infer<typeof workflowTranscriptToolCallDetailSchema>;

export const workflowTranscriptToolResultDetailSchema = z.object({
  kind: z.literal("tool_result"),
  id: z.string().min(1),
  ord: z.number().int(),
  title: z.string().min(1),
  toolCallId: z.string().nullable(),
  toolId: z.string().nullable(),
  toolName: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().nullable(),
  outputPreview: z.string().nullable().default(null),
  observations: z.array(observationSchema).default([]),
  observationSummaries: z.array(z.string().min(1)).default([]),
  usedToolId: z.string().nullable().default(null),
  usedToolName: z.string().nullable().default(null),
  fallbackUsed: z.boolean().default(false),
  attempts: z.array(z.object({
    toolId: z.string().min(1),
    toolName: z.string().min(1),
    status: z.enum(["running", "completed", "failed"]),
    exitCode: z.number().int().optional(),
    statusReason: z.string().optional(),
    outputExcerpt: z.string(),
    selected: z.boolean()
  })).default([]),
  status: z.enum(["running", "completed", "failed"])
});
export type WorkflowTranscriptToolResultDetail = z.infer<typeof workflowTranscriptToolResultDetailSchema>;

export const workflowTranscriptVerificationDetailSchema = z.object({
  kind: z.literal("verification"),
  id: z.string().min(1),
  ord: z.number().int(),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().nullable(),
  status: z.enum(["running", "completed", "failed"]),
  tone: z.enum(["accepted", "retry", "model_error", "tool_error", "challenge"]),
  toolName: z.string().nullable()
});
export type WorkflowTranscriptVerificationDetail = z.infer<typeof workflowTranscriptVerificationDetailSchema>;

export const workflowTranscriptNoteDetailSchema = z.object({
  kind: z.literal("note"),
  id: z.string().min(1),
  ord: z.number().int(),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().nullable()
});
export type WorkflowTranscriptNoteDetail = z.infer<typeof workflowTranscriptNoteDetailSchema>;

export const workflowTranscriptAssistantTurnDetailSchema = z.discriminatedUnion("kind", [
  workflowTranscriptToolCallDetailSchema,
  workflowTranscriptToolResultDetailSchema,
  workflowTranscriptVerificationDetailSchema,
  workflowTranscriptNoteDetailSchema
]);
export type WorkflowTranscriptAssistantTurnDetail = z.infer<typeof workflowTranscriptAssistantTurnDetailSchema>;

export const workflowTranscriptAssistantTurnSchema = z.object({
  kind: z.literal("assistant_turn"),
  id: z.string().min(1),
  ord: z.number().int(),
  createdAt: z.string().datetime(),
  title: z.string().min(1),
  summary: z.string(),
  body: z.string().nullable(),
  reasoning: z.string().nullable(),
  agentName: z.string().min(1),
  details: z.array(workflowTranscriptAssistantTurnDetailSchema),
  findingIds: z.array(z.string().min(1)),
  live: z.boolean().default(false)
});
export type WorkflowTranscriptAssistantTurn = z.infer<typeof workflowTranscriptAssistantTurnSchema>;

export const workflowTranscriptCloseoutSchema = z.object({
  kind: z.literal("closeout"),
  id: z.string().min(1),
  ord: z.number().int(),
  createdAt: z.string().datetime(),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().nullable(),
  status: z.enum(["completed", "failed"])
});
export type WorkflowTranscriptCloseout = z.infer<typeof workflowTranscriptCloseoutSchema>;

export const workflowTranscriptItemSchema = z.discriminatedUnion("kind", [
  workflowTranscriptSystemMessageSchema,
  workflowTranscriptAssistantTurnSchema,
  workflowTranscriptCloseoutSchema
]);
export type WorkflowTranscriptItem = z.infer<typeof workflowTranscriptItemSchema>;

export const workflowFindingsRailItemSchema = z.object({
  id: z.string().min(1),
  ord: z.number().int(),
  createdAt: z.string().datetime(),
  title: z.string().min(1),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  type: z.string().min(1),
  impact: z.string().min(1),
  recommendation: z.string().min(1),
  confidence: z.number().min(0).max(1),
  validationStatus: z.enum([
    "unverified",
    "suspected",
    "single_source",
    "cross_validated",
    "reproduced",
    "blocked",
    "rejected"
  ]).optional(),
  host: z.string().min(1)
});
export type WorkflowFindingsRailItem = z.infer<typeof workflowFindingsRailItemSchema>;

export const workflowTranscriptProjectionSchema = z.object({
  items: z.array(workflowTranscriptItemSchema),
  findings: z.array(workflowFindingsRailItemSchema)
});
export type WorkflowTranscriptProjection = z.infer<typeof workflowTranscriptProjectionSchema>;

export const workflowRunTranscriptResponseSchema = z.object({
  runId: z.string().uuid(),
  transcript: workflowTranscriptProjectionSchema
});
export type WorkflowRunTranscriptResponse = z.infer<typeof workflowRunTranscriptResponseSchema>;

export const workflowRunFindingsResponseSchema = z.object({
  runId: z.string().uuid(),
  findings: z.array(workflowReportedFindingSchema)
});
export type WorkflowRunFindingsResponse = z.infer<typeof workflowRunFindingsResponseSchema>;

export const workflowRunCoverageSchema = scanLayerCoverageSchema.extend({
  workflowRunId: z.string().uuid()
}).omit({ scanId: true });
export type WorkflowRunCoverage = z.infer<typeof workflowRunCoverageSchema>;

export const workflowRunCoverageResponseSchema = z.object({
  runId: z.string().uuid(),
  layers: z.array(workflowRunCoverageSchema)
});
export type WorkflowRunCoverageResponse = z.infer<typeof workflowRunCoverageResponseSchema>;

export const workflowRunReportSchema = z.object({
  runId: z.string().uuid(),
  executionKind: executionKindSchema.default("workflow"),
  executiveSummary: z.string(),
  stopReason: z.string().nullable(),
  totalFindings: z.number().int().min(0),
  findingsBySeverity: z.object({
    info: z.number().int().min(0),
    low: z.number().int().min(0),
    medium: z.number().int().min(0),
    high: z.number().int().min(0),
    critical: z.number().int().min(0)
  }),
  coverageOverview: z.record(coverageStatusSchema),
  topFindings: z.array(workflowReportedFindingSchema).max(10),
  generatedAt: z.string().datetime()
});
export type WorkflowRunReport = z.infer<typeof workflowRunReportSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPayloadRawString(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : null;
}

function getPayloadString(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = getPayloadRawString(payload, key);
  return value !== null && value.trim().length > 0 ? value.trim() : null;
}

function getTraceKind(event: WorkflowTraceEvent) {
  const kind = getPayloadString(event.payload ?? {}, "rawStreamPartType")
    ?? getPayloadString(event.payload ?? {}, "streamPartType")
    ?? event.type;
  switch (kind) {
    case "tool-call":
      return "tool_call";
    case "tool-call-delta":
      return "tool_call_delta";
    case "tool-call-streaming-start":
      return "tool_call_streaming_start";
    case "tool-result":
      return "tool_result";
    default:
      return kind;
  }
}

function getPayloadStringList(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getPayloadObservationList(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => observationSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);
}

function getPayloadAttemptList(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  const attempts = value
    .filter(isRecord)
    .map((item) => {
      const toolId = typeof item["toolId"] === "string" ? item["toolId"] : null;
      const toolName = typeof item["toolName"] === "string" ? item["toolName"] : null;
      const rawStatus = item["status"];
      const outputExcerpt = typeof item["outputExcerpt"] === "string" ? item["outputExcerpt"] : "";
      if (!toolId || !toolName || (rawStatus !== "running" && rawStatus !== "completed" && rawStatus !== "failed")) {
        return null;
      }
      const status: "running" | "completed" | "failed" = rawStatus;

      return {
        toolId,
        toolName,
        status,
        ...(typeof item["exitCode"] === "number" ? { exitCode: item["exitCode"] } : {}),
        ...(typeof item["statusReason"] === "string" ? { statusReason: item["statusReason"] } : {}),
        outputExcerpt,
        selected: item["selected"] === true
      };
    });

  return attempts.filter((item): item is Exclude<typeof item, null> => item !== null);
}

function parseWorkflowFinding(value: unknown): WorkflowReportedFinding | null {
  const parsed = workflowReportedFindingSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function getToolName(event: WorkflowTraceEvent, toolLookup: Record<string, string>) {
  const payload = event.payload ?? {};
  const payloadToolId = getPayloadString(payload, "toolId");
  return getPayloadString(payload, "toolName")
    ?? (payloadToolId ? toolLookup[payloadToolId] ?? payloadToolId.replace(/^tool:/, "") : null)
    ?? "Tool";
}

function toFindingsRailItem(finding: WorkflowReportedFinding, ord: number, createdAt: string): WorkflowFindingsRailItem {
  return {
    id: finding.id,
    ord,
    createdAt,
    title: finding.title,
    severity: finding.severity,
    type: finding.type,
    impact: finding.impact,
    recommendation: finding.recommendation,
    confidence: finding.confidence,
    validationStatus: finding.validationStatus,
    host: finding.target.host
  };
}

function createSystemMessage(event: WorkflowTraceEvent): WorkflowTranscriptSystemMessage {
  const payload = event.payload ?? {};
  return {
    kind: "system_message",
    id: event.id,
    ord: event.ord,
    createdAt: event.createdAt,
    title: getPayloadString(payload, "title") ?? event.title,
    summary: getPayloadString(payload, "summary") ?? event.summary,
    body: getPayloadString(payload, "body")
      ?? getPayloadString(payload, "fullPrompt")
      ?? event.detail
  };
}

function isPromptSystemMessage(event: WorkflowTraceEvent) {
  return event.type === "system_message" && getPayloadString(event.payload ?? {}, "messageKind") === "prompt";
}

function mergePromptMessages(events: WorkflowTraceEvent[]): WorkflowTranscriptSystemMessage {
  const firstEvent = events[0]!;
  const renderedParts = events
    .map((event) => {
      const payload = event.payload ?? {};
      const promptKind = getPayloadString(payload, "promptKind") ?? "system";
      const label = promptKind === "task" ? "Task prompt" : "System prompt";
      const body = getPayloadString(payload, "body")
        ?? getPayloadString(payload, "fullPrompt")
        ?? event.detail
        ?? "";
      const sourceLabel = getPayloadString(payload, "promptSourceLabel");
      const decoratedBody = sourceLabel ? `${body}\n\nSource: ${sourceLabel}`.trimEnd() : body;
      return `${label}\n\n${decoratedBody}`.trimEnd();
    })
    .filter((part) => part.trim().length > 0);

  return {
    kind: "system_message",
    id: firstEvent.id,
    ord: firstEvent.ord,
    createdAt: firstEvent.createdAt,
    title: "Prompt context",
    summary: "Persisted the exact system and task prompt context for this run.",
    body: renderedParts.join("\n\n")
  };
}

function createAssistantTurnShell(input: {
  id: string;
  ord: number;
  createdAt: string;
  agentName: string;
}): WorkflowTranscriptAssistantTurn {
  return {
    kind: "assistant_turn",
    id: input.id,
    ord: input.ord,
    createdAt: input.createdAt,
    title: input.agentName,
    summary: "",
    body: null,
    reasoning: null,
    agentName: input.agentName,
    details: [],
    findingIds: [],
    live: false
  };
}

function appendText(target: string | null, next: string) {
  return target ? `${target}${next}` : next;
}

function isGenericToolSummary(toolName: string, summary: string) {
  const normalizedSummary = summary.trim().toLowerCase();
  const normalizedToolName = toolName.trim().toLowerCase();
  return normalizedSummary === `${normalizedToolName} completed.`
    || normalizedSummary === `${normalizedToolName} completed`
    || normalizedSummary === `${normalizedToolName} failed.`
    || normalizedSummary === `${normalizedToolName} failed`;
}

function getLegacyToolInput(payload: Record<string, unknown>) {
  const toolInput = payload["toolInput"];
  return isRecord(toolInput) ? JSON.stringify(toolInput, null, 2) : null;
}

function getLegacyToolOutput(payload: Record<string, unknown>, event: WorkflowTraceEvent) {
  const fullOutput = getPayloadString(payload, "fullOutput") ?? event.detail;
  if (fullOutput) {
    return fullOutput;
  }

  const output = payload["output"];
  if (output !== undefined) {
    return JSON.stringify(output, null, 2);
  }

  return null;
}

function getLegacyVerificationTone(event: WorkflowTraceEvent) {
  const payload = event.payload ?? {};
  const messageKind = getPayloadString(payload, "messageKind");

  if (messageKind === "accept" || payload["accepted"] === true) {
    return "accepted" as const;
  }

  if (getPayloadString(payload, "action") !== null || /model/i.test(event.title) || /unsupported structured action/i.test(event.detail ?? "")) {
    return "model_error" as const;
  }

  if (getPayloadString(payload, "toolId") !== null || getPayloadString(payload, "toolName") !== null) {
    return "tool_error" as const;
  }

  if (messageKind === "challenge") {
    return "challenge" as const;
  }

  return "challenge" as const;
}

function normalizeLegacyVerification(event: WorkflowTraceEvent) {
  const payload = event.payload ?? {};
  const tone = getLegacyVerificationTone(event);
  const toolName = getPayloadString(payload, "toolName");

  if (tone === "model_error") {
    return {
      title: "Model output rejected",
      summary: "The model returned an unsupported structured action. Retry with one supported action before the run can continue.",
      body: event.detail,
      tone,
      toolName: null
    };
  }

  if (tone === "tool_error") {
    return {
      title: `${toolName ?? "Tool"} error`,
      summary: toolName
        ? `${toolName} did not complete cleanly. Retry the tool, switch tools, or mark the layer as blocked.`
        : "The tool did not complete cleanly. Retry the tool, switch tools, or mark the layer as blocked.",
      body: event.detail,
      tone,
      toolName
    };
  }

  return {
    title: event.title,
    summary: event.summary,
    body: event.detail,
    tone,
    toolName
  };
}

export function getWorkflowAgentId(workflow: Workflow) {
  return workflow.agentId;
}

export function getWorkflowObjective(workflow: Workflow) {
  return workflow.objective;
}

export function getWorkflowAllowedToolIds(workflow: Workflow) {
  return Array.isArray(workflow.allowedToolIds) ? workflow.allowedToolIds : [];
}

export function getWorkflowAgentName(workflow: Workflow, agents: AiAgent[]) {
  return agents.find((agent) => agent.id === workflow.agentId)?.name ?? "Unknown agent";
}

export function getToolLookup(tools: AiTool[]) {
  return Object.fromEntries(tools.map((item) => [item.id, item.name]));
}

export function getWorkflowReportedFindings(run: WorkflowRun | null) {
  if (!run) {
    return [];
  }

  return run.events
    .filter((event) => event.type === "finding_reported")
    .map((event) => parseWorkflowFinding((event.payload ?? {})["finding"]))
    .filter((finding): finding is WorkflowReportedFinding => Boolean(finding));
}

export function getWorkflowRunCoverage(_run: WorkflowRun | null): WorkflowRunCoverage[] {
  return [];
}

function emptySeveritySummary() {
  return {
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };
}

export function buildWorkflowRunReport(run: WorkflowRun | null): WorkflowRunReport | null {
  if (!run) {
    return null;
  }

  const findings = getWorkflowReportedFindings(run);
  const findingsBySeverity = emptySeveritySummary();
  for (const finding of findings) {
    findingsBySeverity[finding.severity] += 1;
  }

  const closeoutEvent = run.events
    .filter((event) => {
      const traceKind = getTraceKind(event);
      return traceKind === "run_completed" || traceKind === "run_failed";
    })
    .slice()
    .sort((left, right) => right.ord - left.ord)[0] ?? null;
  const closeoutPayload = isRecord(closeoutEvent?.payload) ? closeoutEvent.payload : null;
  const executiveSummary = getPayloadString(closeoutPayload, "summary")
    ?? (run.status === "failed"
      ? "The workflow run failed before it could complete."
      : findings.length > 0
        ? `The workflow reported ${findings.length} finding${findings.length === 1 ? "" : "s"} during the pipeline run.`
        : "The workflow completed without reporting any findings.");

  return workflowRunReportSchema.parse({
    runId: run.id,
    executionKind: run.executionKind,
    executiveSummary,
    stopReason: run.status === "failed"
      ? getPayloadString(closeoutPayload, "reason") ?? "Workflow run failed."
      : null,
    totalFindings: findings.length,
    findingsBySeverity,
    coverageOverview: {},
    topFindings: findings
      .slice()
      .sort((left, right) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
        return severityOrder[right.severity] - severityOrder[left.severity];
      })
      .slice(0, 10),
    generatedAt: run.completedAt ?? closeoutEvent?.createdAt ?? new Date().toISOString()
  });
}

export function buildWorkflowTranscript(input: {
  workflow: Workflow;
  run: WorkflowRun | null;
  agents: AiAgent[];
  toolLookup: Record<string, string>;
  running: boolean;
}): WorkflowTranscriptProjection {
  if (!input.run) {
    return { items: [], findings: [] };
  }

  const agentName = getWorkflowAgentName(input.workflow, input.agents);
  const items: WorkflowTranscriptItem[] = [];
  const findings: WorkflowFindingsRailItem[] = [];
  const orderedEvents = input.run.events.slice().sort((left, right) => left.ord - right.ord);
  let currentTurn: WorkflowTranscriptAssistantTurn | null = null;
  let closeoutEvent: WorkflowTranscriptCloseout | null = null;
  let pendingPromptEvents: WorkflowTraceEvent[] = [];

  const flushPromptMessages = () => {
    if (pendingPromptEvents.length === 0) {
      return;
    }
    items.push(mergePromptMessages(pendingPromptEvents));
    pendingPromptEvents = [];
  };

  const flushTurn = () => {
    if (!currentTurn) {
      return;
    }

    const body = currentTurn.body?.trim() ?? "";
    currentTurn.body = body || null;
    currentTurn.reasoning = currentTurn.reasoning?.trim() || null;
    currentTurn.summary = currentTurn.summary.trim() || (
      currentTurn.body
        ? currentTurn.body.split("\n").map((line) => line.trim()).find(Boolean) ?? ""
        : ""
    );
    items.push(currentTurn);
    currentTurn = null;
  };

  for (const event of orderedEvents) {
    const payload = event.payload ?? {};
    const traceKind = getTraceKind(event);

    if (event.type === "system_message") {
      if (isPromptSystemMessage(event)) {
        pendingPromptEvents.push(event);
        continue;
      }

      flushPromptMessages();

      if (traceKind === "start" || traceKind === "start-step") {
        flushTurn();
        currentTurn = createAssistantTurnShell({
          id: event.id,
          ord: event.ord,
          createdAt: event.createdAt,
          agentName
        });
        continue;
      }

      if (traceKind === "finish-step") {
        flushTurn();
        continue;
      }

      flushTurn();
      items.push(createSystemMessage(event));
      continue;
    }

    flushPromptMessages();

    if (traceKind === "start" || traceKind === "start-step") {
      flushTurn();
      currentTurn = createAssistantTurnShell({
        id: event.id,
        ord: event.ord,
        createdAt: event.createdAt,
        agentName
      });
      continue;
    }

    if (!currentTurn && (traceKind === "text" || traceKind === "reasoning" || traceKind === "tool_call" || traceKind === "tool_call_delta" || traceKind === "tool_call_streaming_start" || traceKind === "tool_result" || event.type === "finding_reported" || traceKind === "error")) {
      currentTurn = createAssistantTurnShell({
        id: `turn:${event.id}`,
        ord: event.ord,
        createdAt: event.createdAt,
        agentName
      });
    }

    if (traceKind === "text") {
      const text = getPayloadRawString(payload, "text");
      if (text && currentTurn) {
        currentTurn.body = appendText(currentTurn.body, text);
      }
      continue;
    }

    if (traceKind === "reasoning") {
      const text = getPayloadRawString(payload, "text");
      if (text && currentTurn) {
        currentTurn.reasoning = appendText(currentTurn.reasoning, text);
      }
      continue;
    }

    if (event.type === "model_decision") {
      flushTurn();
      currentTurn = createAssistantTurnShell({
        id: event.id,
        ord: event.ord,
        createdAt: event.createdAt,
        agentName
      });
      currentTurn.summary = event.summary;
      currentTurn.body = getPayloadString(payload, "rawModelOutput") ?? event.detail;
      currentTurn.reasoning = getPayloadString(payload, "reasoning");
      continue;
    }

    if (traceKind === "tool_call" || traceKind === "tool_call_streaming_start") {
      currentTurn?.details.push({
        kind: "tool_call",
        id: event.id,
        ord: event.ord,
        title: `Called ${getToolName(event, input.toolLookup)}`,
        toolCallId: getPayloadString(payload, "toolCallId"),
        toolId: getPayloadString(payload, "toolId"),
        toolName: getToolName(event, input.toolLookup),
        body: getPayloadString(payload, "input") ?? getLegacyToolInput(payload) ?? event.detail
      });
      continue;
    }

    if (traceKind === "tool_call_delta") {
      currentTurn?.details.push({
        kind: "note",
        id: event.id,
        ord: event.ord,
        title: `Streaming arguments for ${getToolName(event, input.toolLookup)}`,
        summary: getPayloadRawString(payload, "argsTextDelta") ?? "Argument delta",
        body: null
      });
      continue;
    }

    if (event.type === "tool_result") {
      const output = payload["output"];
      const serializedOutput = output === undefined ? null : JSON.stringify(output, null, 2);
      currentTurn?.details.push({
        kind: "tool_result",
        id: event.id,
        ord: event.ord,
        title: `${getToolName(event, input.toolLookup)} returned`,
        toolCallId: getPayloadString(payload, "toolCallId"),
        toolId: getPayloadString(payload, "toolId"),
        toolName: getToolName(event, input.toolLookup),
        summary: getPayloadString(payload, "summary") ?? getPayloadString(payload, "outputPreview") ?? event.summary,
        body: getLegacyToolOutput(payload, event) ?? serializedOutput,
        outputPreview: getPayloadString(payload, "outputPreview"),
        observations: getPayloadObservationList(payload, "observationRecords"),
        observationSummaries: getPayloadStringList(payload, "observationSummaries")
          .concat(getPayloadStringList(payload, "observations")),
        usedToolId: getPayloadString(payload, "usedToolId"),
        usedToolName: getPayloadString(payload, "usedToolName"),
        fallbackUsed: payload["fallbackUsed"] === true,
        attempts: getPayloadAttemptList(payload, "attempts"),
        status: event.status === "pending" ? "running" : event.status
      });
      continue;
    }

    if (event.type === "finding_reported") {
      const finding = parseWorkflowFinding(payload["finding"]);
      if (finding) {
        findings.push(toFindingsRailItem(finding, event.ord, event.createdAt));
        currentTurn?.findingIds.push(finding.id);
      }
      continue;
    }

    if (traceKind === "finish-step") {
      flushTurn();
      continue;
    }

    if (traceKind === "error" || traceKind === "abort") {
      currentTurn?.details.push({
        kind: "verification",
        id: event.id,
        ord: event.ord,
        title: traceKind === "abort" ? "Stream aborted" : "Stream error",
        summary: getPayloadString(payload, "message") ?? "The stream stopped unexpectedly.",
        body: getPayloadString(payload, "detail"),
        status: "failed",
        tone: "model_error",
        toolName: null
      });
      continue;
    }

    if (event.type === "verification") {
      const normalized = normalizeLegacyVerification(event);
      currentTurn?.details.push({
        kind: "verification",
        id: event.id,
        ord: event.ord,
        title: normalized.title,
        summary: normalized.summary,
        body: normalized.body,
        status: event.status === "pending" ? "running" : event.status,
        tone: normalized.tone,
        toolName: normalized.toolName
      });
      continue;
    }

    if (
      traceKind === "run_completed"
      || traceKind === "run_failed"
      || event.type === "stage_completed"
      || event.type === "stage_failed"
    ) {
      flushTurn();
      const terminalKind =
        traceKind === "run_failed" || event.type === "stage_failed"
          ? "run_failed"
          : "run_completed";
      closeoutEvent = {
        kind: "closeout",
        id: event.id,
        ord: event.ord,
        createdAt: event.createdAt,
        title: getPayloadString(payload, "title") ?? event.title ?? (terminalKind === "run_failed" ? "Pipeline failed" : "Pipeline completed"),
        summary: getPayloadString(payload, "summary") ?? event.summary ?? (terminalKind === "run_failed" ? "The pipeline failed." : "The pipeline completed."),
        body: getPayloadString(payload, "body") ?? event.detail,
        status: terminalKind === "run_failed" ? "failed" : "completed"
      };
      continue;
    }
  }

  flushPromptMessages();
  flushTurn();

  if (closeoutEvent) {
    items.push(closeoutEvent);
  }

  return workflowTranscriptProjectionSchema.parse({
    items,
    findings
  });
}
