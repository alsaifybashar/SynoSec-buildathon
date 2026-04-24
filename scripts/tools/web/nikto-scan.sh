#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v nikto >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Nikto Scan could not run because nikto is not installed.","statusReason":"Missing required binary: nikto"}'
  exit 127
fi

base_url="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`));});')"

if ! output="$(nikto -host "$base_url" -ask no 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"nikto scan failed","commandPreview":"nikto -host %s -ask no"}\n' "$escaped_output" "$base_url"
  exit 64
fi

summary="Nikto completed a web server audit against $base_url."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"nikto:%s","title":"Nikto scan completed","summary":%s,"severity":"info","confidence":0.8,"evidence":%s,"technique":"nikto web audit"}],"commandPreview":"nikto -host %s -ask no"}\n' "$escaped_output" "$base_url" "$escaped_summary" "$escaped_evidence" "$base_url"
