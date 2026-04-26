#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v nxc >/dev/null 2>&1; then
  printf '%s\n' '{"output":"NetExec could not run because nxc is not installed.","statusReason":"Missing required binary: nxc"}'
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
const username = String(toolInput.username || firstCredential?.username || "");
const password = String(toolInput.password || firstCredential?.password || "");
const protocol = String(toolInput.protocol || toolInput.service || "smb");
process.stdout.write(JSON.stringify({ target, username, password, protocol }));
NODE
)"
target="$(node -p 'JSON.parse(process.argv[1]).target' "$plan")"
username="$(node -p 'JSON.parse(process.argv[1]).username' "$plan")"
password="$(node -p 'JSON.parse(process.argv[1]).password' "$plan")"
protocol="$(node -p 'JSON.parse(process.argv[1]).protocol' "$plan")"

args=("$protocol" "$target")
if [ -n "$username" ] || [ -n "$password" ]; then
  if [ -z "$username" ] || [ -z "$password" ]; then
    printf '{"output":"NetExec credentialed mode requires both username and password.","statusReason":"Incomplete credential steering for NetExec"}\n'
    exit 64
  fi
  args+=(-u "$username" -p "$password")
fi
if ! output="$(nxc "${args[@]}" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"NetExec failed","commandPreview":"nxc %s %s"}\n' "$escaped_output" "$protocol" "$target"
  exit 64
fi

summary="NetExec completed $protocol assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"netexec:%s:%s","title":"NetExec completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"NetExec assessment"}],"commandPreview":"nxc %s %s"}\n' "$escaped_output" "$protocol" "$target" "$escaped_summary" "$escaped_evidence" "$protocol" "$target"
