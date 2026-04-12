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

- `chosenAction`: the single bounded defensive action selected for the iteration, including rationale and safety checks.
- `evidence`: reviewable artifacts showing what was checked, changed, or why the iteration stopped.
- `residualRisk`: a plain-language statement of what risk remains after the iteration.
- `recommendedNextStep`: the next safe action, or an explicit reason the loop cannot continue autonomously.

## Failure states

- `missing_evidence`: block the loop when verification or outcome claims cannot be backed by concrete evidence.
- `ambiguous_scope`: block the loop when the target boundary, ownership, or affected components are unclear.
- `unsafe_action`: block the loop when the proposed change is destructive, irreversible, or larger than the agreed bounded scope.

## Source of truth

The machine-readable contract lives in [packages/contracts/src/index.ts](../packages/contracts/src/index.ts) as:

- `defensiveLoopContract`
- `defensiveIterationInputSchema`
- `defensiveIterationRecordSchema`
- `defensiveFailureStateSchema`
