#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v hashcat >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Hashcat Crack could not run because hashcat is not installed.","statusReason":"Missing required binary: hashcat"}'
  exit 127
fi

hash_value="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.hash||""));});')"
mode="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const value=Number(toolInput.mode ?? 0);process.stdout.write(String(Number.isInteger(value) ? value : 0));});')"
wordlist="$(mktemp)"
trap 'rm -f "$wordlist"' EXIT
cat >"$wordlist" <<'EOF'
password
admin
letmein
changeme
welcome
123456
qwerty
EOF

set +e
output="$(hashcat -m "$mode" "$hash_value" "$wordlist" --potfile-disable --quiet --force --runtime 10 2>&1)"
exit_code=$?
set -e

if [ "$exit_code" -ne 0 ] && [ "$exit_code" -ne 1 ]; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"hashcat crack failed","commandPreview":"hashcat -m %s <hash> <temp-wordlist> --potfile-disable --quiet --force --runtime 10"}\n' "$escaped_output" "$mode"
  exit 64
fi

summary="Hashcat completed an offline cracking attempt for the supplied hash."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"hashcat:%s","title":"Hashcat run completed","summary":%s,"severity":"info","confidence":0.74,"evidence":%s,"technique":"hashcat offline cracking"}],"commandPreview":"hashcat -m %s <hash> <temp-wordlist> --potfile-disable --quiet --force --runtime 10"}\n' "$escaped_output" "$mode" "$escaped_summary" "$escaped_evidence" "$mode"
