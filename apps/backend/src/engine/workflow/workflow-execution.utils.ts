import type {
  Observation,
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
  toolInput: Record<string, string | number | boolean | string[]>;
  toolRequest: ToolRequest;
  toolRun: ToolRun;
  status: ToolRun["status"];
  observations: Observation[];
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

export function truncate(value: string, maxLength = 220) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
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

export function normalizeToolInput(input: unknown): Record<string, string | number | boolean | string[]> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized: Record<string, string | number | boolean | string[]> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      normalized[key] = value;
      continue;
    }

    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      normalized[key] = value;
    }
  }

  return normalized;
}

export function parseExecutionTarget(
  toolInput: Record<string, string | number | boolean | string[]>,
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

  const ungrounded = matches.filter((match) => !match.result || !quoteAppearsInResult(match.quote, match.result));
  if (ungrounded.length > 0) {
    return {
      validationStatus: "rejected",
      confidence: 0.1,
      reason: `Evidence grounding failed for item ${ungrounded[0]!.evidenceIndex + 1}; the quote was not traceable to a persisted tool result.`
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
      return `Evidence item ${index + 1} is missing a persisted evidence reference.`;
    }

    const result = resolveEvidenceResult(item, executedResults);
    if (!result) {
      return `Evidence item ${index + 1} does not map to an executed tool result.`;
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
