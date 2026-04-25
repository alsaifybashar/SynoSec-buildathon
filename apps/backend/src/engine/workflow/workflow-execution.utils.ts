import type { OsiLayer } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";

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
  const candidateUrl = ["baseUrl", "startUrl", "url"]
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
