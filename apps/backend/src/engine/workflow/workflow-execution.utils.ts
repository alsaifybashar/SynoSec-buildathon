import type {
  InternalObservation,
  Observation,
  ToolExecutionPublicResult,
  OsiLayer,
  SecurityValidationStatus,
  ToolRequest,
  ToolRun,
  WorkflowFindingSubmission,
  WorkflowFindingTarget
} from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";

export type ExecutedToolResult = {
  toolId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolRequest: ToolRequest;
  toolRun: ToolRun;
  status: ToolRun["status"];
  observations: InternalObservation[];
  publicObservations: Observation[];
  totalObservations: number;
  truncated: boolean;
  observationKeys: string[];
  observationSummaries: string[];
  outputPreview: string;
  fullOutput: string;
  commandPreview: string;
  usedToolId: string;
  usedToolName: string;
  fallbackUsed: boolean;
  attempts: Array<{
    toolId: string;
    toolName: string;
    status: ToolRun["status"];
    exitCode?: number;
    statusReason?: string;
    outputExcerpt: string;
    selected: boolean;
  }>;
};

const MAX_PUBLIC_OBSERVATIONS = 6;

function severityRank(severity: InternalObservation["severity"]) {
  switch (severity) {
    case "critical":
      return 5;
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    default:
      return 1;
  }
}

function summarizePlural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function extractHttpStatus(summary: string) {
  const match = summary.match(/\b(401|403|404)\b/);
  return match?.[1] ?? null;
}

function isLowSignalNegative(observation: InternalObservation) {
  if (severityRank(observation.severity) > 2) {
    return false;
  }

  const text = `${observation.title} ${observation.summary}`.toLowerCase();
  return /(^|\W)(404|403|401)(\W|$)|not found|forbidden|unauthorized|no .*found|returned no usable evidence|missed|absent/.test(text);
}

function isHighSignalPositive(observation: InternalObservation) {
  if (severityRank(observation.severity) >= 3) {
    return true;
  }

  const text = `${observation.title} ${observation.summary}`.toLowerCase();
  return /found|exposed|reachable|discovered|enumerated|identified|leak|missing security|bypass|injection|vulnerab|directory listing|admin|debug|token|credential|s3|bucket/.test(text)
    && !isLowSignalNegative(observation);
}

function compactObservation(observation: InternalObservation): Observation {
  return {
    id: observation.id,
    key: observation.key,
    title: observation.title,
    summary: observation.summary,
    severity: observation.severity,
    confidence: observation.confidence
  };
}

function aggregateNegativeObservations(
  toolRunId: string,
  observations: InternalObservation[]
): Observation[] {
  const groups = new Map<string, InternalObservation[]>();

  for (const observation of observations) {
    const status = extractHttpStatus(observation.summary);
    const groupKey = status ? `http-${status}` : "generic";
    const group = groups.get(groupKey) ?? [];
    group.push(observation);
    groups.set(groupKey, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupKey, group], index) => {
      const status = groupKey.startsWith("http-") ? groupKey.replace("http-", "") : null;
      const exemplar = group[0]!;
      return {
        id: `${toolRunId}-aggregate-${index + 1}`,
        key: status ? `aggregate:http-${status}` : "aggregate:low-signal-negative",
        title: status ? `Repeated HTTP ${status} misses` : "Repeated low-signal negatives omitted",
        summary: status
          ? `${summarizePlural(group.length, "candidate")} returned HTTP ${status}; individual low-signal negatives were compacted.`
          : `${summarizePlural(group.length, "low-signal negative observation")} were omitted from the compact result.`,
        severity: exemplar.severity,
        confidence: Math.max(...group.map((item) => item.confidence))
      };
    });
}

