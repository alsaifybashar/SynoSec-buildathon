# Local Cyber Range Targets

This repository ships two intentionally vulnerable local targets for safe validation in development environments only.

## `demos/vulnerable-app`

Purpose:
- broad evidence-backed web finding validation
- multiple independent critical findings
- useful for basic workflow, transcript, and reporting checks

Included weaknesses:
- SQL injection simulation on `/login`
- unauthenticated admin panel on `/admin`
- sensitive user data exposure on `/api/users`
- directory listing simulation on `/files`
- reflected XSS on `/search`
- verbose errors, missing headers, and exposed version banners

This target is intentionally noisy. Several findings are independently severe, so it is best for validating direct finding detection rather than path-first prioritization.

## `demos/attack-path-target`

Purpose:
- validate attack-path-first workflow behavior
- ensure critical impact only appears when linked findings are combined
- provide two equal-strength paths to the same protected secret

Path A:
1. `/release-board` leaks the active build id and support case reference.
2. `/api/support/cases/:caseRef?workspace=...` exposes approval notes through an IDOR-style case lookup.
3. `/api/release/secrets?build=...&approval=...` returns release secrets when the leaked approval token is paired with the leaked build id.

Path B:
1. `/diagnostics/export` leaks the active build id, approver email, and nonce seed.
2. `/api/auth/magic-link` issues a release-manager session when the leaked nonce is replayed with the leaked approver email.
3. `/api/release/secrets?build=...&session=...` returns the same release secrets when the build id is paired with the forged manager session.

Distractors:
- reflected search on `/search`
- verbose metadata on `/health`
- exposed server and framework headers

Design rules:
- no standalone endpoint should be critically exploitable by itself
- each intermediate issue should be evidence-rich but incomplete on its own
- the final secret access should fail unless a real prerequisite from the path is supplied

## Operational Notes

- Both targets are started by `make dev`, `make dev-services`, and `make docker-up`.
- `demos/vulnerable-app` listens on `http://localhost:8888`.
- `demos/attack-path-target` listens on `http://localhost:8890`.
- These applications are for local demo use only and must never be exposed to the internet.
