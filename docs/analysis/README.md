# April 22-24 Architecture Analysis

This document set reviews the larger code and UX changes that landed between `2026-04-22` and `2026-04-24`.

The analysis is grounded in the current codebase and the main commit clusters from that window:

- `95a63b27` `Rate limiting and helper icons`
- `0dee9ee7` `Fix workflow model output streaming and transcript rendering`
- `e2672894` `Stage remaining UI and workflow updates`
- `19a6824d` `New tools added`
- `041ca3a1` `adding new tools + new attack-map`

## How To Use These Docs

- Read this index first to understand the cross-cutting tensions.
- Use the focused docs as architecture review inputs, not as final implementation specs.
- Treat each document's `Manageable Work Slices` section as the handoff point for later execution planning.

## Cross-Cutting Themes

- The frontend shell evolved quickly and now mixes stable product navigation with temporary design surfaces.
- Workflow UX became significantly richer over these two days, but backend workflow execution still carries scan-era storage and service seams.
- The tool system now spans seeded database records, static runtime catalog entries, shell wrappers, and orchestrator-specific script lookup, without one canonical ownership model.
- Backend route composition is still split between module routes and platform routes, which makes execution-heavy areas harder to place cleanly.
- Shared contracts are doing useful work, but some runtime surfaces still depend on backend-local shapes and legacy data stores.

## Documents

- [Frontend Shell, Sidebar, and UX Structure](./frontend-shell-sidebar-ux.md)
- [Workflow Execution and Trace Architecture](./workflows-architecture.md)
- [Tools, Registries, and Runtime Catalogs](./tools-registries-architecture.md)
- [Backend Composition, Modules, and Resource Boundaries](./backend-architecture.md)
- [Agent Runtime Hardening Direction](./agent-runtime-hardening.md)

## Existing Docs This Complements

- `docs/repo-restructure-plan.md` remains the target-state restructuring document.
- `docs/features.md` remains the feature inventory and maturity guide.
- `docs/analysis/agent-runtime-hardening.md` locks the near-term direction for agent, tool, and prompt hardening work.

This analysis set is narrower: it explains what changed in the last two days, where the new seams are, and how to break the follow-up into manageable architectural work.
