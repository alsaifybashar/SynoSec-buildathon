#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
if ! command -v httpx >/dev/null 2>&1; then
  printf '%s\n' '{"output":"HTTP Recon could not run because httpx is not installed.","statusReason":"Missing required binary: httpx"}'
  exit 127
fi
if ! help_output="$(httpx --help 2>&1)"; then
  printf '%s\n' '{"output":"HTTP Recon could not inspect the installed httpx binary.","statusReason":"Failed to invoke httpx --help"}'
  exit 64
fi
if [[ "$help_output" != *"-tech-detect"* && "$help_output" != *"-td"* ]]; then
  printf '%s\n' '{"output":"HTTP Recon found an incompatible httpx binary on this machine.","statusReason":"Installed httpx binary is not the ProjectDiscovery recon tool"}'
  exit 64
fi
base_url="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl||`http://${parsed?.request?.target||""}`));});')"
if ! output="$(httpx -silent -status-code -title -tech-detect -u "$base_url" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"httpx probe failed"}\n' "$escaped_output"
  exit 64
fi
summary="${output%%$'\n'*}"
if [ -z "$summary" ]; then
  printf '{"output":"HTTP Recon produced no output for %s.","statusReason":"httpx probe returned an empty result"}\n' "$base_url"
  exit 64
fi
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"httpx:%s","title":"HTTP surface discovered","summary":%s,"severity":"info","confidence":0.72,"evidence":%s,"technique":"httpx reconnaissance"}],"commandPreview":"httpx -silent -status-code -title -tech-detect -u %s"}\n' "$escaped_output" "$base_url" "$escaped_summary" "$escaped_evidence" "$base_url"
