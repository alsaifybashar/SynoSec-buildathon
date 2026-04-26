#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const crypto = require("node:crypto");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const hashes = Array.isArray(toolInput.hashes)
  ? toolInput.hashes.filter((value) => typeof value === "string" && value.trim().length > 0)
  : [];
const hashValue = typeof toolInput.hash === "string" && toolInput.hash.trim().length > 0
  ? toolInput.hash.trim()
  : hashes[0] || "";
const hashType = String(toolInput.hashType || "").toLowerCase();

if (!hashValue) {
  console.log(JSON.stringify({
    output: "Hashcat Crack requires hash material via hash or hashes.",
    statusReason: "Missing required hash material"
  }));
  process.exit(64);
}

const candidates = ["password", "admin", "letmein", "changeme", "welcome", "123456", "qwerty", "test", "admin123"];
const modeName = hashType || (/^[a-f0-9]{32}$/i.test(hashValue) ? "md5" : /^[a-f0-9]{40}$/i.test(hashValue) ? "sha1" : /^[a-f0-9]{64}$/i.test(hashValue) ? "sha256" : "");
const digestAlgorithm = modeName === "md5" ? "md5" : modeName === "sha1" ? "sha1" : modeName === "sha256" ? "sha256" : null;

if (!digestAlgorithm) {
  console.log(JSON.stringify({
    output: `Unsupported or unknown hash type for ${hashValue}.`,
    statusReason: "Unsupported hash type",
    commandPreview: `seed-hashcat-crack hash=${hashValue}`
  }));
  process.exit(64);
}

const cracked = candidates.find((candidate) => crypto.createHash(digestAlgorithm).update(candidate).digest("hex") === hashValue.toLowerCase()) || null;
const observations = cracked ? [{
  key: `hashcat:cracked:${modeName}`,
  title: "Offline password crack succeeded",
  summary: `Recovered plaintext for the supplied ${modeName.toUpperCase()} hash from the built-in demo wordlist.`,
  severity: "high",
  confidence: 0.96,
  evidence: `Hash: ${hashValue}\nPlaintext: ${cracked}`,
  technique: "seeded offline cracking"
}] : [{
  key: `hashcat:attempted:${modeName}`,
  title: "Offline password crack completed without a match",
  summary: `Attempted offline cracking against the supplied ${modeName.toUpperCase()} hash, but the built-in demo wordlist found no match.`,
  severity: "info",
  confidence: 0.74,
  evidence: `Hash: ${hashValue}\nWordlist size: ${candidates.length}`,
  technique: "seeded offline cracking"
}];

console.log(JSON.stringify({
  output: cracked
    ? `Recovered ${modeName.toUpperCase()} hash ${hashValue} => ${cracked}`
    : `No password recovered for ${hashValue}.`,
  observations,
  commandPreview: `seed-hashcat-crack hash=${hashValue} type=${modeName || "unknown"}`
}));
NODE
