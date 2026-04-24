#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v evil-winrm >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Evil-WinRM could not run because evil-winrm is not installed.","statusReason":"Missing required binary: evil-winrm"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(evil-winrm -i "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"Evil-WinRM failed","commandPreview":"evil-winrm -i %s"}\n' "$escaped_output" "$target"
  exit 64
fi

summary="Evil-WinRM completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"evil-winrm:%s","title":"Evil-WinRM completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"Evil-WinRM assessment"}],"commandPreview":"evil-winrm -i %s"}\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
