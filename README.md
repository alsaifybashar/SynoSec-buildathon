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
3. `LOCAL_ENABLED=FALSE` is the default. Set `LOCAL_ENABLED=TRUE` in `.env` only if you explicitly want `make dev` to bring up Ollama for the local provider. The legacy typo `LOCAL_ENABHLED` is still accepted temporarily for compatibility.
4. With local enabled, the Docker-backed dev path starts Ollama and pulls `qwen3:1.7b` for the local provider.
5. `make dev` starts Postgres, the vulnerable target, and only starts Ollama when local mode is explicitly enabled before launching backend and frontend on the host.
6. Attack and scan execution should be started from the Attack Map UI, not as an automatic background action during local development startup.
7. Backend tests now include live local-model evaluation of the seeded tool defaults, so `pnpm --filter @synosec/backend test` expects Ollama with `qwen3:1.7b` to be available when local mode is enabled.
8. Optional app-user authentication is gated behind `AUTH_ENABLED`. When enabled, configure `AUTH_GOOGLE_CLIENT_ID`, `AUTH_ALLOWED_EMAILS`, and `AUTH_SESSION_SECRET` in `.env`.
9. The current Google integration uses Google Identity Services redirect mode. Google posts the returned ID token to `/api/auth/google`, the backend verifies it, creates the SynoSec session cookie, and redirects the browser back into the app.
10. In Google Cloud Console, use these values:
   Local:
   `Authorized JavaScript origins` = `http://localhost:5173`
   `Authorized redirect URIs` = `http://localhost:5173/api/auth/google`
   Production:
   `Authorized JavaScript origins` = `https://synosecai.com`
   `Authorized redirect URIs` = `https://synosecai.com/api/auth/google`
11. Start the full stack:

```bash
make docker-up
```

`make docker-up` does not start Ollama unless `LOCAL_ENABLED=TRUE` is set explicitly.

12. Run the smoke demo:

```bash
make smoke-e2e
```

For host-mode development against the same local model stack:

```bash
make dev
```

### Stop development environment

To completely stop the development environment, including both local processes and Docker-backed services (Postgres, target, Ollama):

```bash
# Stop Docker services and free local dev ports
make docker-down && make free-dev-ports
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
FRONTEND_URL=https://synosecai.com
```

`AUTH_ALLOWED_EMAILS` is enforced on every authenticated request, so removing an email from the allowlist invalidates access on the next session-backed call. `AUTH_SESSION_TOUCH_INTERVAL_SECONDS` throttles `lastSeenAt` writes to avoid turning normal UI traffic into a write on every request.

The Google redirect URI must match exactly. Do not register or rely on query-string variants such as `http://localhost:5173/api/auth/google?redirectTo=%2Fapplications`.

## Endpoints

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Ollama API: `http://localhost:11434`
- Vulnerable target: `http://localhost:8888`

## VPS deploy

GitHub Actions deploys to a VPS using `.github/workflows/deploy.yml` and the production stack in `docker-compose.vps.yml`.

- Host `nginx` runs directly on the VPS and proxies traffic to Dockerized frontend and backend services bound on loopback.
- `backend` runs the compiled API. Production schema changes must be applied through committed Prisma migrations.
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
The deploy workflow hardcodes the VPS app directory to `/opt/synosec` and binds the host loopback ports to `3030` for the frontend and `3031` for the backend.
The deploy user must already be able to create and write `${VPS_TARGET_DIR}` without `sudo`.
The deploy user must also be able to write `NGINX_CONFIG_PATH` directly and run `/usr/sbin/nginx -t` plus `/usr/sbin/nginx -s reload` without privilege escalation. If those permissions are missing, deploy fails immediately.
Production deploys no longer use `sudo`, `chown`, or `prisma db push`.
Production startup now requires committed Prisma migrations. If `apps/backend/prisma/migrations` is missing or empty, the backend container exits instead of mutating the database schema implicitly.

Set `SERVER_NAME` to the apex domain only, for example `synosecai.com`. The nginx template will serve both `synosecai.com` and `www.synosecai.com`.

Set `FRONTEND_URL` to the public HTTPS origin: `https://synosecai.com`.

For Google Cloud Console production setup, use:

- `Authorized JavaScript origins`: `https://synosecai.com`
- `Authorized redirect URIs`: `https://synosecai.com/api/auth/google`

If production traffic can also land on `https://www.synosecai.com`, add both of these as well:

- `Authorized JavaScript origins`: `https://www.synosecai.com`
- `Authorized redirect URIs`: `https://www.synosecai.com/api/auth/google`

