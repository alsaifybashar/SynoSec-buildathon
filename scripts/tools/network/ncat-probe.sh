#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v ncat >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Ncat Probe could not run because ncat is not installed.","statusReason":"Missing required binary: ncat"}'
  exit 127
fi

plan="$(SEED_PAYLOAD="$payload" node <<'NODE'
const parsed = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = parsed?.request?.parameters?.toolInput ?? {};
let target = String(toolInput.target || parsed?.request?.target || "localhost");
const baseUrl = String(toolInput.baseUrl || `http://${target}`);
try {
  const parsedUrl = new URL(baseUrl);
  target = String(toolInput.target || parsedUrl.hostname || target);
} catch {}
const directPort = Number(toolInput.port || 0);
let ports = Array.isArray(toolInput.candidatePorts) && toolInput.candidatePorts.length > 0 ? toolInput.candidatePorts : [];
if (ports.length === 0 && Number.isInteger(directPort) && directPort > 0) ports = [directPort];
if (ports.length === 0) {
  try {
    const parsedUrl = new URL(baseUrl);
    if (parsedUrl.port) ports = [Number(parsedUrl.port)];
    else if (parsedUrl.protocol === "https:") ports = [443];
    else if (parsedUrl.protocol === "http:") ports = [80];
  } catch {}
}
const maxPorts = Number.isFinite(Number(toolInput.maxPorts)) ? Math.max(1, Number(toolInput.maxPorts)) : 8;
ports = [...new Set(ports.map(Number).filter((port) => Number.isInteger(port) && port > 0 && port <= 65535))].slice(0, maxPorts);
process.stdout.write(JSON.stringify({ target, baseUrl, ports }));
NODE
)"
target="$(node -p 'JSON.parse(process.argv[1]).target' "$plan")"
base_url="$(node -p 'JSON.parse(process.argv[1]).baseUrl' "$plan")"
ports="$(node -p 'JSON.parse(process.argv[1]).ports.join(" ")' "$plan")"

if [ -z "$ports" ]; then
  printf '{"output":"Ncat Probe requires an explicit port or a URL with an http/https scheme. Received target=%s baseUrl=%s","statusReason":"No explicit probe port could be derived"}\n' "$target" "$base_url"
  exit 64
fi

output=""
observations_json="[]"
for port in $ports; do
probe_payload="$(printf 'HEAD / HTTP/1.0\r\nHost: %s\r\n\r\n' "$target")"
if ! probe_output="$(printf '%s' "$probe_payload" | ncat "$target" "$port" -w 2 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"ncat connection failed","commandPreview":"ncat %s %s -w 2"}\n' "$escaped_output" "$target" "$port"
  exit 64
fi
evidence="$probe_output"
if [ -z "$evidence" ]; then
  evidence="TCP connection to $target:$port succeeded but the service returned no banner."
fi
output="${output}${output:+$'\n'}${target}:${port} ${evidence}"
observations_json="$(OBS="$observations_json" node -p 'const obs=JSON.parse(process.env.OBS); obs.push({key:`ncat:${process.argv[1]}:${process.argv[2]}`,title:"Ncat TCP probe succeeded",summary:`Established TCP connectivity to ${process.argv[1]}:${process.argv[2]} using ncat.`,severity:"info",confidence:0.82,evidence:`Request target: ${process.argv[1]}:${process.argv[2]}\nProtocol: TCP\nProof: ${process.argv[3]}`,technique:"ncat TCP banner probe",port:Number(process.argv[2])}); JSON.stringify(obs)' "$target" "$port" "$evidence")"
done

escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":%s,"commandPreview":"ncat %s <ports:%s> -w 2"}\n' "$escaped_output" "$observations_json" "$target" "$ports"
