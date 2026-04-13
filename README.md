# SynoSec Buildathon

SynoSec is an AI-assisted security scanning demo built for a buildathon. It runs a frontend, a backend orchestrator, supporting data stores, and an intentionally vulnerable target so the workflow can be demonstrated end to end in a controlled environment.

## What's in the repo

- `apps/frontend` - UI for configuring scans and viewing findings, graphs, and reports
- `apps/backend` - API, orchestration, agents, and persistence
- `targets/vulnerable-app` - intentionally unsafe demo target used for local scanning exercises

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
3. Start the full stack:

```bash
make docker-up
```

4. Run the smoke demo:

```bash
make smoke-e2e
```

## Endpoints

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Neo4j Browser: `http://localhost:7474`
- Vulnerable target: `http://localhost:8888`

## Key commands

```bash
make docker-up
make docker-down
make smoke-e2e
make dev
make test
pnpm build
```
