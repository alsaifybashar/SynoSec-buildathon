#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v feroxbuster >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Feroxbuster could not run because feroxbuster is not installed.","statusReason":"Missing required binary: feroxbuster"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(feroxbuster -u "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Feroxbuster failed","commandPreview":"feroxbuster -u %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Feroxbuster completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"feroxbuster:%s","title":"Feroxbuster completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Feroxbuster assessment"}],"commandPreview":"feroxbuster -u %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
