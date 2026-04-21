# Repo Restructure Plan

This document turns the current cleanup observations into a concrete target structure and a staged migration plan.

It is intentionally conservative:

- It does not assume a clean worktree.
- It does not require a big-bang rewrite.
- It preserves the current app/package boundaries.
- It focuses first on ownership clarity, then on build and operational simplification.

## Goals

- Make it obvious where new code belongs.
- Reduce backend layering overlap.
- Make frontend feature ownership clearer.
- Separate core platform concerns from product modules.
- Reduce command drift between host dev, Docker dev, and deployment.
- Keep cross-app contracts and shared utilities in packages instead of ad hoc duplication.

## Current Structural Problems

### Backend

The backend currently spreads related concerns across multiple top-level areas:

- `src/features/modules`
- `src/platform`
- `src/workflows`
- `src/integrations`
- `src/auth`

That makes ownership blurry, especially for workflow execution and connector behavior, which currently cross several top-level trees.

### Frontend

The frontend is in better shape, but still mixes:

- route pages
- shared UI
- feature-specific UI
- generic hooks
- API clients
- tests split by technical type rather than product feature

This is manageable now, but it will get noisier as more flow and auth surfaces are added.

### Docs And Operations

Operational guidance is split across:

- `README.md`
- `Makefile`
- `docker-compose.yml`
- package scripts
- feature inventory docs

Some of it is already drifting. Example: the feature inventory references retired route files that no longer exist.

## Target Repository Shape

The repo should keep the monorepo split at the top level:

```text
apps/
  backend/
  connector/
  frontend/
packages/
  contracts/
  config/
  connector-sdk/
  test-utils/
docs/
  architecture/
  product/
  adr/
demos/
infra/
scripts/
```

Notes:

- `packages/config`, `packages/connector-sdk`, and `packages/test-utils` do not need to exist immediately. They are target extractions.
- `infra/` should only exist if it contains real deployment or local-infra assets. If not, remove it.
- `docs/` should separate audience and purpose instead of mixing pitch, requirements, and implementation notes at one level.

## Target Backend Shape

### Top-Level Layout

```text
apps/backend/src/
  app/
  core/
  modules/
  integrations/
  workflow-engine/
  types/
```

### Ownership Rules

#### `app/`

Composition only.

- app creation
- route registration
- top-level middleware wiring
- bootstrapping

Candidate contents:

- `create-app.ts`
- `register-routes.ts`
- `main.ts`

#### `core/`

Framework and cross-cutting infrastructure, with no product-specific behavior.

- env loading
- database client
- HTTP helpers
- error handling
- pagination
- shared request utilities

Candidate contents from today:

- `platform/core/env/*`
- `platform/core/database/*`
- `platform/core/http/*`
- `platform/core/pagination/*`

#### `modules/`

Product-facing domains. Each module owns its route layer, service layer, data mapping, and repository abstraction.

Target shape:

```text
modules/
  ai-agents/
    routes.ts
    service.ts
    repository.ts
    prisma-repository.ts
    memory-repository.ts
    mapper.ts
    schema.ts
    *.test.ts
  ai-providers/
  ai-tools/
  applications/
  auth/
  health/
  runtimes/
  workflows/
```

Rules:

- If a concept is exposed to the product or UI, it belongs in a module.
- Route tests and service tests should live beside the module.
- Avoid generic `platform/routes` once module routes are established.

#### `integrations/`

External-system boundaries only.

- connector control plane transport
- provider-specific or external API integrations
- future webhook or third-party adapters

Keep them thin. Product logic should stay in modules or the workflow engine.

#### `workflow-engine/`

Use this only for truly cross-domain orchestration logic.

Likely contents:

- broker
- policy
- evidence handling
- tool runner adapters
- scan loop orchestration
- evaluation harnesses

Current `src/workflows` and workflow-related backend code should converge here, except module-specific workflow CRUD, which belongs in `modules/workflows`.

### Concrete Moves From Current Tree

- `src/platform/app/*` -> `src/app/*`
- `src/platform/core/*` -> `src/core/*`
- `src/auth/*` -> `src/modules/auth/*`
- `src/features/modules/*` -> `src/modules/*`
- `src/workflows/broker/*` -> `src/workflow-engine/broker/*`
- `src/workflows/tools/*` -> `src/workflow-engine/tools/*`
- `src/workflows/evals/*` -> `src/workflow-engine/evals/*`

