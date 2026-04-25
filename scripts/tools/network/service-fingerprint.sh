#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v nmap >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Service Fingerprint could not run because nmap is not installed.","statusReason":"Missing required binary: nmap"}'
  exit 127
fi

SEED_PAYLOAD="$payload" node <<'NODE'
const { spawnSync } = require("node:child_process");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const target = String(toolInput.target || payload?.request?.target || "localhost");

function derivePorts() {
  if (typeof toolInput.ports === "string" && toolInput.ports.trim()) {
    return toolInput.ports.trim();
  }
  const directPort = Number(toolInput.port || payload?.request?.port || 0);
  if (Number.isInteger(directPort) && directPort > 0) {
    return String(directPort);
  }
  try {
    const parsedUrl = new URL(String(toolInput.baseUrl || `http://${target}`));
    if (parsedUrl.port) {
      return parsedUrl.port;
    }
    if (parsedUrl.protocol === "https:") {
      return "443";
    }
    if (parsedUrl.protocol === "http:") {
      return "80";
    }
  } catch {}
  return "1-1024,3000,3306,5432,6379,8000,8080,8443,9000";
}

function attr(text, name) {
  const match = text.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : "";
}

function decodeXml(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

const ports = derivePorts();
const args = ["-Pn", "-sV", "--version-all", "--version-intensity", "9", "-p", ports, "-oX", "-", target];
const result = spawnSync("nmap", args, { encoding: "utf8", timeout: 170000 });
const stdout = result.stdout || "";
const stderr = result.stderr || "";

if (result.error) {
  console.log(JSON.stringify({
    output: `Service fingerprint failed: ${result.error.message}`,
    statusReason: result.error.message,
    commandPreview: `nmap ${args.join(" ")}`
  }));
  process.exit(1);
}
if (result.status !== 0) {
  console.log(JSON.stringify({
    output: [stdout, stderr].filter(Boolean).join("\n"),
    statusReason: "nmap service fingerprint failed",
    commandPreview: `nmap ${args.join(" ")}`
  }));
  process.exit(result.status || 1);
}

const observations = [];
const lines = [];
for (const portMatch of stdout.matchAll(/<port protocol="([^"]+)" portid="([^"]+)">([\s\S]*?)<\/port>/g)) {
  const protocol = portMatch[1];
  const port = Number(portMatch[2]);
  const body = portMatch[3];
  if (!/<state state="open"/.test(body)) {
    continue;
  }
  const serviceTag = body.match(/<service\b[^>]*>/)?.[0] || "";
  const serviceName = decodeXml(attr(serviceTag, "name") || "unknown");
  const product = decodeXml(attr(serviceTag, "product"));
  const version = decodeXml(attr(serviceTag, "version"));
  const extra = decodeXml(attr(serviceTag, "extrainfo"));
  const cpes = [...body.matchAll(/<cpe>([^<]+)<\/cpe>/g)].map((match) => decodeXml(match[1]));
  const fingerprint = [serviceName, product, version, extra].filter(Boolean).join(" ");
  const evidence = [
    `${protocol}/${port} open ${fingerprint || serviceName}`,
    cpes.length ? `CPE: ${cpes.join(", ")}` : "CPE: none reported by nmap"
  ].join("\n");
  lines.push(evidence);
  observations.push({
    key: `service-fingerprint:${target}:${port}`,
    title: `Service fingerprint for ${target}:${port}`,
    summary: cpes.length
      ? `Identified ${serviceName} on ${target}:${port} with ${cpes.length} CPE value(s).`
      : `Identified ${serviceName} on ${target}:${port}; nmap did not report a CPE.`,
    severity: "info",
    confidence: cpes.length ? 0.9 : 0.78,
    evidence,
    technique: "nmap deep service version and CPE fingerprinting",
    port
  });
}

const output = lines.length > 0
  ? lines.join("\n\n")
  : `No open services were fingerprinted on ${target} across ports ${ports}.`;
console.log(JSON.stringify({
  output,
  observations,
  commandPreview: `nmap ${args.join(" ")}`
}));
NODE
