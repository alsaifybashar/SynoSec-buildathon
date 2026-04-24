#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v gobuster >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Gobuster Scan could not run because gobuster is not installed.","statusReason":"Missing required binary: gobuster"}'
  exit 127
fi

base_url="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`));});')"
wordlist="$(mktemp)"
trap 'rm -f "$wordlist"' EXIT
cat >"$wordlist" <<'EOF'
admin
login
api
files
robots.txt
sitemap.xml
.git
.env
EOF

if ! output="$(gobuster dir -q -u "$base_url" -w "$wordlist" -k 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"gobuster scan failed","commandPreview":"gobuster dir -q -u %s -w <temp-wordlist> -k"}\n' "$escaped_output" "$base_url"
  exit 64
fi

summary="Gobuster completed directory enumeration against $base_url."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"gobuster:%s","title":"Gobuster scan completed","summary":%s,"severity":"info","confidence":0.8,"evidence":%s,"technique":"gobuster directory enumeration"}],"commandPreview":"gobuster dir -q -u %s -w <temp-wordlist> -k"}\n' "$escaped_output" "$base_url" "$escaped_summary" "$escaped_evidence" "$base_url"
