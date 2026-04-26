#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v rustscan >/dev/null 2>&1; then
  printf '%s\n' '{"output":"RustScan could not run because rustscan is not installed.","statusReason":"Missing required binary: rustscan"}'
  exit 127
fi

plan="$(SEED_PAYLOAD="$payload" node <<'NODE'
const parsed = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = parsed?.request?.parameters?.toolInput ?? {};
let target = String(toolInput.target || parsed?.request?.target || "localhost");
try {
  const parsedUrl = new URL(String(toolInput.baseUrl || toolInput.url || ""));
  target = String(toolInput.target || parsedUrl.hostname || target);
} catch {}
const directPort = Number(toolInput.port || 0);
let ports = Array.isArray(toolInput.candidatePorts) && toolInput.candidatePorts.length > 0 ? toolInput.candidatePorts : [];
if (ports.length === 0 && Number.isInteger(directPort) && directPort > 0) ports = [directPort];
const maxPorts = Number.isFinite(Number(toolInput.maxPorts)) ? Math.max(1, Number(toolInput.maxPorts)) : 64;
ports = [...new Set(ports.map(Number).filter((port) => Number.isInteger(port) && port > 0 && port <= 65535))].slice(0, maxPorts);
process.stdout.write(JSON.stringify({ target, ports: ports.join(",") }));
NODE
)"
target="$(node -p 'JSON.parse(process.argv[1]).target' "$plan")"
ports="$(node -p 'JSON.parse(process.argv[1]).ports' "$plan")"

args=(-a "$target")
if [ -n "$ports" ]; then
  args+=(-p "$ports")
fi

if ! output="$(rustscan "${args[@]}" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"RustScan failed","commandPreview":"rustscan %s"}\n' "$escaped_output" "${args[*]}"
  exit 64
fi

summary="RustScan completed assessment against $target${ports:+ ports=$ports}."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"rustscan:%s","title":"RustScan completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"RustScan assessment"%s}],"commandPreview":"rustscan %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "${ports:+,\"ports\":\"$ports\"}" "${args[*]}"
