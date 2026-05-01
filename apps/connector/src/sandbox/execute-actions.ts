import type {
  ConnectorAction,
  ConnectorActionExecutionResult,
  ConnectorActionResult,
  ConnectorHttpResponseBinding,
  ConnectorHttpRequestAction
} from "@synosec/contracts";

function appendHeader(headers: Record<string, string | string[]>, key: string, value: string) {
  const current = headers[key];
  if (current === undefined) {
    headers[key] = value;
    return;
  }

  if (Array.isArray(current)) {
    headers[key] = [...current, value];
    return;
  }

  headers[key] = [current, value];
}

function decodeBody(buffer: ArrayBuffer, maxResponseBytes: number) {
  const bytes = new Uint8Array(buffer);
  const truncated = bytes.byteLength > maxResponseBytes ? bytes.slice(0, maxResponseBytes) : bytes;
  return new TextDecoder().decode(truncated);
}

function replaceTemplateTokens(value: string, bindings: Map<string, string>) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, name: string) => bindings.get(name) ?? "");
}

function interpolateJsonValue(value: unknown, bindings: Map<string, string>): unknown {
  if (typeof value === "string") {
    return replaceTemplateTokens(value, bindings);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => interpolateJsonValue(entry, bindings));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, interpolateJsonValue(entry, bindings)])
    );
  }
  return value;
}

function interpolateHeaders(
  headers: Record<string, string | string[]>,
  bindings: Map<string, string>
) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.map((entry) => replaceTemplateTokens(entry, bindings))
        : replaceTemplateTokens(value, bindings)
    ])
  );
}

function interpolateStringRecord(values: Record<string, string>, bindings: Map<string, string>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, replaceTemplateTokens(value, bindings)])
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveBindingValue(
  result: Extract<ConnectorActionResult, { kind: "http_request" }>,
  binding: ConnectorHttpResponseBinding
) {
  if (binding.source === "header") {
    const headerValue = result.headers[binding.headerName ?? ""];
    const normalized = Array.isArray(headerValue) ? headerValue.join(",") : (headerValue ?? "");
    if (!binding.pattern) {
      return normalized;
    }

    const match = normalized.match(new RegExp(binding.pattern, "i"));
    return match?.[binding.groupIndex] ?? null;
  }

  const match = result.body.match(new RegExp(binding.pattern ?? "", "i"));
  return match?.[binding.groupIndex] ?? null;
}

function applyResponseBindings(
  result: ConnectorActionResult,
  bindings: ConnectorHttpResponseBinding[],
  capturedBindings: Map<string, string>
) {
  if (result.kind !== "http_request") {
    return;
  }

  for (const binding of bindings) {
    const value = resolveBindingValue(result, binding);
    if (value == null || value.length === 0) {
      if (binding.required) {
        throw new Error(`Required response binding ${binding.name} was not resolved.`);
      }
      continue;
    }
    capturedBindings.set(binding.name, value);
  }
}

function materializeHttpAction(
  action: ConnectorHttpRequestAction,
  bindings: Map<string, string>
): ConnectorHttpRequestAction {
  return {
    ...action,
    url: replaceTemplateTokens(action.url, bindings),
    headers: interpolateHeaders(action.headers, bindings),
    query: interpolateStringRecord(action.query, bindings),
    ...(action.formBody ? { formBody: interpolateStringRecord(action.formBody, bindings) } : {}),
    ...(action.jsonBody !== undefined ? { jsonBody: interpolateJsonValue(action.jsonBody, bindings) as Record<string, unknown> } : {})
  };
}

async function executeHttpRequestAction(action: ConnectorHttpRequestAction): Promise<ConnectorActionResult> {
  const startedAt = Date.now();

  try {
    const url = new URL(action.url);
    for (const [key, value] of Object.entries(action.query)) {
      url.searchParams.set(key, value);
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(action.headers)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          headers.append(key, entry);
        }
        continue;
      }
      headers.set(key, value);
    }

    let body: BodyInit | undefined;
    if (action.formBody) {
      body = new URLSearchParams(action.formBody).toString();
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/x-www-form-urlencoded");
      }
    } else if (action.jsonBody !== undefined) {
      body = JSON.stringify(action.jsonBody);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    }

    const response = await fetch(url, {
      method: action.method,
      headers,
      redirect: action.followRedirects ? "follow" : "manual",
      signal: AbortSignal.timeout(action.timeoutMs),
      ...(body === undefined ? {} : { body })
    });

    const responseHeaders: Record<string, string | string[]> = {};
    if (action.captureHeaders) {
      response.headers.forEach((value, key) => {
        appendHeader(responseHeaders, key, value);
      });
    }

    const responseBody = action.captureBody
      ? decodeBody(await response.arrayBuffer(), action.maxResponseBytes)
      : "";

    return {
      kind: "http_request",
      actionId: action.id,
      ok: response.ok,
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      kind: "http_request",
      actionId: action.id,
      ok: false,
      statusCode: 0,
      headers: {},
      body: "",
      durationMs: Date.now() - startedAt,
      networkError: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function executeConnectorActionBatch(actions: ConnectorAction[]): Promise<ConnectorActionExecutionResult> {
  const actionResults: ConnectorActionResult[] = [];
  const capturedBindings = new Map<string, string>();

  for (const action of actions) {
    if (action.kind === "http_request") {
      const httpAction = materializeHttpAction(action as ConnectorHttpRequestAction, capturedBindings);
      if (httpAction.delayMs > 0) {
        await sleep(httpAction.delayMs);
      }
      const result = await executeHttpRequestAction(httpAction);
      try {
        applyResponseBindings(result, httpAction.responseBindings, capturedBindings);
        actionResults.push(result);
      } catch (error) {
        actionResults.push({
          ...result,
          networkError: error instanceof Error ? error.message : String(error)
        });
        break;
      }
      continue;
    }

    throw new Error(`Unsupported connector action kind: ${(action as { kind?: string }).kind ?? "unknown"}`);
  }

  return { actionResults };
}
