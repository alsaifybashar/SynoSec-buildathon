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
- `demos/full-stack-target` listens on `http://localhost:8891`.
- These applications are for local demo use only and must never be exposed to the internet.
