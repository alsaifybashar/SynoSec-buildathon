#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v nikto >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Nikto Scan could not run because nikto is not installed.","statusReason":"Missing required binary: nikto"}'
  exit 127
fi

base_url="$(SEED_PAYLOAD="$payload" node -e 'const parsed=JSON.parse(process.env.SEED_PAYLOAD||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const base=String(toolInput.baseUrl||toolInput.url||toolInput.startUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`);const vt=Array.isArray(toolInput.validationTargets)&&toolInput.validationTargets[0];const candidate=vt?(vt.url||vt.endpoint||vt.path):Array.isArray(toolInput.candidateEndpoints)&&toolInput.candidateEndpoints[0];process.stdout.write(new URL(String(candidate||base),base).toString());')"

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
