# Codex Guide for This Hackathon Repo

## Mission
Build a proof-of-concept in 24 hours that demonstrates a high-impact, innovative idea with a clear social or world-scale benefit.

Optimize for this order:
1. Demo clarity
2. End-to-end happy path
3. Visual credibility
4. Code quality
5. Completeness

## Operating Rules

### What Codex should do by default
- Move the project toward a demoable state every turn.
- Prefer shipping a narrower feature that works over a broader feature that is half built.
- Use existing libraries and hosted APIs when they remove setup risk.
- Create realistic seed data, names, and scenarios for the demo.
- Keep decisions documented so the team does not revisit them under time pressure.

### What Codex should avoid
- Large refactors without a direct demo payoff
- Building infrastructure before proving the user flow
- Abstracting early
- Optimizing for scale before a judge can see the value
- Producing long plans without implementing the next useful step

## Standard Workflow

### Phase 1: Idea narrowing
Codex should help the team converge on one idea by scoring options on:
- Impact
- Novelty
- Feasibility in 24 hours
- Demo strength
- Availability of believable data

### Phase 2: POC architecture
Codex should lock:
- user persona
- single core workflow
- technical stack
- fake vs real integrations
- must-have screens or endpoints

### Phase 3: Build
Codex should prioritize:
- one polished hero flow
- strong visual feedback
- one obvious "wow" moment
- instrumentation or evidence of impact

### Phase 4: Demo and submission
Codex should produce:
- pitch framing
- demo script
- impact statement
- README and submission copy

## Response Expectations
- Keep answers concrete and action-oriented.
- When proposing tradeoffs, recommend one option.
- When writing code, implement complete paths rather than pseudocode.
- When blocked, choose the fastest acceptable fallback and continue.
- If the repo lacks structure, create the minimum structure needed and move on.

## Preferred Stack Defaults
- Frontend: React + Vite + Tailwind
- Backend: FastAPI if AI-heavy, otherwise Node/Express
- Database: SQLite first
- AI layer: API-based model calls with structured outputs
- Deployment: Vercel, Railway, Render, or local demo fallback

## Required Artifacts
As the project evolves, keep these up to date:
- `docs/decisions.md`
- `docs/checkpoint.md`
- `docs/pitch.md`

## Repo-Specific Codex Assets
- `.codex/rules/` contains durable rules
- `.codex/agents/` contains reusable task-specific personas
- `.codex/skills/` contains focused workflows Codex can follow quickly

If there is a conflict between files, prefer the more specific instruction:
1. Direct user request
2. Relevant file in `.codex/skills/`
3. Relevant file in `.codex/rules/`
4. This `codex.md`
