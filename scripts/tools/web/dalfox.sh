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
const parameter = Array.isArray(toolInput.parameters) && toolInput.parameters.length > 0
  ? String(toolInput.parameters[0])
  : "q";
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
  const url = new URL(targetUrl);
  url.searchParams.set(parameter, payloadMarker);
  const result = await request(url.toString());
  if (result.statusCode === 0) {
    console.log(JSON.stringify({
      output: `XSS validation could not reach ${url.toString()}: ${result.body}`,
      statusReason: "Target endpoint was unreachable during XSS validation"
    }));
    process.exit(64);
  }

  const reflected = result.body.includes(payloadMarker);
  const observations = reflected ? [{
    key: `xss:${new URL(result.url).pathname}`,
    title: `Reflected input detected on ${new URL(result.url).pathname}`,
    summary: `${parameter} was reflected unsafely in the response body.`,
    severity: "high",
    confidence: 0.9,
    evidence: `URL: ${result.url}\nStatus: ${result.statusCode}\nPayload: ${payloadMarker}`,
    technique: "seeded reflected XSS probe"
  }] : [];

  console.log(JSON.stringify({
    output: reflected
      ? `HIGH reflected input detected on ${new URL(result.url).pathname}`
      : `No reflected XSS signal was confirmed at ${result.url}.`,
    observations,
    commandPreview: `seed-xss-validation url=${targetUrl}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `XSS validation failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
