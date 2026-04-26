#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v medusa >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Medusa could not run because medusa is not installed.","statusReason":"Missing required binary: medusa"}'
  exit 127
fi

plan="$(SEED_PAYLOAD="$payload" node <<'NODE'
const parsed = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = parsed?.request?.parameters?.toolInput ?? {};
let target = String(toolInput.target || parsed?.request?.target || "localhost");
try {
  const parsedUrl = new URL(String(toolInput.baseUrl || toolInput.url || ""));
  target = String(toolInput.target || parsedUrl.hostname || target);
} catch {}
const firstCredential = Array.isArray(toolInput.credentialCandidates) ? toolInput.credentialCandidates.find(Boolean) : null;
const username = String(toolInput.username || firstCredential?.username || (Array.isArray(toolInput.candidateUsernames) ? toolInput.candidateUsernames[0] : "") || "");
const password = String(toolInput.password || firstCredential?.password || (Array.isArray(toolInput.candidatePasswords) ? toolInput.candidatePasswords[0] : "") || "");
const service = String(toolInput.service || toolInput.protocol || "");
const port = Number(toolInput.port || (Array.isArray(toolInput.candidatePorts) ? toolInput.candidatePorts[0] : 0) || 0);
process.stdout.write(JSON.stringify({ target, username, password, service, port }));
NODE
)"
target="$(node -p 'JSON.parse(process.argv[1]).target' "$plan")"
username="$(node -p 'JSON.parse(process.argv[1]).username' "$plan")"
password="$(node -p 'JSON.parse(process.argv[1]).password' "$plan")"
service="$(node -p 'JSON.parse(process.argv[1]).service' "$plan")"
port="$(node -p 'JSON.parse(process.argv[1]).port || ""' "$plan")"
if [ -z "$service" ] || [ -z "$username" ] || [ -z "$password" ]; then
  printf '{"output":"Medusa requires explicit service plus bounded username/password candidates.","statusReason":"Missing required credential steering for Medusa"}\n'
  exit 64
fi

args=(-h "$target" -u "$username" -p "$password" -M "$service")
if [ -n "$port" ]; then
  args=(-h "$target" -u "$username" -p "$password" -M "$service" -n "$port")
fi
if ! output="$(medusa "${args[@]}" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Medusa failed","commandPreview":"medusa -h %s -M %s <bounded-credentials>"}\n' "$escaped_output" "$target" "$service"
  exit 64
fi

summary="Medusa completed bounded credential validation against $target service=$service."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"medusa:%s:%s","title":"Medusa credential validation completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"bounded Medusa credential validation"%s}],"commandPreview":"medusa -h %s -M %s <bounded-credentials>"}\n' "$escaped_output" "$target" "$service" "$escaped_summary" "$escaped_evidence" "${port:+,\"port\":$port}" "$target" "$service"
