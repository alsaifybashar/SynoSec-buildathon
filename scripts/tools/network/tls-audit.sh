#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v openssl >/dev/null 2>&1; then
  printf '%s\n' '{"output":"TLS Audit could not run because openssl is not installed.","statusReason":"Missing required binary: openssl"}'
  exit 127
fi

SEED_PAYLOAD="$payload" node <<'NODE'
const { spawnSync } = require("node:child_process");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
let target = String(toolInput.target || payload?.request?.target || "localhost");
let port = Number(toolInput.port || payload?.request?.port || 0);
const explicitUrl = [toolInput.baseUrl, toolInput.url, toolInput.startUrl, toolInput.loginUrl]
  .find((value) => typeof value === "string" && value.trim().length > 0);
try {
  const parsedUrl = new URL(String(explicitUrl || ""));
  target = String(toolInput.target || parsedUrl.hostname || target);
  if (parsedUrl.protocol === "http:") {
    console.log(JSON.stringify({
      output: `plaintext HTTP target detected at ${parsedUrl.toString()}.`,
      observations: [{
        key: `tls:${target}:${parsedUrl.port || 80}:plaintext-http`,
        title: `Plaintext HTTP endpoint on ${target}:${parsedUrl.port || 80}`,
        summary: "The supplied application URL uses HTTP rather than HTTPS.",
        severity: "medium",
        confidence: 0.98,
        evidence: `URL: ${parsedUrl.toString()}`,
        technique: "TLS applicability audit",
        port: parsedUrl.port ? Number(parsedUrl.port) : 80
      }],
      commandPreview: `openssl s_client -connect ${target}:${parsedUrl.port || 443} -servername ${target}`
    }));
    process.exit(0);
  }
  if (!port) {
    port = parsedUrl.port ? Number(parsedUrl.port) : parsedUrl.protocol === "https:" ? 443 : 0;
  }
} catch {}
if (!port) {
  port = 443;
}

function runOpenSsl(args, input = "") {
  return spawnSync("openssl", args, { input, encoding: "utf8", timeout: 8000 });
}

function negotiatedCipher(result) {
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const match = output.match(/(?:^|\n)New,\s+[^,]+,\s+Cipher is\s+([^\s\r\n]+)/);
  return match?.[1] || null;
}

function acceptedCipherFamily(result, family) {
  if (result.status !== 0) {
    return false;
  }
  const negotiated = negotiatedCipher(result);
  if (!negotiated) {
    return false;
  }
  if (family === "NULL") {
    return /(?:^|[-_])NULL(?:$|[-_])/.test(negotiated);
  }
  if (family === "ADH") {
    return /(?:^|[-_])(?:ADH|AECDH)(?:$|[-_])/.test(negotiated);
  }
  return negotiated.includes(family);
}

const protocols = [
  ["ssl2", "SSLv2"],
  ["ssl3", "SSLv3"],
  ["tls1", "TLS 1.0"],
  ["tls1_1", "TLS 1.1"],
  ["tls1_2", "TLS 1.2"],
  ["tls1_3", "TLS 1.3"]
];
const weakProtocols = new Set(["ssl2", "ssl3", "tls1", "tls1_1"]);
const findings = [];
const observations = [];

for (const [flag, label] of protocols) {
  const result = runOpenSsl(["s_client", "-connect", `${target}:${port}`, "-servername", target, `-${flag}`]);
  if (result.status === 0) {
    const weak = weakProtocols.has(flag);
    findings.push(`${weak ? "WEAK " : ""}protocol supported: ${label}`);
    if (weak) {
      observations.push({
        key: `tls:${target}:${port}:protocol:${flag}`,
        title: `Weak TLS protocol supported: ${label}`,
        summary: `${target}:${port} accepted a ${label} handshake.`,
        severity: flag === "ssl2" || flag === "ssl3" ? "high" : "medium",
        confidence: 0.88,
        evidence: `openssl s_client -connect ${target}:${port} -${flag} succeeded.`,
        technique: "TLS protocol downgrade audit",
        port
      });
    }
  }
}

for (const cipher of ["RC4", "3DES", "DES", "ADH", "NULL"]) {
  const cipherArg = cipher === "ADH" ? "aNULL:@SECLEVEL=0" : cipher === "NULL" ? "eNULL:@SECLEVEL=0" : `${cipher}:@SECLEVEL=0`;
  const result = runOpenSsl(["s_client", "-connect", `${target}:${port}`, "-servername", target, "-tls1_2", "-cipher", cipherArg]);
  if (acceptedCipherFamily(result, cipher)) {
    findings.push(`weak cipher accepted: ${cipher}`);
    observations.push({
      key: `tls:${target}:${port}:cipher:${cipher}`,
      title: `Weak TLS cipher accepted: ${cipher}`,
      summary: `${target}:${port} accepted a weak cipher family during handshake testing.`,
      severity: "medium",
      confidence: 0.82,
      evidence: `openssl s_client -connect ${target}:${port} -tls1_2 -cipher '${cipherArg}' negotiated ${negotiatedCipher(result)}.`,
      technique: "TLS weak cipher audit",
      port
    });
  }
}

const certResult = runOpenSsl(["s_client", "-connect", `${target}:${port}`, "-servername", target, "-showcerts"]);
const certPem = certResult.stdout.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/)?.[0] || "";
if (!certPem) {
  observations.push({
    key: `tls:${target}:${port}:no-handshake`,
    title: `No TLS handshake on ${target}:${port}`,
    summary: `${target}:${port} did not present a TLS certificate or complete a TLS handshake.`,
    severity: "info",
    confidence: 0.9,
    evidence: `openssl s_client -connect ${target}:${port} -servername ${target} did not return a certificate chain.`,
    technique: "TLS handshake audit",
    port
  });
  console.log(JSON.stringify({
    output: [`TLS audit for ${target}:${port}`, ...findings, "certificate: unavailable"].join("\n"),
    observations,
    commandPreview: `openssl s_client -connect ${target}:${port} -servername ${target}`
  }));
  process.exit(0);
}

const subject = runOpenSsl(["x509", "-noout", "-subject"], certPem).stdout.trim();
const issuer = runOpenSsl(["x509", "-noout", "-issuer"], certPem).stdout.trim();
const dates = runOpenSsl(["x509", "-noout", "-dates"], certPem).stdout.trim();
findings.push(subject, issuer, dates);

const expired = runOpenSsl(["x509", "-checkend", "0", "-noout"], certPem).status !== 0;
const expiresSoon = runOpenSsl(["x509", "-checkend", "2592000", "-noout"], certPem).status !== 0;
const selfSigned = subject.replace(/^subject=/, "") === issuer.replace(/^issuer=/, "");
if (expired || expiresSoon || selfSigned) {
  const issues = [
    expired ? "expired certificate" : null,
    !expired && expiresSoon ? "certificate expires within 30 days" : null,
    selfSigned ? "self-signed certificate" : null
  ].filter(Boolean);
  observations.push({
    key: `tls:${target}:${port}:certificate`,
    title: `TLS certificate issue on ${target}:${port}`,
    summary: issues.join(", "),
    severity: expired ? "high" : "medium",
    confidence: 0.9,
    evidence: [subject, issuer, dates, ...issues].join("\n"),
    technique: "TLS certificate trust audit",
    port
  });
}

console.log(JSON.stringify({
  output: [`TLS audit for ${target}:${port}`, ...findings].join("\n"),
  observations,
  commandPreview: `openssl s_client -connect ${target}:${port} -servername ${target}`
}));
NODE
