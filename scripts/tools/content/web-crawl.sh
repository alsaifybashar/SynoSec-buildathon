#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const http = require("node:http");
const https = require("node:https");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const startUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);
const maxPages = 8;
const start = new URL(startUrl);
const origin = start.origin;

function fetchPage(url) {
  return new Promise((resolve) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;
    const req = transport.request(target, { method: 'GET', timeout: 1500 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { if (body.length < 16384) { body += chunk; } });
      res.on("end", () => resolve({
        url: target.toString(),
        statusCode: res.statusCode ?? 0,
        contentType: String(res.headers["content-type"] || ""),
        body
      }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => resolve({ url: target.toString(), statusCode: 0, contentType: "", body: error.message }));
    req.end();
  });
}

function extractLinks(baseUrl, html) {
  const hrefRegex = /href\s*=\s*["']([^"'#]+)["']/gi;
  const links = new Set();
  for (const match of html.matchAll(hrefRegex)) {
    const href = match[1];
    try {
      const absolute = new URL(href, baseUrl);
      if (absolute.origin === origin) {
        links.add(absolute.toString());
      }
    } catch {}
  }
  return Array.from(links);
}

(async () => {
  const queue = [start.toString()];
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
    if (page.statusCode >= 200 && page.statusCode < 400 && page.contentType.includes("text/html")) {
      for (const link of extractLinks(url, page.body)) {
        if (!visited.has(link) && queue.length + pages.length < maxPages * 2) {
          queue.push(link);
        }
      }
    }
  }
  const discovered = pages.filter((page) => page.statusCode > 0).map((page) => {
    const url = new URL(page.url);
    return { path: `${url.pathname}${url.search}`, statusCode: page.statusCode, url: page.url };
  });
  const observations = discovered.map((page) => ({
    key: `crawl:${page.path || "/"}`,
    title: `Crawled ${page.path || "/"}`,
    summary: `${page.path || "/"} responded with HTTP ${page.statusCode}.`,
    severity: "info",
    confidence: 0.78,
    evidence: `URL: ${page.url}\nStatus: ${page.statusCode}`,
    technique: "seeded web crawl"
  }));
  const output = discovered.length > 0
    ? discovered.map((page) => `${page.statusCode} ${page.path || "/"}`).join("\n")
    : `No crawlable pages returned a response from ${startUrl}.`;
  console.log(JSON.stringify({
    output,
    observations,
    commandPreview: `seed-web-crawl startUrl=${startUrl}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `Web crawl failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
