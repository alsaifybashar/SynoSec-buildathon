# SynoSec Buildathon

SynoSec is an AI-assisted security scanning demo built for a buildathon. It runs a frontend, a backend orchestrator, supporting data stores, and an intentionally vulnerable target so the workflow can be demonstrated end to end in a controlled environment.

## What's in the repo

- `apps/frontend` - UI for configuring scans and viewing findings, graphs, and reports
- `apps/backend` - API, orchestration, agents, and persistence
- `targets/vulnerable-app` - intentionally unsafe demo target used for local scanning exercises

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
