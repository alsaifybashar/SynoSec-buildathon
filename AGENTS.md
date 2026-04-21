# AGENTS

## Failure Handling

Avoid fallback behavior that converts a real failure into a partial success, empty result, or alternate path unless the caller explicitly requires that behavior.

Fallbacks tend to create silent failures by hiding the original error and making the system appear healthy when it is not.

Prefer these rules:

- Fail loudly when a required dependency, tool, provider, or workflow step cannot complete.
- Preserve the original error context so callers and operators can see what actually failed.
- Only use a fallback when it is an intentional product requirement and the degraded state is reported explicitly.
