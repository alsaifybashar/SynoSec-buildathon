#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.target||parsed?.request?.target||"unknown-target"));});')"
base_url="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const target=String(toolInput.target||parsed?.request?.target||"unknown-target");process.stdout.write(String(toolInput.baseUrl||`http://${target}`));});')"
now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
output="Bash probe recorded target=$target baseUrl=$base_url at $now."
summary="Captured deterministic probe metadata for $target."
evidence="target=$target
baseUrl=$base_url
timestamp=$now"
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$evidence")"
printf '{"output":%s,"observations":[{"key":"bash-probe:%s","title":"Bash probe completed","summary":%s,"severity":"info","confidence":0.99,"evidence":%s,"technique":"local bash probe"}],"commandPreview":"bash-probe %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$base_url"