Do not move files only for aesthetics. Move them when the destination ownership rule is clear.

## Target Frontend Shape

### Top-Level Layout

```text
apps/frontend/src/
  app/
  shared/
  features/
```

### Ownership Rules

#### `app/`

- root app shell
- router setup
- providers
- global navigation wiring
- startup entrypoints

Candidate contents:

- `main.tsx`
- `App.tsx`
- `router.tsx`
- navigation registration

#### `shared/`

Reusable, non-product-specific pieces.

- `ui/`
- `lib/`
- small cross-feature hooks
- API primitives

Move here only if the code is actually reused across features.

#### `features/`

Product-specific UI and behavior grouped by domain.

Target shape:

```text
features/
  ai-agents/
  ai-providers/
  ai-tools/
  applications/
  auth/
  runtimes/
  workflows/
```

Each feature can contain:

- `page.tsx`
- `components/*`
- `api.ts`
- `types.ts`
- `hooks.ts`
- `*.test.tsx`

### Concrete Moves From Current Tree

- `src/auth/*` -> `src/features/auth/*`
- `src/pages/workflows/*` -> `src/features/workflows/*`
- `src/pages/*-page.tsx` -> matching `src/features/<feature>/page.tsx`
- shared primitives under `src/components/ui/*` -> `src/shared/ui/*`
- only truly generic helpers remain in `src/shared/lib/*`

The point is to stop growing a large `pages/` folder that becomes the dumping ground for all feature logic.

## Target Package Extractions

You already have a correct first shared package:

- `packages/contracts`

The next extractions should be driven by actual duplication:

### `packages/config`

Use for:

- shared env schemas
- default constants
- runtime flags used by multiple apps

Do not keep repeating env parsing rules in backend scripts, Docker wiring, and app boot logic.

### `packages/connector-sdk`

Use for:

- connector request and response helpers
- polling payload types
- auth header helpers
- shared execution envelopes

This should hold logic shared by backend and connector that is more than plain type contracts.

### `packages/test-utils`

Use for:

- shared Vitest setup
- contract test fixtures
- test data builders
- API test helpers

Only extract this after the first few repeated patterns are obvious.

## Docs Restructure

Target docs shape:

```text
docs/
  architecture/
    repo-structure.md
    workflow-engine.md
    connector-control-plane.md
  product/
    requirements.md
    pitch.md
    vulnerable-app-specification.md
  adr/
    0001-monorepo-and-runtime-shape.md
    0002-broker-mediated-tool-execution.md
```

Suggested moves from the current docs set:

- `docs/requirements.md` -> `docs/product/requirements.md`
- `docs/pitch.md` -> `docs/product/pitch.md`
- `docs/vulnerable-app-specification.md` -> `docs/product/vulnerable-app-specification.md`
- `docs/defensive-loop-contract.md` -> `docs/architecture/defensive-loop-contract.md`
- `docs/strategy-flow-terminology.md` -> `docs/architecture/strategy-flow-terminology.md`
- `docs/ai-sdk-workflow-devkit.md` -> `docs/architecture/ai-sdk-workflow-devkit.md`
- `docs/decisions.md` -> replace gradually with real ADR files under `docs/adr/`

Keep `docs/features.md` as the feature inventory if that workflow is useful, but it needs periodic pruning so it does not become stale policy fiction.

## Operational Cleanup Targets

### Commands

Define and document exactly two developer modes:

1. Host development
2. Docker development

Everything else should be derived from those.

Recommended command surface:

- `pnpm dev` for host app development
- `make dev-host` for host app development plus Docker-backed dependencies
- `make dev-docker` for full Docker stack
- `pnpm test`
- `pnpm build`

Deprecate ambiguous names gradually if needed, but stop adding new ones.

### Compose

Split the current Compose file into:

- `docker-compose.yml` for shared base services
- `docker-compose.dev.yml` for local mounts and dev commands

Reasons:

- VPS deploy and local dev do not need the same overrides.
- Runtime `pnpm install` in service commands is a dev-only concern.
- Volume-heavy local mounts should not define the deployment shape.

### Containers

Reduce startup drift by:

- avoiding `pnpm install` in service startup commands
- moving more setup into Dockerfiles or explicit bootstrap commands
- keeping dev containers and deploy containers separate when their needs diverge

## Repo Hygiene Targets

### Remove Or Relocate Noise

The repo root currently carries local-agent and local-artifact noise:

