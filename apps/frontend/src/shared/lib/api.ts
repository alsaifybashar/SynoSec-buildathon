import { apiRoutes } from "@synosec/contracts";
import { getCsrfToken, markAuthUnauthorized } from "@/features/auth/auth-store";

type ErrorPayload = {
  message?: string;
  code?: string;
  userFriendlyMessage?: string;
};

type RequestContext = {
  method: string;
  action: string;
  singularLabel: string;
  pluralLabel: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function normalizePathname(url: string) {
  return new URL(url, window.location.origin).pathname;
}

function inferRequestContext(url: string, init?: RequestInit): RequestContext {
  const pathname = normalizePathname(url);
  const method = (init?.method ?? "GET").toUpperCase();

  if (pathname.match(/\/api\/ai-tools\/[^/]+\/run$/)) {
    return { method, action: "run AI tool", singularLabel: "AI tool", pluralLabel: "AI tools" };
  }
  if (pathname.match(/\/api\/workflows\/[^/]+\/launches\/latest$/)) {
    return { method, action: "load the latest workflow launch", singularLabel: "workflow launch", pluralLabel: "workflow launches" };
  }
  if (pathname.match(/\/api\/workflows\/[^/]+\/runs$/) && method === "POST") {
    return { method, action: "start workflow run", singularLabel: "workflow run", pluralLabel: "workflow runs" };
  }
  if (pathname.match(/\/api\/workflow-runs\/[^/]+\/step$/) && method === "POST") {
    return { method, action: "advance workflow run", singularLabel: "workflow run", pluralLabel: "workflow runs" };
  }
  if (pathname.match(/\/api\/execution-reports\/[^/]+\/archive$/) && method === "POST") {
    return { method, action: "archive execution report", singularLabel: "execution report", pluralLabel: "execution reports" };
  }
  if (pathname.match(/\/api\/execution-reports\/[^/]+\/unarchive$/) && method === "POST") {
    return { method, action: "unarchive execution report", singularLabel: "execution report", pluralLabel: "execution reports" };
  }

  const resourceMatch = pathname.match(/\/api\/([^/]+)(?:\/[^/]+)?$/);
  const resource = resourceMatch?.[1] ?? "resource";
  const labels: Record<string, { singular: string; plural: string }> = {
    targets: { singular: "Target", plural: "Targets" },
    "ai-agents": { singular: "AI agent", plural: "AI agents" },
    "ai-tools": { singular: "AI tool", plural: "AI tools" },
    workflows: { singular: "Workflow", plural: "Workflows" },
    "workflow-runs": { singular: "Workflow run", plural: "Workflow runs" },
    "execution-reports": { singular: "Execution report", plural: "Execution reports" }
  };
  const label = labels[resource] ?? { singular: "Resource", plural: "Resources" };
  const isCollectionRequest = !pathname.match(/\/api\/[^/]+\/[^/]+$/);

  if (method === "GET") {
    return {
      method,
      action: isCollectionRequest ? `load ${label.plural}` : `load ${label.singular}`,
      singularLabel: label.singular,
      pluralLabel: label.plural
    };
  }
  if (method === "POST") {
    return { method, action: `create ${label.singular}`, singularLabel: label.singular, pluralLabel: label.plural };
  }
  if (method === "PATCH" || method === "PUT") {
    return { method, action: `update ${label.singular}`, singularLabel: label.singular, pluralLabel: label.plural };
  }
  if (method === "DELETE") {
    return { method, action: `delete ${label.singular}`, singularLabel: label.singular, pluralLabel: label.plural };
  }

  return { method, action: "complete the request", singularLabel: label.singular, pluralLabel: label.plural };
}

function sanitizeUserFriendlyMessage(message: string | undefined) {
  if (!message) {
    return null;
  }

  const singleLine = message
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return singleLine && !/\bat\s+.+:\d+:\d+\b/.test(singleLine) ? singleLine : null;
}

function isSafeServerMessage(message: string | null) {
  if (!message) {
    return false;
  }

  return !/^(TypeError|ReferenceError|SyntaxError|Error:)\b/.test(message);
}

function defaultMessageForStatus(status: number, context: RequestContext) {
  if (status === 400) {
    return `Unable to ${context.action}. Check the submitted data and try again.`;
  }
  if (status === 401) {
    return `Authentication is required to ${context.action}.`;
  }
  if (status === 403) {
    return `You do not have permission to ${context.action}.`;
  }
  if (status === 404) {
    return `${context.singularLabel} not found.`;
  }
  if (status === 409) {
    return `${context.singularLabel} changed before the request completed. Try again.`;
  }
  if (status === 429) {
    return `Too many requests were sent while trying to ${context.action}. Try again shortly.`;
  }
  if (status >= 500) {
    return `Unable to ${context.action} right now.`;
  }

  return `Unable to ${context.action}.`;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  const csrfToken = ["GET", "HEAD", "OPTIONS"].includes(method) ? null : getCsrfToken();

  if (csrfToken) {
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(url, {
    ...init,
    method,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    const context = inferRequestContext(url, init);
    let payload: ErrorPayload | null = null;

    try {
      payload = (await response.json()) as ErrorPayload;
    } catch {
      payload = null;
    }

    const pathname = normalizePathname(url);
    if (response.status === 401 && pathname !== apiRoutes.authSession) {
      markAuthUnauthorized();
    }

    const userFriendlyMessage = sanitizeUserFriendlyMessage(payload?.userFriendlyMessage);
    const backendMessage = sanitizeUserFriendlyMessage(payload?.message);
    const defaultMessage = defaultMessageForStatus(response.status, context);
    const requestErrorMessage =
      response.status >= 500 && backendMessage !== defaultMessage && isSafeServerMessage(backendMessage)
        ? backendMessage
        : payload?.code === "REQUEST_ERROR" && response.status < 500
          ? backendMessage
          : null;
    throw new ApiError(
      userFriendlyMessage ?? requestErrorMessage ?? defaultMessage,
      response.status,
      payload?.code
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
