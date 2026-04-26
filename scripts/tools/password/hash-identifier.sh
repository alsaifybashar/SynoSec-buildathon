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
  ? toolInput.hash
  : hashes[0] || "";

if (!hashValue) {
  console.log(JSON.stringify({
    output: "Hash-Identifier requires hash material via hash or hashes.",
    statusReason: "Missing required hash material"
  }));
  process.exit(64);
}

const normalized = hashValue.trim().toLowerCase();
const detected = /^[a-f0-9]{32}$/.test(normalized)
  ? { name: "MD5", key: "md5", confidence: 0.98 }
  : /^[a-f0-9]{40}$/.test(normalized)
    ? { name: "SHA1", key: "sha1", confidence: 0.94 }
    : /^[a-f0-9]{64}$/.test(normalized)
      ? { name: "SHA256", key: "sha256", confidence: 0.94 }
      : null;

console.log(JSON.stringify({
  output: detected ? detected.name : "Unknown hash format",
  observations: detected ? [{
    key: `hash-type:${detected.key}`,
    title: `Identified hash format: ${detected.name}`,
    summary: `The supplied hash matches the expected ${detected.name} length and alphabet.`,
    severity: "info",
    confidence: detected.confidence,
    evidence: `Hash: ${hashValue}`,
    technique: "seeded hash format identification"
  }] : [],
  commandPreview: `seed-hash-identifier hash=${hashValue}`
}));
NODE
