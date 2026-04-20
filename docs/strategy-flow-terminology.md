# Strategy Flow Terminology

This document records the terminology chosen for the scan/pentest domain so the rename can be implemented consistently later.

## Chosen Product Language

- Overall product voice: `Strategy Flow`
- Replace `node` with `tactic`
- Replace `graph` with `strategy map`
- Replace `chain` with `escalation route`
- Remove `GRACE` terminology

## Canonical Replacements

Use these terms as the default vocabulary across product copy, contracts, API names, backend code, and tests.

| Old term | New term |
| --- | --- |
| graph | strategy map |
| node | tactic |
| child node | follow-up tactic |
| root node | root tactic |
| node status | tactic status |
| node update event | tactic update event |
| chain | escalation route |
| chain link | escalation route link |
| chain detection | escalation route detection |
| graph analysis | strategy analysis |
| DFS queue / DFS graph | tactic queue / strategy map |

## Naming Guidance

- Prefer `strategy map` for anything that describes the persisted view of exploration state.
- Prefer `tactic` for the concrete unit currently being evaluated, queued, linked, or persisted.
- Prefer `follow-up tactic` for newly derived work from evidence.
- Prefer `escalation route` for multi-step relationships between findings that imply progression or pivoting.
- Prefer `strategy analysis` for the subsystem that prioritizes targets and infers escalation routes.

## API And Contract Direction

When the rename work resumes, the intended public naming is:

- `/api/scan/:id/strategy-map`
- `/api/scan/:id/escalation-routes`
- `ScanTactic`
- `StrategyMapResponse`
- `EscalationRoute`
- `EscalationRouteLink`
- `StrategyAnalysis`
- websocket event `tactic_updated`
- websocket event `escalation_route_detected`
- websocket event `strategy_analysis_complete`

## Explicit Non-Goals

- Do not keep mixed terminology like `strategy graph`, `graph tactic`, or `GRACE routes`.
- Do not preserve `GRACE` as a public-facing label.
- Do not use `lead`, `step`, or `approach` as alternates for the persisted unit unless this decision is revisited.

## Status

This is a terminology decision record only. It does not imply that the rename or Postgres migration has been completed.
