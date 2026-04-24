#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v httpx >/dev/null 2>&1; then
  printf '%s\n' '{"output":"HTTPx could not run because httpx is not installed.","statusReason":"Missing required binary: httpx"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(httpx -u "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"HTTPx failed","commandPreview":"httpx -u %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="HTTPx completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"httpx:%s","title":"HTTPx completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"HTTPx assessment"}],"commandPreview":"httpx -u %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
