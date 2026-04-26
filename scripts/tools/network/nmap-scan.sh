#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v nmap >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Nmap Scan could not run because nmap is not installed.","statusReason":"Missing required binary: nmap"}'
  exit 127
fi

plan="$(SEED_PAYLOAD="$payload" node <<'NODE'
const parsed = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = parsed?.request?.parameters?.toolInput ?? {};
let target = String(toolInput.target || parsed?.request?.target || "localhost");
try {
  const parsedUrl = new URL(String(toolInput.baseUrl || toolInput.url || ""));
  target = parsedUrl.hostname || target;
} catch {}
try {
  if (/^https?:\/\//.test(target)) {
    target = new URL(target).hostname;
  }
} catch {}
const maxPorts = Number.isFinite(Number(toolInput.maxPorts)) ? Math.max(1, Number(toolInput.maxPorts)) : 32;
const directPort = Number(toolInput.port || parsed?.request?.port || 0);
const serviceDetection = toolInput.serviceDetection === true || toolInput.versionDetection === true;
let ports = [];
if (Array.isArray(toolInput.candidatePorts) && toolInput.candidatePorts.length > 0) {
  ports = toolInput.candidatePorts;
} else if (Number.isInteger(directPort) && directPort > 0) {
  ports = [directPort];
} else {
  try {
    const parsedUrl = new URL(String(toolInput.baseUrl || `http://${target}`));
    if (parsedUrl.port) ports = [Number(parsedUrl.port)];
    else if (parsedUrl.protocol === "https:") ports = [443];
    else if (parsedUrl.protocol === "http:") ports = [80];
  } catch {}
}
ports = [...new Set(ports.map(Number).filter((port) => Number.isInteger(port) && port > 0 && port <= 65535))].slice(0, maxPorts);
process.stdout.write(JSON.stringify({ target, ports, serviceDetection }));
NODE
)"
target="$(node -p 'JSON.parse(process.argv[1]).target' "$plan")"
ports="$(node -p 'JSON.parse(process.argv[1]).ports.join(",")' "$plan")"
service_detection="$(node -p 'JSON.parse(process.argv[1]).serviceDetection ? "true" : "false"' "$plan")"

args=(-Pn)
if [ -n "$ports" ]; then
  if [ "$service_detection" = "true" ]; then
    args+=(-sV)
  fi
  args+=(-p "$ports")
else
  args+=(-F)
fi
args+=("$target")

if ! output="$(nmap "${args[@]}" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"nmap scan failed","commandPreview":"nmap %s"}\n' "$escaped_output" "${args[*]}"
  exit 64
fi

summary="Nmap completed a network scan against $target${ports:+ ports=$ports}."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"nmap:%s","title":"Nmap scan completed","summary":%s,"severity":"info","confidence":0.86,"evidence":%s,"technique":"nmap service scan"%s}],"commandPreview":"nmap %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "${ports:+,\"ports\":\"$ports\"}" "${args[*]}"
