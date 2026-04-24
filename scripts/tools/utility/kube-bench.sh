#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v kube-bench >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Kube-bench could not run because kube-bench is not installed.","statusReason":"Missing required binary: kube-bench"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(kube-bench  "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Kube-bench failed","commandPreview":"kube-bench  %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Kube-bench completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"kube-bench:%s","title":"Kube-bench completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Kube-bench assessment"}],"commandPreview":"kube-bench  %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
