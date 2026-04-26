#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const crypto = require("node:crypto");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const token = String(toolInput.token || "").trim();
const target = String(toolInput.target || payload?.request?.target || "jwt");

function fail(message) {
  console.log(JSON.stringify({ output: message, statusReason: message }));
  process.exit(64);
}

function b64urlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(alg, secret, signingInput) {
  const digest = alg === "HS512" ? "sha512" : alg === "HS384" ? "sha384" : "sha256";
  return crypto.createHmac(digest, secret).update(signingInput).digest("base64url");
}

if (!token) {
  fail("JWT Analyzer requires a token input.");
}

const parts = token.split(".");
if (parts.length !== 3) {
  fail("JWT Analyzer requires a compact JWT with three dot-separated parts.");
}

let header;
let claims;
try {
  header = JSON.parse(b64urlDecode(parts[0]));
  claims = JSON.parse(b64urlDecode(parts[1]));
} catch (error) {
  fail(`JWT Analyzer could not decode the token: ${error.message}`);
}

const observations = [];
const lines = [
  `JWT target: ${target}`,
  `alg: ${String(header.alg || "missing")}`,
  `typ: ${String(header.typ || "missing")}`,
  `kid: ${String(header.kid || "missing")}`
];
const alg = String(header.alg || "").toUpperCase();
const claimNames = Object.keys(claims).sort();

function addArtifactObservation(keySuffix, title, summary, evidence, severity = "info", confidence = 0.9) {
  observations.push({
    key: `jwt:${target}:${keySuffix}`,
    title,
    summary,
    severity,
    confidence,
    evidence,
    technique: "offline JWT artifact analysis"
  });
}

addArtifactObservation(
  "header",
  "JWT header artifacts decoded",
  `Decoded JWT header alg=${String(header.alg || "missing")}${header.kid ? ` kid=${String(header.kid)}` : ""}.`,
  `JWT header: ${JSON.stringify(header)}`
);

for (const claim of ["iss", "sub", "aud", "jti"]) {
  if (claims[claim] != null) {
    addArtifactObservation(
      `claim:${claim}`,
      `JWT claim decoded: ${claim}`,
      `Token claim ${claim} is present and can steer downstream validation.`,
      `${claim}=${JSON.stringify(claims[claim])}`
    );
    lines.push(`${claim}: ${JSON.stringify(claims[claim])}`);
  }
}

const roleLikeClaims = claimNames.filter((claim) => /role|group|scope|permission|tenant|workspace|org/i.test(claim));
for (const claim of roleLikeClaims) {
  addArtifactObservation(
    `claim:${claim}`,
    `JWT authorization artifact decoded: ${claim}`,
    `Role-like claim ${claim} may identify authorization scope for later offline reasoning or online validation by a separate tool.`,
    `${claim}=${JSON.stringify(claims[claim])}`,
    "info",
    0.88
  );
}

if (!alg || alg === "NONE") {
  observations.push({
    key: `jwt:${target}:alg-none`,
    title: "JWT accepts an unsafe or missing algorithm",
    summary: "The token header uses alg:none or omits an algorithm.",
    severity: "critical",
    confidence: 0.95,
    evidence: `JWT header: ${JSON.stringify(header)}`,
    technique: "JWT algorithm confusion analysis"
  });
}

if (alg.startsWith("HS")) {
  const signingInput = `${parts[0]}.${parts[1]}`;
  const weakSecrets = ["secret", "password", "changeme", "admin", "jwt", "test", "key"];
  const matchedSecret = weakSecrets.find((secret) => sign(alg, secret, signingInput) === parts[2]);
  if (matchedSecret) {
    observations.push({
      key: `jwt:${target}:weak-secret`,
      title: "JWT signed with a common weak secret",
      summary: `The token signature validates with a common HMAC secret (${matchedSecret}).`,
      severity: "high",
      confidence: 0.98,
      evidence: `Algorithm ${alg} signature matched common secret "${matchedSecret}".`,
      technique: "JWT weak secret validation"
    });
  }
}

const now = Math.floor(Date.now() / 1000);
const missingClaims = ["exp", "iat", "iss", "aud"].filter((claim) => claims[claim] == null);
if (missingClaims.length > 0) {
  observations.push({
    key: `jwt:${target}:missing-claims`,
    title: "JWT is missing recommended session claims",
    summary: `Missing claim(s): ${missingClaims.join(", ")}.`,
    severity: missingClaims.includes("exp") ? "medium" : "low",
    confidence: 0.9,
    evidence: `JWT claims: ${JSON.stringify(claims)}`,
    technique: "JWT session claim analysis"
  });
}

if (typeof claims.exp === "number") {
  const secondsRemaining = claims.exp - now;
  const issuedAt = typeof claims.iat === "number" ? claims.iat : null;
  if (issuedAt) {
    const lifetimeSeconds = claims.exp - issuedAt;
    lines.push(`lifetimeSeconds: ${lifetimeSeconds}`);
    addArtifactObservation(
      "lifetime",
      "JWT session lifetime decoded",
      `Token lifetime is ${lifetimeSeconds} seconds from iat to exp.`,
      `iat=${issuedAt}, exp=${claims.exp}, lifetimeSeconds=${lifetimeSeconds}`
    );
  }
  lines.push(`exp: ${claims.exp} (${secondsRemaining}s remaining)`);
  if (secondsRemaining < 0) {
    observations.push({
      key: `jwt:${target}:expired`,
      title: "JWT is expired",
      summary: "The token expiry timestamp is already in the past.",
      severity: "medium",
      confidence: 0.96,
      evidence: `exp=${claims.exp}, now=${now}`,
      technique: "JWT expiry analysis"
    });
  }
  if (secondsRemaining > 60 * 60 * 24 * 30) {
    observations.push({
      key: `jwt:${target}:long-lived`,
      title: "JWT has a long session lifetime",
      summary: "The token remains valid for more than 30 days.",
      severity: "low",
      confidence: 0.84,
      evidence: `exp=${claims.exp}, now=${now}, secondsRemaining=${secondsRemaining}`,
      technique: "JWT session lifetime analysis"
    });
  }
}

lines.push(`claims: ${claimNames.join(", ") || "none"}`);
console.log(JSON.stringify({
  output: lines.join("\n"),
  observations,
  commandPreview: "jwt-analyzer <token>"
}));
NODE
