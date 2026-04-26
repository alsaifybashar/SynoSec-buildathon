#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v sqlmap >/dev/null 2>&1; then
  printf '%s\n' '{"output":"SQLMap Scan could not run because sqlmap is not installed.","statusReason":"Missing required binary: sqlmap"}'
  exit 127
fi

base_url="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};const base=String(toolInput.baseUrl||toolInput.url||toolInput.startUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`);const vt=Array.isArray(toolInput.validationTargets)&&toolInput.validationTargets[0];const candidate=vt?(vt.url||vt.endpoint||vt.path):Array.isArray(toolInput.candidateEndpoints)&&toolInput.candidateEndpoints[0];const url=new URL(String(candidate||base),base);const query=(vt&&vt.query&&typeof vt.query==="object")?vt.query:{};for(const [key,value] of Object.entries(query)){url.searchParams.set(key,String(value));}process.stdout.write(url.toString());});')"

if ! output="$(sqlmap -u "$base_url" --batch --level=1 --risk=1 --threads=1 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"sqlmap scan failed","commandPreview":"sqlmap -u %s --batch --level=1 --risk=1 --threads=1"}\n' "$escaped_output" "$base_url"
  exit 64
fi

summary="SQLMap completed a database injection assessment against $base_url."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"sqlmap:%s","title":"SQLMap scan completed","summary":%s,"severity":"info","confidence":0.78,"evidence":%s,"technique":"sqlmap database injection check"}],"commandPreview":"sqlmap -u %s --batch --level=1 --risk=1 --threads=1"}\n' "$escaped_output" "$base_url" "$escaped_summary" "$escaped_evidence" "$base_url"
