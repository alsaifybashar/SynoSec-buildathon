import { z } from "zod";
import {
  coverageStatusSchema,
  scanLayerCoverageSchema
} from "./scan-core.js";
import {
  type AiAgent,
  type AiTool,
  type Workflow,
  type WorkflowReportedFinding,
  type WorkflowRun,
  type WorkflowTraceEvent,
  workflowReportedFindingSchema
} from "./resources.js";

export const workflowLiveModelOutputSchema = z.object({
  runId: z.string().uuid(),
  source: z.enum(["local", "hosted"]),
  text: z.string(),
  final: z.boolean().default(false),
  createdAt: z.string().datetime()
});
export type WorkflowLiveModelOutput = z.infer<typeof workflowLiveModelOutputSchema>;

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
  toolId: z.string().nullable(),
  toolName: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().nullable(),
  observations: z.array(z.string().min(1)),
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

function getPayloadString(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getTraceKind(event: WorkflowTraceEvent) {
  return getPayloadString(event.payload ?? {}, "streamPartType") ?? event.type;
}

function getPayloadStringList(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
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
    title: getPayloadString(payload, "title") ?? "System",
    summary: getPayloadString(payload, "summary") ?? "Pipeline event",
    body: getPayloadString(payload, "body")
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
  liveModelOutput?: WorkflowLiveModelOutput | null;
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

  const flushTurn = () => {
    if (!currentTurn) {
      return;
    }

    const body = currentTurn.body?.trim() ?? "";
    currentTurn.body = body || null;
    currentTurn.reasoning = currentTurn.reasoning?.trim() || null;
    currentTurn.summary = body
      ? body.split("\n").map((line) => line.trim()).find(Boolean) ?? ""
      : currentTurn.summary;
    items.push(currentTurn);
    currentTurn = null;
  };

  for (const event of orderedEvents) {
    const payload = event.payload ?? {};
    const traceKind = getTraceKind(event);

    if (event.type === "system_message") {
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
      const text = getPayloadString(payload, "text");
      if (text && currentTurn) {
        currentTurn.body = appendText(currentTurn.body, text);
      }
      continue;
    }

    if (traceKind === "reasoning") {
      const text = getPayloadString(payload, "text");
      if (text && currentTurn) {
        currentTurn.reasoning = appendText(currentTurn.reasoning, text);
      }
      continue;
    }

    if (traceKind === "tool_call" || traceKind === "tool_call_streaming_start") {
      currentTurn?.details.push({
        kind: "tool_call",
        id: event.id,
        ord: event.ord,
        title: `Called ${getToolName(event, input.toolLookup)}`,
        toolId: getPayloadString(payload, "toolId"),
        toolName: getToolName(event, input.toolLookup),
        body: getPayloadString(payload, "input")
      });
      continue;
    }

    if (traceKind === "tool_call_delta") {
      currentTurn?.details.push({
        kind: "note",
        id: event.id,
        ord: event.ord,
        title: `Streaming arguments for ${getToolName(event, input.toolLookup)}`,
        summary: getPayloadString(payload, "argsTextDelta") ?? "Argument delta",
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
        toolId: getPayloadString(payload, "toolId"),
        toolName: getToolName(event, input.toolLookup),
        summary: getPayloadString(payload, "summary") ?? "Tool execution completed.",
        body: serializedOutput,
        observations: getPayloadStringList(payload, "observations"),
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

    if (traceKind === "run_completed" || traceKind === "run_failed") {
      flushTurn();
      closeoutEvent = {
        kind: "closeout",
        id: event.id,
        ord: event.ord,
        createdAt: event.createdAt,
        title: getPayloadString(payload, "title") ?? (traceKind === "run_failed" ? "Pipeline failed" : "Pipeline completed"),
        summary: getPayloadString(payload, "summary") ?? (traceKind === "run_failed" ? "The pipeline failed." : "The pipeline completed."),
        body: getPayloadString(payload, "body"),
        status: traceKind === "run_failed" ? "failed" : "completed"
      };
      continue;
    }
  }

  flushTurn();

  const liveModelText = input.liveModelOutput?.text.trim() ?? "";
  if (liveModelText.length > 0) {
    items.push({
      kind: "assistant_turn",
      id: `live-model-output:${input.liveModelOutput?.runId ?? input.run.id}`,
      ord: (items.at(-1)?.ord ?? -1) + 1,
      createdAt: input.liveModelOutput?.createdAt ?? input.run.startedAt,
      title: agentName,
      summary: "",
      body: liveModelText,
      reasoning: null,
      agentName,
      details: [],
      findingIds: [],
      live: input.running && !Boolean(input.liveModelOutput?.final)
    });
  }

  if (closeoutEvent) {
    items.push(closeoutEvent);
  }

  return workflowTranscriptProjectionSchema.parse({
    items,
    findings
  });
}
