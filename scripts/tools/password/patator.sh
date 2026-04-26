#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v patator >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Patator could not run because patator is not installed.","statusReason":"Missing required binary: patator"}'
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
const moduleName = String(toolInput.module || toolInput.service || toolInput.protocol || "");
const port = Number(toolInput.port || (Array.isArray(toolInput.candidatePorts) ? toolInput.candidatePorts[0] : 0) || 0);
process.stdout.write(JSON.stringify({ target, username, password, moduleName, port }));
NODE
)"
target="$(node -p 'JSON.parse(process.argv[1]).target' "$plan")"
username="$(node -p 'JSON.parse(process.argv[1]).username' "$plan")"
password="$(node -p 'JSON.parse(process.argv[1]).password' "$plan")"
module_name="$(node -p 'JSON.parse(process.argv[1]).moduleName' "$plan")"
port="$(node -p 'JSON.parse(process.argv[1]).port || ""' "$plan")"
if [ -z "$module_name" ] || [ -z "$username" ] || [ -z "$password" ]; then
  printf '{"output":"Patator requires explicit module/service plus bounded username/password candidates.","statusReason":"Missing required credential steering for Patator"}\n'
  exit 64
fi

args=("$module_name" "host=$target" "user=$username" "password=$password")
if [ -n "$port" ]; then
  args+=("port=$port")
fi
if ! output="$(patator "${args[@]}" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Patator failed","commandPreview":"patator %s host=%s <bounded-credentials>"}\n' "$escaped_output" "$module_name" "$target"
  exit 64
fi

summary="Patator completed bounded credential validation against $target module=$module_name."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"patator:%s:%s","title":"Patator credential validation completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"bounded Patator credential validation"%s}],"commandPreview":"patator %s host=%s <bounded-credentials>"}\n' "$escaped_output" "$target" "$module_name" "$escaped_summary" "$escaped_evidence" "${port:+,\"port\":$port}" "$module_name" "$target"
