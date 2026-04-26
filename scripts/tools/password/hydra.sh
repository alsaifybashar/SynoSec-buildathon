#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v hydra >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Hydra could not run because hydra is not installed.","statusReason":"Missing required binary: hydra"}'
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
const maxAttempts = Number.isFinite(Number(toolInput.maxAttempts)) ? Math.max(1, Number(toolInput.maxAttempts)) : 1;
process.stdout.write(JSON.stringify({ target, username, password, service, port, maxAttempts }));
NODE
)"
target="$(node -p 'JSON.parse(process.argv[1]).target' "$plan")"
username="$(node -p 'JSON.parse(process.argv[1]).username' "$plan")"
password="$(node -p 'JSON.parse(process.argv[1]).password' "$plan")"
service="$(node -p 'JSON.parse(process.argv[1]).service' "$plan")"
port="$(node -p 'JSON.parse(process.argv[1]).port || ""' "$plan")"
if [ -z "$service" ] || [ -z "$username" ] || [ -z "$password" ]; then
  printf '{"output":"Hydra requires explicit service plus bounded username/password candidates.","statusReason":"Missing required credential steering for Hydra"}\n'
  exit 64
fi

args=(-l "$username" -p "$password" -t 1 -f "$target" "$service")
if [ -n "$port" ]; then
  args=(-l "$username" -p "$password" -s "$port" -t 1 -f "$target" "$service")
fi
if ! output="$(hydra "${args[@]}" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Hydra failed","commandPreview":"hydra <bounded-credentials> %s %s"}\n' "$escaped_output" "$target" "$service"
  exit 64
fi

summary="Hydra completed bounded credential validation against $target service=$service."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"hydra:%s:%s","title":"Hydra credential validation completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"bounded Hydra credential validation"%s}],"commandPreview":"hydra <bounded-credentials> %s %s"}\n' "$escaped_output" "$target" "$service" "$escaped_summary" "$escaped_evidence" "${port:+,\"port\":$port}" "$target" "$service"