export function compactToolExecutionResult(input: {
  toolRunId: string;
  toolId: string;
  toolName: string;
  status: ToolRun["status"];
  outputPreview: string;
  observations: InternalObservation[];
}): ToolExecutionPublicResult {
  const highSignal = input.observations.filter((observation) => !isLowSignalNegative(observation));
  const lowSignalNegatives = input.observations.filter((observation) => isLowSignalNegative(observation));
  const rankedHighSignal = [...highSignal].sort((left, right) => {
    const severityDelta = severityRank(right.severity) - severityRank(left.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }
    const positiveDelta = Number(isHighSignalPositive(right)) - Number(isHighSignalPositive(left));
    if (positiveDelta !== 0) {
      return positiveDelta;
    }
    return left.id.localeCompare(right.id);
  });
  const aggregatedNegatives = aggregateNegativeObservations(input.toolRunId, lowSignalNegatives);
  const publicObservations = [...rankedHighSignal.map(compactObservation), ...aggregatedNegatives].slice(0, MAX_PUBLIC_OBSERVATIONS);
  const totalObservations = input.observations.length;
  const truncated = publicObservations.length !== totalObservations
    || aggregatedNegatives.length > 0
    || rankedHighSignal.length + aggregatedNegatives.length > MAX_PUBLIC_OBSERVATIONS;
  const compactPreview = firstNonBlankString(
    publicObservations[0]?.summary,
    input.outputPreview,
    `${input.toolName} ${input.status}.`
  ) ?? `${input.toolName} ${input.status}.`;

  return {
    toolRunId: input.toolRunId,
    toolId: input.toolId,
    toolName: input.toolName,
    status: input.status,
    outputPreview: truncate(compactPreview),
    observations: publicObservations,
    totalObservations,
    truncated
  };
}

type EvidenceMatch = {
  evidenceIndex: number;
  result: ExecutedToolResult | null;
  quote: string;
};

type FindingDetailContext = {
  title: string;
  target: WorkflowFindingTarget;
  evidence: WorkflowFindingSubmission["evidence"];
  reproduction?: WorkflowFindingSubmission["reproduction"];
};

export function truncate(value: string, maxLength = 500) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function firstNonBlankString(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return null;
}

export function parseTarget(baseUrl: string | null | undefined) {
  if (!baseUrl?.trim()) {
    throw new RequestError(400, "Workflow target requires a real base URL before execution.", {
      code: "WORKFLOW_TARGET_MISSING",
      userFriendlyMessage: "The workflow target URL is required."
    });
  }

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch (error) {
    throw new RequestError(400, `Invalid workflow target base URL: ${baseUrl}.`, {
      code: "WORKFLOW_TARGET_INVALID",
      userFriendlyMessage: "The workflow target URL is invalid.",
      cause: error
    });
  }

  const port = url.port ? Number(url.port) : undefined;

  return {
    baseUrl: url.toString(),
    host: url.hostname,
    ...(port === undefined ? {} : { port })
  };
}

export function inferLayer(category: string): OsiLayer {
  if (category === "topology") {
    return "L3";
  }

  if (category === "auth") {
    return "L5";
  }

  if (category === "network" || category === "dns" || category === "subdomain") {
    return "L4";
  }

  return "L7";
}

function isStructuredToolInputValue(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry) => isStructuredToolInputValue(entry) || (entry && typeof entry === "object"));
  }
  return typeof value === "object";
}

export function normalizeToolInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (isStructuredToolInputValue(value)) {
      normalized[key] = value;
    }
  }

  return normalized;
}

function rewriteUrlToRuntimeOrigin(value: string, runtimeBaseUrl: string) {
  try {
    const runtime = new URL(runtimeBaseUrl);
    const parsed = new URL(value, runtime);
    return new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, runtime).toString();
  } catch {
    return value;
  }
}

function rewriteValidationTargets(value: unknown, runtimeBaseUrl: string) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return entry;
    }

    const next = { ...(entry as Record<string, unknown>) };
    for (const key of ["url", "endpoint"] as const) {
      const candidate = next[key];
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        next[key] = rewriteUrlToRuntimeOrigin(candidate, runtimeBaseUrl);
      }
    }
    return next;
  });
}

