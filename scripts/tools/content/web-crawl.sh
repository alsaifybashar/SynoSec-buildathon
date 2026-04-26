#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const startUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);
const start = new URL(startUrl);
const origin = start.origin;
const maxPages = clampNumber(toolInput.maxPages ?? toolInput.maxPaths, 8, 1, 40);

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

function toAbsoluteUrl(input) {
  try {
    const resolved = new URL(input, startUrl);
    return resolved.origin === origin ? resolved.toString() : null;
  } catch {
    return null;
  }
}

function fetchPage(url) {
  return new Promise((resolve) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;
    const req = transport.request(target, { method: "GET", timeout: 1500 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        if (body.length < 20000) {
          body += chunk;
        }
      });
      res.on("end", () => resolve({
        url: target.toString(),
        statusCode: res.statusCode ?? 0,
        location: typeof res.headers.location === "string" ? res.headers.location : null,
        server: String(res.headers.server || ""),
        contentType: String(res.headers["content-type"] || ""),
        body
      }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => resolve({
      url: target.toString(),
      statusCode: 0,
      location: null,
      server: "",
      contentType: "",
      body: error.message
    }));
    req.end();
  });
}

function extractLinks(base, html) {
  const hrefRegex = /href\s*=\s*["']([^"'#]+)["']/gi;
  const links = [];
  for (const match of html.matchAll(hrefRegex)) {
    const absolute = toAbsoluteUrl(match[1]);
    if (absolute) {
      links.push(absolute);
    }
  }
  return uniqueOrdered(links);
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
    ["workspace", /\bworkspace\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["approvalToken", /\bapproval(?: token|Token)?\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["approverEmail", /\bapprover(?:_email|Email)?\s*[:=]\s*["']?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})["']?/gi],
    ["nonce", /\b(?:nonce|nonce_seed|nonceSeed)\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["sessionToken", /\bsessionToken\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi]
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
  const queue = uniqueOrdered([
    start.toString(),
    ...sanitizeList(toolInput.candidateEndpoints).map(toAbsoluteUrl),
    ...sanitizeList(toolInput.candidatePaths).map(toAbsoluteUrl)
  ].filter(Boolean));
  const visited = new Set();
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift();
    if (!url || visited.has(url)) {
      continue;
    }
    visited.add(url);
    const page = await fetchPage(url);
    pages.push(page);
    if (page.statusCode >= 200 && page.statusCode < 400 && /text\/html/i.test(page.contentType)) {
      for (const link of extractLinks(url, page.body)) {
        if (!visited.has(link) && queue.length + pages.length < maxPages * 3) {
          queue.push(link);
        }
      }
    }
  }

  const discovered = pages.filter((page) => page.statusCode > 0);
  if (discovered.length === 0) {
    console.log(JSON.stringify({
      output: `Web crawl could not reach ${startUrl}.`,
      statusReason: "Target was unreachable during web crawl"
    }));
    process.exit(64);
  }

  const observations = discovered.map((page) => {
    const url = new URL(page.url);
    const path = `${url.pathname}${url.search}`;
    const links = /text\/html/i.test(page.contentType) ? extractLinks(page.url, page.body).map((entry) => {
      const parsed = new URL(entry);
      return `${parsed.pathname}${parsed.search}`;
    }).slice(0, 8) : [];
    const artifacts = extractArtifacts(page.body);
    const proofParts = [
      `GET ${path || "/"} returned HTTP ${page.statusCode}`,
      page.location ? `and redirected to ${page.location}` : null,
      artifacts.length > 0 ? `and exposed artifacts ${artifacts.map((artifact) => `${artifact.kind}=${artifact.value}`).join(", ")}` : null,
      links.length > 0 ? `and linked to ${links.join(", ")}` : null
    ].filter(Boolean);
    return {
      key: `crawl:${path || "/"}`,
      title: `Crawled ${path || "/"}`,
      summary: `${proofParts.join(" ")}.`,
      severity: "info",
      confidence: 0.8,
      evidence: [
        `URL: ${page.url}`,
        `Status: ${page.statusCode}`,
        page.location ? `Location: ${page.location}` : null,
        page.server ? `Server: ${page.server}` : null,
        page.contentType ? `Content-Type: ${page.contentType}` : null,
        `Proof: ${proofParts.join(" ")}`,
        artifacts.length > 0 ? `Artifacts: ${artifacts.map((artifact) => `${artifact.kind}=${artifact.value}`).join(", ")}` : null,
        links.length > 0 ? `Follow-on paths: ${links.join(", ")}` : null,
        snippet(page.body) ? `Snippet: ${snippet(page.body)}` : null
      ].filter(Boolean).join("\n"),
      technique: "seeded web crawl"
    };
  });

  const output = discovered.map((page) => {
    const url = new URL(page.url);
    return `${page.statusCode} ${url.pathname}${url.search}`;
  }).join("\n");

  console.log(JSON.stringify({
    output,
    observations,
    commandPreview: `seed-web-crawl startUrl=${startUrl} maxPages=${maxPages}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `Web crawl failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
