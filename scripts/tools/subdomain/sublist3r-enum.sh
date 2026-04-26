#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v sublist3r >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Sublist3r Enumeration could not run because sublist3r is not installed.","statusReason":"Missing required binary: sublist3r"}'
  exit 127
fi

domain="$(SEED_PAYLOAD="$payload" node -e 'const parsed=JSON.parse(process.env.SEED_PAYLOAD||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const source=Array.isArray(toolInput.candidateDomains)&&toolInput.candidateDomains[0]||toolInput.domain||toolInput.target||parsed?.request?.target||toolInput.baseUrl||"";try{process.stdout.write(new URL(String(source)).hostname);}catch{process.stdout.write(String(source).replace(/^https?:\\/\\//,"").replace(/\\/.*$/,""));}')"
outfile="$(mktemp)"
trap 'rm -f "$outfile"' EXIT

if ! output="$(sublist3r -d "$domain" -o "$outfile" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"sublist3r enumeration failed","commandPreview":"sublist3r -d %s -o <temp-outfile>"}\n' "$escaped_output" "$domain"
  exit 64
fi

results="$(cat "$outfile" 2>/dev/null || true)"
combined_output="$output"
if [ -n "$results" ]; then
  combined_output="$combined_output"$'\n'"$results"
fi
summary="Sublist3r enumerated subdomains for $domain."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$combined_output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$combined_output")"
printf '{"output":%s,"observations":[{"key":"sublist3r:%s","title":"Sublist3r enumeration completed","summary":%s,"severity":"info","confidence":0.76,"evidence":%s,"technique":"sublist3r subdomain enumeration"}],"commandPreview":"sublist3r -d %s -o <temp-outfile>"}\n' "$escaped_output" "$domain" "$escaped_summary" "$escaped_evidence" "$domain"
