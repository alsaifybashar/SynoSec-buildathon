#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-3101}"
VITE_DEV_PORT="${VITE_DEV_PORT:-5273}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:${BACKEND_PORT}}"
TARGET="${TARGET:-synosec-target:8888}"
MAX_DEPTH="${MAX_DEPTH:-2}"
MAX_DURATION_MINUTES="${MAX_DURATION_MINUTES:-3}"
RATE_LIMIT_RPS="${RATE_LIMIT_RPS:-5}"
POLL_SECONDS="${POLL_SECONDS:-1}"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-60}"

echo "Starting Docker stack for smoke test..."
BACKEND_PORT="$BACKEND_PORT" VITE_DEV_PORT="$VITE_DEV_PORT" docker compose up --build -d backend frontend vulnerable-target postgres neo4j >/dev/null

echo "Waiting for backend health at ${BACKEND_URL}/api/health ..."
for _ in $(seq 1 30); do
  if curl -fsS "${BACKEND_URL}/api/health" >/dev/null; then
    break
  fi
  sleep 2
done
curl -fsS "${BACKEND_URL}/api/health" >/dev/null

payload="$(
  jq -n \
    --arg target "$TARGET" \
    --argjson maxDepth "$MAX_DEPTH" \
    --argjson maxDurationMinutes "$MAX_DURATION_MINUTES" \
    --argjson rateLimitRps "$RATE_LIMIT_RPS" \
    '{
      scope: {
        targets: [$target],
        exclusions: [],
        layers: ["L4", "L6", "L7"],
        maxDepth: $maxDepth,
        maxDurationMinutes: $maxDurationMinutes,
        rateLimitRps: $rateLimitRps,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation"
      },
      llm: {
        provider: "local"
      }
    }'
)"

echo "Submitting smoke scan for target ${TARGET} ..."
scan_id="$(
  curl -fsS -X POST "${BACKEND_URL}/api/scan" \
    -H 'content-type: application/json' \
    -d "$payload" | jq -r '.scanId'
)"

status="pending"
for _ in $(seq 1 "$POLL_ATTEMPTS"); do
  status_json="$(curl -fsS "${BACKEND_URL}/api/scan/${scan_id}")"
  status="$(jq -r '.status' <<<"$status_json")"
  nodes_complete="$(jq -r '.nodesComplete' <<<"$status_json")"
  nodes_total="$(jq -r '.nodesTotal' <<<"$status_json")"
  echo "scan_id=${scan_id} status=${status} nodes=${nodes_complete}/${nodes_total}"

  case "$status" in
    complete|failed|aborted)
      break
      ;;
  esac

  sleep "$POLL_SECONDS"
done

graph_json="$(curl -fsS "${BACKEND_URL}/api/scan/${scan_id}/graph")"
tool_runs_json="$(curl -fsS "${BACKEND_URL}/api/scan/${scan_id}/tool-runs")"
findings_json="$(curl -fsS "${BACKEND_URL}/api/scan/${scan_id}/findings")"
audit_json="$(curl -fsS "${BACKEND_URL}/api/scan/${scan_id}/audit")"

echo
echo "Workflow summary"
echo "$graph_json" | jq '{
  graphNodes: [.nodes[] | {layer, service, port, target}],
  edgeCount: (.edges | length)
}'

echo
echo "Tool runs"
echo "$tool_runs_json" | jq '[.[] | {adapter, status, riskTier, statusReason}]'

echo
echo "Findings"
echo "$findings_json" | jq '[.[].title]'

echo
echo "Audit highlights"
echo "$audit_json" | jq '[.[] | {
  actor,
  action,
  details: (
    .details
    | with_entries(select(.key == "adapter" or .key == "tool" or .key == "reason" or .key == "requestedToolRuns" or .key == "childNodesCount" or .key == "childNodesDerivedFrom" or .key == "service" or .key == "round" or .key == "summary"))
  )
}]'

if [[ "$status" != "complete" ]]; then
  echo
  echo "Smoke test failed: scan ${scan_id} finished with status ${status}" >&2
  exit 1
fi

report_json="$(curl -fsS "${BACKEND_URL}/api/scan/${scan_id}/report")"
echo
echo "Report"
echo "$report_json" | jq '{executiveSummary, topRisks: [.topRisks[].title]}'

echo
echo "Smoke test passed for scan ${scan_id}"
