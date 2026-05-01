import type {
  ConnectorAction,
  ConnectorActionExecutionResult,
  ConnectorActionResult,
  ConnectorDnsQueryAction,
  ConnectorHttpResponseBinding,
  ConnectorHttpRequestAction,
  ConnectorTcpConnectAction,
  ConnectorTlsHandshakeAction
} from "@synosec/contracts";
import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";

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

function normalizeCertificateName(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
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

async function executeDnsQueryAction(action: ConnectorDnsQueryAction): Promise<ConnectorActionResult> {
  const startedAt = Date.now();
  const resolver = new dns.promises.Resolver();
  if (action.resolver) {
    resolver.setServers([action.resolver]);
  }

  try {
    const answers = await withTimeout((async () => {
      switch (action.recordType) {
        case "A":
          return (await resolver.resolve4(action.name, { ttl: true })).map((entry) => ({
            name: action.name,
            type: action.recordType,
            ttl: entry.ttl,
            data: entry.address
          }));
        case "AAAA":
          return (await resolver.resolve6(action.name, { ttl: true })).map((entry) => ({
            name: action.name,
            type: action.recordType,
            ttl: entry.ttl,
            data: entry.address
          }));
        case "CNAME":
        case "NS":
          return (await resolver.resolve(action.name, action.recordType)).map((entry) => ({
            name: action.name,
            type: action.recordType,
            data: String(entry)
          }));
        case "TXT":
          return (await resolver.resolveTxt(action.name)).map((entry) => ({
            name: action.name,
            type: action.recordType,
            data: entry.join("")
          }));
        case "MX":
          return (await resolver.resolveMx(action.name)).map((entry) => ({
            name: action.name,
            type: action.recordType,
            data: `${entry.priority} ${entry.exchange}`
          }));
        case "SOA": {
          const entry = await resolver.resolveSoa(action.name);
          return [{
            name: action.name,
            type: action.recordType,
            data: `${entry.nsname} ${entry.hostmaster} serial=${entry.serial}`
          }];
        }
        case "SRV":
          return (await resolver.resolveSrv(action.name)).map((entry) => ({
            name: action.name,
            type: action.recordType,
            data: `${entry.priority} ${entry.weight} ${entry.port} ${entry.name}`
          }));
        case "CAA":
          return (await resolver.resolveCaa(action.name)).map((entry) => ({
            name: action.name,
            type: action.recordType,
            data: JSON.stringify(entry)
          }));
      }
    })(), action.timeoutMs, `DNS query timed out after ${action.timeoutMs}ms.`);

    return {
      kind: "dns_query",
      actionId: action.id,
      ok: true,
      name: action.name,
      recordType: action.recordType,
      responseCode: "NOERROR",
      answers,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: "dns_query",
      actionId: action.id,
      ok: false,
      name: action.name,
      recordType: action.recordType,
      responseCode: error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "ERROR",
      answers: [],
      durationMs: Date.now() - startedAt,
      networkError: message
    };
  }
}

async function executeTcpConnectAction(action: ConnectorTcpConnectAction): Promise<ConnectorActionResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    let banner = "";

    const finish = (result: Omit<Extract<ConnectorActionResult, { kind: "tcp_connect" }>, "kind" | "actionId" | "host" | "port" | "durationMs">) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve({
        kind: "tcp_connect",
        actionId: action.id,
        host: action.host,
        port: action.port,
        durationMs: Date.now() - startedAt,
        ...result
      });
    };

    socket.setTimeout(action.timeoutMs);
    socket.once("connect", () => {
      if (action.send) {
        socket.write(action.send);
      }
      setTimeout(() => {
        finish({
          ok: true,
          status: "connected",
          banner,
          ...(action.expectRegex ? { matchedExpectRegex: new RegExp(action.expectRegex, "i").test(banner) } : {})
        });
      }, 150);
    });
    socket.on("data", (chunk: Buffer) => {
      if (banner.length >= action.maxReadBytes) {
        return;
      }
      banner += chunk.toString("utf8").slice(0, action.maxReadBytes - banner.length);
      if (action.expectRegex && new RegExp(action.expectRegex, "i").test(banner)) {
        finish({
          ok: true,
          status: "connected",
          banner,
          matchedExpectRegex: true
        });
      }
    });
    socket.once("timeout", () => {
      finish({
        ok: false,
        status: "timed_out",
        banner,
        ...(action.expectRegex ? { matchedExpectRegex: false } : {}),
        networkError: `TCP connect timed out after ${action.timeoutMs}ms.`
      });
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      const status = error.code === "ECONNREFUSED"
        ? "refused"
        : error.code === "ETIMEDOUT"
          ? "timed_out"
          : "error";
      finish({
        ok: false,
        status,
        banner,
        ...(action.expectRegex ? { matchedExpectRegex: false } : {}),
        networkError: error.message
      });
    });

    socket.connect(action.port, action.host);
  });
}

async function executeTlsHandshakeAction(action: ConnectorTlsHandshakeAction): Promise<ConnectorActionResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const socket = tls.connect({
      host: action.host,
      port: action.port,
      servername: action.serverName ?? action.host,
      rejectUnauthorized: false
    });
    let settled = false;

    const finish = (result: Omit<Extract<ConnectorActionResult, { kind: "tls_handshake" }>, "kind" | "actionId" | "host" | "port" | "durationMs">) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve({
        kind: "tls_handshake",
        actionId: action.id,
        host: action.host,
        port: action.port,
        durationMs: Date.now() - startedAt,
        ...result
      });
    };

    socket.setTimeout(action.timeoutMs);
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      const subjectAltNames = typeof cert.subjectaltname === "string"
        ? cert.subjectaltname.split(",").map((entry) => entry.trim()).filter(Boolean)
        : [];
      finish({
        ok: true,
        ...(action.serverName ? { serverName: action.serverName } : {}),
        protocol: socket.getProtocol() ?? undefined,
        cipher: socket.getCipher()?.name,
        certSubject: normalizeCertificateName(cert.subject?.CN) ?? undefined,
        certIssuer: normalizeCertificateName(cert.issuer?.CN) ?? undefined,
        certSan: subjectAltNames,
        validFrom: cert.valid_from || undefined,
        validTo: cert.valid_to || undefined
      });
    });
    socket.once("timeout", () => {
      finish({
        ok: false,
        ...(action.serverName ? { serverName: action.serverName } : {}),
        certSan: [],
        handshakeError: `TLS handshake timed out after ${action.timeoutMs}ms.`,
        networkError: `TLS handshake timed out after ${action.timeoutMs}ms.`
      });
    });
    socket.once("error", (error) => {
      finish({
        ok: false,
        ...(action.serverName ? { serverName: action.serverName } : {}),
        certSan: [],
        handshakeError: error.message,
        networkError: error.message
      });
    });
  });
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

    if (action.kind === "dns_query") {
      actionResults.push(await executeDnsQueryAction(action));
      continue;
    }

    if (action.kind === "tcp_connect") {
      actionResults.push(await executeTcpConnectAction(action));
      continue;
    }

    if (action.kind === "tls_handshake") {
      actionResults.push(await executeTlsHandshakeAction(action));
      continue;
    }

    throw new Error(`Unsupported connector action kind: ${(action as { kind?: string }).kind ?? "unknown"}`);
  }

  return { actionResults };
}
