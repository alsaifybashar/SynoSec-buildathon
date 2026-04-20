# SynoSec Buildathon

SynoSec is an AI-assisted security scanning demo built for a buildathon. It runs a frontend, a backend orchestrator, supporting data stores, and an intentionally vulnerable target so the workflow can be demonstrated end to end in a controlled environment.

## Agent SDK Status

- `apps/backend` now includes AI SDK and Workflow Dev Kit scaffolding.
- Anthropic model calls in `apps/backend` now go through AI SDK.
- The migration note lives in `docs/ai-sdk-workflow-devkit.md`.
- The active builder UI now exposes `AI Providers`, `AI Agents`, and `AI Tools`.
- Default AI builder records are seeded through `apps/backend/prisma/seed.ts`, not generated at runtime.

## What's in the repo

- `apps/frontend` - UI for configuring AI providers, AI agents, AI tools, applications, and runtimes
- `apps/backend` - API, broker, scan persistence, and connector control plane
- `apps/connector` - Docker-installable connector worker that polls for approved tool jobs
- `demos/vulnerable-app` - intentionally unsafe demo target used for local scanning exercises

## How scanning works

SynoSec starts from a target and a scan policy, then builds out a graph of services, ports, and findings as it explores. The backend coordinates tool use, records evidence, and updates the scan state so the UI can show progress in near real time.

A typical scan looks like this:

1. A scan request defines targets, depth, time limits, and allowed layers.
2. The orchestrator creates an initial node and begins exploring reachable surfaces.
3. Agents inspect the current node, choose the next useful action, and request tool runs through the backend broker.
4. Tool results are stored as evidence, turned into findings or child nodes, and added back into the graph.
5. The loop continues until the graph is exhausted or the scan reaches its configured stop conditions.

## Agent workflow

The agent system is structured as a controlled analysis loop rather than an open-ended autonomous run. Each step is reviewed against policy, recorded in the audit trail, and fed back into the next decision.

- plan - decide what to inspect next based on the current node, prior evidence, and scan limits
- observe - gather tool output, runtime metadata, and service details
- evaluate - score the result, identify useful findings, and derive follow-up nodes
- act - request the next approved tool run or exploration step
- stop - end when no higher-value path remains or limits are reached

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `ANTHROPIC_API_KEY` in `.env` if you want to use Anthropic models.
3. `LOCAL_ENABHLED=TRUE` is the default. Set `LOCAL_ENABHLED=FALSE` in `.env` if you want `make dev` to skip Ollama entirely.
4. With local enabled, the Docker-backed dev path starts Ollama and pulls `qwen3:1.7b` for the local provider automatically.
5. `make dev` starts Postgres, the vulnerable target, and optionally Ollama before launching backend and frontend on the host.
6. Backend tests now include live local-model evaluation of the seeded tool defaults, so `pnpm --filter @synosec/backend test` expects Ollama with `qwen3:1.7b` to be available when local mode is enabled.
7. Start the full stack:

```bash
make docker-up
```

8. Run the smoke demo:

```bash
make smoke-e2e
```

For host-mode development against the same local model stack:

```bash
make dev
```

## Endpoints

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Ollama API: `http://localhost:11434`
- Vulnerable target: `http://localhost:8888`

## Connector testing

The Docker stack now runs the same connector shape you can later deploy on a VPS.

- `TOOL_EXECUTION_MODE=connector` routes broker-approved tool runs through the connector control plane.
- `CONNECTOR_RUN_MODE` supports `dry-run`, `simulate`, and `execute`.
- `POST /api/connectors/test-dispatch` lets you test the broker/connector path without reviving the retired scan API.

## Feature documentation

Contributor-facing feature documentation lives in [docs/features.md](/home/nilwi971/projects/SynoSec-buildathon/docs/features.md).

Use it to check:

- which features are active
- what each feature is for
- how each feature is tested
- whether the feature is mature enough to extend safely

## Key commands

```bash
make docker-up
make docker-down
make smoke-e2e
make dev
make test
pnpm build
```

## Contributing

Contribute to an existing feature when it is already documented in [docs/features.md](/home/nilwi971/projects/SynoSec-buildathon/docs/features.md) and has a clear purpose, a defined test path, and enough developer-facing notes to preserve the intended behavior.

The cutoff is strict:

- If a feature does not yet have purpose, tests, and developer documentation, do not expand it as normal product work.
- Document the feature first, define how it will be tested, and only then extend it.
- Do not contribute new behavior to retired or frozen areas unless the reactivation effort is explicitly documented as a new active feature.

For connector-related work, preserve local/VPS parity and keep execution broker-mediated. Do not introduce direct model-to-tool or model-to-shell access as a shortcut.
