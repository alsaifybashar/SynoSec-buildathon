#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v steghide >/dev/null 2>&1; then
  printf '%s\n' '{"output":"Steghide Info could not run because steghide is not installed.","statusReason":"Missing required binary: steghide"}'
  exit 127
fi

file_path="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.filePath||""));});')"
passphrase="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.passphrase||""));});')"

if [ -z "$file_path" ]; then
  printf '%s\n' '{"output":"Steghide Info requires input.filePath.","statusReason":"Missing required input: filePath"}'
  exit 64
fi

args=(info "$file_path")
if [ -n "$passphrase" ]; then
  args+=(-p "$passphrase")
fi

if ! output="$(steghide "${args[@]}" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"steghide info failed","commandPreview":"steghide %s"}\n' "$escaped_output" "${args[*]}"
  exit 64
fi

summary="Steghide inspected file $file_path."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"steghide:%s","title":"Steghide inspection completed","summary":%s,"severity":"info","confidence":0.8,"evidence":%s,"technique":"steghide info"}],"commandPreview":"steghide %s"}\n' "$escaped_output" "$file_path" "$escaped_summary" "$escaped_evidence" "${args[*]}"
