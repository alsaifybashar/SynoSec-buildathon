# Backend Composition, Modules, and Resource Boundaries

## Summary

The backend changes from April 22-24 expanded capability faster than they clarified ownership. The current codebase now supports richer workflow execution, a new orchestrator surface, more tools, broader seeded defaults, and additional route surfaces. The cost is that backend composition still spans `features/modules`, `workflow-engine`, `platform/routes`, and older storage paths in ways that do not yet line up cleanly.

This does not mean the structure is failing. It means the backend now needs a sharper ownership pass before more capability lands on top.

## What Changed

- `apps/backend/src/app/register-routes.ts` now wires more module routes plus orchestrator and tool-capability surfaces.
- `apps/backend/src/features/modules/orchestrator/orchestrator.service.ts` introduced a parallel orchestration path with SSE, persistence, model reasoning, and script execution.
- Workflow execution kept expanding as the run and transcript experience matured.
- Shared contracts in `packages/contracts` continue to define core resource surfaces, especially around resources and tools.

## Current Architecture

The runtime composition point is clear: `register-routes.ts` constructs services and wires routes. The issue is the number of different ownership styles that meet there:

- CRUD-oriented resource modules under `features/modules`
- workflow execution logic under both `features/modules/workflows` and `workflow-engine`
- platform-owned routes such as tool capabilities
- orchestrator logic that looks like a product module but also behaves like a second execution engine

The resource layer is relatively disciplined. The execution-heavy layer is not yet.

## Architectural Findings

### 1. Route registration reveals backend boundary overlap

`register-routes.ts` has to understand too much about how execution surfaces are assembled. It instantiates workflow streaming, single-agent scanning, workflow execution, orchestrator streaming, and orchestrator execution in one place. That is manageable today, but it is a sign that composition depends on cross-boundary knowledge.

### 2. The orchestrator is a second orchestration system, not just another CRUD module

`orchestrator.service.ts` owns run lifecycle, reasoning events, attack-map persistence, provider use, suggested tool execution, and SSE publication. That places it closer to workflow-engine behavior than to ordinary feature-module behavior, but it currently lives as a feature module. The tension is architectural, not cosmetic.

### 3. Shared contracts cover resources better than execution domains

`packages/contracts/src/resources.ts` gives the CRUD resource surfaces a stable schema layer. The execution domains are less normalized. Workflow runs, trace projections, tool capability surfaces, and orchestrator events are still more backend-shaped than contract-first in several places.

### 4. The current tree only partially matches the repo restructure target

`docs/repo-restructure-plan.md` already argues for clearer separation between app composition, modules, integrations, and workflow-engine logic. The last two days moved capabilities forward, but they also increased drift from that target in the execution-heavy parts of the backend.

## Manageable Work Slices

1. Define the execution-domain ownership map.
Document which responsibilities belong to `modules/workflows`, `workflow-engine`, and the orchestrator path before moving more code.

2. Reduce route-composition knowledge in `register-routes.ts`.
Push construction and dependency assembly closer to module or engine boundaries so the app layer composes fewer low-level execution details.

3. Decide where the orchestrator belongs.
Either keep it as a product module with a narrow API role or treat it as part of a broader execution engine domain and reorganize accordingly.

4. Expand contract-first treatment for execution surfaces.
Make workflow run views, capability payloads, and orchestrator event shapes more intentionally shared instead of leaving them as backend-local output forms.

5. Align backend structure with the existing restructure plan incrementally.
Favor small ownership clarifications and adapter extraction over a broad file-move campaign.
