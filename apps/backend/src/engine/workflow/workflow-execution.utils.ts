import type {
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
  observations: string[];
  outputPreview: string;
  fullOutput: string;
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
        port: parsed.port ? Number(parsed.port) : fallbackTarget.port
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

  const indicators = {
    ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    httpStatus: /\b[1-5]\d{2}\b/,
    header: /\b[A-Za-z0-9-]+:\s/,
    sql: /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|UNION|JOIN|INTO)\b/i,
    port: /\b\d{1,5}\/(tcp|udp)\b/,
    path: /\/[\w\.-]+\//
  };

  let totalMatches = 0;
  let groundedMatches = 0;

  for (const item of evidence) {
    const quote = item.quote.trim();
    if (!quote) continue;

    const hasIndicator = Object.values(indicators).some(regex => regex.test(quote));
    if (hasIndicator) {
      totalMatches++;
      
      // Cross-reference with tool output
      const matchingTool = executedResults.find(r => r.toolName === item.sourceTool || r.toolId === item.sourceTool);
      if (matchingTool && matchingTool.fullOutput.includes(quote)) {
        groundedMatches++;
      }
    }
  }

  if (groundedMatches > 0) {
    const status: SecurityValidationStatus = groundedMatches === evidence.length ? "single_source" : "suspected";
    return {
      validationStatus: status,
      confidence: status === "single_source" ? Math.max(finding.confidence, 0.8) : finding.confidence,
      reason: `Evidence cross-referenced against ${groundedMatches} tool outputs.`
    };
  }

  if (totalMatches > 0) {
    return {
      validationStatus: "suspected",
      confidence: finding.confidence * 0.7,
      reason: "Evidence contains technical indicators but could not be cross-referenced against tool output."
    };
  }

  return {
    validationStatus: "rejected",
    confidence: 0.1,
    reason: "Evidence appears to be pure speculation without technical indicators or tool grounding."
  };
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
