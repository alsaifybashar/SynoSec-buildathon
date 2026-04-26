#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v subfinder >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Subfinder could not run because subfinder is not installed.","statusReason":"Missing required binary: subfinder"}'
  exit 127
fi

target="$(SEED_PAYLOAD="$payload" node -e 'const parsed=JSON.parse(process.env.SEED_PAYLOAD||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const source=Array.isArray(toolInput.candidateDomains)&&toolInput.candidateDomains[0]||toolInput.domain||toolInput.target||parsed?.request?.target||toolInput.baseUrl||"localhost";const normalize=(value)=>{const raw=String(value??"").trim();if(!raw){return"";}try{return new URL(raw.includes("://")?raw:`http://${raw}`).hostname;}catch{const withoutScheme=raw.startsWith("http://")?raw.slice(7):raw.startsWith("https://")?raw.slice(8):raw;return withoutScheme.split("/")[0]||"";}};process.stdout.write(normalize(source)||"localhost");')"

if ! output="$(subfinder -d "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Subfinder failed","commandPreview":"subfinder -d %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Subfinder completed passive subdomain enumeration for $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"subfinder:%s","title":"Subfinder completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Subfinder assessment"}],"commandPreview":"subfinder -d %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
