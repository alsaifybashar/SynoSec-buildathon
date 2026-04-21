# SynoSec

SynoSec is an AI-assisted security scanning system with a frontend, backend orchestrator, connector worker, supporting data stores, and an intentionally vulnerable local target for end-to-end validation.

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
3. `LOCAL_ENABLED=TRUE` is the default. Set `LOCAL_ENABLED=FALSE` in `.env` if you want `make dev` to skip Ollama entirely. The legacy typo `LOCAL_ENABHLED` is still accepted temporarily for compatibility.
4. With local enabled, the Docker-backed dev path starts Ollama and pulls `qwen3:1.7b` for the local provider automatically.
5. `make dev` starts Postgres, the vulnerable target, and optionally Ollama before launching backend and frontend on the host.
6. Backend tests now include live local-model evaluation of the seeded tool defaults, so `pnpm --filter @synosec/backend test` expects Ollama with `qwen3:1.7b` to be available when local mode is enabled.
7. Optional app-user authentication is gated behind `AUTH_ENABLED`. When enabled, configure `AUTH_GOOGLE_CLIENT_ID`, `AUTH_ALLOWED_EMAILS`, and `AUTH_SESSION_SECRET` in `.env`.
8. The current Google integration uses Google Identity Services in the browser, then sends the returned Google ID token to the backend to create a SynoSec session cookie.
9. In Google Cloud Console, set the OAuth client's `Authorized JavaScript origins` to `http://localhost:5173`. A redirect URI is not used by the current login flow.
10. Start the full stack:

```bash
make docker-up
```

11. Run the smoke demo:

```bash
make smoke-e2e
```

For host-mode development against the same local model stack:

```bash
make dev
```

For auth-enabled local development, the relevant `.env` values are:

```env
AUTH_ENABLED=true
AUTH_GOOGLE_ENABLED=true
AUTH_GOOGLE_CLIENT_ID=your-google-web-client-id
AUTH_ALLOWED_EMAILS=you@example.com
AUTH_SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters
AUTH_COOKIE_NAME=synosec_session
AUTH_COOKIE_SECURE=false
AUTH_SESSION_TTL_HOURS=168
AUTH_SESSION_TOUCH_INTERVAL_SECONDS=600
FRONTEND_URL=http://localhost:5173
```

`AUTH_ALLOWED_EMAILS` is enforced on every authenticated request, so removing an email from the allowlist invalidates access on the next session-backed call. `AUTH_SESSION_TOUCH_INTERVAL_SECONDS` throttles `lastSeenAt` writes to avoid turning normal UI traffic into a write on every request.

## Endpoints

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Ollama API: `http://localhost:11434`
- Vulnerable target: `http://localhost:8888`

## VPS deploy

GitHub Actions deploys to a VPS using `.github/workflows/deploy.yml` and the production stack in `docker-compose.vps.yml`.

- Host `nginx` runs directly on the VPS and proxies traffic to Dockerized frontend and backend services bound on loopback.
- `backend` runs the compiled API and pushes the Prisma schema on startup.
- `frontend` runs the production frontend build behind the host nginx reverse proxy.
- `connector` stays on the private Docker network and polls the backend control plane.
- `postgres` persists app data in a named Docker volume.

Before using the deploy workflow, define these GitHub repository variables:

- `VPS_HOST`
- `VPS_USER`
- `SERVER_NAME`
- `NGINX_CONFIG_PATH`
- `FRONTEND_URL`

Define these GitHub repository secrets as well:

- `VPS_SSH_KEY`
- `POSTGRES_PASSWORD`
- `ANTHROPIC_API_KEY`
- `CONNECTOR_SHARED_TOKEN`
- `AUTH_SESSION_SECRET`

Most non-secret application defaults now live in `infra/deploy/env.vps.template`, so GitHub only needs the host-specific variables above plus the runtime secrets. If you need to change default model, scan, connector, auth, or public port settings for every deployment, edit that committed template instead of adding more Actions variables.
The deploy workflow now hardcodes the VPS app directory to `/opt/synosec` and binds the host loopback ports to `3030` for the frontend and `3031` for the backend.

Set `SERVER_NAME` to the apex domain only, for example `synosecai.com`. The nginx template will serve both `synosecai.com` and `www.synosecai.com`.

Set `FRONTEND_URL` to the public HTTPS origin, for example `https://synosecai.com`.

Set `NGINX_CONFIG_PATH` to the exact nginx site config path allowed by sudoers, for example `/etc/nginx/sites-available/synosec`.

The host nginx config template lives at `infra/nginx/synosec.vps.conf.template` and is installed by the deploy workflow. It redirects HTTP to HTTPS, terminates TLS on the VPS using the standard Certbot layout under `/etc/letsencrypt/live/<server_name>/`, forwards the original client scheme/host to the app, and emits `Strict-Transport-Security`.

Post-deploy health checks now run on the VPS origin loopback endpoints instead of the public domain, so deploy validation does not depend on Cloudflare edge behavior.

## Connector testing

The Docker stack now runs the same connector shape you can later deploy on a VPS.

- `TOOL_EXECUTION_MODE=connector` routes broker-approved tool runs through the connector control plane.
- `CONNECTOR_RUN_MODE` supports `dry-run`, `simulate`, and `execute`.
- `POST /api/connectors/test-dispatch` lets you test the broker/connector path without reviving the retired scan API.

## Feature documentation

Contributor-facing feature documentation lives in [docs/features.md](/home/nilwi971/projects/SynoSec-buildathon/docs/features.md).

Repository cleanup and restructure guidance lives in [docs/repo-restructure-plan.md](/home/nilwi971/projects/SynoSec-buildathon/docs/repo-restructure-plan.md).

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
