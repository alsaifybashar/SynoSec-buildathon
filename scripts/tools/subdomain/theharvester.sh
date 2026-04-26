#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v theHarvester >/dev/null 2>&1; then
  printf '%s\n' '{"output":"TheHarvester could not run because theHarvester is not installed.","statusReason":"Missing required binary: theHarvester"}'
  exit 127
fi

target="$(SEED_PAYLOAD="$payload" node -e 'const parsed=JSON.parse(process.env.SEED_PAYLOAD||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const source=Array.isArray(toolInput.candidateDomains)&&toolInput.candidateDomains[0]||toolInput.domain||toolInput.target||parsed?.request?.target||toolInput.baseUrl||"localhost";try{process.stdout.write(new URL(String(source)).hostname);}catch{process.stdout.write(String(source).replace(/^https?:\\/\\//,"").replace(/\\/.*$/,""));}')"

if ! output="$(theHarvester -d "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"TheHarvester failed","commandPreview":"theHarvester -d %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="TheHarvester completed passive subdomain and OSINT enumeration for $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"theharvester:%s","title":"TheHarvester completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"TheHarvester assessment"}],"commandPreview":"theHarvester -d %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
