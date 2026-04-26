#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v fierce >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Fierce could not run because fierce is not installed.","statusReason":"Missing required binary: fierce"}'
  exit 127
fi

target="$(SEED_PAYLOAD="$payload" node -e 'const parsed=JSON.parse(process.env.SEED_PAYLOAD||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const source=Array.isArray(toolInput.candidateDomains)&&toolInput.candidateDomains[0]||toolInput.domain||toolInput.target||parsed?.request?.target||toolInput.baseUrl||"localhost";try{process.stdout.write(new URL(String(source)).hostname);}catch{process.stdout.write(String(source).replace(/^https?:\\/\\//,"").replace(/\\/.*$/,""));}')"

if ! output="$(fierce --domain "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Fierce failed","commandPreview":"fierce --domain %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Fierce completed DNS reconnaissance for $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"fierce:%s","title":"Fierce completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Fierce assessment"}],"commandPreview":"fierce --domain %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