export function applyWorkflowRuntimeTarget(
  toolInput: Record<string, unknown>,
  target: { baseUrl: string; host: string; port?: number }
): Record<string, unknown> {
  let firstEndpointUrl: string | null = null;
  const scopedInput: Record<string, unknown> = {
    ...toolInput,
    target: target.host,
    baseUrl: target.baseUrl,
    ...(target.port === undefined ? {} : { port: target.port })
  };

  for (const key of ["url", "startUrl", "loginUrl"] as const) {
    const value = toolInput[key];
    if (typeof value === "string" && value.trim().length > 0) {
      const rewritten = rewriteUrlToRuntimeOrigin(value, target.baseUrl);
      scopedInput[key] = rewritten;
      firstEndpointUrl ??= rewritten;
    }
  }

  if (firstEndpointUrl) {
    scopedInput["baseUrl"] = firstEndpointUrl;
  }

  if ("validationTargets" in toolInput) {
    scopedInput["validationTargets"] = rewriteValidationTargets(toolInput["validationTargets"], target.baseUrl);
  }

  return scopedInput;
}

export function parseExecutionTarget(
  toolInput: Record<string, unknown>,
  fallbackTarget: { baseUrl: string; host: string; port?: number }
) {
  const candidateUrl = ["baseUrl", "startUrl", "url", "loginUrl"]
    .map((key) => toolInput[key])
    .find((value): value is string => typeof value === "string" && value.length > 0);

  if (candidateUrl) {
    try {
      const parsed = new URL(candidateUrl);
      return {
        target: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : fallbackTarget.port,
        url: parsed.toString()
      };
    } catch (error) {
      throw new RequestError(400, `Invalid execution URL: ${candidateUrl}.`, {
        code: "WORKFLOW_TOOL_TARGET_INVALID",
        userFriendlyMessage: "The workflow tool target URL is invalid.",
        cause: error
      });
    }
  }

  const candidateTarget = toolInput["target"];
  if (typeof candidateTarget === "string" && candidateTarget.length > 0) {
    if (/^https?:\/\//.test(candidateTarget)) {
      try {
        const parsed = new URL(candidateTarget);
        return {
          target: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : fallbackTarget.port,
          url: parsed.toString()
        };
      } catch (error) {
        throw new RequestError(400, `Invalid execution URL: ${candidateTarget}.`, {
          code: "WORKFLOW_TOOL_TARGET_INVALID",
          userFriendlyMessage: "The workflow tool target URL is invalid.",
          cause: error
        });
      }
    }

    if (candidateTarget.startsWith("/")) {
      return {
        target: fallbackTarget.host,
        port: fallbackTarget.port,
        path: candidateTarget
      };
    }

    const normalizedTarget = candidateTarget.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const [host, rawPort] = normalizedTarget.split(":");

    return {
      target: host || fallbackTarget.host,
        port: rawPort ? Number(rawPort) : fallbackTarget.port
    };
  }

  const candidatePort = toolInput["port"];
  if (typeof candidatePort === "number" && candidatePort !== fallbackTarget.port) {
    throw new RequestError(400, "A workflow tool port was provided without a target host.", {
      code: "WORKFLOW_TOOL_TARGET_MISSING",
      userFriendlyMessage: "The workflow tool target host is required."
    });
  }

  return {
    target: fallbackTarget.host,
    port: typeof candidatePort === "number" ? candidatePort : fallbackTarget.port
  };
}

export function createToolSelectionSummary(selectedToolNames: string[]) {
  return selectedToolNames.length > 0
    ? `Selected ${selectedToolNames.join(", ")} via native tool calls.`
    : "No native tool calls were executed.";
}

