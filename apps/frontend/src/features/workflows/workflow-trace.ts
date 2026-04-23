import type { AiAgent, AiTool, SecurityVulnerability, Workflow, WorkflowReportedFinding, WorkflowRun, WorkflowTraceEvent } from "@synosec/contracts";

export type RunAction = "starting" | "stepping" | null;
export type RunStreamState = "idle" | "connecting" | "connected" | "disconnected";

export type SystemMessageItem = {
  kind: "system_message";
  id: string;
  ord: number;
  createdAt: string;
  title: string;
  summary: string;
  body: string | null;
};

export type AssistantTurnDetail =
  | {
      kind: "tool_call";
      id: string;
      ord: number;
      title: string;
      toolId: string | null;
      toolName: string;
      body: string | null;
    }
  | {
      kind: "tool_result";
      id: string;
      ord: number;
      title: string;
      toolId: string | null;
      toolName: string;
      summary: string;
      body: string | null;
      observations: string[];
      status: WorkflowTraceEvent["status"];
    }
  | {
      kind: "verification";
      id: string;
      ord: number;
      title: string;
      summary: string;
      body: string | null;
      status: WorkflowTraceEvent["status"];
      tone: "accepted" | "retry" | "model_error" | "tool_error" | "challenge";
      toolName: string | null;
    }
  | {
      kind: "note";
      id: string;
      ord: number;
      title: string;
      summary: string;
      body: string | null;
    };

export type AssistantTurnItem = {
  kind: "assistant_turn";
  id: string;
  ord: number;
  createdAt: string;
  title: string;
  summary: string;
  body: string | null;
  reasoning: string | null;
  agentName: string;
  details: AssistantTurnDetail[];
  findingIds: string[];
  live: boolean;
};

export type CloseoutItem = {
  kind: "closeout";
  id: string;
  ord: number;
  createdAt: string;
  title: string;
  summary: string;
  body: string | null;
  status: "completed" | "failed";
};

export type TranscriptItem = SystemMessageItem | AssistantTurnItem | CloseoutItem;

export type FindingsRailItem = {
  id: string;
  ord: number;
  createdAt: string;
  title: string;
  severity: WorkflowReportedFinding["severity"];
  type: string;
  impact: string;
  recommendation: string;
  confidence: number;
  host: string;
};

export type TranscriptProjection = {
  items: TranscriptItem[];
  findings: FindingsRailItem[];
};

