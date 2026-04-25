#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v nmap >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Network Segment Map could not run because nmap is not installed.","statusReason":"Missing required binary: nmap"}'
  exit 127
fi

SEED_PAYLOAD="$payload" node <<'NODE'
const { spawnSync } = require("node:child_process");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const target = String(toolInput.target || payload?.request?.target || "localhost");
const cidr = typeof toolInput.cidr === "string" && toolInput.cidr.trim()
  ? toolInput.cidr.trim()
  : target.includes("/") ? target : `${target}/32`;
const ports = typeof toolInput.ports === "string" && toolInput.ports.trim()
  ? toolInput.ports.trim()
  : "21,22,23,25,53,80,443,3000,3306,5432,6379,8080,8443";

function runNmap(args) {
  const result = spawnSync("nmap", args, { encoding: "utf8", timeout: 85000 });
  if (result.error) {
    throw result.error;
  }
  return result;
}

let discovery;
try {
  discovery = runNmap(["-sn", cidr]);
} catch (error) {
  console.log(JSON.stringify({
    output: `Network segment discovery failed: ${error.message}`,
    statusReason: error.message,
    commandPreview: `nmap -sn ${cidr}`
  }));
  process.exit(1);
}
if (discovery.status !== 0) {
  console.log(JSON.stringify({
    output: [discovery.stdout, discovery.stderr].filter(Boolean).join("\n"),
    statusReason: "nmap host discovery failed",
    commandPreview: `nmap -sn ${cidr}`
  }));
  process.exit(discovery.status || 1);
}

const hosts = [...discovery.stdout.matchAll(/Nmap scan report for (?:.+ \()?([0-9a-fA-F:.]+)\)?/g)]
  .map((match) => match[1])
  .filter((value, index, values) => values.indexOf(value) === index);

const observations = [{
  key: `topology:segment:${cidr}`,
  title: `Network segment map for ${cidr}`,
  summary: `Discovered ${hosts.length} live host(s) in ${cidr}.`,
  severity: "info",
  confidence: 0.86,
  evidence: hosts.length > 0 ? hosts.map((host) => `live host: ${host}`).join("\n") : `No live hosts reported by nmap -sn ${cidr}.`,
  technique: "nmap L3 host discovery"
}];

const outputLines = [`Segment: ${cidr}`, `Live hosts: ${hosts.length}`];
if (hosts.length > 0) {
  outputLines.push(...hosts.map((host) => `- ${host}`));
}

for (const host of hosts.slice(0, 32)) {
  const args = ["-Pn", "-sV", "--open", "-p", ports, host];
  const probe = runNmap(args);
  if (probe.status !== 0) {
    outputLines.push(`Gateway/service probe failed for ${host}: ${probe.stderr || probe.stdout}`);
    continue;
  }
  const openLines = probe.stdout.split(/\r?\n/).filter((line) => /^\d+\/tcp\s+open\s+/.test(line));
  if (openLines.length === 0) {
    continue;
  }
  outputLines.push(`\nHost ${host} open gateway/service ports:`, ...openLines);
  observations.push({
    key: `topology:host:${host}`,
    title: `Reachable host ${host}`,
    summary: `Host ${host} exposes ${openLines.length} common port(s) from this scan position.`,
    severity: "info",
    confidence: 0.82,
    evidence: openLines.join("\n"),
    technique: "nmap common-port trust-boundary probe"
  });
}

console.log(JSON.stringify({
  output: outputLines.join("\n"),
  observations,
  commandPreview: `nmap -sn ${cidr}; nmap -Pn -sV --open -p ${ports} <live-host>`
}));
NODE
