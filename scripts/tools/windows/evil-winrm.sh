#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v evil-winrm >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Evil-WinRM could not run because evil-winrm is not installed.","statusReason":"Missing required binary: evil-winrm"}'
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
const port = Number(toolInput.port || (Array.isArray(toolInput.candidatePorts) ? toolInput.candidatePorts[0] : 0) || 0);
process.stdout.write(JSON.stringify({ target, username, password, port }));
NODE
)"
target="$(node -p 'JSON.parse(process.argv[1]).target' "$plan")"
username="$(node -p 'JSON.parse(process.argv[1]).username' "$plan")"
password="$(node -p 'JSON.parse(process.argv[1]).password' "$plan")"
port="$(node -p 'JSON.parse(process.argv[1]).port || ""' "$plan")"
if [ -z "$username" ] || [ -z "$password" ]; then
  printf '{"output":"Evil-WinRM requires explicit username and password for remote access validation.","statusReason":"Missing required credential steering for Evil-WinRM"}\n'
  exit 64
fi

args=(-i "$target" -u "$username" -p "$password")
if [ -n "$port" ]; then
  args+=(-P "$port")
fi
if ! output="$(evil-winrm "${args[@]}" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Evil-WinRM failed","commandPreview":"evil-winrm -i %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Evil-WinRM completed remote access validation against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"evil-winrm:%s","title":"Evil-WinRM completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Evil-WinRM assessment"}],"commandPreview":"evil-winrm -i %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
