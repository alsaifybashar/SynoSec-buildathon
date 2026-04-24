#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v hash-identifier >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Hash-Identifier could not run because hash-identifier is not installed.","statusReason":"Missing required binary: hash-identifier"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(hash-identifier  "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Hash-Identifier failed","commandPreview":"hash-identifier  %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Hash-Identifier completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"hash-identifier:%s","title":"Hash-Identifier completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Hash-Identifier assessment"}],"commandPreview":"hash-identifier  %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
