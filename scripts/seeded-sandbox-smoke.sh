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
  local target="$2"
  local layer="$3"
  local base_url="$4"
  local port="${5:-}"

  local tool_definition
  tool_definition="$(curl -fsS "${BACKEND_URL}/api/ai-tools/${tool_id}")"

  local tool_name
  tool_name="$(echo "$tool_definition" | jq -r '.name')"
  local executor_type
  executor_type="$(echo "$tool_definition" | jq -r '.executorType')"
  local capabilities_json
  capabilities_json="$(echo "$tool_definition" | jq '.capabilities')"
  local risk_tier
  risk_tier="$(echo "$tool_definition" | jq -r '.riskTier')"
  local sandbox_profile
  sandbox_profile="$(echo "$tool_definition" | jq -r '.sandboxProfile')"
  local privilege_profile
  privilege_profile="$(echo "$tool_definition" | jq -r '.privilegeProfile')"
  local timeout_ms
  timeout_ms="$(echo "$tool_definition" | jq -r '.timeoutMs')"
  local bash_source
  bash_source="$(echo "$tool_definition" | jq -r '.bashSource')"

  local tool_input_json
  if [[ -n "$port" ]]; then
    tool_input_json="$(jq -n --arg target "$target" --arg baseUrl "$base_url" --argjson port "$port" '{
      target: $target,
      baseUrl: $baseUrl,
      port: $port
    }')"
  else
    tool_input_json="$(jq -n --arg target "$target" --arg baseUrl "$base_url" '{
      target: $target,
      baseUrl: $baseUrl
    }')"
  fi

  local command_preview
  command_preview="${tool_name} target=${target} baseUrl=${base_url}"

  local payload
  payload="$(
    jq -n \
      --arg scanId "11111111-1111-4111-8111-111111111111" \
      --arg tacticId "22222222-2222-4222-8222-222222222222" \
      --arg agentId "seeded-tool-smoke" \
      --arg targetScope "vulnerable-target:8888" \
      --arg toolId "$tool_id" \
      --arg toolName "$tool_name" \
      --arg executorType "$executor_type" \
      --arg target "$target" \
      --arg layer "$layer" \
      --arg riskTier "$risk_tier" \
      --arg sandboxProfile "$sandbox_profile" \
      --arg privilegeProfile "$privilege_profile" \
      --arg bashSource "$bash_source" \
      --arg commandPreview "$command_preview" \
      --argjson capabilities "$capabilities_json" \
      --argjson timeoutMs "$timeout_ms" \
      --argjson toolInput "$tool_input_json" \
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
          executorType: $executorType,
          capabilities: $capabilities,
          target: $target,
          layer: $layer,
          riskTier: $riskTier,
          justification: ("Docker smoke run for " + $toolId),
          sandboxProfile: $sandboxProfile,
          privilegeProfile: $privilegeProfile,
          parameters: {
            bashSource: $bashSource,
            timeoutMs: $timeoutMs,
            commandPreview: $commandPreview,
            toolInput: $toolInput
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
    toolRuns: [.toolRuns[] | {tool, dispatchMode, status, statusReason, exitCode}],
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

echo "Resetting any previous Docker stack state ..."
docker compose down --remove-orphans >/dev/null 2>&1 || true
docker rm -f synosec-target >/dev/null 2>&1 || true

echo "Starting Docker stack for seeded sandbox smoke test ..."
docker compose up --build -d vulnerable-target postgres ollama >/dev/null

BACKEND_PORT="$BACKEND_PORT" \
TOOL_EXECUTION_MODE=connector \
CONNECTOR_RUN_MODE=execute \
CONNECTOR_DISPATCH_TIMEOUT_MS=45000 \
CONNECTOR_ALLOWED_CAPABILITIES=passive,web-recon,network-recon,content-discovery \
CONNECTOR_ALLOWED_SANDBOX_PROFILES=network-recon \
CONNECTOR_ALLOWED_PRIVILEGE_PROFILES=read-only-network \
docker compose run -d --no-deps --use-aliases --service-ports backend \
  sh -c "pnpm install --frozen-lockfile || pnpm install && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/backend prisma:generate && pnpm --filter @synosec/backend prisma:push && pnpm --filter @synosec/backend exec tsx src/main.ts" \
  >/dev/null

wait_for_backend

CONNECTOR_RUN_MODE=execute \
CONNECTOR_COMMAND_TIMEOUT_MS=15000 \
CONNECTOR_ALLOWED_CAPABILITIES=passive,web-recon,network-recon,content-discovery \
CONNECTOR_ALLOWED_SANDBOX_PROFILES=network-recon \
CONNECTOR_ALLOWED_PRIVILEGE_PROFILES=read-only-network \
docker compose run -d --no-deps --use-aliases connector \
  sh -c "pnpm install --frozen-lockfile || pnpm install && pnpm --filter @synosec/contracts build && pnpm --filter @synosec/connector exec tsx src/main.ts" \
  >/dev/null

wait_for_connector

dispatch_tool \
  "seed-http-recon" "vulnerable-target" "L7" "http://vulnerable-target:8888"

dispatch_tool \
  "seed-web-crawl" "vulnerable-target" "L7" "http://vulnerable-target:8888"

dispatch_tool \
  "seed-service-scan" "vulnerable-target" "L4" "http://vulnerable-target:8888" "8888"

echo
echo "Seeded sandbox smoke test passed."
