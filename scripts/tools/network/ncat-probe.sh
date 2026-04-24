#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v ncat >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Ncat Probe could not run because ncat is not installed.","statusReason":"Missing required binary: ncat"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.target||parsed?.request?.target||"localhost"));});')"
base_url="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`));});')"
port="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const directPort=Number(toolInput.port||0);if (Number.isInteger(directPort) && directPort>0) { process.stdout.write(String(directPort)); return; } try { const parsedUrl=new URL(String(toolInput.baseUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`)); if (parsedUrl.port) { process.stdout.write(parsedUrl.port); return; } if (parsedUrl.protocol === "https:") { process.stdout.write("443"); return; } if (parsedUrl.protocol === "http:") { process.stdout.write("80"); return; } } catch {} process.stdout.write("");});')"

if [ -z "$port" ]; then
  printf '{"output":"Ncat Probe requires an explicit port or a URL with an http/https scheme. Received target=%s baseUrl=%s","statusReason":"No explicit probe port could be derived"}\n' "$target" "$base_url"
  exit 64
fi

probe_payload="$(printf 'HEAD / HTTP/1.0\r\nHost: %s\r\n\r\n' "$target")"
if ! output="$(printf '%s' "$probe_payload" | ncat "$target" "$port" -w 2 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"ncat connection failed","commandPreview":"ncat %s %s -w 2"}\n' "$escaped_output" "$target" "$port"
  exit 64
fi

summary="Established TCP connectivity to $target:$port using ncat."
evidence="$output"
if [ -z "$evidence" ]; then
  evidence="TCP connection to $target:$port succeeded but the service returned no banner."
fi

escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$evidence")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$evidence")"
printf '{"output":%s,"observations":[{"key":"ncat:%s:%s","title":"Ncat TCP probe succeeded","summary":%s,"severity":"info","confidence":0.82,"evidence":%s,"technique":"ncat TCP banner probe","port":%s}],"commandPreview":"ncat %s %s -w 2"}\n' "$escaped_output" "$target" "$port" "$escaped_summary" "$escaped_evidence" "$port" "$target" "$port"
