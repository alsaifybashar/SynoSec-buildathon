#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v autorecon >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Autorecon could not run because autorecon is not installed.","statusReason":"Missing required binary: autorecon"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(autorecon  "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Autorecon failed","commandPreview":"autorecon  %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Autorecon completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"autorecon:%s","title":"Autorecon completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Autorecon assessment"}],"commandPreview":"autorecon  %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
