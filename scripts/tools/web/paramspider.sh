#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const targetUrl = String(
  [toolInput.url, toolInput.baseUrl, toolInput.startUrl, toolInput.loginUrl]
    .find((value) => typeof value === "string" && value.trim().length > 0)
    || `http://${toolInput.target || payload?.request?.target || "localhost"}`
);
const candidateParams = Array.isArray(toolInput.parameters) && toolInput.parameters.length > 0
  ? toolInput.parameters.filter((value) => typeof value === "string" && value.trim().length > 0)
  : ["q", "query", "search", "id"];

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
  for (const parameter of candidateParams) {
    const url = new URL(targetUrl);
    const marker = `synosec-paramspider-${parameter}`;
    url.searchParams.set(parameter, marker);
    const result = await request(url.toString());
    if (result.statusCode > 0 && result.body.includes(marker)) {
      findings.push({
        key: `parameter:${parameter}`,
        title: `Likely parameter discovered: ${parameter}`,
        summary: `${parameter} was reflected by ${new URL(result.url).pathname}.`,
        severity: "info",
        confidence: 0.82,
        evidence: `URL: ${result.url}\nStatus: ${result.statusCode}\nMarker: ${marker}`,
        technique: "seeded parameter reflection probe"
      });
    }
  }

  const output = findings.length > 0
    ? findings.map((finding) => finding.key.replace("parameter:", "")).join("\n")
    : `No likely parameters were confirmed at ${targetUrl}.`;

  console.log(JSON.stringify({
    output,
    observations: findings,
    commandPreview: `seed-paramspider url=${targetUrl}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `ParamSpider heuristic failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
