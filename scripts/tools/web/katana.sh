#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v katana >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Katana could not run because katana is not installed.","statusReason":"Missing required binary: katana"}'
  exit 127
fi

target="$(SEED_PAYLOAD="$payload" node -e 'const parsed=JSON.parse(process.env.SEED_PAYLOAD||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const base=String(toolInput.baseUrl||toolInput.url||toolInput.startUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`);const candidate=Array.isArray(toolInput.candidateEndpoints)&&toolInput.candidateEndpoints[0];process.stdout.write(new URL(String(candidate||base),base).toString());')"

if ! output="$(katana -u "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Katana failed","commandPreview":"katana -u %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Katana completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"katana:%s","title":"Katana completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Katana assessment"}],"commandPreview":"katana -u %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
