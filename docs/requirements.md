# Requirements

## Purpose

This document defines the minimum requirements SynoSec must meet before we can credibly claim that the pre-seeded workflow:

- passes a cybersecurity stack review
- covers all 7 OSI layers
- models meaningful relationships across those layers

Today, the repo does not meet that bar.

## Current State

The current implementation supports only a narrower claim:

`SynoSec demonstrates a staged security workflow with partial OSI-layer coverage, centered mainly on transport, presentation, and application-layer validation, plus some network discovery primitives.`

The reasons are concrete:

- The pre-seeded workflow is only a four-stage agent sequence with no explicit layer ownership, no layer coverage criteria, and no relationship semantics beyond stage order.
- The scan contract supports only `L2` through `L7`. `L1` does not exist in the model.
- The default scan scope and smoke flow only exercise `L4`, `L6`, and `L7`.
- The strategy-map relationship model is only `source -> target` parent-child linkage.
- The seeded toolset is mostly HTTP, content, network scan, and web vulnerability tooling. It does not establish real coverage for all layers.

## Evidence In Repo

- Seeded workflow stages: [apps/backend/prisma/seed-data/ai-builder-defaults.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/prisma/seed-data/ai-builder-defaults.ts:289)
- OSI layer enum currently excludes `L1`: [packages/contracts/src/scan-core.ts](/home/nilwi971/projects/SynoSec-buildathon/packages/contracts/src/scan-core.ts:3)
- Default scan scope is `L4`, `L6`, `L7`: [packages/contracts/src/scan-core.ts](/home/nilwi971/projects/SynoSec-buildathon/packages/contracts/src/scan-core.ts:15)
- Strategy-map relationships are only `source` and `target`: [packages/contracts/src/scan.ts](/home/nilwi971/projects/SynoSec-buildathon/packages/contracts/src/scan.ts:91)
- Relationship persistence is only parent-child tactic linkage: [apps/backend/src/platform/db/neo4j.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/platform/db/neo4j.ts:307)
- Smoke scan uses only `L4`, `L6`, `L7`: [scripts/e2e-smoke.sh](/home/nilwi971/projects/SynoSec-buildathon/scripts/e2e-smoke.sh:33)
- Workflow execution is tool-selection evaluation, not a full layer-aware execution model: [apps/backend/src/features/modules/workflows/workflow-execution.service.ts](/home/nilwi971/projects/SynoSec-buildathon/apps/backend/src/features/modules/workflows/workflow-execution.service.ts:28)
- Vulnerable app spec claims `L1` through `L7`: [docs/vulnerable-app-specification.md](/home/nilwi971/projects/SynoSec-buildathon/docs/vulnerable-app-specification.md:18)

## Requirement Matrix

### Requirement 1: Full 7-Layer Model

Requirement:
The product contract must represent all seven layers explicitly.

Minimum acceptance criteria:

- Add `L1` to the OSI layer enum and labels.
- Ensure scan scope accepts `L1` through `L7`.
- Ensure tactic persistence, validation, and UI rendering handle all seven layers consistently.
- Update tests to cover all seven layer values.

Why this is required:
Without `L1` in the type system, any “all 7 layers” claim is false at the contract level.

### Requirement 2: Seeded Workflow Must Declare Intended Layer Coverage

Requirement:
The pre-seeded workflow must specify which layers each stage is responsible for and what constitutes completion.

Minimum acceptance criteria:

- Add explicit layer coverage metadata to seeded workflow stages or to a linked workflow policy object.
- Define expected outputs per stage, such as discovery evidence, findings, validation status, or escalation candidates.
- Prevent a workflow from being described as full-stack unless the declared stage coverage spans `L1` through `L7`.

Why this is required:
The current four stages are generic role transitions, not evidence of stack coverage.

### Requirement 3: Relationship Model Must Be Richer Than Parent-Child

Requirement:
Relationships must encode security meaning, not just tactic lineage.

Minimum acceptance criteria:

- Extend relationships to include a typed edge model.
- Supported edge types should include at least:
  - `discovers`
  - `depends_on`
  - `reachable_from`
  - `escalates_to`
  - `validates`
  - `correlates_with`
- Relationships should carry enough metadata to explain cross-layer movement, confidence, and evidence source.
- Strategy-map and report outputs must expose these typed relationships.

