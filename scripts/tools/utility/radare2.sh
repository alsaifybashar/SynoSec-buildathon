#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v r2 >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Radare2 could not run because r2 is not installed.","statusReason":"Missing required binary: r2"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(r2 -qc "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Radare2 failed","commandPreview":"r2 -qc %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Radare2 completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"radare2:%s","title":"Radare2 completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Radare2 assessment"}],"commandPreview":"r2 -qc %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
