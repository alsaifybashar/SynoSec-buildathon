#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v amass >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Amass Enumeration could not run because amass is not installed.","statusReason":"Missing required binary: amass"}'
  exit 127
fi

domain="$(SEED_PAYLOAD="$payload" node -e 'const parsed=JSON.parse(process.env.SEED_PAYLOAD||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const source=Array.isArray(toolInput.candidateDomains)&&toolInput.candidateDomains[0]||toolInput.domain||toolInput.target||parsed?.request?.target||toolInput.baseUrl||"";try{process.stdout.write(new URL(String(source)).hostname);}catch{process.stdout.write(String(source).replace(/^https?:\\/\\//,"").replace(/\\/.*$/,""));}')"

if ! output="$(amass enum -passive -d "$domain" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"amass enumeration failed","commandPreview":"amass enum -passive -d %s"}\n' "$escaped_output" "$domain"
  exit 64
fi

summary="Amass enumerated subdomains for $domain."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"amass:%s","title":"Amass enumeration completed","summary":%s,"severity":"info","confidence":0.78,"evidence":%s,"technique":"amass passive enumeration"}],"commandPreview":"amass enum -passive -d %s"}\n' "$escaped_output" "$domain" "$escaped_summary" "$escaped_evidence" "$domain"
