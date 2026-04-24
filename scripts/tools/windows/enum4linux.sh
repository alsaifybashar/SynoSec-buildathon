#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v enum4linux >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Enum4linux could not run because enum4linux is not installed.","statusReason":"Missing required binary: enum4linux"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.target||parsed?.request?.target||"localhost"));});')"

if ! output="$(enum4linux -a "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"enum4linux scan failed","commandPreview":"enum4linux -a %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Enum4linux completed SMB/Windows enumeration against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"enum4linux:%s","title":"Enum4linux enumeration completed","summary":%s,"severity":"info","confidence":0.82,"evidence":%s,"technique":"enum4linux smb enumeration"}],"commandPreview":"enum4linux -a %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
