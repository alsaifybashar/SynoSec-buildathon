# Defensive Loop Contract

The defensive loop is a single bounded iteration. It accepts evidence-backed findings, chooses one explainable defensive action, verifies the outcome, records what happened, and hands off a deterministic next step.

## Stage order

1. `intake`: collect findings, target identity, asset context, and prior iteration state when available.
2. `prioritize`: select exactly one bounded defensive action using the intake evidence and asset context.
3. `act`: execute the chosen action only when the scope is clear and the action is safe.
4. `verify`: confirm the action outcome with explicit checks and supporting evidence.
5. `record`: persist the chosen action, verification result, evidence, and residual risk.
6. `handoff`: produce the next safe step so the next iteration can continue without rebuilding context.

## Required inputs

- `findings`: one or more findings with severity, confidence, source, and evidence.
- `target`: stable target identity for the application, runtime, service, host, repository, or manually scoped asset.
- `assetContext`: criticality and exposure context needed to explain the decision in plain language.
- `priorIteration`: optional carry-forward state from the previous loop, including unresolved findings and residual risk.

## Required outputs

- `prioritization`: ranked candidate actions with explicit scoring factors, one selected action, deferred follow-up items, and reasons the alternatives were not chosen.
- `chosenAction`: the single bounded defensive action selected for the iteration, including rationale and safety checks.
- `evidence`: reviewable artifacts showing what was checked, changed, or why the iteration stopped.
- `residualRisk`: a plain-language statement of what risk remains after the iteration.
- `recommendedNextStep`: the next safe action, or an explicit reason the loop cannot continue autonomously.

## Prioritization model

The prioritize stage is deterministic and human-reviewable. It scores candidate actions with explicit weights:

- `severity`: how serious the issue is if left in place.
- `exploitability`: how easy it appears to abuse from the evidence.
- `exposure`: how much real-world surface area is affected based on internet exposure, sensitive data, and asset criticality.
- `confidence`: how trustworthy the current finding or observation is.
- `implementationSafety`: how safely the bounded action can be executed in one iteration.

The current weighting favors fast exposure reduction without treating weak evidence as confirmed risk:

- `severity`: `0.30`
- `exploitability`: `0.25`
- `exposure`: `0.20`
- `confidence`: `0.15`
- `implementationSafety`: `0.10`

Low-confidence or ambiguous inputs are moved to follow-up instead of being prioritized as confirmed remediation work. If every input is low-confidence, the single selected action becomes bounded manual investigation rather than an autonomous production change.

## Bounded hardening execution

The `act` stage applies exactly one reversible mitigation for the selected action. The current shared contract enforces this with an execution request that includes:

- one `change` record with a single `scopeRef` and `rolloutRef`
- `reversibleIntent: true`
- `affectsMultipleComponents: false`
- `destructive: false`
- a focused `verificationPlan` with explicit checks
- reviewable `evidence` that includes verification output

The loop blocks instead of executing when:

- the selected action is low-confidence and only suitable for manual investigation
- the proposed implementation broadens beyond one component or lacks a rollback path
- the proposed change does not match the selected mitigation scope
- verification evidence is missing, so the loop cannot claim success

When execution succeeds, the record explains the exact mitigation that landed, the verification checks that passed, the residual risk, the per-issue outcome (`fixed`, `mitigated`, `unverified`, or `skipped`), and the next bounded step. When execution is blocked, the record preserves the failure reason, marks which issues were intentionally skipped or still unverified, and states clearly that no change was applied.

## Recorded iteration state

The record stage now preserves enough structure for the next iteration to start without rebuilding context by hand:

- `input.findings`: the source findings that justified the iteration.
- `chosenAction`: the selected bounded mitigation and its safety checks.
- `evidence`: reviewable source, change, and verification artifacts.
- `finalOutcome`: whether the iteration ended as `fixed`, `mitigated`, or `blocked`.
- `issueOutcomes`: one entry per finding or observation showing whether it was `fixed`, `mitigated`, `unverified`, or intentionally `skipped`.
- `carryForward`: the next-iteration seed, including the target, asset context, resolved issues, outstanding issues, residual risk, and recommended next step.

## Failure states

- `missing_evidence`: block the loop when verification or outcome claims cannot be backed by concrete evidence.
- `ambiguous_scope`: block the loop when the target boundary, ownership, or affected components are unclear.
- `unsafe_action`: block the loop when the proposed change is destructive, irreversible, or larger than the agreed bounded scope.

## Source of truth

The machine-readable contract lives in [packages/contracts/src/index.ts](../packages/contracts/src/index.ts) as:

- `defensiveLoopContract`
- `defensiveIterationInputSchema`
- `defensiveIterationRecordSchema`
- `defensivePrioritizationSchema`
- `prioritizeDefensiveAction`
- `defensiveExecutionRequestSchema`
- `executeDefensiveIteration`
- `defensiveFailureStateSchema`
