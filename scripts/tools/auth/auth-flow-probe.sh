#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const target = String(toolInput.target || payload?.request?.target || "localhost");
const explicitUrl = [toolInput.loginUrl, toolInput.url, toolInput.baseUrl, toolInput.startUrl]
  .find((value) => typeof value === "string" && value.trim().length > 0);
const baseUrl = String(explicitUrl || `http://${target}`);
const parsedBaseUrl = new URL(baseUrl);
const loginUrl = String(
  typeof toolInput.loginUrl === "string" && toolInput.loginUrl.trim().length > 0
    ? toolInput.loginUrl
    : parsedBaseUrl.pathname === "/login"
      ? parsedBaseUrl.toString()
      : new URL("/login", parsedBaseUrl).toString()
);
const usernameField = String(toolInput.usernameField || "username");
const passwordField = String(toolInput.passwordField || "password");
const knownUser = String(toolInput.knownUser || "admin");
const unknownUser = String(toolInput.unknownUser || "synosec-nonexistent-user");

function formBody(values) {
  return new URLSearchParams(values).toString();
}

function submit(values) {
  return new Promise((resolve) => {
    const url = new URL(loginUrl);
    const transport = url.protocol === "https:" ? https : http;
    const body = formBody(values);
    const started = process.hrtime.bigint();
    const req = transport.request(url, {
      method: "POST",
      timeout: 2500,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "content-length": Buffer.byteLength(body)
      }
    }, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        if (responseBody.length < 32768) {
          responseBody += chunk;
        }
      });
      res.on("end", () => {
        const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
        resolve({
          statusCode: res.statusCode || 0,
          durationMs,
          body: responseBody,
          headers: res.headers
        });
      });
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      resolve({ statusCode: 0, durationMs, body: error.message, headers: {}, error: error.message });
    });
    req.write(body);
    req.end();
  });
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function summarizeAttempt(attempt, index) {
  const marker = String(attempt.body || "").replace(/\s+/g, " ").slice(0, 140);
  return `attempt ${index + 1}: status=${attempt.statusCode} durationMs=${attempt.durationMs.toFixed(1)} bodyMarker=${JSON.stringify(marker)}`;
}

(async () => {
  const observations = [];
  const invalidAttempts = [];
  for (let i = 0; i < 6; i++) {
    invalidAttempts.push(await submit({ [usernameField]: knownUser, [passwordField]: `wrong-password-${i}` }));
  }

  if (invalidAttempts.some((attempt) => attempt.statusCode === 0)) {
    const first = invalidAttempts.find((attempt) => attempt.statusCode === 0);
    console.log(JSON.stringify({
      output: `Auth flow probe could not reach ${loginUrl}: ${first?.body || "request failed"}`,
      statusReason: "Login endpoint was unreachable during auth flow probe",
      commandPreview: `auth-flow-probe ${loginUrl}`
    }));
    process.exit(64);
  }

  const rateLimited = invalidAttempts.some((attempt) => attempt.statusCode === 429 || /rate limit|too many|try again/i.test(attempt.body));
  if (!rateLimited) {
    observations.push({
      key: `auth-flow:${loginUrl}:rate-limit`,
      title: "Login flow did not rate-limit repeated failures",
      summary: "Six consecutive invalid login attempts completed without a rate-limit signal.",
      severity: "medium",
      confidence: 0.82,
      evidence: [`URL: ${loginUrl}`, ...invalidAttempts.map(summarizeAttempt)].join("\n"),
      technique: "authentication rate-limit probe"
    });
  }

  const knownSamples = [];
  const unknownSamples = [];
  for (let i = 0; i < 3; i++) {
    knownSamples.push(await submit({ [usernameField]: knownUser, [passwordField]: `wrong-known-${i}` }));
    unknownSamples.push(await submit({ [usernameField]: unknownUser, [passwordField]: `wrong-unknown-${i}` }));
  }

  const knownAvg = average(knownSamples.map((item) => item.durationMs));
  const unknownAvg = average(unknownSamples.map((item) => item.durationMs));
  const timingDelta = Math.abs(knownAvg - unknownAvg);
  const statusDiffers = new Set([...knownSamples, ...unknownSamples].map((item) => item.statusCode)).size > 1;
  const bodyLengthDelta = Math.abs(average(knownSamples.map((item) => item.body.length)) - average(unknownSamples.map((item) => item.body.length)));

  if (statusDiffers || bodyLengthDelta > 80 || timingDelta > 150) {
    const knownMarkers = knownSamples.map((item, index) => `known ${summarizeAttempt(item, index)}`);
    const unknownMarkers = unknownSamples.map((item, index) => `unknown ${summarizeAttempt(item, index)}`);
    observations.push({
      key: `auth-flow:${loginUrl}:oracle`,
      title: "Login flow leaks user validity signals",
      summary: "Known-user and unknown-user login attempts produced materially different responses.",
      severity: "medium",
      confidence: timingDelta > 150 ? 0.78 : 0.84,
      evidence: [
        `URL: ${loginUrl}`,
        `knownAvgMs=${knownAvg.toFixed(1)}`,
        `unknownAvgMs=${unknownAvg.toFixed(1)}`,
        `timingDeltaMs=${timingDelta.toFixed(1)}`,
        `bodyLengthDelta=${bodyLengthDelta.toFixed(1)}`,
        `knownStatuses=${knownSamples.map((item) => item.statusCode).join(",")}`,
        `unknownStatuses=${unknownSamples.map((item) => item.statusCode).join(",")}`,
        ...knownMarkers,
        ...unknownMarkers
      ].join("\n"),
      technique: "authentication user-enumeration timing oracle probe"
    });
  }

  const weakPasswordAttempt = await submit({ [usernameField]: knownUser, [passwordField]: "password" });
  if (weakPasswordAttempt.statusCode >= 200 && weakPasswordAttempt.statusCode < 300 && /success|token|authenticated|welcome/i.test(weakPasswordAttempt.body)) {
    observations.push({
      key: `auth-flow:${loginUrl}:weak-password`,
      title: "Login flow accepted a weak password candidate",
      summary: "The login endpoint returned an authentication success signal for password=password.",
      severity: "high",
      confidence: 0.88,
      evidence: `URL: ${loginUrl}\nStatus: ${weakPasswordAttempt.statusCode}\nSnippet: ${String(weakPasswordAttempt.body).slice(0, 400)}`,
      technique: "authentication weak password policy probe"
    });
  }

  const output = observations.length > 0
    ? observations.map((observation) => `${observation.severity.toUpperCase()} ${observation.title}`).join("\n")
    : `No bounded auth-flow weakness signal was confirmed at ${loginUrl}.`;

  console.log(JSON.stringify({
    output,
    observations,
    commandPreview: `auth-flow-probe ${loginUrl}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `Auth flow probe failed: ${error.message}`,
    statusReason: error.message,
    commandPreview: `auth-flow-probe ${loginUrl}`
  }));
  process.exit(1);
});
NODE