Why this is required:
A simple tree edge cannot justify claims about attack chains, trust boundaries, or cross-layer coverage.

### Requirement 4: Each Layer Must Have Concrete Detection Or Validation Capability

Requirement:
Each claimed layer must map to at least one implemented tactic and one usable tool path.

Minimum acceptance criteria:

- `L1`: Simulated host or infrastructure evidence path, such as Docker socket exposure, mounted host artifacts, or host-level leakage checks.
- `L2`: Local network or bridge-level checks, such as ARP visibility or bridge-network misconfiguration validation.
- `L3`: Network reachability, segmentation, routing, or internal IP mapping checks.
- `L4`: Port exposure, cleartext transport, protocol reachability, or unmonitored service-port validation.
- `L5`: Session controls, fixation, replay, token rotation, or sticky-session hijack validation.
- `L6`: Encoding, parsing, serialization, content-type, or cryptographic presentation checks.
- `L7`: Application flaws such as BOLA, SSRF, injection, auth bypass, or business-logic abuse.
- Every layer must be represented in the seeded tool catalog, execution broker, and report language.

Why this is required:
Layer names alone are not coverage. Coverage requires implemented detection or validation paths.

### Requirement 5: Demo Target And Execution Paths Must Match The Claim

Requirement:
The vulnerable target, seeded tools, and execution runtime must all support the same coverage statement.

Minimum acceptance criteria:

- The vulnerable app specification and the executable demo must align layer by layer.
- The seeded tool list must include tools or adapters that can actually exercise the claimed layers.
- The broker must authorize and audit layer-relevant actions for all claimed layers.
- Local smoke or E2E flows must run against a scope that includes all claimed layers.

Why this is required:
Right now the spec claims seven layers, while the smoke path only exercises three.

### Requirement 6: Reports Must Prove Coverage, Not Just Mention It

Requirement:
Reports must include explicit evidence showing what was checked, what was found, and what remains unverified for each layer.

Minimum acceptance criteria:

- Add a per-layer coverage section to reports.
- For each layer, report:
  - `coverageStatus`: `covered`, `partially_covered`, or `not_covered`
  - tactics executed
  - evidence references
  - findings produced
  - validation confidence
  - gaps or blockers
- Prevent executive summaries from claiming full-stack coverage if any layer is partial or uncovered.

Why this is required:
Without per-layer reporting, the claim is marketing language rather than auditable evidence.

### Requirement 7: Verification Must Exist In Tests

Requirement:
The claim must be testable in CI or in a documented local validation flow.

Minimum acceptance criteria:

- Contract tests for all seven layers.
- Repository tests for richer relationship types.
- Workflow tests that assert declared stage coverage.
- Smoke or E2E tests that verify the demo run emits per-layer evidence.
- A documented validation command sequence that reproduces the claim locally.

Why this is required:
If full-stack coverage is not testable, it is not a product requirement yet.

## Gap Matrix

| Area | Current state | Required state |
| --- | --- | --- |
| OSI model | Supports `L2`-`L7` only | Supports `L1`-`L7` |
| Seeded workflow | Four generic stages | Stages declare layer coverage and completion criteria |
| Relationships | Parent-child only | Typed, evidence-backed security relationships |
| Tooling | Mostly web/network discovery | Layer-specific implemented validation paths |
| Smoke flow | Exercises `L4`, `L6`, `L7` | Exercises all claimed layers |
| Reporting | Findings and summaries | Per-layer coverage proof |
| Validation | Partial and inconsistent | Repeatable tests for the full claim |

## Claim Policy

Until the requirements above are met, approved language is:

`SynoSec demonstrates a staged security workflow with partial multi-layer coverage.`

The following claims are not approved:

- `We cover all 7 layers.`
- `We pass the full cybersecurity stack.`
- `The seeded workflow proves end-to-end 7-layer coverage.`

## Recommended Implementation Order

1. Add `L1` to the contracts, storage, and UI.
2. Expand relationship types beyond parent-child tactic edges.
3. Add per-stage layer coverage metadata to workflows.
4. Add layer-specific seeded tools or adapters for missing layers, especially `L1`, `L2`, and `L5`.
5. Update the smoke flow and reporting model to emit per-layer coverage evidence.
6. Add tests that block unsupported “all 7 layers” claims from regressing back into docs or UI copy.
