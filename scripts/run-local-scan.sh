#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:3001}"
TARGET="${TARGET:-localhost:8888}"
LOCAL_MODEL="${LOCAL_MODEL:-Qwen/Qwen3-1.7B}"
LOCAL_BASE_URL="${LOCAL_BASE_URL:-http://127.0.0.1:8010}"
LOCAL_API_PATH="${LOCAL_API_PATH:-/generate}"
MAX_DEPTH="${MAX_DEPTH:-2}"
MAX_DURATION_MINUTES="${MAX_DURATION_MINUTES:-5}"
RATE_LIMIT_RPS="${RATE_LIMIT_RPS:-5}"
POLL_SECONDS="${POLL_SECONDS:-2}"

payload="$(jq -n \
  --arg target "$TARGET" \
  --arg model "$LOCAL_MODEL" \
  --arg baseUrl "$LOCAL_BASE_URL" \
  --arg apiPath "$LOCAL_API_PATH" \
  --argjson maxDepth "$MAX_DEPTH" \
  --argjson maxDurationMinutes "$MAX_DURATION_MINUTES" \
  --argjson rateLimitRps "$RATE_LIMIT_RPS" \
  '{
    scope: {
      targets: [$target],
      exclusions: [],
      layers: ["L3", "L4", "L5", "L6", "L7"],
      maxDepth: $maxDepth,
      maxDurationMinutes: $maxDurationMinutes,
      rateLimitRps: $rateLimitRps,
      allowActiveExploits: false
    },
    llm: {
      provider: "local",
      model: $model,
      baseUrl: $baseUrl,
      apiPath: $apiPath
    }
  }'
)"

scan_id="$(
  curl -fsS -X POST "$BACKEND_URL/api/scan" \
    -H 'content-type: application/json' \
    -d "$payload" | jq -r '.scanId'
)"

echo "scan_id=$scan_id"

while true; do
  status_json="$(curl -fsS "$BACKEND_URL/api/scan/$scan_id")"
  status="$(jq -r '.status' <<<"$status_json")"
  round="$(jq -r '.currentRound' <<<"$status_json")"
  complete="$(jq -r '.nodesComplete' <<<"$status_json")"
  total="$(jq -r '.nodesTotal' <<<"$status_json")"

  echo "status=$status round=$round nodes=$complete/$total"

  case "$status" in
    complete|aborted|failed)
      break
      ;;
  esac

  sleep "$POLL_SECONDS"
done

echo
echo "status_json:"
jq . <<<"$status_json"

echo
echo "findings:"
curl -fsS "$BACKEND_URL/api/scan/$scan_id/findings" | jq .

echo
echo "audit_tail:"
curl -fsS "$BACKEND_URL/api/scan/$scan_id/audit" | jq '.[-10:]'

if [[ "$status" == "complete" ]]; then
  echo
  echo "report:"
  curl -fsS "$BACKEND_URL/api/scan/$scan_id/report" | jq .
fi
