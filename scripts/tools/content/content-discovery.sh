#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const baseUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);
const paths = ["/", "/admin", "/login", "/api/users", "/files", "/search", "/robots.txt", "/sitemap.xml", "/.env", "/.git/config"];

function requestPath(base, path) {
  return new Promise((resolve) => {
    const target = new URL(path, base);
    const transport = target.protocol === "https:" ? https : http;
    const req = transport.request(target, { method: 'GET', timeout: 1500 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { if (body.length < 1024) { body += chunk; } });
      res.on("end", () => resolve({
        path: target.pathname,
        url: target.toString(),
        statusCode: res.statusCode ?? 0,
        location: res.headers.location ?? null,
        snippet: body.slice(0, 240)
      }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => resolve({ path: new URL(path, base).pathname, url: new URL(path, base).toString(), statusCode: 0, location: null, snippet: error.message }));
    req.end();
  });
}

(async () => {
  const results = [];
  for (const path of paths) {
    results.push(await requestPath(baseUrl, path));
  }
  const discoveries = results.filter((item) => item.statusCode > 0 && item.statusCode < 400);
  const observations = discoveries.map((item) => ({
    key: `content:${item.path}`,
    title: `Discovered content at ${item.path}`,
    summary: `Path ${item.path} returned HTTP ${item.statusCode}.`,
    severity: item.path === "/admin" || item.path === "/api/users" ? "medium" : "info",
    confidence: item.path === "/" ? 0.72 : 0.8,
    evidence: `URL: ${item.url}\nStatus: ${item.statusCode}${item.location ? `\nLocation: ${item.location}` : ""}${item.snippet ? `\nSnippet: ${item.snippet}` : ""}`,
    technique: "seeded content discovery"
  }));
  const output = results.map((item) => `${item.statusCode || "ERR"} ${item.path}${item.location ? ` -> ${item.location}` : ""}`).join("\n");
  console.log(JSON.stringify({
    output,
    observations,
    commandPreview: `seed-content-discovery baseUrl=${baseUrl}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `Content discovery failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
