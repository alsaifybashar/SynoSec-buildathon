#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v kube-hunter >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Kube-hunter could not run because kube-hunter is not installed.","statusReason":"Missing required binary: kube-hunter"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(kube-hunter --remote "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Kube-hunter failed","commandPreview":"kube-hunter --remote %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Kube-hunter completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"kube-hunter:%s","title":"Kube-hunter completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Kube-hunter assessment"}],"commandPreview":"kube-hunter --remote %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
