# Hackathon Project — Claude Code Guide

## Mission
Build a proof-of-concept in 24 hours that demonstrates a high-impact, innovative solution. Every decision should optimize for: **demo clarity > working prototype > code quality**.

## The Golden Rule
**Ship something that works and wows, not something perfect and unfinished.**

---

## How to Work With Me

### Time Phases (adapt as needed)
| Phase | Hours | Focus |
|-------|-------|-------|
| Ideation & Architecture | 0–2h | Lock the idea, stack, and scope |
| Core Feature Build | 2–16h | Ship the must-haves |
| Polish & Demo Prep | 16–22h | Make it shine for judges |
| Buffer & Presentation | 22–24h | Rehearse, fix last-minute bugs |

### When I should ask before acting
- Changing the tech stack mid-build
- Adding a feature that wasn't in the agreed scope
- Creating new files > 300 lines
- Integrating a new external service or API

### When I should just do it
- Bug fixes
- UI tweaks and styling
- Adding tests for existing behavior
- Refactoring within a file
- Writing documentation/comments

---

## Development Principles

### Speed-Optimized Defaults
- **Prefer libraries over custom implementations.** Don't reinvent auth, charts, maps, AI SDKs.
- **Hardcode early, abstract later.** Config values, URLs, and credentials can be constants for the POC.
- **One happy path first.** Edge cases and error handling come after the demo flow works.
- **No premature optimization.** N+1 queries, unindexed tables — fine for 24h demo scale.
- **Mock external dependencies** if they block progress. Use realistic fake data.

### Code Style
- Functions should do one thing and be short enough to understand at a glance.
- Prefer flat structure over deeply nested abstractions.
- Comments only where the *why* is not obvious.
- No dead code, no commented-out blocks, no TODO sprawl.

### Demo-Driven Development
Every feature must answer: **"Will this impress a judge in a 3-minute demo?"**
- Build the demo flow first — the exact screens/steps a judge will see.
- Seed realistic, compelling data (not "test", "foo", "lorem ipsum").
- Make the UI readable on a projected screen (large font, high contrast).

---

## Tech Stack Guidance

### Preferred defaults (change only if there's a strong reason)
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Python FastAPI or Node.js Express
- **Database:** SQLite (local dev) → PostgreSQL if cloud deploy needed
- **AI/LLM:** Anthropic Claude API (claude-sonnet-4-6 for speed/cost, claude-opus-4-6 for quality)
- **Auth:** Clerk or NextAuth (never roll your own)
- **Deploy:** Vercel (frontend) + Railway or Render (backend)
- **State management:** React Context or Zustand (avoid Redux for a 24h build)

### When to reach for Claude API
The hackathon judges expect AI. Use Claude for:
- Natural language → structured output
- Document/image understanding
- Intelligent recommendations
- Conversational interfaces
- Classification and extraction tasks

Use `claude-sonnet-4-6` by default. Switch to `claude-haiku-4-5-20251001` for high-volume/low-stakes calls.

---

## Project Structure (to be filled in as we build)

```
hackathon/
├── CLAUDE.md              ← you are here
├── .claude/
│   ├── agents/            ← specialized sub-agents
│   └── skills/            ← custom slash commands
├── frontend/              ← UI
├── backend/               ← API + business logic
├── data/                  ← seed data, schemas
└── docs/                  ← pitch deck outline, demo script
```

---

## Impact Framing (for pitch alignment)

When building features, always link them to:
1. **Problem**: Who suffers without this? How many?
2. **Solution**: What does this POC demonstrate?
3. **Novelty**: What makes this different from existing solutions?
4. **Scalability**: Could this work at 10x / 1000x users?

---

## Useful Slash Commands (Custom Skills)
- `/brainstorm` — Structured ideation session
- `/poc-scaffold` — Scaffold the project skeleton for a chosen stack
- `/ship` — Commit everything, generate README, prepare demo script
- `/checkpoint` — Document current state and what's left to build
- `/demo-script` — Generate a 3-minute demo walkthrough

---

## Memory & Context
- Save key decisions (stack choice, scope cuts, what was deprioritized) so we don't revisit them.
- If we change direction, note why in a brief comment or commit message.
- Keep a `docs/decisions.md` log of major architectural choices.
