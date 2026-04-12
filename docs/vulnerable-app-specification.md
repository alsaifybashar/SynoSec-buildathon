"VulnCart" — A fake e-commerce checkout system

Four services in one docker-compose:
Gateway (nginx/Express) — public-facing reverse proxy that routes to internal services. Trusts X-Internal-User headers from downstream without validation, so if you can reach a backend directly you can impersonate any user.

Auth Service (Node/Python) — issues JWTs with a weak secret ("secret123"), doesn't validate token expiry properly, and has a user enumeration flaw on the login endpoint.

Order Service (Python/Go) — accepts orders, talks to the payment service internally. Has a classic BOLA — any authenticated user can view/modify any order by changing the ID. Also has an SSRF flaw where the "webhook callback URL" field can be pointed at internal services.

Payment Service (Node) — supposed to be internal-only, but the network policy is missing so it's reachable from any container. Runs as root, has a debug endpoint with command injection via a "log_level" parameter.

The intended attack chain your agents should discover:
Weak JWT → forge a token → enumerate users → access another user's order via BOLA → use the SSRF in the webhook field to hit the payment service's debug endpoint → command injection → root shell in the payment container → read the mounted secrets.

Each vulnerability alone is medium severity. Chained together across services, it's a full compromise. That's exactly the story you want to tell in the demo.


"VulnCart" — Vulnerabilities mapped to OSI layers
Layer 7 — Application: The BOLA on the order service, weak JWT signing, user enumeration, and the SSRF webhook flaw. This is where Playwright and API-level agents operate naturally.
Layer 6 — Presentation: The auth service accepts both JSON and XML input but the XML parser has XXE enabled. Malformed content-type headers bypass input validation on the gateway. JWT tokens are base64-encoded but not encrypted, leaking user roles in the payload.
Layer 5 — Session: JWT tokens never expire. Session fixation is possible because the auth service doesn't rotate tokens after privilege changes. The gateway maintains sticky sessions that can be hijacked by replaying a cookie across services.
Layer 4 — Transport: The payment service listens on an unencrypted HTTP port internally (no mTLS between services). The debug endpoint accepts connections on a non-standard port that isn't covered by health checks or monitoring.
Layer 3 — Network: No network segmentation between containers — every service can reach every other service directly. The payment service responds to pings and exposes its internal IP, enabling network mapping from any compromised container.
Layer 2 — Data Link: Containers share a default Docker bridge network with ARP visible between them, enabling ARP spoofing from a compromised container to intercept traffic between other services.
Layer 1 — Physical (simulated): The payment container has the Docker socket mounted (simulating host access), and /proc is readable, leaking host-level environment variables and mounted volume paths.
