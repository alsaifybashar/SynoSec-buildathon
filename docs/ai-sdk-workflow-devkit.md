# AI SDK And Workflow Dev Kit

This repo now includes `ai`, `@ai-sdk/anthropic`, `workflow`, and `@workflow/ai` in `apps/backend`.

## What changed

- `apps/backend/src/llm/client.ts` now sends Anthropic requests through the Vercel AI SDK instead of using the Anthropic SDK directly.
- `apps/backend/src/llm/ai-sdk-agent.ts` adds a reusable `ToolLoopAgent` factory for future tool-driven agent loops.
- `apps/backend/src/runtime/durable-agent.ts` adds a small Workflow Dev Kit scaffold using `DurableAgent` and `"use workflow"`.

## What this means for SynoSec

- AI SDK is now the preferred abstraction for model-backed agent loops in backend code.
- Workflow Dev Kit is available for long-running, resumable agent executions instead of hand-rolled orchestration loops.
- The current scan engine is still the repo's active runtime. These additions are scaffolding for migration, not a route-level cutover.
- Starter `AI Providers`, `AI Agents`, and `AI Tools` now belong in the Prisma seed, not in runtime code.

## Recommended project use

- Use `createSynoSecToolLoopAgent()` for new bounded tool loops that should stay inside normal backend request handling.
- Use `streamSynoSecDurableAgent()` only for work that should survive retries, pauses, or resumptions.
- Keep the existing broker, audit trail, and finding models. Replace loop mechanics before replacing domain objects.

## Limits of the current implementation

- No scan route has been rewired to Workflow Dev Kit yet.
- No sandbox or hosted Vercel services were added.
- The durable agent scaffold is build-safe, but it still needs workflow endpoint wiring before it becomes an active runtime path.
