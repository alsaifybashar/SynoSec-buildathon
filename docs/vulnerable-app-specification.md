# Local Cyber Range Targets

This repository ships three intentionally vulnerable local targets for safe validation in development environments only.

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

## `demos/full-stack-target`

Purpose:
- validate full-stack target handling across browser UI, JSON APIs, and a SQLite-backed data layer
- provide two evidence-rich attack tracks that converge on the same protected finance export
- exercise chained reasoning across public pages, API records, token exchange, and protected data access

Track A:
1. `/vendors` leaks vendor slugs and invoice references.
2. `/api/vendors/:vendorSlug/invoices/:invoiceId` exposes invoice details through an IDOR-style lookup and leaks a treasury approval code.
3. `/api/finance/export?invoice=...&approval=...` returns the protected export when the leaked approval code is paired with the invoice id.

Track B:
1. `/support/search?q=recovery` leaks support case ids, requester email, and recovery workflow hints.
2. `/api/support/cases/:caseId` exposes case details through an IDOR-style lookup and leaks a recovery token.
3. `/api/auth/recover` accepts the leaked token and requester email, then issues a finance-manager session that unlocks `/api/finance/export?session=...`.

Distractors:
- reflected support search query
- exposed framework and server headers
- verbose `/health` metadata with SQLite path details

Design rules:
- the app must include a real browser UI, API routes, and SQLite persistence
- no finance export should be returned unless a real prerequisite from Track A or Track B is supplied
- denial responses should preserve the original failure reason instead of returning partial success

## Operational Notes

- All targets are started by `make dev`, `make dev-services`, and `make docker-up`.
- `demos/vulnerable-app` listens on `http://localhost:8888`.
- `demos/attack-path-target` listens on `http://localhost:8890`.
- `demos/full-stack-target` listens on `http://localhost:8891`.
- These applications are for local demo use only and must never be exposed to the internet.
