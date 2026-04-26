#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const hashes = Array.isArray(toolInput.hashes)
  ? toolInput.hashes.filter((value) => typeof value === "string" && value.trim().length > 0)
  : [];
const hashValue = typeof toolInput.hash === "string" && toolInput.hash.trim().length > 0
  ? toolInput.hash.trim()
  : hashes[0] || "";

if (!hashValue) {
  console.log(JSON.stringify({
    output: "Cipher-Identifier requires hash material via hash or hashes.",
    statusReason: "Missing required hash material"
  }));
  process.exit(64);
}

const detected = /^[a-f0-9]+$/i.test(hashValue)
  ? { name: "hex-like", key: "hex-like", confidence: 0.8 }
  : /^[A-Za-z0-9+/=]+$/.test(hashValue) && hashValue.includes("=")
    ? { name: "base64-like", key: "base64-like", confidence: 0.8 }
    : { name: "unknown", key: "unknown", confidence: 0.35 };

console.log(JSON.stringify({
  output: detected.name,
  observations: [{
    key: `cipher-format:${detected.key}`,
    title: `Identified ciphertext format: ${detected.name}`,
    summary: `The supplied material most closely matches a ${detected.name} encoding pattern.`,
    severity: "info",
    confidence: detected.confidence,
    evidence: `Value: ${hashValue}`,
    technique: "seeded ciphertext format identification"
  }],
  commandPreview: `seed-cipher-identifier value=${hashValue}`
}));
NODE