export function verifyFindingEvidence(
  finding: WorkflowFindingSubmission,
  executedResults: ExecutedToolResult[]
): { validationStatus: SecurityValidationStatus; confidence: number; reason: string } {
  const evidence = finding.evidence || [];
  if (evidence.length === 0) {
    return { validationStatus: "unverified", confidence: finding.confidence * 0.5, reason: "No evidence provided." };
  }

  const matches = evidence.map((item, evidenceIndex) => ({
    evidenceIndex,
    result: resolveEvidenceResult(item, executedResults),
    quote: item.quote.trim()
  }));

  const unresolved = matches.filter((match) => !match.result);
  if (unresolved.length > 0) {
    return {
      validationStatus: "rejected",
      confidence: 0.1,
      reason: `Evidence grounding failed for item ${unresolved[0]!.evidenceIndex + 1}; the evidence reference did not map to a persisted tool result.`
    };
  }

  const nonVerbatim = matches.filter((match) => !quoteAppearsInResult(match.quote, match.result!));
  if (nonVerbatim.length > 0) {
    return {
      validationStatus: "suspected",
      confidence: Math.min(finding.confidence, 0.69),
      reason: `Evidence item ${nonVerbatim[0]!.evidenceIndex + 1} mapped to a persisted tool result but the quote was not verbatim-traceable.`
    };
  }

  const nonSpecific = matches.filter((match) => !isConcreteEvidenceQuote(match.quote));
  if (nonSpecific.length > 0) {
    return {
      validationStatus: "suspected",
      confidence: Math.min(finding.confidence, 0.74),
      reason: `Evidence item ${nonSpecific[0]!.evidenceIndex + 1} was grounded but not specific enough to prove the claim on its own.`
    };
  }

  return {
    validationStatus: "single_source",
    confidence: Math.max(finding.confidence, 0.8),
    reason: `Evidence was grounded to ${matches.length} persisted tool result${matches.length === 1 ? "" : "s"} with concrete proof strings.`
  };
}

export function attachEvidenceReferences(
  finding: WorkflowFindingSubmission,
  executedResults: ExecutedToolResult[]
): WorkflowFindingSubmission {
  return {
    ...finding,
    evidence: finding.evidence.map((item) => {
      if (item.toolRunRef || item.observationRef || item.artifactRef || item.traceEventId) {
        return item;
      }

      const candidates = executedResults.filter((result) => result.toolName === item.sourceTool || result.toolId === item.sourceTool);
      if (candidates.length !== 1) {
        return item;
      }

      return {
        ...item,
        toolRunRef: candidates[0]!.toolRun.id
      };
    })
  };
}

