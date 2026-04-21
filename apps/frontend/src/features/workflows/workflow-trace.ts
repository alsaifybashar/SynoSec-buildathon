import {
  deriveWorkflowStageLifecycleState,
  type AiTool,
  type Workflow,
  type WorkflowReportedFinding,
  type WorkflowRun,
  type WorkflowStageResult,
  type WorkflowTraceEvent
} from "@synosec/contracts";

export type RunAction = "starting" | "stepping" | null;
export type StepVisualState = "completed" | "current" | "failed" | "pending" | "running";
export type RunStreamState = "idle" | "connecting" | "connected" | "disconnected";

export type StageTraceSummary = {
  startedEvent: WorkflowTraceEvent | undefined;
  inputEvent: WorkflowTraceEvent | undefined;
  decisionEvent: WorkflowTraceEvent | undefined;
  toolCallEvent: WorkflowTraceEvent | undefined;
  findingEvents: WorkflowTraceEvent[];
  stageResultEvent: WorkflowTraceEvent | undefined;
  summaryEvent: WorkflowTraceEvent | undefined;
  terminalEvent: WorkflowTraceEvent | undefined;
  toolResultEvents: WorkflowTraceEvent[];
  findings: WorkflowReportedFinding[];
  stageResult: WorkflowStageResult | null;
  stageTools: string[];
  topSeverity: WorkflowReportedFinding["severity"] | null;
  evidenceSummary: {
    total: number;
    completed: number;
    failed: number;
    timedOut: number;
    groupedFailures: Array<{
      key: string;
      label: string;
      count: number;
      tools: string[];
    }>;
  };
  stageIntent: string;
  stageAction: string;
  stageReasoning: string;
  stageToolChoices: string[];
  stageOutcome: string;
  handoffSummary: {
    receives: string;
    why: string;
  };
  visualState: StepVisualState;
};

function truncateText(value: string, maxLength = 180) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function summarizeReason(value: string) {
  const firstSentence = value.split(/(?<=[.!?])\s+/)[0]?.trim();
  return firstSentence && firstSentence.length > 0 ? firstSentence : value;
}

export function formatEventType(type: WorkflowTraceEvent["type"]) {
  switch (type) {
    case "stage_started":
      return "Stage Started";
    case "system_message":
      return "System Message";
    case "agent_input":
      return "Agent Input";
    case "model_decision":
      return "Model Decision";
    case "tool_call":
      return "Tool Call";
    case "tool_result":
      return "Tool Result";
    case "verification":
      return "Verification";
    case "finding_reported":
      return "Finding Reported";
    case "stage_result_submitted":
      return "Stage Result";
    case "stage_contract_validation_failed":
      return "Contract Validation Failed";
    case "agent_summary":
      return "Agent Summary";
    case "stage_completed":
      return "Stage Completed";
    case "stage_failed":
      return "Stage Failed";
    default:
      return "Workflow Event";
  }
}