Set `NGINX_CONFIG_PATH` to the exact nginx site config path the deploy user can write directly, for example `/etc/nginx/sites-available/synosec`.

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
make docker-up         # Start full stack (Docker Compose)
make docker-down       # Stop and remove containers
make dev               # Start local dev against Docker-backed infra
make docker-down && make free-dev-ports # Stop everything completely
make smoke-e2e         # Run the Docker E2E smoke scan
make test              # Run workspace tests
pnpm build             # Build all workspace packages
```

## Contributing

Contribute to an existing feature when it is already documented in [docs/features.md](/home/nilwi971/projects/SynoSec-buildathon/docs/features.md) and has a clear purpose, a defined test path, and enough developer-facing notes to preserve the intended behavior.

The cutoff is strict:

- If a feature does not yet have purpose, tests, and developer documentation, do not expand it as normal product work.
- Document the feature first, define how it will be tested, and only then extend it.
- Do not contribute new behavior to retired or frozen areas unless the reactivation effort is explicitly documented as a new active feature.

For connector-related work, preserve local/VPS parity and keep execution broker-mediated. Do not introduce direct model-to-tool or model-to-shell access as a shortcut.

## Tool Platform Architecture

The tool platform is designed so the repo can grow from a handful of demo tools to hundreds of cataloged tools without turning the scan loop, seed data, or UI into a maintenance bottleneck.

The current model has six pieces:

1. A modular tool catalog in `apps/backend/src/workflow-engine/tools/catalog/`
2. Modular seeded tool implementations in `scripts/tools/` and `apps/backend/prisma/seed-data/tools/`
3. A runtime tool selector that pre-filters tools before they reach the model
4. An opt-in agent-tool policy layer for automatic assignment
5. Frontend list UX that remains usable at larger tool counts
6. A steady-state workflow for adding new tools with minimal friction

### Phase 1: Modular Tool Catalog

The canonical catalog lives under:

- `apps/backend/src/workflow-engine/tools/catalog/types.ts`
- `apps/backend/src/workflow-engine/tools/catalog/index.ts`
- `apps/backend/src/workflow-engine/tools/catalog/<domain>.ts`

Domains are split by capability area such as:

- `network.ts`
- `web.ts`
- `content.ts`
- `subdomain.ts`
- `dns.ts`
- `password.ts`
- `cloud.ts`
- `kubernetes.ts`
- `windows.ts`
- `forensics.ts`
- `reversing.ts`
- `exploitation.ts`
- `utility.ts`

`tool-catalog.ts` still exposes the same public functions:

- `getToolCatalog()`
- `getToolCapabilities()`
- `isToolCatalogEntryAvailable()`

Every catalog entry now includes additional metadata used by the selector and future assignment logic:

- `phase`
- `osiLayers`
- `tags`

Current `phase` values:

- `recon`
- `enum`
- `vuln-scan`
- `exploit`
- `post`
- `report`
- `utility`

`tool-catalog.ts` also performs a duplicate ID guard at startup. Duplicate catalog IDs are treated as a hard error.

### Phase 2: Modular Seed Architecture

Seeded tools are no longer defined as one large file with inline bash factories.

The implementation is split into:

- Shell assets in `scripts/tools/<category>/<tool>.sh`
- Per-tool seed modules in `apps/backend/prisma/seed-data/tools/<category>/<tool>.ts`
- An assembler in `apps/backend/prisma/seed-data/ai-builder-defaults.ts`

Each seed module exports one tool object with a lazy `bashSource` getter that reads the script from disk. Example pattern:

```ts
export const httpReconTool = {
  id: "seed-http-recon",
  name: "HTTP Recon",
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/web/http-recon.sh");
  }
} as const;
```

Startup fail-fast behavior:

- `apps/backend/src/main.ts` calls `validateSeededToolDefinitions()`
- missing script files fail the backend immediately
- `apps/backend/prisma/seed-data/tools/load-script.ts` resolves both source and built `dist/` layouts

This means seeded tool definitions stay small and script logic lives in real `.sh` files where it is easier to inspect, test, and replace.

### Phase 3: Tool Selector Layer

The critical context-limit fix lives in:

- `apps/backend/src/workflow-engine/tools/tool-selector.ts`

The selector scores available tools before they are passed to the model. This prevents the single-agent scan loop from dumping every approved tool into one model call.

Selector inputs:

- requested OSI layers
- current layer coverage
- already executed tool IDs
- current findings
- `allowActiveExploits`

Scoring signals:

- layer alignment
- phase progression
- risk tier gate
- recency penalty

Important behavior:

- `controlled-exploit` tools are hard-gated when `allowActiveExploits === false`
- recently used tools are penalized
- if the top slice is all one category, the selector swaps in another category for diversity
- catalog metadata is used when available; uncataloged tools default to `phase: "utility"` and `osiLayers: ["L7"]`

Integration:

- Anthropic loop: select once before building the evidence tool map
- Local loop: re-select at the start of each iteration
- lifecycle actions are always available and are never filtered:
  - `report_vulnerability`
  - `update_layer_coverage`
  - `submit_scan_completion`

Main integration point:

- `apps/backend/src/features/modules/scans/single-agent-scan.service.ts`

### Phase 4: Smart Agent-Tool Assignment

Agent-tool auto-assignment is opt-in and lives in:

- `apps/backend/prisma/seed-data/agent-tool-policies.ts`
- `apps/backend/src/features/modules/ai-agents/agent-tool-resolver.ts`

This layer exists to remove manual junction-table style maintenance as the tool count grows.

How it works:

- If no policy exists for an agent, behavior stays exactly as before: use `agent.toolIds`
- If a policy exists, SynoSec:
  - loads active tools
  - starts from `pinnedToolIds`
  - preserves explicit `agent.toolIds`
  - adds policy-matched tools using catalog metadata such as category, risk tier, phase, and tags
  - deduplicates the final set

Current rollout status:

- `AGENT_TOOL_POLICIES` is intentionally empty by default
- policies are activated one agent at a time by adding an entry

This keeps rollout safe while enabling future “new tool automatically appears for the right agent” behavior.

### Phase 5: Frontend UX for Large Tool Sets

The AI tools page has been updated to remain usable when the tool inventory grows:

- file: `apps/frontend/src/pages/ai-tools-page.tsx`

Current list UX improvements:

- category filter
- risk tier filter
- `list` / `grouped` view mode toggle
- grouped-by-category rendering on the client
- compact colored risk badges:
  - passive = green
  - active = amber
  - controlled-exploit = red
- default page size of 50 for the tools page

This is intentionally page-local behavior so the shared list component does not need to know about tool-specific grouping logic.

### Phase 6: Adding a New Tool

The steady-state workflow for adding a tool is now:

1. Add a `ToolCatalogEntry` to the correct file in `apps/backend/src/workflow-engine/tools/catalog/`
2. Include `phase`, `osiLayers`, and `tags`
3. Add the implementation script in `scripts/tools/<category>/<tool-name>.sh`
4. Add the seed module in `apps/backend/prisma/seed-data/tools/<category>/<tool-name>.ts`
5. Import it into `apps/backend/prisma/seed-data/ai-builder-defaults.ts` and add it to `seededToolDefinitions`
6. Run the seed upsert so the tool exists in the database
7. If a policy later covers that category/phase/tag set, the tool becomes available automatically to the relevant agents

The core goal is low-friction tool authoring:

- write a `.sh` script
- add a small metadata object
- let the catalog, seed layer, selector, and policy system do the rest

## Developer Notes

### Where Tool Behavior Actually Comes From

There are three different layers to keep straight:

- Catalog metadata:
  `apps/backend/src/workflow-engine/tools/catalog/`
  This is capability metadata, installation checks, selection hints, and future assignment input.

- Seeded tool implementations:
  `scripts/tools/`
  `apps/backend/prisma/seed-data/tools/`
  These are the concrete built-in tools that get seeded into the database.

- Runtime execution config:
  Stored on the tool record and resolved through:
  `apps/backend/src/features/modules/ai-tools/tool-execution-config.ts`

If you change tool behavior, make sure you are editing the correct layer.

### Current Seeded Tool Set

SynoSec comes with a comprehensive set of built-in security tools categorized by domain:

- **Network**: `nmap`, `ncat`, `netcat`, `service-scan`
- **Web**: `nikto`, `sqlmap`, `http-recon`, `http-headers`, `sql-injection-check`, `vuln-audit`
- **Content Discovery**: `gobuster`, `dirb`, `ffuf`, `web-crawl`, `content-discovery`
- **Subdomain Enumeration**: `amass`, `sublist3r`
- **Exploitation**: `metasploit-framework`
- **Password Cracking**: `hashcat`
- **Forensics**: `steghide`
- **Windows Enumeration**: `enum4linux`
- **Utility**: `bash-probe`

These tools are pre-configured with bash scripts in `scripts/tools/` and seeded into the database for immediate use by AI agents.

### Key Backend Files

- Scan loop:
  `apps/backend/src/features/modules/scans/single-agent-scan.service.ts`
- Tool selector:
  `apps/backend/src/workflow-engine/tools/tool-selector.ts`
- Tool catalog entrypoint:
  `apps/backend/src/workflow-engine/tools/tool-catalog.ts`
- Agent tool resolver:
  `apps/backend/src/features/modules/ai-agents/agent-tool-resolver.ts`
- Seed assembler:
  `apps/backend/prisma/seed-data/ai-builder-defaults.ts`

### Recommended Checks After Tool-Platform Changes

Backend:

- `pnpm --filter @synosec/backend exec tsc -p tsconfig.json --noEmit`
- targeted Vitest runs for the area you changed

Frontend:

- `pnpm --filter @synosec/frontend exec tsc -p tsconfig.json --noEmit`

If you touch seeded scripts or seed modules, also make sure startup validation still passes and that `pnpm --filter @synosec/backend build` succeeds.
