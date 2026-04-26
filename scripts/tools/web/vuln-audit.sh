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
const maxTargets = clampNumber(toolInput.maxPaths ?? toolInput.maxPages, 10, 1, 40);

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

function sanitizeValidationTargets(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry) => entry && typeof entry === "object");
}

function normalizeRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const normalized = {};
  for (const [key, entry] of Object.entries(value)) {
    if (["string", "number", "boolean"].includes(typeof entry)) {
      normalized[key] = String(entry);
    }
  }
  return normalized;
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
    const resolved = new URL(input, baseUrl);
    return resolved.origin === origin ? resolved.toString() : null;
  } catch {
    return null;
  }
}

function inferMethod(target) {
  const method = typeof target.method === "string" ? target.method.trim().toUpperCase() : "";
  if (method) {
    return method;
  }
  const body = normalizeRecord(target.body);
  return Object.keys(body).length > 0 ? "POST" : "GET";
}

function normalizeValidationTarget(target) {
  const endpoint = typeof target.url === "string" && target.url.trim().length > 0
    ? target.url.trim()
    : typeof target.endpoint === "string" && target.endpoint.trim().length > 0
      ? target.endpoint.trim()
      : typeof target.path === "string" && target.path.trim().length > 0
        ? target.path.trim()
        : null;
  const url = endpoint ? toAbsoluteUrl(endpoint) : null;
  if (!url) {
    return null;
  }
  return {
    label: typeof target.label === "string" ? target.label.trim() : "",
    url,
    method: inferMethod(target),
    expectedAuthBehavior: typeof target.expectedAuthBehavior === "string" ? target.expectedAuthBehavior.trim().toLowerCase() : "",
    expectedEvidenceStrings: sanitizeList(target.expectedEvidenceStrings),
    expectedEvidenceFields: sanitizeList(target.expectedEvidenceFields),
    query: normalizeRecord(target.query),
    body: normalizeRecord(target.body),
    headers: normalizeRecord(target.headers),
    notes: typeof target.notes === "string" ? target.notes.trim() : ""
  };
}

