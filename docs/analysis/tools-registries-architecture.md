# Tools, Registries, and Runtime Catalogs

## Summary

The tool system changed materially over April 22-24. New tool definitions were added, seeded defaults expanded, runtime capability exposure became more visible, and the orchestrator added its own suggested-tool execution path. The result is broader coverage, but also more overlap between the different places that define or expose tool behavior.

The main architectural question is now simple: what is the canonical source of truth for a tool?

## What Changed

- `apps/backend/prisma/seed-data/ai-builder-defaults.ts` expanded the seeded tool inventory and role grants.
- `apps/backend/src/workflow-engine/tools/tool-catalog.ts` exposes runtime capability inspection from a static catalog.
- `apps/backend/src/platform/routes/tools.ts` publishes `/api/tools/capabilities`.
- New scripts landed under `scripts/tools`, and orchestrator logic introduced a separate suggested-tool lookup map.
- Workflow and tool-selection behavior now rely on a larger, more varied tool universe than before.

## Current Architecture

The current system has at least four distinct tool layers:

- seeded database definitions for builders, roles, and default product records
- static runtime catalog entries for machine capability inspection
- executable shell wrappers under `scripts/tools`
- orchestrator-specific script mapping for suggested actions

Those layers are related, but they are not the same thing:

- seeded tools describe product-visible tool records
- catalog entries describe capability detection
- scripts describe execution adapters
- orchestrator maps describe a second execution lookup system

## Architectural Findings

### 1. There is no single canonical ownership model for tools

At the moment, a tool can be defined in seeded defaults, represented in the runtime catalog, implemented by a script, granted to an agent, and mapped separately inside the orchestrator. That is enough to ship behavior, but not enough to guarantee consistency.

### 2. Installed is not the same as executable, and executable is not the same as granted

`tool-catalog.ts` correctly reports availability by binary inspection, but that only answers one question. It does not prove the seeded tool record is wired to the right script, that the script is safe to invoke through the intended broker path, or that a given role or workflow is allowed to use it.

### 3. Tool routing is split across workflow-engine and orchestrator paths

Workflow execution already has brokered tool behavior. The orchestrator service adds a second path via `suggestedToolScriptMap`. That may be acceptable temporarily, but architecturally it means two orchestration surfaces can drift on naming, capability support, and execution policy.

### 4. Route ownership still reflects older structure

`/api/tools/capabilities` is served from `apps/backend/src/platform/routes/tools.ts`, even though the capability data itself comes from `workflow-engine/tools`. That is a small code smell, but it reveals the broader issue: the product-facing tool boundary and the platform/runtime capability boundary are not fully separated.

## Manageable Work Slices

1. Define the canonical tool model.
Choose which layer owns identity, human metadata, runtime capability, execution adapter, and policy metadata for each tool.

2. Normalize tool states.
Distinguish at minimum between `cataloged`, `seeded`, `installed`, `executable`, and `granted`, and make those states visible where they matter.

3. Unify execution lookup paths.
Reduce drift between workflow-engine tool execution and orchestrator suggested-tool execution by converging on shared adapters or shared registry lookup.

4. Clarify route ownership.
Move product-facing tool APIs and runtime capability APIs into explicit module or engine-aligned boundaries rather than a generic platform route bucket.

5. Document the role of `scripts/tools`.
State whether shell wrappers are the stable execution interface, a temporary adapter layer, or a bridge to a future connector-owned runtime.