export function getStepVisualState(state: StepVisualState) {
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

  if (state === "failed") {
    return {
      dot: "bg-rose-500",
      rail: "border-rose-500/35",
      card: "border-rose-500/20 bg-rose-500/[0.05]",
      badge: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
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

export function getEventTone(event: WorkflowTraceEvent) {
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

  if (event.type === "system_message" || event.type === "verification") {
    return {
      rail: "border-violet-500/30",
      dot: "bg-violet-500 text-white",
      card: "border-violet-500/20 bg-violet-500/[0.04]",
      badge: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300"
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

export function getEventPreview(event: WorkflowTraceEvent) {
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

export function getPayloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function getPayloadNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getPayloadStringList(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export type TokenUsageSummary = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseWorkflowFinding(value: unknown): WorkflowReportedFinding | null {
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

  if (!id || !title || !type || !severity || !impact || !recommendation || !workflowRunId || !workflowStageId || !createdAt || confidence === null || !host) {
    return null;
  }

  return value as WorkflowReportedFinding;
}

function parseWorkflowStageResult(value: unknown): WorkflowStageResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const status = typeof value["status"] === "string" ? value["status"] : null;
  const summary = typeof value["summary"] === "string" ? value["summary"] : null;
  const recommendedNextStep = typeof value["recommendedNextStep"] === "string" ? value["recommendedNextStep"] : null;
  const residualRisk = typeof value["residualRisk"] === "string" ? value["residualRisk"] : null;
  const submittedAt = typeof value["submittedAt"] === "string" ? value["submittedAt"] : null;

  if (!status || !summary || !recommendedNextStep || !residualRisk || !submittedAt) {
    return null;
  }

  return value as WorkflowStageResult;
}

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

const severityOrder: Record<WorkflowReportedFinding["severity"], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
};

export function getTokenUsageSummary(payload: Record<string, unknown>): TokenUsageSummary | null {
  const usage = isRecord(payload["tokenUsage"])
    ? payload["tokenUsage"]
    : isRecord(payload["usage"])
      ? payload["usage"]
      : null;
  const inputTokens = firstFiniteNumber(
    payload["inputTokens"],
    payload["promptTokens"],
    usage?.["inputTokens"],
    usage?.["promptTokens"]
  );
  const outputTokens = firstFiniteNumber(
    payload["outputTokens"],
    payload["completionTokens"],
    usage?.["outputTokens"],
    usage?.["completionTokens"]
  );
  const totalTokens = firstFiniteNumber(
    payload["totalTokens"],
    usage?.["totalTokens"],
    inputTokens !== null || outputTokens !== null ? (inputTokens ?? 0) + (outputTokens ?? 0) : null
  );

  if (inputTokens === null && outputTokens === null && totalTokens === null) {
    return null;
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens
  };
}

function getToolNameList(toolIds: string[], toolLookup: Record<string, string>) {
  return toolIds.map((toolId) => toolLookup[toolId] ?? toolId).filter((value, index, list) => list.indexOf(value) === index);
}

export function getEventToolLabels(event: WorkflowTraceEvent, toolLookup: Record<string, string>) {
  const payload = event.payload ?? {};

  if (Array.isArray(payload["selectedToolIds"])) {
    return payload["selectedToolIds"].map((toolId) => toolLookup[String(toolId)] ?? String(toolId));
  }

  if (typeof payload["toolName"] === "string" && payload["toolName"].length > 0) {
    return [payload["toolName"]];
  }

  return [];
}

function getStageIntentSummary(inputEvent: WorkflowTraceEvent | undefined, traceEntry: WorkflowRun["trace"][number] | undefined) {
  if (inputEvent?.summary) {
    return inputEvent.summary;
  }
  if (traceEntry?.targetSummary) {
    return `Work against ${traceEntry.targetSummary}.`;
  }

  return "No recorded intent summary.";
}

function getStageActionSummary(
  decisionEvent: WorkflowTraceEvent | undefined,
  toolCallEvent: WorkflowTraceEvent | undefined,
  traceEntry: WorkflowRun["trace"][number] | undefined,
  toolLookup: Record<string, string>
) {
  if (decisionEvent) {
    const selectedToolNames = getPayloadStringList(decisionEvent.payload ?? {}, "selectedToolNames");
    if (selectedToolNames.length > 0) {
      return `Selected ${selectedToolNames.join(", ")} for the stage.`;
    }

    if (decisionEvent.summary) {
      return decisionEvent.summary;
    }
  }

  if (toolCallEvent?.summary) {
    return toolCallEvent.summary;
  }

  if (traceEntry?.selectedToolIds.length) {
    return `Executed ${getToolNameList(traceEntry.selectedToolIds, toolLookup).join(", ")}.`;
  }

  return "No recorded action.";
}

function getStageOutcomeSummary(
  terminalEvent: WorkflowTraceEvent | undefined,
  summaryEvent: WorkflowTraceEvent | undefined,
  stageResult: WorkflowStageResult | null,
  stageLabel: string
) {
  if (stageResult?.summary) {
    return stageResult.summary;
  }
  if (terminalEvent?.summary) {
    return terminalEvent.summary;
  }
  if (summaryEvent?.summary) {
    return summaryEvent.summary;
  }

  return `${stageLabel} has no terminal summary yet.`;
}

function getStageReasoningSummary(
  decisionEvent: WorkflowTraceEvent | undefined,
  traceEntry: WorkflowRun["trace"][number] | undefined,
  stageResult: WorkflowStageResult | null
) {
  if (stageResult?.residualRisk) {
    return stageResult.residualRisk;
  }
  if (decisionEvent?.detail) {
    return decisionEvent.detail;
  }
  if (traceEntry?.toolSelectionReason) {
    return traceEntry.toolSelectionReason;
  }

  return "No recorded tool-choice rationale.";
}

function getStageToolChoiceSummary(
  decisionEvent: WorkflowTraceEvent | undefined,
  toolCallEvent: WorkflowTraceEvent | undefined,
  traceEntry: WorkflowRun["trace"][number] | undefined,
  toolLookup: Record<string, string>
) {
  const decisionPayload = decisionEvent?.payload ?? {};
  const selectedToolNames = getPayloadStringList(decisionPayload, "selectedToolNames");

  if (selectedToolNames.length > 0) {
    return selectedToolNames;
  }
  if (traceEntry?.selectedToolIds.length) {
    return getToolNameList(traceEntry.selectedToolIds, toolLookup);
  }
  if (toolCallEvent) {
    return getEventToolLabels(toolCallEvent, toolLookup);
  }

  return [];
}

function getStageHandoffSummary(input: {
  stageLabel: string;
  nextStageLabel: string | undefined;
  terminalEvent: WorkflowTraceEvent | undefined;
  traceEntry: WorkflowRun["trace"][number] | undefined;
  stageTools: string[];
}) {
  if (input.terminalEvent?.type === "stage_failed") {
    return {
      receives: "No downstream stage received a hand-off because this stage failed.",
      why: "Review the failure evidence on this stage before resuming the workflow."
    };
  }

  if (!input.nextStageLabel) {
    return {
      receives: "No next stage remains; this stage closes the workflow with the evidence shown here.",
      why: "Reviewers can treat this stage as the terminal source of truth for the completed run."
    };
  }

  const evidenceContext = input.traceEntry?.evidenceHighlights[0] ?? "the current stage evidence";
  const selectedTools = input.stageTools.length ? input.stageTools.join(", ") : "the recorded stage context";

  return {
    receives: `${input.nextStageLabel} receives ${selectedTools}, ${evidenceContext.toLowerCase()}, and the target context from ${input.stageLabel}.`,
    why: `That context matters so ${input.nextStageLabel} can continue from validated evidence instead of re-deriving the previous stage state.`
  };
}

export function summarizeWorkflowStageTrace(input: {
  workflow: Workflow;
  run: WorkflowRun | null;
  stageId: string;
  stageIndex: number;
  toolLookup: Record<string, string>;
}) {
  const orderedStages = input.workflow.stages.slice().sort((left, right) => left.ord - right.ord);
  const stage = orderedStages[input.stageIndex];
  if (!stage || stage.id !== input.stageId) {
    return null;
  }

  const stageEvents = (input.run?.events ?? [])
    .slice()
    .sort((left, right) => left.ord - right.ord)
    .filter((event) => event.workflowStageId === stage.id);
  const traceEntry = (input.run?.trace ?? []).find((entry) => entry.workflowStageId === stage.id);
  const nextStage = orderedStages[input.stageIndex + 1];
  const stageState = deriveWorkflowStageLifecycleState(input.run, stage);
  const activeStageIndex = input.run?.status === "running" ? input.run.currentStepIndex : null;
  const startedEvent = stageEvents.find((event) => event.type === "stage_started");
  const inputEvent = stageEvents.find((event) => event.type === "agent_input" || event.type === "system_message");
  const decisionEvent = stageEvents.find((event) => event.type === "model_decision");
  const toolCallEvent = stageEvents.find((event) => event.type === "tool_call");
  const findingEvents = stageEvents.filter((event) => event.type === "finding_reported");
  const stageResultEvent = [...stageEvents].reverse().find((event) => event.type === "stage_result_submitted");
  const summaryEvent = stageEvents.find((event) => event.type === "agent_summary");
  const terminalEvent = [...stageEvents].reverse().find((event) => event.type === "stage_completed" || event.type === "stage_failed");
  const toolResultEvents = stageEvents.filter((event) => event.type === "tool_result");
  const findings = findingEvents
    .map((event) => parseWorkflowFinding((event.payload ?? {})["finding"]))
    .filter((value): value is WorkflowReportedFinding => Boolean(value));
  const stageResult = parseWorkflowStageResult((stageResultEvent?.payload ?? {})["result"]);
  const topSeverity = findings.reduce<WorkflowReportedFinding["severity"] | null>(
    (highest, finding) => {
      if (!highest || severityOrder[finding.severity] > severityOrder[highest]) {
        return finding.severity;
      }

      return highest;
    },
    null
  );
  const groupedFailureMap = new Map<string, { label: string; count: number; tools: string[] }>();
  for (const event of toolResultEvents) {
    const payload = event.payload ?? {};
    if (event.status !== "failed") {
      continue;
    }

    const toolName = getPayloadString(payload, "toolName") ?? event.title;
    const label = getPayloadString(payload, "outputPreview")
      ?? getPayloadString(payload, "error")
      ?? event.summary
      ?? "Tool execution failed";
    const normalizedLabel = summarizeReason(label);
    const current = groupedFailureMap.get(normalizedLabel);
    if (current) {
      current.count += 1;
      if (!current.tools.includes(toolName)) {
        current.tools.push(toolName);
      }
    } else {
      groupedFailureMap.set(normalizedLabel, {
        label: normalizedLabel,
        count: 1,
        tools: [toolName]
      });
    }
  }
  const stageTools = traceEntry?.selectedToolIds.length
    ? getToolNameList(traceEntry.selectedToolIds, input.toolLookup)
    : stageEvents.flatMap((event) => getEventToolLabels(event, input.toolLookup)).filter((value, currentIndex, values) => values.indexOf(value) === currentIndex);
  const visualState: StepVisualState =
    stageState === "failed"
      ? "failed"
      : stageState === "completed"
        ? "completed"
        : activeStageIndex === input.stageIndex
          ? "current"
          : stageState === "running"
            ? "running"
            : "pending";

  return {
    startedEvent,
    inputEvent,
    decisionEvent,
    toolCallEvent,
    findingEvents,
    stageResultEvent,
    summaryEvent,
    terminalEvent,
    toolResultEvents,
    findings,
    stageResult,
    stageTools,
    topSeverity,
    evidenceSummary: {
      total: toolResultEvents.length,
      completed: toolResultEvents.filter((event) => event.status === "completed").length,
      failed: toolResultEvents.filter((event) => event.status === "failed").length,
      timedOut: toolResultEvents.filter((event) => (event.payload ?? {})["timedOut"] === true).length,
      groupedFailures: Array.from(groupedFailureMap.entries()).map(([key, value]) => ({
        key,
        label: value.label,
        count: value.count,
        tools: value.tools
      }))
    },
    stageIntent: getStageIntentSummary(inputEvent, traceEntry),
    stageAction: getStageActionSummary(decisionEvent, toolCallEvent, traceEntry, input.toolLookup),
    stageReasoning: getStageReasoningSummary(decisionEvent, traceEntry, stageResult),
    stageToolChoices: getStageToolChoiceSummary(decisionEvent, toolCallEvent, traceEntry, input.toolLookup),
    stageOutcome: getStageOutcomeSummary(terminalEvent, summaryEvent, stageResult, stage.label),
    handoffSummary: getStageHandoffSummary({
      stageLabel: stage.label,
      nextStageLabel: nextStage?.label,
      terminalEvent,
      traceEntry,
      stageTools
    }),
    visualState
  } satisfies StageTraceSummary;
}

export function getToolLookup(tools: AiTool[]) {
  return Object.fromEntries(tools.map((item) => [item.id, item.name]));
}
