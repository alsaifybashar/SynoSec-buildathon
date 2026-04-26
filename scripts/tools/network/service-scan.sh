#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
SEED_PAYLOAD="$payload" node <<'NODE'
const net = require("node:net");

const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = payload?.request?.parameters?.toolInput ?? {};
const target = String(toolInput.target || payload?.request?.target || "localhost");
const baseUrl = typeof toolInput.baseUrl === "string" ? toolInput.baseUrl : `http://${target}`;
let parsedUrl = null;
try {
  parsedUrl = new URL(baseUrl);
} catch {}
const requestedPort = Number(toolInput.port || parsedUrl?.port || 0);
const portSource = Array.isArray(toolInput.candidatePorts) && toolInput.candidatePorts.length > 0
  ? toolInput.candidatePorts
  : requestedPort > 0
  ? [requestedPort]
  : parsedUrl?.protocol === "https:"
    ? [443]
    : parsedUrl?.protocol === "http:"
      ? [80]
      : [];
const maxPorts = Number.isFinite(Number(toolInput.maxPorts)) ? Math.max(1, Number(toolInput.maxPorts)) : 16;
const candidatePorts = [...new Set(portSource
  .map((value) => Number(value))
  .filter((value) => Number.isInteger(value) && value > 0 && value <= 65535))].slice(0, maxPorts);
if (candidatePorts.length === 0) {
  console.log(JSON.stringify({
    output: `Service scan requires an explicit port or a URL with an http/https scheme. Received target=${target} baseUrl=${baseUrl}`,
    statusReason: "No explicit scan port could be derived"
  }));
  process.exit(64);
}

function probePort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let banner = "";
    let connected = false;
    const done = (result) => {
      if (!socket.destroyed) {
        socket.destroy();
      }
      resolve(result);
    };
    socket.setTimeout(900);
    socket.once("connect", () => {
      connected = true;
      socket.write(`HEAD / HTTP/1.0\r\nHost: ${host}\r\n\r\n`);
      setTimeout(() => done({ port, open: true, banner: banner.trim() || null }), 150);
    });
    socket.on("data", (chunk) => {
      if (banner.length < 512) {
        banner += chunk.toString();
      }
    });
    socket.once("timeout", () => done({ port, open: connected, banner: banner.trim() || null }));
    socket.once("error", (error) => done({ port, open: false, banner: null, error: error.message }));
    socket.once("close", () => {
      if (!connected) {
        return;
      }
      done({ port, open: true, banner: banner.trim() || null });
    });
    socket.connect(port, host);
  });
}

(async () => {
  const results = [];
  for (const port of candidatePorts) {
    results.push(await probePort(target, port));
  }
  const openPorts = results.filter((item) => item.open);
  const observations = openPorts.map((item) => ({
    key: `tcp:${target}:${item.port}`,
    title: `Open TCP port ${item.port}`,
    summary: `Confirmed TCP connectivity to ${target}:${item.port}.`,
    severity: "info",
    confidence: 0.84,
    evidence: item.banner
      ? `Request target: ${target}:${item.port}\nProtocol: TCP\nStatus: open\nProof: banner returned\n${item.banner}`
      : `Request target: ${target}:${item.port}\nProtocol: TCP\nStatus: open\nProof: TCP connection succeeded.`,
    technique: "lightweight TCP service probe",
    port: item.port
  }));
  const outputLines = results.map((item) => item.open
    ? `${target}:${item.port} open${item.banner ? ` banner=${JSON.stringify(item.banner.slice(0, 120))}` : ""}`
    : `${target}:${item.port} closed${item.error ? ` error=${item.error}` : ""}`);
  console.log(JSON.stringify({
    output: outputLines.join("\n"),
    observations,
    commandPreview: `seed-service-scan target=${target} ports=${candidatePorts.join(",")}`
  }));
})().catch((error) => {
  console.log(JSON.stringify({
    output: `Service scan failed: ${error.message}`,
    statusReason: error.message
  }));
  process.exit(1);
});
NODE
