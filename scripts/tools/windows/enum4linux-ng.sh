#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v enum4linux-ng >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Enum4linux-ng could not run because enum4linux-ng is not installed.","statusReason":"Missing required binary: enum4linux-ng"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(enum4linux-ng  "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Enum4linux-ng failed","commandPreview":"enum4linux-ng  %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Enum4linux-ng completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"enum4linux-ng:%s","title":"Enum4linux-ng completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Enum4linux-ng assessment"}],"commandPreview":"enum4linux-ng  %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
