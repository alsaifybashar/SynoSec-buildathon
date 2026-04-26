#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v ffuf >/dev/null 2>&1; then
  printf '%s\n' '{"output":"FFuf Scan could not run because ffuf is not installed.","statusReason":"Missing required binary: ffuf"}'
  exit 127
fi

base_url="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl||`http://${toolInput.target||parsed?.request?.target||"localhost"}`));});')"
wordlist="$(mktemp)"
outfile="$(mktemp)"
trap 'rm -f "$wordlist" "$outfile"' EXIT
SEED_PAYLOAD="$payload" node <<'NODE' >"$wordlist"
const parsed = JSON.parse(process.env.SEED_PAYLOAD || "{}");
const toolInput = parsed?.request?.parameters?.toolInput ?? {};
const defaults = ["admin", "login", "api", "files", "robots.txt", "sitemap.xml", ".git", ".env"];
const candidates = [
  ...(Array.isArray(toolInput.candidatePaths) ? toolInput.candidatePaths : []),
  ...(Array.isArray(toolInput.candidateEndpoints) ? toolInput.candidateEndpoints : [])
];
const words = candidates.length > 0 ? candidates : defaults;
const maxPaths = Number.isFinite(Number(toolInput.maxPaths)) ? Math.max(1, Number(toolInput.maxPaths)) : 32;
for (const word of [...new Set(words.map(String).map((value) => value.trim().replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+/, "")).filter(Boolean))].slice(0, maxPaths)) {
  console.log(word);
}
NODE

if ! output="$(ffuf -u "${base_url%/}/FUZZ" -w "$wordlist" -of json -o "$outfile" -s 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"ffuf scan failed","commandPreview":"ffuf -u %s/FUZZ -w <temp-wordlist> -of json -o <temp-outfile> -s"}\n' "$escaped_output" "${base_url%/}"
  exit 64
fi

results="$(cat "$outfile" 2>/dev/null || true)"
combined_output="$output"
if [ -n "$results" ]; then
  combined_output="$combined_output"$'\n'"$results"
fi
summary="FFuf completed content fuzzing against $base_url using supplied or compact path candidates."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$combined_output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$combined_output")"
printf '{"output":%s,"observations":[{"key":"ffuf:%s","title":"FFuf scan completed","summary":%s,"severity":"info","confidence":0.8,"evidence":%s,"technique":"ffuf content fuzzing"}],"commandPreview":"ffuf -u %s/FUZZ -w <temp-wordlist> -of json -o <temp-outfile> -s"}\n' "$escaped_output" "$base_url" "$escaped_summary" "$escaped_evidence" "${base_url%/}"
