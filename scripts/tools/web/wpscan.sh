#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v wpscan >/dev/null 2>&1; then
  printf '%s\n' '{"output":"WPScan could not run because wpscan is not installed.","statusReason":"Missing required binary: wpscan"}'
  exit 127
fi

target="$(SEED_PAYLOAD="$payload" node -e 'const parsed=JSON.parse(process.env.SEED_PAYLOAD||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const base=String(toolInput.baseUrl||toolInput.url||toolInput.startUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`);const candidate=Array.isArray(toolInput.candidateEndpoints)&&toolInput.candidateEndpoints[0];process.stdout.write(new URL(String(candidate||base),base).toString());')"

if ! output="$(wpscan --url "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"WPScan failed","commandPreview":"wpscan --url %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="WPScan completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"wpscan:%s","title":"WPScan completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"WPScan assessment"}],"commandPreview":"wpscan --url %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
