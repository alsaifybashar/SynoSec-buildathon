# Product Terminology

This document records the terminology the repo currently uses in product copy and core documentation. It reflects the README and the current codebase more closely than older rename plans.

## Current Product Language

- Overall product voice: `attack map`, `workflow`, `finding`, `agent`, and `tool`
- Keep `graph` and `node` language for reasoning structure and persisted relationships
- Keep `attack chain` as the preferred product-facing term for multi-step impact
- Treat `tactic` as a specific node kind or contract term, not the primary product noun
- Remove `GRACE` terminology

## Preferred Usage

Use these terms by default in docs, demos, and operator-facing UI:

| Prefer | Use for |
| --- | --- |
| attack map | The user-facing visualization and persisted security relationship view |
| graph | The underlying reasoning structure, graph processing, or graph-shaped data |
| node | The primary unit inside the graph, with different node kinds such as target, tactic, finding, and attack-chain node |
| attack chain | A higher-impact path created by connecting multiple findings |
| tactic | A specific scan work-item node kind used in scan contracts and some backend internals |
| finding | Evidence-backed security observation or reported issue |
| workflow | The bounded runtime path for agent execution and reporting |

## Naming Guidance

- Prefer `attack map` when describing the product artifact users inspect.
- Prefer `graph` when discussing implementation details, graph construction, graph edges, graph nodes, or graph analysis.
- Prefer `node` when describing the general unit of graph state across different kinds.
- Prefer `attack chain` in product copy when explaining how findings combine into larger impact.
- Prefer `tactic` only where the contracts or code already model a specific persisted scan work-item node that way.
- Avoid introducing new umbrella labels that compete with `attack map` or `workflow`.

## Explicit Non-Goals

- Do not preserve `GRACE` as a public-facing label.
- Do not force a broad rename from `graph` to `strategy map`; the repo does not currently use that language consistently.
- Do not force a broad rename from `chain` to some other label; `attack chain` is the preferred product language today.

## Status

This is a current-state terminology record. It is meant to keep the docs aligned with the repo as it exists today, not to mandate a large naming migration.