function request(targetUrl, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(targetUrl);
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(url, {
      method: options.method || "GET",
      headers: options.headers || {},
      timeout: 2000
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        if (body.length < 24000) {
          body += chunk;
        }
      });
      res.on("end", () => resolve({
        url: url.toString(),
        statusCode: res.statusCode ?? 0,
        headers: res.headers,
        body
      }));
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", (error) => resolve({
      url: url.toString(),
      statusCode: 0,
      headers: {},
      body: error.message,
      error: error.message
    }));
    if (options.body) {
      req.write(options.body);
    }
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
    ["sessionToken", /\bsessionToken\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["signingKey", /\bsigningKey\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi],
    ["deployToken", /\bdeployToken\s*[:=]\s*["']?([a-z0-9._-]+)["']?/gi]
  ];
  for (const [kind, regex] of fieldPatterns) {
    for (const match of body.matchAll(regex)) {
      pushArtifact(kind, match[1]);
    }
  }
  return artifacts;
}

function extractMatchedEvidence(body, expectedEvidenceStrings, expectedEvidenceFields) {
  const matches = [];
  for (const expected of expectedEvidenceStrings) {
    if (body.includes(expected)) {
      matches.push(expected);
    }
  }
  for (const field of expectedEvidenceFields) {
    const regex = new RegExp(`"${field}"\\s*:|\\b${field}\\s*[:=]`, "i");
    if (regex.test(body)) {
      matches.push(field);
    }
  }
  return uniqueOrdered(matches);
}

function parseBodySnippet(body) {
  return body.replace(/\s+/g, " ").trim().slice(0, 320);
}

function isSensitiveResponse(responseBody, artifacts) {
  if (/passwordHash|ssn|creditCard|id_rsa|private key|artifactBucket|signingKey|deployToken/i.test(responseBody)) {
    return true;
  }
  if (/Index of \//i.test(responseBody) && /\.(sql|env|pem|key)\b|id_rsa|passwords\.txt/i.test(responseBody)) {
    return true;
  }
  return artifacts.some((artifact) => ["signingKey", "deployToken"].includes(artifact.kind));
}

function isChainArtifact(artifacts) {
  return artifacts.some((artifact) => ["buildId", "caseRef", "workspace", "approvalToken", "approverEmail", "nonce", "sessionToken"].includes(artifact.kind));
}

function formatPath(urlString) {
  const url = new URL(urlString);
  return `${url.pathname}${url.search}`;
}

function buildTargetRequest(target) {
  const url = new URL(target.url);
  for (const [key, value] of Object.entries(target.query)) {
    url.searchParams.set(key, value);
  }

  let body = null;
  const headers = { ...target.headers };
  if (target.method !== "GET" && Object.keys(target.body).length > 0) {
    body = new URLSearchParams(target.body).toString();
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }

  return {
    url: url.toString(),
    method: target.method,
    headers,
    body
  };
}

function buildBaselineRequest(target) {
  const url = new URL(target.url);
  return {
    url: url.toString(),
    method: target.method,
    headers: {},
    body: target.method === "GET" ? null : new URLSearchParams({}).toString()
  };
}

function makeObservation(input) {
  return {
    key: input.key,
    title: input.title,
    summary: input.summary,
    severity: input.severity,
    confidence: input.confidence,
    evidence: input.evidence,
    technique: "seeded vulnerability audit"
  };
}

(async () => {
  const root = await request(baseUrl);
  if (root.statusCode === 0) {
    console.log(JSON.stringify({
      output: `Vulnerability audit could not reach ${baseUrl}: ${root.body}`,
      statusReason: "Target was unreachable during vulnerability audit"
    }));
    process.exit(64);
  }

  const explicitTargets = sanitizeValidationTargets(toolInput.validationTargets)
    .map(normalizeValidationTarget)
    .filter(Boolean);

  const genericUrls = uniqueOrdered([
    baseUrl,
    ...sanitizeList(toolInput.candidateEndpoints).map(toAbsoluteUrl),
    ...sanitizeList(toolInput.candidatePaths).map(toAbsoluteUrl),
    ...[
      "/admin",
      "/login",
      "/dashboard",
      "/api",
      "/api/users",
      "/files",
      "/health",
      "/diagnostics/export",
      "/openapi.json"
    ].map(toAbsoluteUrl),
    ...extractLinks(baseUrl, root.body)
  ].filter(Boolean)).slice(0, maxTargets);

  const genericTargets = genericUrls.map((url) => ({
    label: "",
    url,
    method: "GET",
    expectedAuthBehavior: "",
    expectedEvidenceStrings: [],
    expectedEvidenceFields: [],
    query: {},
    body: {},
    headers: {},
    notes: ""
  }));

  const targets = uniqueOrdered([
    ...explicitTargets.map((target) => JSON.stringify(target)),
    ...genericTargets.map((target) => JSON.stringify(target))
  ]).map((entry) => JSON.parse(entry)).slice(0, Math.max(maxTargets, explicitTargets.length));

  const findings = [];
  const outputLines = [];
  const seenObservationKeys = new Set();

  for (const target of targets) {
    const requestConfig = buildTargetRequest(target);
    const response = await request(requestConfig.url, requestConfig);
    if (response.statusCode === 0) {
      continue;
    }

    const responsePath = formatPath(response.url);
    const artifacts = extractArtifacts(response.body);
    const matchedEvidence = extractMatchedEvidence(
      response.body,
      target.expectedEvidenceStrings,
      target.expectedEvidenceFields
    );
    const explicit = explicitTargets.some((candidate) => candidate.url === target.url && candidate.method === target.method);
    const sensitive = isSensitiveResponse(response.body, artifacts);
    const chainArtifact = isChainArtifact(artifacts) || matchedEvidence.length > 0;
    const authBypass = (
      target.expectedAuthBehavior === "requires-auth" || target.expectedAuthBehavior === "authenticated"
    ) && response.statusCode >= 200 && response.statusCode < 400;

    let baseline = null;
    if (explicit && (
      Object.keys(target.query).length > 0 ||
      Object.keys(target.body).length > 0 ||
      Object.keys(target.headers).length > 0
    )) {
      baseline = await request(buildBaselineRequest(target).url, buildBaselineRequest(target));
    }

    if (explicit) {
      const proof = baseline && baseline.statusCode > 0
        ? `${target.method} ${responsePath} returned HTTP ${response.statusCode}; baseline ${target.method} ${formatPath(buildBaselineRequest(target).url)} returned HTTP ${baseline.statusCode}`
        : `${target.method} ${responsePath} returned HTTP ${response.statusCode}`;
      const key = `audit:reachable:${target.method}:${responsePath}`;
      if (!seenObservationKeys.has(key)) {
        seenObservationKeys.add(key);
        findings.push(makeObservation({
          key,
          title: target.label || `Reachable target validated at ${responsePath}`,
          summary: `Reachable: ${proof}.`,
          severity: "info",
          confidence: 0.84,
          evidence: [
            `Request: ${target.method} ${requestConfig.url}`,
            `Status: ${response.statusCode}`,
            baseline ? `Baseline status: ${baseline.statusCode}` : null,
            `Proof: ${proof}`,
            matchedEvidence.length > 0 ? `Matched evidence: ${matchedEvidence.join(", ")}` : null,
            parseBodySnippet(response.body) ? `Snippet: ${parseBodySnippet(response.body)}` : null
          ].filter(Boolean).join("\n")
        }));
      }
    }

    if (authBypass || /No authentication required|Administrator Control Panel/i.test(response.body)) {
      const proof = baseline && baseline.statusCode > 0
        ? `${target.method} ${responsePath} returned HTTP ${response.statusCode} while the same endpoint without supplied artifacts returned HTTP ${baseline.statusCode}`
        : `${target.method} ${responsePath} returned HTTP ${response.statusCode} without an authentication challenge`;
      const key = `audit:unauthenticated:${responsePath}`;
      if (!seenObservationKeys.has(key)) {
        seenObservationKeys.add(key);
        findings.push(makeObservation({
          key,
          title: `Unauthenticated access confirmed at ${responsePath}`,
          summary: `Unauthenticated: ${proof}.`,
          severity: "high",
          confidence: 0.95,
          evidence: [
            `Request: ${target.method} ${requestConfig.url}`,
            `Status: ${response.statusCode}`,
            baseline ? `Baseline status: ${baseline.statusCode}` : null,
            `Proof: ${proof}`,
            parseBodySnippet(response.body) ? `Snippet: ${parseBodySnippet(response.body)}` : null
          ].filter(Boolean).join("\n")
        }));
        outputLines.push(`HIGH Unauthenticated access confirmed at ${responsePath}`);
      }
    }

    if (chainArtifact) {
      const artifactSummary = uniqueOrdered([
        ...artifacts.map((artifact) => `${artifact.kind}=${artifact.value}`),
        ...matchedEvidence.map((match) => `matched=${match}`)
      ]).join(", ");
      const proof = baseline && baseline.statusCode > 0 && baseline.statusCode !== response.statusCode
        ? `${target.method} ${responsePath} changed from HTTP ${baseline.statusCode} to HTTP ${response.statusCode} when supplied artifacts were used`
        : `${target.method} ${responsePath} returned HTTP ${response.statusCode} and exposed chain-enabling artifacts ${artifactSummary}`;
      const key = `audit:chain-artifact:${responsePath}`;
      if (!seenObservationKeys.has(key)) {
        seenObservationKeys.add(key);
        findings.push(makeObservation({
          key,
          title: `Chain-enabling artifact found at ${responsePath}`,
          summary: `Chain-enabling artifact: ${proof}.`,
          severity: baseline && baseline.statusCode > 0 && baseline.statusCode !== response.statusCode ? "high" : "medium",
          confidence: 0.92,
          evidence: [
            `Request: ${target.method} ${requestConfig.url}`,
            `Status: ${response.statusCode}`,
            baseline ? `Baseline status: ${baseline.statusCode}` : null,
            `Proof: ${proof}`,
            `Artifacts: ${artifactSummary}`,
            parseBodySnippet(response.body) ? `Snippet: ${parseBodySnippet(response.body)}` : null
          ].filter(Boolean).join("\n")
        }));
        outputLines.push(`MEDIUM Chain-enabling artifact found at ${responsePath}`);
      }
    }

    if (sensitive) {
      const proof = baseline && baseline.statusCode > 0 && baseline.statusCode !== response.statusCode
        ? `${target.method} ${responsePath} changed from HTTP ${baseline.statusCode} to HTTP ${response.statusCode} when supplied artifacts were used and returned sensitive response fields`
        : `${target.method} ${responsePath} returned HTTP ${response.statusCode} with sensitive response content`;
      const key = `audit:sensitive:${responsePath}`;
      if (!seenObservationKeys.has(key)) {
        seenObservationKeys.add(key);
        findings.push(makeObservation({
          key,
          title: `Sensitive response confirmed at ${responsePath}`,
          summary: `Sensitive response: ${proof}.`,
          severity: "high",
          confidence: 0.95,
          evidence: [
            `Request: ${target.method} ${requestConfig.url}`,
            `Status: ${response.statusCode}`,
            baseline ? `Baseline status: ${baseline.statusCode}` : null,
            `Proof: ${proof}`,
            matchedEvidence.length > 0 ? `Matched evidence: ${matchedEvidence.join(", ")}` : null,
            parseBodySnippet(response.body) ? `Snippet: ${parseBodySnippet(response.body)}` : null
          ].filter(Boolean).join("\n")
        }));
        outputLines.push(`HIGH Sensitive response confirmed at ${responsePath}`);
      }
    }
  }

  const output = outputLines.length > 0
    ? outputLines.join("\n")
    : `No evidence-backed vulnerability signals were confirmed at ${baseUrl}.`;

  console.log(JSON.stringify({
    output,
    observations: findings,
    commandPreview: `seed-vuln-audit baseUrl=${baseUrl} targets=${targets.length}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `Vulnerability audit failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
