# Agent Runtime Hardening Direction

## Summary

The current SynoSec agent architecture is directionally correct for the next iteration. It already uses bounded execution loops, broker-mediated tool execution, turn-level tool filtering, built-in lifecycle actions, persisted prompts, and explicit failure handling. The near-term priority should be to harden that shape rather than replace it.

This document is a repo-specific design note for the next phase of agent work. It uses `Keep / Change / Defer` judgments so follow-up implementation work can stay aligned without reopening the core architecture on every task.

## Runtime Direction

### Agent execution model

Keep:

- the workflow pipeline runtime in `apps/backend/src/engine/workflow/`
- the attack-map orchestrator path as a separate execution mode
- broker-mediated tool execution as a hard invariant

Change:

- document one canonical runtime contract across local and hosted execution:
  - approved tools only
  - structured lifecycle actions
  - explicit verifier checks
  - explicit terminal conditions
- treat local JSON-action mode and hosted native tool-calling mode as transport variants of the same logical agent behavior
- make “tool completed but produced no usable evidence” a first-class outcome in agent runtime language, not an implicit success

Defer:

- default manager-and-subagent orchestration
- any direct model-to-shell or model-to-connector path
- any rewrite that merges the workflow and attack-map execution modes into one service before the contracts are clarified

### Prompt steering contract

Keep:

- persisted system and task prompts in workflow traces
- built-in reporting and completion actions as the canonical mutation surface
- verifier challenges for unsupported actions and invalid closeout behavior

Change:

- define a canonical instruction shape for future prompt work:
  - role and goal
  - scope and safety boundaries
  - approved tools this turn
  - evidence requirements
  - completion requirements
  - blocked or failed behavior
- align local and hosted prompts semantically even when the provider path differs
- prefer schema-first contracts for lifecycle actions and any structured non-tool output

Defer:

- replacing the local JSON envelope path outright
- prompt-only attempts to solve tool ambiguity that should instead be solved by better tool contracts

## Tool Exposure Direction

### Current model

Keep:

- persistent tool definitions and seeded implementations
- agent-level tool resolution
- turn-level tool selection before model exposure
- built-in system tools for reporting, completion, and orchestrator-only actions

Change:

- treat the current script-backed tools as an implementation layer, not the ideal long-term model surface
- move toward fewer semantic tools backed by the existing scripts, starting with common repeated workflows rather than catalog-wide replacement
- require every exposed tool definition to describe:
  - what the tool does
  - when to use it
  - when not to use it
  - what evidence it can actually return
  - important limitations and failure modes
- preserve the small active tool budget per turn and continue to prefilter aggressively before model calls

Defer:

- mass renaming or large catalog churn
- exposing generic low-level execution surfaces as a convenience shortcut
- replacing the existing selector with a larger multi-agent routing system before tool quality is improved

### Semantic tool migration rule

Use this rule for future tool work:

- keep existing bash-backed tools when they provide useful coverage or operational value today
- add semantic wrapper tools first where the agent repeatedly chooses among overlapping low-level tools
- expose low-level tools directly only when they are meaningfully distinct in purpose, evidence, or risk profile

## Failure And Verification Direction

Keep:

- the `AGENTS.md` rule that failures must stay loud and explicit
- broker authorization and constraint checks before execution
- completion failure when the model exits without the required terminal action

Change:

- standardize runtime error language around distinct outcome classes:
  - constraint denial
  - authorization denial
  - execution failure
  - completed without usable evidence
  - malformed model action
  - verifier rejection
- preserve root-cause detail across broker, connector, and runtime boundaries so operators can see what actually failed
- treat evidence sufficiency as separate from command success in future reporting and eval work

Defer:

- fallback behavior that silently swaps tools, providers, or completion modes
- degraded-success semantics that hide missing evidence or missing terminal actions

## Evals And Observability Direction

Keep:

- persisted prompts
- streamed workflow trace events
- audit and broker event surfaces as the base observability model

Change:

- make these evals mandatory before major architectural expansion:
  - wrong tool selected from the approved set
  - hosted run ends without terminal completion or failure action
  - local and hosted paths diverge on the same seeded scenario
  - finding submission without sufficient evidence
  - unsupported layer coverage claim
  - tool run succeeds operationally but yields no usable observations
- track these quality signals explicitly:
  - tool selection quality
  - tool run success versus usable-evidence rate
  - verifier rejection rate
  - completion success rate
  - local versus hosted parity failures

Defer:

- structural multi-agent expansion before the current workflow path is measured well enough to prove it is the limiting factor

## Decision

The default path for SynoSec agent work is:

1. Harden the current workflow runtime contracts.
2. Improve tool descriptions, schemas, and evidence semantics.
3. Add eval coverage for tool choice, verifier behavior, and local-hosted parity.
4. Introduce semantic wrapper tools incrementally where low-level tool overlap is hurting reliability.
5. Revisit multi-agent orchestration only after the current architecture is measured and shown to be insufficient.

This keeps the current strengths of the repo while avoiding a premature architecture shift.