export type LiveModelOutput = {
  runId: string;
  source: "local" | "hosted";
  text: string;
  final: boolean;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPayloadString(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getPayloadStringList(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseWorkflowFinding(value: unknown): WorkflowReportedFinding | SecurityVulnerability | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value["id"] === "string" ? value["id"] : null;
  const title = typeof value["title"] === "string" ? value["title"] : null;
  const type = typeof value["type"] === "string" ? value["type"] : null;
  const severity = typeof value["severity"] === "string" ? value["severity"] : null;
  const impact = typeof value["impact"] === "string" ? value["impact"] : null;
  const recommendation = typeof value["recommendation"] === "string" ? value["recommendation"] : null;
  const workflowRunId = typeof value["workflowRunId"] === "string" ? value["workflowRunId"] : null;
  const workflowStageId = typeof value["workflowStageId"] === "string" ? value["workflowStageId"] : null;
  const createdAt = typeof value["createdAt"] === "string" ? value["createdAt"] : null;
  const confidence = typeof value["confidence"] === "number" ? value["confidence"] : null;
  const target = isRecord(value["target"]) ? value["target"] : null;
  const host = typeof target?.["host"] === "string" ? target["host"] : null;

  if (id && title && type && severity && impact && recommendation && workflowRunId && workflowStageId && createdAt && confidence !== null && host) {
    return value as WorkflowReportedFinding;
  }

  const category = typeof value["category"] === "string" ? value["category"] : null;
  const scanId = typeof value["scanId"] === "string" ? value["scanId"] : null;
  const agentId = typeof value["agentId"] === "string" ? value["agentId"] : null;
  if (!id || !title || !category || !severity || !impact || !recommendation || !createdAt || confidence === null || !host || !scanId || !agentId) {
    return null;
  }

  return value as SecurityVulnerability;
}

function toFindingsRailItem(finding: WorkflowReportedFinding | SecurityVulnerability, ord: number, createdAt: string): FindingsRailItem {
  if ("type" in finding) {
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

  return {
    id: finding.id,
    ord,
    createdAt,
    title: finding.title,
    severity: finding.severity,
    type: finding.category,
    impact: finding.impact,
    recommendation: finding.recommendation,
    confidence: finding.confidence,
    host: finding.target.host
  };
}

function getWorkflowStageFallback(workflow: Workflow) {
  return workflow.stages.slice().sort((left, right) => left.ord - right.ord)[0] ?? null;
}

export function getWorkflowAgentId(workflow: Workflow) {
  return workflow.agentId || getWorkflowStageFallback(workflow)?.agentId || "";
}

export function getWorkflowObjective(workflow: Workflow) {
  return workflow.objective || getWorkflowStageFallback(workflow)?.objective || "";
}

export function getWorkflowAllowedToolIds(workflow: Workflow) {
  const allowedToolIds = Array.isArray(workflow.allowedToolIds) ? workflow.allowedToolIds : [];
  return allowedToolIds.length > 0
    ? allowedToolIds
    : (getWorkflowStageFallback(workflow)?.allowedToolIds ?? []);
}

export function getWorkflowAgentName(workflow: Workflow, agents: AiAgent[]) {
  const agentId = getWorkflowAgentId(workflow);
  return agents.find((agent) => agent.id === agentId)?.name ?? "Unknown agent";
}

export function getToolLookup(tools: AiTool[]) {
  return Object.fromEntries(tools.map((item) => [item.id, item.name]));
}

export function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getToolName(event: WorkflowTraceEvent, toolLookup: Record<string, string>) {
  const payload = event.payload ?? {};
  const payloadToolId = getPayloadString(payload, "toolId");
  return getPayloadString(payload, "toolName")
    ?? (payloadToolId ? toolLookup[payloadToolId] ?? payloadToolId.replace(/^tool:/, "") : null)
    ?? toolLookup[String(payload["toolId"] ?? "")]
    ?? event.title;
}

function getEventBody(event: WorkflowTraceEvent) {
  const payload = event.payload ?? {};

  if (event.type === "tool_call") {
    const toolInput = payload["toolInput"];
    return toolInput && typeof toolInput === "object" ? JSON.stringify(toolInput, null, 2) : (event.detail ?? null);
  }

  return getPayloadString(payload, "fullOutput")
    ?? getPayloadString(payload, "rawModelOutput")
    ?? getPayloadString(payload, "fullPrompt")
    ?? getPayloadString(payload, "modelReasoning")
    ?? event.detail
    ?? null;
}

function getAssistantText(event: WorkflowTraceEvent) {
  const payload = event.payload ?? {};
  return getPayloadString(payload, "rawModelOutput")
    ?? getPayloadString(payload, "fullOutput")
    ?? event.detail
    ?? event.summary;
}

function getReasoningText(event: WorkflowTraceEvent) {
  const payload = event.payload ?? {};
  return getPayloadString(payload, "reasoning")
    ?? getPayloadString(payload, "modelReasoning")
    ?? null;
}

function createSystemMessage(event: WorkflowTraceEvent): SystemMessageItem {
  return {
    kind: "system_message",
    id: event.id,
    ord: event.ord,
    createdAt: event.createdAt,
    title: event.title,
    summary: event.summary,
    body: getEventBody(event)
  };
}

function appendDetailToTurn(
  turn: AssistantTurnItem | null,
  event: WorkflowTraceEvent,
  toolLookup: Record<string, string>
): AssistantTurnItem | null {
  if (!turn) {
    return null;
  }

  if (event.type === "tool_call") {
    turn.details.push({
      kind: "tool_call",
      id: event.id,
      ord: event.ord,
      title: event.title,
      toolId: getPayloadString(event.payload ?? {}, "toolId"),
      toolName: getToolName(event, toolLookup),
      body: getEventBody(event)
    });
    return turn;
  }

  if (event.type === "tool_result") {
    turn.details.push({
      kind: "tool_result",
      id: event.id,
      ord: event.ord,
      title: event.title,
      toolId: getPayloadString(event.payload ?? {}, "toolId"),
      toolName: getToolName(event, toolLookup),
      summary: event.summary,
      body: getEventBody(event),
      observations: getPayloadStringList(event.payload ?? {}, "observationSummaries"),
      status: event.status
    });
    return turn;
  }

  if (event.type === "verification" || event.type === "stage_contract_validation_failed") {
    const payload = event.payload ?? {};
    const messageKind = getPayloadString(payload, "messageKind");
    const payloadToolName = getPayloadString(payload, "toolName");
    const titleLower = event.title.toLowerCase();
    const summaryLower = event.summary.toLowerCase();
    const toolName = payloadToolName ?? (
      titleLower.startsWith("evidence checkpoint after ")
        ? event.title.slice("Evidence checkpoint after ".length).trim()
        : null
    );
    const tone =
      titleLower.includes("model action")
        ? "model_error"
        : titleLower.includes("requested tool") || (titleLower.startsWith("evidence checkpoint after ") && event.status === "failed")
          ? "tool_error"
          : messageKind === "retry"
            ? "retry"
            : event.status === "completed"
              ? "accepted"
              : "challenge";

    const normalizedTitle =
      tone === "model_error"
        ? "Model output rejected"
        : tone === "tool_error"
          ? (summaryLower.includes("not available")
              ? "Requested tool rejected"
              : `${toolName ?? "Tool"} error`)
          : tone === "retry"
            ? "Retry required"
            : event.title;

    const normalizedSummary =
      tone === "model_error"
        ? "The model returned an unsupported structured action. Retry with one supported action before the run can continue."
        : tone === "tool_error"
          ? (summaryLower.includes("not available")
              ? "The requested tool is not approved for this run. Choose one of the approved tools and retry."
              : `${toolName ?? "The tool"} did not complete cleanly. Retry the tool, switch tools, or mark the layer as blocked.`)
          : tone === "retry"
            ? `${event.summary} Retry with a corrected structured response to continue the run.`
            : event.summary;

    turn.details.push({
      kind: "verification",
      id: event.id,
      ord: event.ord,
      title: normalizedTitle,
      summary: normalizedSummary,
      body: getEventBody(event),
      status: event.status,
      tone,
      toolName
    });
    return turn;
  }

  if (event.type === "agent_summary" || event.type === "stage_result_submitted") {
    turn.details.push({
      kind: "note",
      id: event.id,
      ord: event.ord,
      title: event.title,
      summary: event.summary,
      body: getEventBody(event)
    });
    return turn;
  }

  return turn;
}

function createAssistantTurnShell(input: {
  id: string;
  ord: number;
  createdAt: string;
  agentName: string;
  title?: string;
  summary?: string;
  body?: string | null;
}): AssistantTurnItem {
  return {
    kind: "assistant_turn",
    id: input.id,
    ord: input.ord,
    createdAt: input.createdAt,
    title: input.title ?? input.agentName,
    summary: input.summary ?? "",
    body: input.body ?? null,
    reasoning: null,
    agentName: input.agentName,
    details: [],
    findingIds: [],
    live: false
  };
}

export function buildWorkflowTranscript(input: {
  workflow: Workflow;
  run: WorkflowRun | null;
  agents: AiAgent[];
  toolLookup: Record<string, string>;
  running: boolean;
  liveModelOutput?: LiveModelOutput | null;
}): TranscriptProjection {
  if (!input.run) {
    return { items: [], findings: [] };
  }

  const agentName = getWorkflowAgentName(input.workflow, input.agents);
  const items: TranscriptItem[] = [];
  const findings: FindingsRailItem[] = [];
  const orderedEvents = input.run.events.slice().sort((left, right) => left.ord - right.ord);
  const closeoutAcceptedOrd = orderedEvents.find((event) =>
    event.type === "verification"
    && event.status === "completed"
    && event.title === "Verifier accepted the scan closeout"
  )?.ord ?? null;

  let currentTurn: AssistantTurnItem | null = null;
  let closeoutEvent: CloseoutItem | null = null;

  const flushTurn = () => {
    if (!currentTurn) {
      return;
    }
    currentTurn.details.sort((left, right) => left.ord - right.ord);
    items.push(currentTurn);
    currentTurn = null;
  };

  for (const event of orderedEvents) {
    const payload = event.payload ?? {};

    if (event.type === "stage_started") {
      continue;
    }

    if (event.type === "finding_reported") {
      const finding = parseWorkflowFinding(payload["finding"]);
      if (finding) {
        findings.push(toFindingsRailItem(finding, event.ord, event.createdAt));
        if (currentTurn) {
          currentTurn.findingIds.push(finding.id);
        } else {
          currentTurn = createAssistantTurnShell({
            id: `turn:${event.id}`,
            ord: event.ord,
            createdAt: event.createdAt,
            agentName,
            title: agentName
          });
          currentTurn.findingIds.push(finding.id);
        }
      }
      continue;
    }

    if (event.type === "system_message" || event.type === "agent_input") {
      flushTurn();
      items.push(createSystemMessage(event));
      continue;
    }

    if (event.type === "model_decision") {
      if (closeoutAcceptedOrd !== null && event.ord > closeoutAcceptedOrd) {
        continue;
      }
      flushTurn();
      currentTurn = {
        kind: "assistant_turn",
        id: event.id,
        ord: event.ord,
        createdAt: event.createdAt,
        title: event.title,
        summary: event.summary,
        body: getAssistantText(event),
        reasoning: getReasoningText(event),
        agentName,
        details: [],
        findingIds: [],
        live: false
      };
      continue;
    }

    if (event.type === "stage_completed" || event.type === "stage_failed") {
      closeoutEvent = {
        kind: "closeout",
        id: event.id,
        ord: event.ord,
        createdAt: event.createdAt,
        title: event.title,
        summary: event.summary,
        body: getEventBody(event),
        status: event.type === "stage_failed" ? "failed" : "completed"
      };
      continue;
    }

    if (!currentTurn && (event.type === "tool_call" || event.type === "tool_result" || event.type === "verification" || event.type === "agent_summary" || event.type === "stage_result_submitted")) {
      currentTurn = createAssistantTurnShell({
        id: `turn:${event.id}`,
        ord: event.ord,
        createdAt: event.createdAt,
        agentName,
        title: agentName
      });
    }

    const appendedTurn = appendDetailToTurn(currentTurn, event, input.toolLookup);
    if (appendedTurn) {
      currentTurn = appendedTurn;
      continue;
    }

    items.push(createSystemMessage(event));
  }

  flushTurn();

  const liveModelText = input.liveModelOutput?.text.trim() ?? "";
  if (liveModelText.length > 0) {
    const lastAssistantTurn = [...items].reverse().find((item): item is AssistantTurnItem => item.kind === "assistant_turn") ?? null;
    const isDuplicateOfLastTurn = lastAssistantTurn?.body?.trim() === liveModelText;
    if (!isDuplicateOfLastTurn) {
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
  }

  if (closeoutEvent) {
    items.push(closeoutEvent);
  }

  if (input.running) {
    const liveTurn = [...items].reverse().find((item): item is AssistantTurnItem => item.kind === "assistant_turn");
    if (liveTurn) {
      liveTurn.live = true;
    }
  }

  return {
    items,
    findings: findings.sort((left, right) => left.ord - right.ord)
  };
}
