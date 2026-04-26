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
const targetUrl = String(explicitEndpoint || defaultUrl);
const method = String(toolInput.method || (new URL(targetUrl).pathname === "/login" ? "POST" : "GET")).toUpperCase();
const parameterNames = Array.isArray(toolInput.parameters) && toolInput.parameters.length > 0
  ? toolInput.parameters.filter((value) => typeof value === "string" && value.trim().length > 0)
  : ["q"];
const injectionPayload = "' OR '1'='1";

function submit(requestUrl, requestMethod, values) {
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
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': Buffer.byteLength(body)
      } : {}
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
  const submission = method === "POST"
    ? { username: injectionPayload, password: "test" }
    : { [parameterNames[0] || "q"]: injectionPayload };
  const result = await submit(targetUrl, method, submission);
  if (result.statusCode === 0) {
    console.log(JSON.stringify({
      output: `SQL injection check could not reach ${targetUrl}: ${result.body}`,
      statusReason: "Target endpoint was unreachable during SQL injection check"
    }));
    process.exit(64);
  }
  const indicators = [/Authentication bypassed via SQL injection/i, /"success"\s*:\s*true/i, /SELECT \* FROM users/i, /"user"\s*:\s*\{/i];
  const matched = indicators.filter((indicator) => indicator.test(result.body));
  const path = `${new URL(result.url).pathname}${new URL(result.url).search}`;
  const observations = matched.length > 0 ? [{
    key: `sqli:${path}`,
    title: `${path} appears injectable with a classic quote payload`,
    summary: `${path} accepted a quote-based payload and returned an injection signal.`,
    severity: "high",
    confidence: 0.97,
    evidence: `URL: ${result.url}\nMethod: ${method}\nStatus: ${result.statusCode}\nPayload: ${JSON.stringify(submission)}\nSnippet: ${result.body.slice(0, 320)}`,
    technique: "seeded SQL injection check"
  }] : [];
  const output = observations.length > 0
    ? `HIGH ${observations[0].title}`
    : `No SQL injection signal was confirmed at ${result.url}. Status=${result.statusCode}.`;
  console.log(JSON.stringify({
    output,
    observations,
    commandPreview: `seed-sql-injection-check method=${method} url=${targetUrl}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `SQL injection check failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
