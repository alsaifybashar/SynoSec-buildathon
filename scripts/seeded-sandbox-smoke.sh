#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-3101}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:${BACKEND_PORT}}"
CONNECTOR_TOKEN="${CONNECTOR_SHARED_TOKEN:-synosec-connector-dev}"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-60}"
POLL_SECONDS="${POLL_SECONDS:-2}"

cleanup() {
  local exit_code="$1"
  if [[ "$exit_code" -ne 0 ]]; then
    echo
    echo "Smoke run failed. Recent backend logs:"
    docker compose logs --tail=100 backend || true
    echo
    echo "Recent connector logs:"
    docker compose logs --tail=100 connector || true
  fi

  echo
  echo "Stopping Docker stack ..."
  docker compose down --remove-orphans >/dev/null || true
}

trap 'cleanup $?' EXIT

wait_for_backend() {
  echo "Waiting for backend health at ${BACKEND_URL}/api/health ..."
  for _ in $(seq 1 45); do
    if curl -fsS "${BACKEND_URL}/api/health" >/dev/null; then
      return 0
    fi
    sleep 2
  done

  echo "Backend did not become healthy." >&2
  return 1
}

wait_for_connector() {
  echo "Waiting for connector registration ..."
  for _ in $(seq 1 "$POLL_ATTEMPTS"); do
    if curl -fsS "${BACKEND_URL}/api/connectors/status" \
      -H "Authorization: Bearer ${CONNECTOR_TOKEN}" \
      | jq -e '.connectors | length > 0' >/dev/null; then
      return 0
    fi
    sleep "$POLL_SECONDS"
  done

  echo "Connector did not register in time." >&2
  return 1
}

dispatch_tool() {
  local tool_id="$1"
  local tool_name="$2"
  local adapter="$3"
  local target="$4"
  local layer="$5"
  local risk_tier="$6"
  local sandbox_profile="$7"
  local privilege_profile="$8"
  local binary="$9"
  shift 9

  local args_json
  args_json="$(printf '%s\n' "$@" | jq -R . | jq -s .)"

  local payload
  payload="$(
    jq -n \
      --arg scanId "11111111-1111-4111-8111-111111111111" \
      --arg tacticId "22222222-2222-4222-8222-222222222222" \
      --arg agentId "seeded-tool-smoke" \
      --arg targetScope "vulnerable-target:8888" \
      --arg toolId "$tool_id" \
      --arg toolName "$tool_name" \
      --arg adapter "$adapter" \
      --arg target "$target" \
      --arg layer "$layer" \
      --arg riskTier "$risk_tier" \
      --arg sandboxProfile "$sandbox_profile" \
      --arg privilegeProfile "$privilege_profile" \
      --arg binary "$binary" \
      --argjson args "$args_json" \
      '{
        scanId: $scanId,
        tacticId: $tacticId,
        agentId: $agentId,
        scope: {
          targets: [$targetScope],
          exclusions: [],
          layers: ["L4", "L7"],
          maxDepth: 1,
          maxDurationMinutes: 2,
          rateLimitRps: 2,
          allowActiveExploits: false,
          graceEnabled: true,
          graceRoundInterval: 3,
          cyberRangeMode: "simulation"
        },
        request: {
          toolId: $toolId,
          tool: $toolName,
          adapter: $adapter,
          target: $target,
          layer: $layer,
          riskTier: $riskTier,
          justification: ("Docker smoke run for " + $toolId),
          sandboxProfile: $sandboxProfile,
          privilegeProfile: $privilegeProfile,
          parameters: {
            binary: $binary,
            args: $args
          }
        }
      }'
  )"

  echo
  echo "Dispatching ${tool_id} ..."
  local response
  response="$(
    curl -fsS -X POST "${BACKEND_URL}/api/connectors/test-dispatch" \
      -H 'content-type: application/json' \
      -d "$payload"
  )"

  echo "$response" | jq '{
    dispatchMode,
    toolRuns: [.toolRuns[] | {tool, adapter, status, statusReason, exitCode}],
    observations: (.observations | length),
    findings: (.findings | length)
  }'

  local status
  status="$(echo "$response" | jq -r '.toolRuns[0].status')"
  local dispatch_mode
  dispatch_mode="$(echo "$response" | jq -r '.dispatchMode')"
  local exit_code
  exit_code="$(echo "$response" | jq -r '.toolRuns[0].exitCode')"
  local status_reason
  status_reason="$(echo "$response" | jq -r '.toolRuns[0].statusReason // empty')"

  if [[ "$dispatch_mode" != "connector" ]]; then
    echo "Expected connector dispatch mode, got ${dispatch_mode}" >&2
    return 1
  fi

  if [[ "$status" != "completed" ]]; then
    echo "Tool ${tool_id} did not complete successfully." >&2
    return 1
  fi

  if [[ "$exit_code" != "0" ]]; then
    echo "Tool ${tool_id} exited with ${exit_code}." >&2
    return 1
  fi

  if [[ -n "$status_reason" ]]; then
    echo "Tool ${tool_id} reported status reason: ${status_reason}" >&2
    return 1
  fi
}

echo "Starting Docker stack for seeded sandbox smoke test ..."
BACKEND_PORT="$BACKEND_PORT" \
TOOL_EXECUTION_MODE=connector \
CONNECTOR_RUN_MODE=execute \
CONNECTOR_ALLOWED_ADAPTERS=httpx_probe,web_crawl,service_scan \
CONNECTOR_ALLOWED_SANDBOX_PROFILES=network-recon \
CONNECTOR_ALLOWED_PRIVILEGE_PROFILES=read-only-network \
docker compose up --build -d backend vulnerable-target postgres ollama >/dev/null

wait_for_backend

BACKEND_PORT="$BACKEND_PORT" \
TOOL_EXECUTION_MODE=connector \
CONNECTOR_RUN_MODE=execute \
CONNECTOR_ALLOWED_ADAPTERS=httpx_probe,web_crawl,service_scan \
CONNECTOR_ALLOWED_SANDBOX_PROFILES=network-recon \
CONNECTOR_ALLOWED_PRIVILEGE_PROFILES=read-only-network \
docker compose up -d connector >/dev/null

wait_for_connector

dispatch_tool \
  "seed-http-recon" "HTTP Recon" "httpx_probe" "vulnerable-target:8888" "L7" "passive" "network-recon" "read-only-network" "httpx" \
  "-silent" "-status-code" "-title" "-tech-detect" "-u" "http://vulnerable-target:8888"

dispatch_tool \
  "seed-web-crawl" "Web Crawl" "web_crawl" "vulnerable-target:8888" "L7" "passive" "network-recon" "read-only-network" "katana" \
  "-u" "http://vulnerable-target:8888" "-silent"

dispatch_tool \
  "seed-service-scan" "Service Scan" "service_scan" "vulnerable-target" "L4" "passive" "network-recon" "read-only-network" "nmap" \
  "-Pn" "-p" "8888" "--host-timeout" "5s" "--max-retries" "1" "vulnerable-target"

echo
echo "Seeded sandbox smoke test passed."
