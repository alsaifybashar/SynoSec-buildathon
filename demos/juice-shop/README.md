# Juice Shop Lab Files

This directory contains the pinned OWASP Juice Shop lab target and its repo-owned challenge metadata.

- `Dockerfile`: wraps the pinned `bkimminich/juice-shop:v19.2.1` image used by local development.
- `upstream-challenges.v19.2.1.yml`: vendored snapshot of Juice Shop's upstream `data/static/challenges.yml` from git tag `v19.2.1`.
- `upstream-challenges.yml`: stable copy of the same vendored snapshot for tooling that prefers a non-versioned path.
- `target-pack.v19.2.1.json`: normalized SynoSec target-pack derived from the vendored upstream YAML.
- `target-pack.json`: stable copy of the same target pack for local tooling and future integration.

The upstream Juice Shop companion guide documents `data/static/challenges.yml` as the single source of truth for challenge declarations.
