#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v nmap >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Nmap Scan could not run because nmap is not installed.","statusReason":"Missing required binary: nmap"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.target||parsed?.request?.target||"localhost"));});')"
port="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const directPort=Number(toolInput.port||0);if (Number.isInteger(directPort) && directPort>0) { process.stdout.write(String(directPort)); return; } try { const parsedUrl=new URL(String(toolInput.baseUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`)); if (parsedUrl.port) { process.stdout.write(parsedUrl.port); return; } if (parsedUrl.protocol === "https:") { process.stdout.write("443"); return; } if (parsedUrl.protocol === "http:") { process.stdout.write("80"); return; } } catch {} process.stdout.write("");});')"

args=(-Pn)
if [ -n "$port" ]; then
  args+=(-sV -p "$port")
else
  args+=(-F)
fi
args+=("$target")

if ! output="$(nmap "${args[@]}" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"nmap scan failed","commandPreview":"nmap %s"}\n' "$escaped_output" "${args[*]}"
  exit 64
fi

summary="Nmap completed a network/service scan against $target${port:+:$port}."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"nmap:%s","title":"Nmap scan completed","summary":%s,"severity":"info","confidence":0.86,"evidence":%s,"technique":"nmap service scan"%s}],"commandPreview":"nmap %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "${port:+,\"port\":$port}" "${args[*]}"
