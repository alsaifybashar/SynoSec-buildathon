#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const baseUrl = String(
  [toolInput.url, toolInput.baseUrl, toolInput.startUrl, toolInput.loginUrl]
    .find((value) => typeof value === "string" && value.trim().length > 0)
    || `http://${toolInput.target || payload?.request?.target || "localhost"}`
);
const parameterSource = Array.isArray(toolInput.candidateParameters) && toolInput.candidateParameters.length > 0
  ? toolInput.candidateParameters
  : Array.isArray(toolInput.parameters) && toolInput.parameters.length > 0
    ? toolInput.parameters
    : ["q"];
const parameters = [...new Set(parameterSource.filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))];
const endpointSource = Array.isArray(toolInput.validationTargets) && toolInput.validationTargets.length > 0
  ? toolInput.validationTargets.map((target) => target?.url || target?.endpoint || target?.path).filter(Boolean)
  : Array.isArray(toolInput.candidateEndpoints) && toolInput.candidateEndpoints.length > 0
    ? toolInput.candidateEndpoints
    : [baseUrl];
const maxEndpoints = Number.isFinite(Number(toolInput.maxEndpoints)) ? Math.max(1, Number(toolInput.maxEndpoints)) : 4;
const maxRequests = Number.isFinite(Number(toolInput.maxRequests)) ? Math.max(1, Number(toolInput.maxRequests)) : 24;
const endpoints = [...new Set(endpointSource
  .filter((value) => typeof value === "string" && value.trim().length > 0)
  .map((value) => new URL(value, baseUrl).toString()))].slice(0, maxEndpoints);
const payloadMarker = "<synosec-xss-probe>";

function request(urlString) {
  return new Promise((resolve) => {
    const url = new URL(urlString);
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(url, { method: "GET", timeout: 2000 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        if (body.length < 8192) {
          body += chunk;
        }
      });
      res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body, url: url.toString() }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => resolve({ statusCode: 0, body: error.message, url: url.toString() }));
    req.end();
  });
}

(async () => {
  const observations = [];
  let firstFailure = null;
  let requestCount = 0;
  for (const endpoint of endpoints) {
    for (const parameter of parameters) {
      if (requestCount >= maxRequests) {
        break;
      }
      requestCount += 1;
      const url = new URL(endpoint);
      url.searchParams.set(parameter, payloadMarker);
      const result = await request(url.toString());
      if (result.statusCode === 0) {
        firstFailure = { url: url.toString(), result };
        break;
      }

      const reflected = result.body.includes(payloadMarker);
      const escaped = result.body.includes("&lt;synosec-xss-probe&gt;");
      if (reflected || escaped) {
        const path = new URL(result.url).pathname;
        observations.push({
          key: endpoints.length === 1 ? `xss:${path}` : `xss:${path}:${parameter}`,
          title: `Reflected input detected on ${path}`,
          summary: `${parameter} reached a response sink on ${path}; reflection is validation evidence for a sink and does not by itself imply script execution.`,
          severity: reflected ? "high" : "medium",
          confidence: reflected ? 0.9 : 0.72,
          evidence: `Request target: ${result.url}\nMethod: GET\nStatus: ${result.statusCode}\nSink path: ${path}\nParameter: ${parameter}\nPayload marker: ${payloadMarker}\nReflection: ${reflected ? "raw marker reflected" : "escaped marker reflected"}\nContext change: ${reflected ? "raw angle brackets present in response body" : "marker was HTML-escaped"}`,
          technique: "seeded reflected XSS probe"
        });
      }
    }
  }

  if (firstFailure) {
    console.log(JSON.stringify({
      output: `XSS validation could not reach ${firstFailure.url}: ${firstFailure.result.body}`,
      statusReason: "Target endpoint was unreachable during XSS validation"
    }));
    process.exit(64);
  }

  console.log(JSON.stringify({
    output: observations.length > 0
      ? observations.map((observation) => `${observation.severity.toUpperCase()} reflected ${observation.title}`).join("\n")
      : `No reflected XSS signal was confirmed across ${requestCount} request(s).`,
    observations,
    commandPreview: `seed-xss-validation endpoints=${endpoints.join(",")} parameters=${parameters.join(",")}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `XSS validation failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
