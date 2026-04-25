# Workflow Execution and Trace Architecture

## Summary

The largest workflow changes from April 22-24 improved the user-facing run experience substantially. `apps/frontend/src/features/workflows/workflows-page.tsx` and `workflow-trace-section.tsx` now present workflow configuration, allowed-tool semantics, transcript rendering, findings, and streamed run state more clearly than before.

The backend path underneath that UX is less settled. `apps/backend/src/features/modules/workflows/workflow-execution.service.ts` still combines workflow execution, tool orchestration, validation, transcript shaping, and scan-era persistence seams inside one large service.

## What Changed

- Workflow runs now have richer streamed trace behavior and transcript rendering.
- The workflow UI shows execution contract details more explicitly, especially agent ownership and effective tool grants.
- Run detail surfaces now pull together transcript, findings, and stage context into a more operator-facing workflow page instead of a scan-only view.
- Route support expanded around workflow runs, including latest run lookup, SSE events, trace, vulnerabilities, coverage, and report endpoints.

## Current Architecture

The current split is:

- frontend workflow pages: configuration, run launch, trace display, and operator inspection
- workflow routes: CRUD plus run lifecycle and run-adjacent endpoints
- workflow execution service: stage ordering, tool selection, tool execution, findings, stage results, and run event publication

This architecture is functional, but the execution boundary is still broad. The same subsystem owns:

- workflow CRUD adjacency
- model interaction
- tool brokering
- normalization and validation
- run transcript projection inputs
- scan-store derived report and coverage paths

## Architectural Findings

### 1. Workflow execution still depends on scan-era storage and terminology

`workflows.routes.ts` still serves run vulnerabilities, coverage, trace, and report via `scan-store` helpers. That means the workflow domain is presented to users as a first-class feature, but part of its storage and retrieval model still comes from the older scan architecture.

### 2. The execution service is carrying too many responsibilities

`workflow-execution.service.ts` is doing orchestration, policy, validation, persistence coordination, event streaming, and output shaping. That increases change risk: UI improvements to transcript behavior and backend changes to execution behavior are more tightly coupled than they should be.

### 3. The frontend trace UX is ahead of the backend contract clarity

The trace section already treats the run as a rich product artifact with system messages, assistant output, findings rails, tool usage, and prompt context. The backend does not yet expose that as a clearly separated projection layer. Instead, the shape emerges from a mix of execution service behavior, stream events, and scan-derived endpoints.

### 4. Workflow tools are conceptually split between built-in actions and granted tools, but the boundary is not fully normalized

The UI explains the distinction between workflow-engine actions and agent-managed evidence tools. That is useful, but the backend ownership boundary for those two capability types is still implicit rather than formalized through a dedicated contract or execution layer.

## Manageable Work Slices

1. Split workflow CRUD from workflow run execution.
Keep repository-backed workflow editing separate from runtime orchestration services and run projection concerns.

2. Extract run projection and transcript assembly.
Create a dedicated layer that turns stored run state and events into the exact shape the frontend trace UI consumes.

3. Remove scan-store dependency from workflow-facing routes.
Either migrate workflow run artifacts into workflow-owned storage or isolate the legacy bridge behind an explicit compatibility adapter.

4. Separate execution loop concerns.
Break model interaction, tool request compilation, tool execution, findings submission, and stage-result validation into smaller workflow-engine components.

5. Formalize the workflow capability model.
Make the distinction between built-in workflow actions, allowed evidence tools, and degraded or unavailable tools explicit in backend contracts and execution reporting.