export function validateFindingEvidenceReferences(
  finding: WorkflowFindingSubmission,
  executedResults: ExecutedToolResult[]
): string | null {
  for (const [index, item] of finding.evidence.entries()) {
    const hasPersistedReference = Boolean(item.toolRunRef || item.observationRef || item.artifactRef || item.traceEventId);
    if (!hasPersistedReference) {
      const sourceTool = item.sourceTool?.trim();
      const matchingRuns = sourceTool
        ? executedResults.filter((result) => result.toolName === sourceTool || result.toolId === sourceTool)
        : [];
      const candidateRuns = matchingRuns
        .map((result) => `${result.toolName} toolRunRef=${result.toolRun.id}`)
        .join(", ");
      return matchingRuns.length > 1
        ? `Evidence item ${index + 1} is ambiguous: sourceTool \`${sourceTool}\` matched multiple executed results in this run (${candidateRuns}). Replace sourceTool with toolRunRef or observationRef from exactly one persisted result.`
        : matchingRuns.length === 1
          ? `Evidence item ${index + 1} is missing a persisted evidence reference. Replace sourceTool \`${sourceTool}\` with toolRunRef=${matchingRuns[0]!.toolRun.id} or one of that run's observation refs.`
          : sourceTool
            ? `Evidence item ${index + 1} is missing a persisted evidence reference. Source tool \`${sourceTool}\` did not match any executed result in this run. Provide a valid toolRunRef, observationRef, artifactRef, or traceEventId.`
            : `Evidence item ${index + 1} is missing a persisted evidence reference. Provide toolRunRef, observationRef, artifactRef, or traceEventId from a persisted result in this run.`;
    }

    const result = resolveEvidenceResult(item, executedResults);
    if (!result) {
      if (item.toolRunRef) {
        return `Evidence item ${index + 1} references unknown toolRunRef \`${item.toolRunRef}\`. Use a persisted toolRunRef from this run.`;
      }
      if (item.observationRef) {
        return `Evidence item ${index + 1} references unknown observationRef \`${item.observationRef}\`. Use an observationRef emitted by an executed tool result in this run.`;
      }
      const sourceTool = item.sourceTool?.trim();
      const matchingRuns = sourceTool
        ? executedResults.filter((candidate) => candidate.toolName === sourceTool || candidate.toolId === sourceTool)
        : [];
      if (matchingRuns.length > 1) {
        const candidateRuns = matchingRuns
          .map((candidate) => `${candidate.toolName} toolRunRef=${candidate.toolRun.id}`)
          .join(", ");
        return `Evidence item ${index + 1} does not map to exactly one executed tool result. sourceTool \`${sourceTool}\` matched multiple runs (${candidateRuns}). Replace sourceTool with toolRunRef or observationRef from the intended run.`;
      }
      return sourceTool
        ? `Evidence item ${index + 1} does not map to an executed tool result. sourceTool \`${sourceTool}\` did not resolve in this run.`
        : `Evidence item ${index + 1} does not map to an executed tool result.`;
    }
  }

  return null;
}

export function enrichWorkflowFindingDetails(
  finding: FindingDetailContext,
  executedResults: ExecutedToolResult[],
  fallbackTarget?: { baseUrl?: string; host: string; port?: number }
): Pick<WorkflowFindingSubmission, "target" | "reproduction"> {
  const matchedResults = finding.evidence.flatMap((item) =>
    executedResults.filter((result) => result.toolName === item.sourceTool || result.toolId === item.sourceTool)
  );
  const exactLocation = inferExactFindingLocation(
    finding.evidence.map((item) => item.quote),
    matchedResults,
    fallbackTarget
  );

  const target: WorkflowFindingTarget = {
    ...finding.target,
    ...(exactLocation.path && !finding.target.path ? { path: exactLocation.path } : {}),
    ...(exactLocation.url ? { url: exactLocation.url } : {})
  };
  const reproduction = buildManualReproduction(
    finding.title,
    target,
    finding.evidence,
    finding.reproduction?.commandPreview,
    finding.reproduction?.steps
  );

  return { target, reproduction };
}

function inferExactFindingLocation(
  evidenceQuotes: string[],
  executedResults: ExecutedToolResult[],
  fallbackTarget?: { baseUrl?: string; host: string; port?: number }
): { url?: string; path?: string } {
  const texts = [
    ...evidenceQuotes,
    ...executedResults.map((result) => result.outputPreview),
    ...executedResults.map((result) => result.fullOutput)
  ];

  for (const text of texts) {
    const url = extractFirstUrl(text);
    if (url) {
      const path = safePathname(url);
      return {
        url,
        ...(path ? { path } : {})
      };
    }
  }

  const candidateToolUrl = executedResults
    .map((result) => readUrlFromToolInput(result.toolInput))
    .find((value): value is string => Boolean(value));
  if (candidateToolUrl) {
    const path = safePathname(candidateToolUrl);
    return {
      url: candidateToolUrl,
      ...(path ? { path } : {})
    };
  }

  const path = texts
    .map((text) => extractInterestingPath(text))
    .find((value): value is string => Boolean(value));
  if (path) {
    return {
      path,
      ...(fallbackTarget?.baseUrl ? { url: buildUrlFromPath(fallbackTarget.baseUrl, path) } : {})
    };
  }

  return {};
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (!match?.[0]) {
    return null;
  }

  return stripTrailingPunctuation(match[0]);
}

