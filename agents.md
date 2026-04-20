# Agent Runtime Note

- Use AI SDK for new backend model loops.
- Use Workflow Dev Kit for durable or resumable agent execution.
- Configure providers, agents, and reusable tools through the active CRUD surfaces, not the retired template flow.
- Keep starter providers, agents, and tools in the Prisma seed, not as runtime-generated defaults.
- See `docs/ai-sdk-workflow-devkit.md` before adding new agent runtime code.

## Contribution boundary

Contributor-facing feature maturity rules live in [docs/features.md](/home/nilwi971/projects/SynoSec-buildathon/docs/features.md).

Contribute to agent or runtime code only when the work maps to:

- an already documented active feature, or
- a newly documented feature with a clear purpose, test path, and contribution notes

The cutoff is strict:

- If the runtime change does not yet have a clear purpose, a defined test strategy, and an execution boundary, stop and document it first.
- Do not add new agent loops, tool surfaces, or runtime pathways without updating the feature inventory.
- Do not bypass broker or policy boundaries to expose direct tool access from the model layer.

## Connector-specific rule

Connector work is part of the active feature set, but it must stay within the documented control-plane model.

- Keep broker-mediated execution as the control boundary.
- Preserve local Docker and later VPS deployment parity.
- Extend the connector through shared contracts, control-plane routes, and allowlisted adapters.
- Do not turn the connector into a direct MCP passthrough or unrestricted shell surface for the model.

## Retired areas

Do not contribute new runtime behavior to retired scan APIs or other frozen areas unless their reactivation is explicitly documented in [docs/features.md](/home/nilwi971/projects/SynoSec-buildathon/docs/features.md).