- `.agents/`
- `.claude/`
- `.ralph/`
- `.local/`
- `.playwright-mcp/`
- screenshot artifacts in the repo root

These should either:

- live outside the repo, or
- stay ignored and moved under a single clearly non-source directory

### Keep Generated Files Out Of Source Trees

Generated artifacts should not sit under source ownership paths unless the tool requires it.

Current cleanup direction already appears to be moving Prisma generated output out of tracked source paths. Keep going in that direction.

### Eliminate Stale References

Current example:

- `docs/features.md` still references retired route files that are no longer present.

A restructure should include doc verification, not just file movement.

### Normalize Naming

Fix obvious naming debt while touching adjacent files:

- `LOCAL_ENABHLED` -> `LOCAL_ENABLED`

Do not preserve known typos in the long-term interface unless there is an explicit compatibility bridge.

## Migration Plan

This should be done in stages so feature work can continue.

### Stage 1: Guardrails And Inventory

Goal: stabilize ownership before moving large file sets.

Actions:

- add this plan doc
- decide the target backend and frontend top-level layout
- stop adding new code to legacy top-level areas when an obvious target exists
- fix stale documentation references
- document which paths are source, generated, temporary, or local-only

Exit criteria:

- contributors can tell where new code should go
- docs no longer reference missing files as active structure

### Stage 2: Backend Top-Level Flattening

Goal: make backend ownership legible.

Actions:

- create `src/app`, `src/core`, `src/modules`, and `src/workflow-engine`
- move `platform/app` to `app`
- move `platform/core` to `core`
- move `auth` into `modules/auth`
- move one backend feature module at a time from `features/modules/*` to `modules/*`

Recommended order:

1. `health`
2. `applications`
3. `runtimes`
4. `ai-providers`
5. `ai-agents`
6. `ai-tools`
7. `workflows`
8. `auth`

Exit criteria:

- no new product module code lands under `features/modules`
- app and core ownership are clear

### Stage 3: Workflow Engine Consolidation

Goal: stop splitting orchestration logic across multiple trees.

Actions:

- move broker, tool execution, and eval code under `workflow-engine`
- keep workflow CRUD and UI-facing workflow resource code under `modules/workflows`
- define a clear boundary between workflow engine internals and workflow module HTTP/resource surfaces

Exit criteria:

- workflow execution logic is in one top-level backend area
- module routes no longer reach across several unrelated folders for core behavior

### Stage 4: Frontend Feature Consolidation

Goal: make frontend growth cheaper.

Actions:

- create `src/app`, `src/shared`, `src/features`
- move shared UI primitives under `shared/ui`
- migrate one feature at a time out of `pages/`
- colocate tests with features where practical

Recommended order:

1. `auth`
2. `workflows`
3. `ai-tools`
4. `ai-providers`
5. `ai-agents`
6. `applications`
7. `runtimes`

Exit criteria:

- feature code is grouped by domain
- `pages/` is gone or reduced to a temporary compatibility layer

### Stage 5: Shared Package Extractions

Goal: remove duplication after module boundaries are clearer.

Actions:

- extract shared config rules into `packages/config`
- extract connector/backend shared helpers into `packages/connector-sdk`
- extract repeated test helpers into `packages/test-utils`

Exit criteria:

- cross-app shared logic lives in packages instead of copy-pasted helpers

### Stage 6: Dev And Deploy Split

Goal: reduce operational confusion.

Actions:

- split Compose base and dev overrides
- define canonical host-dev and Docker-dev commands
- remove duplicated build steps
- reduce runtime installs in Compose commands

Exit criteria:

- new contributors can start the stack without guessing which path is canonical
- local dev and deploy paths are intentionally different where needed

## Immediate Next Actions

If you want the restructure to start now without colliding with current feature work, do these first:

1. Fix stale docs and rename obvious config debt such as `LOCAL_ENABHLED`.
2. Create the new top-level backend folders and start routing new code into them without moving everything at once.
3. Migrate one low-risk backend module and one low-risk frontend feature to establish the pattern.

## Non-Goals

- rewriting the product architecture during repo cleanup
- changing backend, connector, and frontend into a different monorepo model
- extracting packages before boundaries are understood
- forcing all tests, docs, and paths to move in one PR

## Success Criteria

The restructure is succeeding when:

- a contributor can place a new file without asking where it belongs
- workflow execution ownership is unambiguous
- frontend feature code is colocated by domain
- Docker dev and deploy paths are intentionally separated
- docs match the live repository shape
