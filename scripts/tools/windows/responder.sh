#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v responder >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Responder could not run because responder is not installed.","statusReason":"Missing required binary: responder"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(responder -I eth0 "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Responder failed","commandPreview":"responder -I eth0 %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Responder completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"responder:%s","title":"Responder completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Responder assessment"}],"commandPreview":"responder -I eth0 %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
