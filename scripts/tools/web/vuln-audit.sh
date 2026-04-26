#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const baseUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);

function request(targetUrl, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(targetUrl);
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(url, { method: options.method || 'GET', headers: options.headers || {}, timeout: 2000 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { if (body.length < 16384) { body += chunk; } });
      res.on("end", () => resolve({ url: url.toString(), statusCode: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => resolve({ url: url.toString(), statusCode: 0, headers: {}, body: error.message, error: error.message }));
    if (options.body) { req.write(options.body); }
    req.end();
  });
}

(async () => {
  const findings = [];
  const root = await request(baseUrl);
  if (root.statusCode === 0) {
    console.log(JSON.stringify({
      output: `Vulnerability audit could not reach ${baseUrl}: ${root.body}`,
      statusReason: "Target was unreachable during vulnerability audit"
    }));
    process.exit(64);
  }
  const admin = await request(new URL("/admin", baseUrl).toString());
  const users = await request(new URL("/api/users", baseUrl).toString());
  const files = await request(new URL("/files", baseUrl).toString());
  if (admin.statusCode === 200 && /No authentication required|Administrator Control Panel/i.test(admin.body)) {
    findings.push({
      key: "audit:/admin",
      title: "Unauthenticated admin panel exposed",
      summary: "/admin was reachable without authentication and exposed administrative content.",
      severity: "high",
      confidence: 0.96,
      evidence: `URL: ${admin.url}\nStatus: ${admin.statusCode}\nSnippet: ${admin.body.slice(0, 320)}`,
      technique: "seeded vulnerability audit"
    });
  }
  if (users.statusCode === 200 && /passwordHash|ssn|creditCard/i.test(users.body)) {
    findings.push({
      key: "audit:/api/users",
      title: "Sensitive user data exposed without authentication",
      summary: "/api/users returned sensitive records including credential or PII fields.",
      severity: "high",
      confidence: 0.95,
      evidence: `URL: ${users.url}\nStatus: ${users.statusCode}\nSnippet: ${users.body.slice(0, 320)}`,
      technique: "seeded vulnerability audit"
    });
  }
  if (files.statusCode === 200 && /Index of \/files|id_rsa|\.env|backup_.*\.sql|passwords\.txt/i.test(files.body)) {
    const exposedNames = ["backup_2019.sql", "passwords.txt", "db_config.php", "id_rsa", ".env.production"]
      .filter((name) => files.body.includes(name));
    findings.push({
      key: "audit:/files",
      title: "Public file index exposes secret-bearing artifacts",
      summary: "/files returned a public index containing backup, key, or environment filenames that are sensitive on their own.",
      severity: "high",
      confidence: 0.93,
      evidence: `URL: ${files.url}\nStatus: ${files.statusCode}\nExposed names: ${exposedNames.join(", ")}\nSnippet: ${files.body.slice(0, 320)}`,
      technique: "seeded vulnerability audit"
    });
  }
  const output = findings.length > 0
    ? findings.map((finding) => `${finding.severity.toUpperCase()} ${finding.title}`).join("\n")
    : `No seeded vulnerability signals were confirmed at ${baseUrl}.`;
  console.log(JSON.stringify({
    output,
    observations: findings,
    commandPreview: `seed-vuln-audit baseUrl=${baseUrl}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `Vulnerability audit failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