function extractInterestingPath(text: string): string | null {
  const matches = text.match(/\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+/g) ?? [];
  const candidate = matches.find((value) => value.length > 1 && !value.startsWith("//"));
  return candidate ? stripTrailingPunctuation(candidate) : null;
}

function stripTrailingPunctuation(value: string) {
  return value.replace(/[),.;]+$/g, "");
}

function safePathname(rawUrl: string): string | undefined {
  try {
    const parsed = new URL(rawUrl);
    return parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : undefined;
  } catch {
    return undefined;
  }
}

function buildUrlFromPath(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ""), normalizedBase).toString();
}

function readUrlFromToolInput(toolInput: ExecutedToolResult["toolInput"]): string | null {
  const candidate = ["baseUrl", "startUrl", "url", "loginUrl"]
    .map((key) => toolInput[key])
    .find((value): value is string => typeof value === "string" && value.length > 0);
  if (candidate) {
    return candidate;
  }

  const target = toolInput["target"];
  if (typeof target === "string" && target.startsWith("/")) {
    return null;
  }

  return null;
}

function buildManualReproduction(
  title: string,
  target: WorkflowFindingTarget,
  evidence: WorkflowFindingSubmission["evidence"],
  commandPreview?: string,
  existingSteps?: string[]
): NonNullable<WorkflowFindingSubmission["reproduction"]> {
  const steps = [
    ...(existingSteps ?? []),
    ...(target.url ? [`Request the exact URL: ${target.url}`] : []),
    ...(!target.url && target.path && target.host ? [`Request the exact path ${target.path} on ${target.host}.`] : []),
    ...(commandPreview ? [`Re-run the captured command: ${commandPreview}`] : []),
    `Confirm the response still includes: ${truncate(evidence[0]?.quote ?? title, 180)}`
  ].filter((value, index, array) => value && array.indexOf(value) === index);

  return {
    ...(commandPreview ? { commandPreview } : {}),
    steps
  };
}

function resolveEvidenceResult(
  item: WorkflowFindingSubmission["evidence"][number],
  executedResults: ExecutedToolResult[]
): ExecutedToolResult | null {
  if (item.toolRunRef) {
    return executedResults.find((result) => result.toolRun.id === item.toolRunRef) ?? null;
  }

  if (item.observationRef) {
    return executedResults.find((result) => result.observationKeys.includes(item.observationRef!)) ?? null;
  }

  const candidates = executedResults.filter((result) => result.toolName === item.sourceTool || result.toolId === item.sourceTool);
  return candidates.length === 1 ? candidates[0]! : null;
}

function quoteAppearsInResult(quote: string, result: ExecutedToolResult) {
  if (!quote) {
    return false;
  }

  const haystacks = [
    result.fullOutput,
    result.outputPreview,
    result.commandPreview,
    ...result.observations.map((observation) => observation.evidence),
    ...result.observationSummaries
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return haystacks.some((value) => value.includes(quote));
}

function isConcreteEvidenceQuote(quote: string) {
  const trimmed = quote.trim();
  if (trimmed.length < 12) {
    return false;
  }

  const proofPatterns = [
    /^URL:\s+\S+/im,
    /^Status:\s+\d{3}/im,
    /^Snippet:\s+\S+/im,
    /^Payload:\s+\S+/im,
    /^attempt\s+\d+:\s+status=\d{3}/im,
    /^[a-z0-9-]+:\s+\S+/im,
    /https?:\/\//i,
    /\b(?:status|payload|query|token|secret|password|durationMs|timingDeltaMs|knownAvgMs|unknownAvgMs)=/i,
    /\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+/,
    /\b\d{3}\b/
  ];

  return proofPatterns.some((pattern) => pattern.test(trimmed));
}
