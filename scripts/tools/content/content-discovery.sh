#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const baseUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);
const start = new URL(baseUrl);
const origin = start.origin;
const maxPaths = clampNumber(toolInput.maxPaths, 12, 1, 40);

const defaultPaths = [
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/health",
  "/login",
  "/admin",
  "/api",
  "/openapi.json",
  "/.well-known/security.txt"
];

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

function sanitizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function toPathCandidate(input) {
  try {
    const resolved = new URL(input, baseUrl);
    if (resolved.origin !== origin) {
      return null;
    }
    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return null;
  }
}

function uniqueOrdered(values) {
  const seen = new Set();
  const ordered = [];
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

function requestPath(base, path) {
  return new Promise((resolve) => {
    const target = new URL(path, base);
    const transport = target.protocol === "https:" ? https : http;
    const req = transport.request(target, { method: "GET", timeout: 1500 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        if (body.length < 16384) {
          body += chunk;
        }
      });
      res.on("end", () => resolve({
        path: `${target.pathname}${target.search}`,
        url: target.toString(),
        statusCode: res.statusCode ?? 0,
        location: typeof res.headers.location === "string" ? res.headers.location : null,
        contentType: String(res.headers["content-type"] || ""),
        body
      }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => resolve({
      path: `${target.pathname}${target.search}`,
      url: target.toString(),
      statusCode: 0,
      location: null,
      contentType: "",
      body: error.message
    }));
    req.end();
  });
}

function extractLinks(base, body) {
  const hrefRegex = /href\s*=\s*["']([^"'#]+)["']/gi;
  const discovered = [];
  for (const match of body.matchAll(hrefRegex)) {
    const candidate = toPathCandidate(match[1]);
    if (candidate) {
      discovered.push(candidate);
    }
  }
  return uniqueOrdered(discovered);
}

function extractArtifacts(body) {
  const artifacts = [];
  const pushArtifact = (kind, value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return;
    }
    const key = `${kind}:${trimmed}`;
    if (!artifacts.some((artifact) => artifact.key === key)) {
      artifacts.push({ key, kind, value: trimmed });
    }
  };

  for (const match of body.matchAll(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi)) {
    pushArtifact("email", match[0]);
  }
  for (const match of body.matchAll(/\bcase-\d+\b/gi)) {
    pushArtifact("caseRef", match[0]);
  }
  for (const match of body.matchAll(/\b[a-z]{1,8}-\d{4}-\d{2}\b/gi)) {
    pushArtifact("buildId", match[0]);
  }
  const fieldPatterns = [
    ["buildId", /\b(?:build|buildId)\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["workspace", /\bworkspace\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["approvalToken", /\bapproval(?: token|Token)?\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["approverEmail", /\bapprover(?:_email|Email)?\s*[:=]\s*["']?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})["']?/gi],
    ["nonce", /\b(?:nonce|nonce_seed|nonceSeed)\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["sessionToken", /\bsessionToken\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["token", /\b(?:token|deployToken)\s*[:=]\s*["']?([a-z0-9._-]{8,})["']?/gi]
  ];
  for (const [kind, regex] of fieldPatterns) {
    for (const match of body.matchAll(regex)) {
      pushArtifact(kind, match[1]);
    }
  }
  return artifacts;
}

function snippet(body) {
  return body.replace(/\s+/g, " ").trim().slice(0, 260);
}

(async () => {
  const seededCandidates = uniqueOrdered([
    ...sanitizeList(toolInput.candidatePaths).map(toPathCandidate),
    ...sanitizeList(toolInput.candidateEndpoints).map(toPathCandidate),
    ...defaultPaths
  ].filter(Boolean));
  const queue = [...seededCandidates];
  const visited = new Set();
  const results = [];

  while (queue.length > 0 && results.length < maxPaths) {
    const path = queue.shift();
    if (!path || visited.has(path)) {
      continue;
    }
    visited.add(path);
    const response = await requestPath(baseUrl, path);
    results.push(response);
    if (response.statusCode >= 200 && response.statusCode < 400 && /text\/html/i.test(response.contentType)) {
      for (const linkedPath of extractLinks(response.url, response.body)) {
        if (!visited.has(linkedPath) && queue.length + results.length < maxPaths * 3) {
          queue.push(linkedPath);
        }
      }
    }
  }

  const reachable = results.filter((item) => item.statusCode > 0);
  if (reachable.length === 0) {
    console.log(JSON.stringify({
      output: `Content discovery could not reach ${baseUrl}.`,
      statusReason: "Target was unreachable during content discovery"
    }));
    process.exit(64);
  }

  const observations = reachable.map((item) => {
    const artifacts = extractArtifacts(item.body);
    const linkedPaths = /text\/html/i.test(item.contentType) ? extractLinks(item.url, item.body).slice(0, 6) : [];
    const proofParts = [
      `GET ${item.path} returned HTTP ${item.statusCode}`,
      item.location ? `and redirected to ${item.location}` : null,
      artifacts.length > 0 ? `and exposed artifacts ${artifacts.map((artifact) => `${artifact.kind}=${artifact.value}`).join(", ")}` : null,
      linkedPaths.length > 0 ? `and linked to ${linkedPaths.join(", ")}` : null
    ].filter(Boolean);
    return {
      key: `content:${item.path}`,
      title: `Discovered content at ${item.path}`,
      summary: `${proofParts.join(" ")}.`,
      severity: "info",
      confidence: item.path === "/" ? 0.72 : 0.82,
      evidence: [
        `URL: ${item.url}`,
        `Status: ${item.statusCode}`,
        item.location ? `Location: ${item.location}` : null,
        item.contentType ? `Content-Type: ${item.contentType}` : null,
        `Proof: ${proofParts.join(" ")}`,
        artifacts.length > 0 ? `Artifacts: ${artifacts.map((artifact) => `${artifact.kind}=${artifact.value}`).join(", ")}` : null,
        linkedPaths.length > 0 ? `Follow-on paths: ${linkedPaths.join(", ")}` : null,
        snippet(item.body) ? `Snippet: ${snippet(item.body)}` : null
      ].filter(Boolean).join("\n"),
      technique: "seeded content discovery"
    };
  });

  const output = reachable
    .map((item) => `${item.statusCode || "ERR"} ${item.path}${item.location ? ` -> ${item.location}` : ""}`)
    .join("\n");

  console.log(JSON.stringify({
    output,
    observations,
    commandPreview: `seed-content-discovery baseUrl=${baseUrl} maxPaths=${maxPaths}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `Content discovery failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
