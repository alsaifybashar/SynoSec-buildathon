#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
if ! command -v curl >/dev/null 2>&1; then
  printf '%s\n' '{"output":"HTTP Headers could not run because curl is not installed.","statusReason":"Missing required binary: curl"}'
  exit 127
fi
base_url="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl||`http://${parsed?.request?.target||""}`));});')"
if ! output="$(curl -sS -I -L "$base_url" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"curl header fetch failed"}\n' "$escaped_output"
  exit 64
fi
summary="Collected response headers for $base_url."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"headers:%s","title":"HTTP headers collected","summary":%s,"severity":"info","confidence":0.68,"evidence":%s,"technique":"curl header fetch"}],"commandPreview":"curl -sS -I -L %s"}\n' "$escaped_output" "$base_url" "$escaped_summary" "$escaped_evidence" "$base_url"
