# Feature Inventory

This document is the contributor-facing catalog of stable project features.

Use it to answer four questions before changing the system:

1. What feature already exists?
2. What is its purpose?
3. How is it tested?
4. Is it mature enough to extend safely?

## Maturity Cutoff

A feature is ready for normal contribution only when all of the following are true:

- It has a clear purpose.
- It has a defined test path, even if some tests are manual or Docker-based.
- It has enough developer-facing documentation to preserve intended behavior.

If one of those is missing, do not treat the work as a normal extension. Document it first, define the test path, and make the behavior explicit before expanding it.

Do not extend retired APIs or temporary scaffolding unless that reactivation work is itself documented here.

## Feature Template

Use this structure when adding a new feature to the catalog:

### Feature Name

- Status:
- Purpose:
- Value:
- Main components:
- How it is tested:
- Local validation:
- Contribution notes:
- Current limits or non-goals:

## Active Features

### Backend API And Resource Management

- Status: Active
- Purpose: Provide the backend HTTP surface for health, brief, applications, runtimes, AI providers, AI agents, AI tools, and related control-plane operations.
- Value: Gives the frontend and developers stable endpoints for configuration, inspection, and platform management.
- Main components: `apps/backend/src/platform/app`, route modules under `apps/backend/src/features/modules`, shared contracts in `packages/contracts`.
- How it is tested: Route tests under `apps/backend/src/features/modules/**/*routes.test.ts` and contract validation tests in `packages/contracts/src/index.test.ts`.
- Local validation: Run `pnpm --filter @synosec/backend test` or targeted route tests, then start the stack with `make docker-up`.
- Contribution notes: Extend existing route modules and shared contracts together. Keep request and response schemas aligned with the contracts package.
- Current limits or non-goals: Retired scan endpoints are not part of this active surface.

### AI Builder Defaults

- Status: Active
- Purpose: Seed the default AI builder records for providers, agents, and tools directly into the database.
- Value: Makes starter configurations portable, inspectable, and editable through the live CRUD surfaces instead of runtime-generated code defaults.
- Main components: `apps/backend/prisma/seed.ts`, Prisma AI models, builder routes and UI pages.
- How it is tested: Seed execution against local Postgres plus targeted provider/agent/tool route tests.
- Local validation: Run `pnpm --filter @synosec/backend prisma:seed`, then verify `/api/ai-providers`, `/api/ai-agents`, and `/api/ai-tools` return the seeded records.
- Contribution notes: Add or adjust starter records only through the seed path. Do not reintroduce runtime auto-population for builder defaults.
- Current limits or non-goals: Seeded defaults are starter records, not immutable system resources.

### Live Local Tool Evaluation

- Status: Active
- Purpose: Evaluate the seeded AI tool defaults against the running local Qwen model in Ollama.
- Value: Keeps the seeded tool catalog and role-to-tool assignments grounded in actual model behavior instead of static assumptions.
- Main components: `apps/backend/prisma/seed-data/ai-builder-defaults.ts`, `apps/backend/src/workflows/evals`.
- How it is tested: Unit tests for response parsing plus live backend integration tests that call the local Ollama model and assert seeded tool selection.
- Local validation: Ensure Ollama is running with `qwen3:1.7b`, then run `pnpm --filter @synosec/backend test`.
- Contribution notes: Use the exported seeded definitions as the test source of truth. Keep live evaluation prompts deterministic and assert exact tool ids.
- Current limits or non-goals: This is a selection-evaluation harness, not a general agent execution runtime or argument-generation framework.

### Brokered Tool Execution

- Status: Active
- Purpose: Accept agent-planned tool requests, enforce policy, execute through an approved transport, and turn results into evidence.
- Value: Keeps planning separate from execution and preserves auditability, scope checks, and reproducibility.
- Main components: `apps/backend/src/workflows/broker`, `apps/backend/src/workflows/tools`, `packages/contracts`.
- How it is tested: Broker policy and broker execution tests in `apps/backend/src/workflows/broker/*.test.ts`.
- Local validation: Run `pnpm --filter @synosec/backend exec vitest run src/broker/policy.test.ts src/broker/tool-broker.test.ts`.
- Contribution notes: Keep the broker as the control boundary. New execution behavior must still flow through policy authorization and structured `ToolRequest` and `ToolRun` types.
- Current limits or non-goals: Do not bypass the broker with direct model-to-tool execution.

### Connector Control Plane

- Status: Active
- Purpose: Provide the local-and-VPS-compatible execution path where the backend dispatches approved jobs and a connector polls, executes, and reports results.
- Value: Makes the same connector shape usable in local Docker and later on a VPS without exposing direct tool access from the model layer.
- Main components: `apps/backend/src/integrations/connectors`, `apps/connector`, connector-related contracts in `packages/contracts`.
- How it is tested: Contract tests in `packages/contracts/src/index.test.ts`, backend connector route tests in `apps/backend/src/integrations/connectors/routes.test.ts`, and connector package tests in `apps/connector/src/index.test.ts`.
- Local validation: Use `POST /api/connectors/test-dispatch` for broker-to-connector flow validation, run the targeted test suites, and run the Docker stack with connector mode enabled.
- Contribution notes: Preserve broker-mediated execution, local/VPS parity, and the allowlisted adapter model. Extend connector behavior through contracts and control-plane routes, not through direct model-facing tool surfaces.
- Current limits or non-goals: This is not a general MCP passthrough and not a direct shell surface for the model. Connector changes must keep `dry-run`, `simulate`, and `execute` behavior explicit.

### Docker-Based Local Development Stack

- Status: Active
- Purpose: Provide a reproducible local environment for frontend, backend, connector, databases, and vulnerable target services.
- Value: Lets contributors validate behavior in the same shape intended for later remote deployment.
- Main components: `docker-compose.yml`, `Makefile`, `.env.example`, service Dockerfiles.
- How it is tested: Build checks, targeted package tests, and manual stack validation with `make docker-up`.
- Local validation: Start with `make docker-up`, confirm `/api/health`, and use the documented commands in `README.md`.
- Contribution notes: Keep environment parity in mind. If a change only works locally in-process but not in the connector-backed stack, it is incomplete.
- Current limits or non-goals: Docker convenience should not replace contract and package-level tests.

### Intentionally Vulnerable Demo Target

- Status: Active
- Purpose: Provide a controlled target for local scanning exercises and execution-path testing.
- Value: Makes it possible to test tool execution and evidence handling without aiming at external infrastructure.
- Main components: `demos/vulnerable-app`.
- How it is tested: Local Docker stack usage and targeted smoke or manual validation.
- Local validation: Start the stack and access the target on port `8888`.
- Contribution notes: Keep the target intentionally unsafe but contained. Changes here should improve local testing value, not become product logic.
- Current limits or non-goals: This is not production code and should not be treated as a hardened example.

## Retired Or Frozen Areas

### Retired Scan API

- Status: Retired
- Purpose: Historical scan endpoints kept only to return explicit deprecation responses.
- Value: Prevents silent failure for callers while the active work happens elsewhere.
- Main components: `apps/backend/src/platform/routes/deprecated.ts`.
- How it is tested: `apps/backend/src/platform/routes/deprecated.test.ts`.
- Local validation: Call the retired endpoints and confirm `410` responses.
- Contribution notes: Do not add new functionality here unless there is a documented reactivation effort with a new feature entry in this document.
- Current limits or non-goals: These routes are not the current product surface and should not be treated as active feature work.
