# Tool Inventory

Last reviewed: 2026-04-30

## Executive summary

SynoSec currently exposes three distinct tool layers:

1. **Catalog layer**: 259 backend catalog entries across 14 categories in [apps/backend/src/engine/tools/catalog](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/engine/tools/catalog).
2. **Seeded runnable layer**: 77 seeded bash-backed tool definitions loaded from [apps/backend/prisma/seed-data/ai-builder-defaults.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/prisma/seed-data/ai-builder-defaults.ts:392) and sourced from `scripts/tools`.
3. **Workflow tool layer**: 36 built-in workflow-facing AI tools in total: 33 semantic-family tools plus 3 lifecycle actions under [apps/backend/src/modules/ai-tools](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/modules/ai-tools).

The important operational point is that the catalog is much broader than the directly runnable wrapper set. The seeded bash tools are the concrete execution surface today.

## 1. Backend catalog inventory

The authoritative merged catalog is `TOOL_CATALOG` in [apps/backend/src/engine/tools/catalog/index.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/engine/tools/catalog/index.ts:17).

Category breakdown:

| Category | Count |
| --- | ---: |
| `utility` | 54 |
| `reversing` | 33 |
| `web` | 33 |
| `network` | 30 |
| `windows` | 21 |
| `cloud` | 19 |
| `password` | 18 |
| `content` | 12 |
| `exploitation` | 12 |
| `forensics` | 11 |
| `dns` | 7 |
| `subdomain` | 5 |
| `auth` | 2 |
| `kubernetes` | 2 |
| **Total** | **259** |

Notes:

- Catalog entries include both executable CLI tools and non-CLI/manual tools with `binary: null`, for example Burp Suite and other GUI or SaaS scanners.
- Capability inspection is implemented in [apps/backend/src/engine/tools/tool-catalog.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/engine/tools/tool-catalog.ts:36) and only verifies whether the configured binary exists on `PATH`.
- That capability check does **not** prove the wrapper works end to end; it explicitly reports path detection only.

## 2. Seeded bash-backed tool inventory

The seeded runnable tools are assembled from `rawSeededToolDefinitions` in [apps/backend/prisma/seed-data/ai-builder-defaults.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/prisma/seed-data/ai-builder-defaults.ts:392). These definitions load bash source from disk and fail if the script cannot be found via [apps/backend/prisma/seed-data/tools/load-script.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/prisma/seed-data/tools/load-script.ts:4).

Counts:

- `77` seeded bash tool definitions used by the app runtime
- `79` shell scripts under [scripts/tools](/home/nilwi971/projects/SynoSec-buildathon/scripts/tools)
- The difference is expected: the scripts tree also contains shared/driver helpers such as [scripts/tools/run-tool.sh](/home/nilwi971/projects/SynoSec-buildathon/scripts/tools/run-tool.sh:1) and non-registry support actions

Wrapper script breakdown:

| Script category | Count |
| --- | ---: |
| `web` | 20 |
| `utility` | 13 |
| `network` | 10 |
| `password` | 8 |
| `forensics` | 7 |
| `subdomain` | 6 |
| `windows` | 6 |
| `content` | 5 |
| `auth` | 2 |
| `agent-actions` | 1 |
| `exploitation` | 1 |
| **Total** | **79** |

Seed-data file breakdown under `apps/backend/prisma/seed-data/tools`:

| Seed-data category | Count |
| --- | ---: |
| `web` | 20 |
| `utility` | 13 |
| `network` | 10 |
| `password` | 8 |
| `agent-actions` | 8 |
| `forensics` | 7 |
| `subdomain` | 6 |
| `windows` | 6 |
| `content` | 5 |
| `auth` | 2 |
| `exploitation` | 1 |
| `shared` | 1 |
| **Total** | **87** |

Operational notes:

- The seeded tool set is the real execution backbone for current workflows.
- Script execution expects structured JSON output and throws if the tool emits an empty or invalid envelope; see [apps/backend/src/engine/tools/script-executor.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/engine/tools/script-executor.ts:92).
- This matches the repo rule to fail loudly instead of silently degrading.

## 3. Workflow-facing AI tool inventory

The public Tool Registry is exposed by [apps/backend/src/modules/ai-tools/ai-tools.routes.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/modules/ai-tools/ai-tools.routes.ts:66) and rendered in the frontend at [apps/frontend/src/features/ai-tools/page.tsx](/home/nilwi971/projects/SynoSec-buildathon/apps/frontend/src/features/ai-tools/page.tsx:1).

Workflow-facing tool types:

- `33` semantic-family built-ins in [apps/backend/src/modules/ai-tools/semantic-family-tools.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/modules/ai-tools/semantic-family-tools.ts:215)
- `3` lifecycle built-ins in [apps/backend/src/modules/ai-tools/builtin-ai-tools.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/modules/ai-tools/builtin-ai-tools.ts:27)
- **36 total** built-in workflow-facing AI tools

The lifecycle built-ins are:

- `builtin-log-progress`
- `builtin-report-system-graph-batch`
- `builtin-complete-run`

Important distinction:

- Semantic-family tools are workflow-facing capabilities that map to one or more seeded/raw tools.
- Built-in lifecycle actions are control/reporting primitives, not shell tools.
- Raw adapter tools are intentionally hidden from registry mutation and treated as internal-only; see [apps/backend/src/modules/ai-tools/ai-tools.routes.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/modules/ai-tools/ai-tools.routes.ts:15).

## 4. Execution and deployment path

Execution paths in the repo:

- Local bash execution through the backend tool runtime in [apps/backend/src/modules/ai-tools/tool-runtime.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/modules/ai-tools/tool-runtime.ts:29)
- Broker/policy authorization in [apps/backend/src/engine/workflow/broker/policy.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/engine/workflow/broker/policy.ts:58)
- Optional remote execution through the connector in [apps/connector/src/main.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/connector/src/main.ts:88)
- Connector-side installed-binary detection in [apps/connector/src/installed-binaries.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/connector/src/installed-binaries.ts:4)

This means the project has both:

- a broad planning/catalog surface for tool selection
- a narrower verified execution surface based on seeded bash tools plus built-in workflow actions

## 5. Gaps and risks

Current inventory risks:

- The 259-entry catalog significantly exceeds the 77 seeded executable tool definitions, so catalog breadth should not be confused with runtime coverage.
- Some catalog entries are intentionally manual, GUI-only, or commercial/SaaS-backed, which makes them discoverable but not directly executable in the current bash runtime.
- Capability reporting is binary-presence-based, not execution-smoke-tested.
- The seeded tool tree is concentrated in `web`, `utility`, and `network`; there is relatively little direct scripted coverage for `auth`, `exploitation`, and no direct seeded `cloud`, `dns`, `reversing`, or `kubernetes` parity with the larger catalog.

## 6. Recommended next steps

1. Add a generated inventory check that asserts catalog count, seeded tool count, and semantic-family count so drift is visible in CI.
2. Mark catalog entries explicitly as `catalog-only`, `manual`, or `script-backed` in one shared place instead of inferring that from multiple layers.
3. Add an execution smoke test for seeded tools beyond simple `PATH` detection.
4. Close the biggest parity gaps first: `cloud`, `dns`, `reversing`, and `kubernetes`.
