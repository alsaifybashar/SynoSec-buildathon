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
8. The current Google integration uses Google Identity Services redirect mode. Google posts the returned ID token to `/api/auth/google`, the backend verifies it, creates the SynoSec session cookie, and redirects the browser back into the app.
9. In Google Cloud Console, use these values:
   Local:
   `Authorized JavaScript origins` = `http://localhost:5173`
   `Authorized redirect URIs` = `http://localhost:5173/api/auth/google`
   Production:
   `Authorized JavaScript origins` = `https://synosecai.com`
   `Authorized redirect URIs` = `https://synosecai.com/api/auth/google`
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
The deploy user must have passwordless `sudo` for `install`, `find`, and `rm` against that path, because the workflow prepares and clears `/opt/synosec` before uploading each release.

Set `SERVER_NAME` to the apex domain only, for example `synosecai.com`. The nginx template will serve both `synosecai.com` and `www.synosecai.com`.

Set `FRONTEND_URL` to the public HTTPS origin: `https://synosecai.com`.

For Google Cloud Console production setup, use:

- `Authorized JavaScript origins`: `https://synosecai.com`
- `Authorized redirect URIs`: `https://synosecai.com/api/auth/google`

If production traffic can also land on `https://www.synosecai.com`, add both of these as well:

- `Authorized JavaScript origins`: `https://www.synosecai.com`
- `Authorized redirect URIs`: `https://www.synosecai.com/api/auth/google`

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


  ---
  Project Overview

  SynoSec is an AI-driven automated pentesting platform. The architecture has three key
  layers:

  1. AI Agent (Claude/Ollama) — decides which tools to run based on OSI layer analysis
  2. Tool Broker — policy engine + execution dispatcher
  3. Tool Layer — bash scripts or native binaries that do the actual scanning

  ---
  How Tools Are Implemented

  Two Types of Tools

  Type 1: Seeded Self-Contained Tools (stored in the database as bash scripts)

  These run Node.js inline HTTP code — no external binaries required:

  ┌──────────────────────────┬───────────────────────────────┬──────────────────────────┐
  │           Tool           │         What It Does          │     Real Pentesting      │
  │                          │                               │        Equivalent        │
  ├──────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │                          │                               │ Initial footprinting —   │
  │ seed-http-recon          │ Probes URL for status, title, │ httpx -silent            │
  │                          │  tech stack via httpx         │ -status-code -title      │
  │                          │                               │ -tech-detect             │
  ├──────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │                          │ curl -sS -I -L to grab raw    │ Manual banner grabbing   │
  │ seed-http-headers        │ response headers              │ to find server version   │
  │                          │                               │ leaks                    │
  ├──────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │                          │ BFS crawls up to 8            │ Spider phase — maps      │
  │ seed-web-crawl           │ same-origin pages following   │ attack surface before    │
  │                          │ href links                    │ exploitation             │
  ├──────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │                          │                               │ Poor-man's nmap -sV —    │
  │ seed-service-scan        │ Raw TCP socket + HEAD banner  │ confirms the service is  │
  │                          │ grab on derived port          │ alive and extracts       │
  │                          │                               │ banner                   │
  ├──────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │                          │ Probes a fixed wordlist:      │ Mimics gobuster dir or   │
  │ seed-content-discovery   │ /admin, /login, /.env,        │ ffuf with a small        │
  │                          │ /.git/config, etc.            │ wordlist                 │
  ├──────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │                          │ Checks unauthenticated        │ Mimics nuclei template   │
  │ seed-vuln-audit          │ /admin, PII leaks at          │ checks + manual header   │
  │                          │ /api/users, missing security  │ review                   │
  │                          │ headers                       │                          │
  ├──────────────────────────┼───────────────────────────────┼──────────────────────────┤
  │                          │ POSTs username=' OR '1'='1 to │ Same payload as sqlmap   │
  │ seed-sql-injection-check │  /login, detects bypass by    │ --level=1 auth bypass    │
  │                          │ regex                         │ test                     │
  └──────────────────────────┴───────────────────────────────┴──────────────────────────┘

  Type 2: Shell Wrapper Scripts (delegate to real installed binaries)

  Located in scripts/tools/, these call the actual tools when available:

  ┌────────────────────────┬────────────┬───────────────────────────────────────────────┐
  │         Script         │   Real     │                   Use Case                    │
  │                        │   Binary   │                                               │
  ├────────────────────────┼────────────┼───────────────────────────────────────────────┤
  │ service-scan.sh        │ nmap       │ Full port/service/OS detection                │
  ├────────────────────────┼────────────┼───────────────────────────────────────────────┤
  │ content-discovery.sh   │ ffuf       │ High-speed directory fuzzing with custom      │
  │                        │            │ wordlists                                     │
  ├────────────────────────┼────────────┼───────────────────────────────────────────────┤
  │ sql-injection-check.sh │ sqlmap     │ Automated SQL injection + DB extraction       │
  ├────────────────────────┼────────────┼───────────────────────────────────────────────┤
  │ vulnerability-audit.sh │ nuclei     │ Template-based CVE scanning                   │
  ├────────────────────────┼────────────┼───────────────────────────────────────────────┤
  │ web-crawl.sh           │ katana     │ JavaScript-aware deep web crawling            │
  ├────────────────────────┼────────────┼───────────────────────────────────────────────┤
  │ http-recon.sh          │ httpx      │ Bulk HTTP probing at scale                    │
  └────────────────────────┴────────────┴───────────────────────────────────────────────┘

  ---
  Real Pentesting Scenario Walkthrough

  Here's how a full scan maps to a real-world pentest methodology:

  Phase 1 — RECONNAISSANCE (OSI L3/L4)
    seed-service-scan → tcp banner grab → finds open ports
    seed-http-recon   → httpx probe    → confirms HTTP(S) service, grabs tech stack

  Phase 2 — ENUMERATION (OSI L7)
    seed-http-headers     → curl -I      → finds Server: Apache/2.2.34 (outdated), missing
  headers
    seed-web-crawl        → BFS crawler  → discovers /admin, /api/users, /files, /search
    seed-content-discovery → wordlist    → finds /.env, /.git/config, /login

  Phase 3 — VULNERABILITY IDENTIFICATION (OSI L7)
    seed-vuln-audit → checks:
      - /admin accessible without auth  → HIGH finding
      - /api/users returns SSNs/cards   → CRITICAL finding
      - Missing CSP/X-Frame-Options     → MEDIUM finding

  Phase 4 — EXPLOITATION (requires allowActiveExploits=true)
    seed-sql-injection-check → POST ' OR '1'='1 → confirms auth bypass
    [real sqlmap via sql-injection-check.sh when binary installed]

  Phase 5 — REPORTING
    AI agent calls report_vulnerability() for each confirmed finding
    submit_scan_completion() with per-OSI-layer coverage claims

  ---
  The AI's Role

  The AI agent (Claude or Ollama) acts as the pentester's decision loop. It:

  1. Receives a system prompt describing the target and scope
  2. Chooses which tool to call next based on what's been discovered so far
  3. Must justify each tool call by OSI layer (L1–L7)
  4. Interprets tool output and decides whether to dig deeper or move on
  5. Calls report_vulnerability() when it has sufficient confidence in a finding
  6. Has a max of 8 tool-call steps per run

  The confidence engine uses Bayesian merging — if two independent tools both detect the
  same finding, the combined confidence score rises above either alone.

  ---
  The Policy Engine (Safety Layer)

  Before any tool executes, authorizeToolRequest() checks:

  - Is the target in scan.scope.targets? (no scanning out-of-scope hosts)
  - If riskTier === "controlled-exploit" (sqlmap, hydra, metasploit) → requires
  allowActiveExploits: true explicitly set on the scan
  - Passive tools always run; active exploit tools are gated

  ---
  The 62-Tool Catalog

  The full catalog (tool-catalog.ts) includes tools across all pentesting domains:
  - Network: nmap, masscan, rustscan, autorecon
  - Web: nikto, nuclei, dalfox (XSS), ffuf, gobuster, feroxbuster
  - SQLi: sqlmap
  - Password: hydra, hashcat, john, medusa
  - Windows/AD: crackmapexec, enum4linux-ng, responder, evil-winrm
  - Subdomain/OSINT: amass, subfinder, theHarvester
  - Cloud: prowler, trivy, scout-suite
  - Forensics/Reversing: volatility3, radare2, binwalk, exiftool

  GET /api/tools/capabilities tells you which of these are actually installed on the current
   machine.
