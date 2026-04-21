# Decisions Log

Use this file to record decisions that should not be reopened during the hackathon.

## Active Project Thesis
- Problem:
- User:
- Solution:
- Why now:

## Locked Decisions
| Date | Area | Decision | Reason |
|---|---|---|---|
| 2026-04-12 | Repo setup | Added Codex and Claude hackathon guidance | Reduce repeated prompting and keep scope disciplined |
| 2026-04-12 | Repo setup | Use a `pnpm` monorepo with React SPA, Express API, and shared `zod` contracts | Fast local setup with strict compile-time and runtime API safety |
| 2026-04-12 | Local development | Include Docker Compose for frontend/backend dev from the initial scaffold | Matches the todo's container requirement without blocking local workspace scripts |
| 2026-04-21 | Repo structure | Standardize toward `app/core/modules/workflow-engine` in backend and `app/shared/features` in frontend | Reduce ownership drift and enable staged cleanup without a big-bang rewrite |
