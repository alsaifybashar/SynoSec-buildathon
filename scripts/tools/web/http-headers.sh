#!/usr/bin/env bash
set -euo pipefail
payload="$(cat)"
if ! command -v curl >/dev/null 2>&1; then
  printf '%s\n' '{"output":"HTTP Headers could not run because curl is not installed.","statusReason":"Missing required binary: curl"}'
  exit 127
fi
targets_json="$(SEED_PAYLOAD="$payload" node <<'NODE'
{
  const parsed = JSON.parse(process.env.SEED_PAYLOAD || "{}");
  const toolInput = parsed?.request?.parameters?.toolInput ?? {};
  const baseUrl = String(toolInput.baseUrl || toolInput.url || toolInput.startUrl || `http://${toolInput.target || parsed?.request?.target || ""}`);
  const source = Array.isArray(toolInput.candidateEndpoints) && toolInput.candidateEndpoints.length > 0
    ? toolInput.candidateEndpoints
    : [baseUrl];
  const maxEndpoints = Number.isFinite(Number(toolInput.maxEndpoints)) ? Math.max(1, Number(toolInput.maxEndpoints)) : 6;
  const endpoints = [...new Set(source
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => new URL(value, baseUrl).toString()))].slice(0, maxEndpoints);
  process.stdout.write(JSON.stringify(endpoints));
}
NODE
)"
if [ "$targets_json" = "[]" ]; then
  printf '%s\n' '{"output":"HTTP Headers requires baseUrl, url, target, or candidateEndpoints.","statusReason":"No HTTP target was provided"}'
  exit 64
fi
if ! output="$(TARGETS_JSON="$targets_json" bash -c 'node -e "const targets=JSON.parse(process.env.TARGETS_JSON); console.log(targets.join(\"\\n\"));" | while IFS= read -r url; do printf "### %s\n" "$url"; curl -sS -I -L "$url"; done' 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"curl header fetch failed"}\n' "$escaped_output"
  exit 64
fi
OUTPUT="$output" TARGETS_JSON="$targets_json" node <<'NODE'
const output = process.env.OUTPUT || "";
const targets = JSON.parse(process.env.TARGETS_JSON || "[]");
const sections = output.split(/^### /m).filter(Boolean);
const observations = [];
for (const section of sections) {
  const [firstLine, ...rest] = section.split(/\r?\n/);
  const url = firstLine.trim();
  const headers = rest.join("\n");
  const status = headers.match(/^HTTP\/\S+\s+(\d+)/mi)?.[1] || "unknown";
  const server = headers.match(/^server:\s*(.+)$/mi)?.[1]?.trim();
  const poweredBy = headers.match(/^x-powered-by:\s*(.+)$/mi)?.[1]?.trim();
  const cookies = [...headers.matchAll(/^set-cookie:\s*([^=;\s]+)/gmi)].map((match) => match[1]);
  const artifacts = [
    server ? `server=${server}` : null,
    poweredBy ? `x-powered-by=${poweredBy}` : null,
    cookies.length > 0 ? `cookies=${cookies.join(",")}` : null
  ].filter(Boolean);
  observations.push({
    key: `headers:${new URL(url).pathname || "/"}`,
    title: `HTTP surface headers collected for ${new URL(url).pathname || "/"}`,
    summary: `GET/HEAD ${url} returned status ${status}${artifacts.length > 0 ? ` with ${artifacts.join("; ")}` : ""}.`,
    severity: "info",
    confidence: 0.72,
    evidence: [`Request target: ${url}`, "Method: HEAD", `Status: ${status}`, ...artifacts, `Proof:\n${headers.slice(0, 1200)}`].join("\n"),
    technique: "curl header fetch"
  });
}
console.log(JSON.stringify({
  output,
  observations,
  commandPreview: `curl -sS -I -L ${targets.join(" ")}`
}));
NODE
