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
    : ["id", "q", "query", "search", "page", "token", "code", "state", "workspace", "build", "approval", "session", "nonce", "email"];
const candidateParams = [...new Set(parameterSource.filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))];
const endpointSource = Array.isArray(toolInput.candidateEndpoints) && toolInput.candidateEndpoints.length > 0
  ? toolInput.candidateEndpoints
  : [baseUrl];
const maxEndpoints = Number.isFinite(Number(toolInput.maxEndpoints)) ? Math.max(1, Number(toolInput.maxEndpoints)) : 4;
const maxRequests = Number.isFinite(Number(toolInput.maxRequests)) ? Math.max(1, Number(toolInput.maxRequests)) : 32;
const endpoints = [...new Set(endpointSource
  .filter((value) => typeof value === "string" && value.trim().length > 0)
  .map((value) => new URL(value, baseUrl).toString()))].slice(0, maxEndpoints);

function request(urlString) {
  return new Promise((resolve) => {
    const url = new URL(urlString);
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(url, { method: "GET", timeout: 2000 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        if (body.length < 4096) {
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
  const findings = [];
  let requests = 0;
  for (const endpoint of endpoints) {
    for (const parameter of candidateParams) {
      if (requests >= maxRequests) {
        break;
      }
      requests += 1;
      const url = new URL(endpoint);
    const marker = `synosec-${parameter}-probe`;
    url.searchParams.set(parameter, marker);
    const result = await request(url.toString());
    if (result.statusCode > 0 && result.body.includes(marker)) {
      const sinkPath = `${new URL(result.url).pathname}${new URL(result.url).search}`;
      findings.push({
        key: endpoints.length === 1 ? `parameter:${parameter}` : `parameter:${new URL(result.url).pathname}:${parameter}`,
        title: `Likely parameter discovered: ${parameter}`,
        summary: `${parameter} was reflected by ${new URL(result.url).pathname}; reachable input reflection is a candidate for later validation, not proof of exploitability.`,
        severity: "info",
        confidence: 0.84,
        evidence: `Request target: ${result.url}\nMethod: GET\nStatus: ${result.statusCode}\nParameter: ${parameter}\nMarker: ${marker}\nProof: response body contained ${marker}\nSink: ${sinkPath}`,
        technique: "seeded parameter reflection probe"
      });
    }
    }
  }

  const output = findings.length > 0
    ? findings.map((finding) => finding.key.replace("parameter:", "")).join("\n")
    : `No likely parameters were confirmed at ${endpoints.join(", ")}.`;

  console.log(JSON.stringify({
    output,
    observations: findings,
    commandPreview: `seed-parameter-discovery endpoints=${endpoints.join(",")} parameters=${candidateParams.join(",")}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `Parameter discovery failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
