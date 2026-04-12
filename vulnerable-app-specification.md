"VulnCart" — A fake e-commerce checkout system

Four services in one docker-compose:
Gateway (nginx/Express) — public-facing reverse proxy that routes to internal services. Trusts X-Internal-User headers from downstream without validation, so if you can reach a backend directly you can impersonate any user.

Auth Service (Node/Python) — issues JWTs with a weak secret ("secret123"), doesn't validate token expiry properly, and has a user enumeration flaw on the login endpoint.

Order Service (Python/Go) — accepts orders, talks to the payment service internally. Has a classic BOLA — any authenticated user can view/modify any order by changing the ID. Also has an SSRF flaw where the "webhook callback URL" field can be pointed at internal services.

Payment Service (Node) — supposed to be internal-only, but the network policy is missing so it's reachable from any container. Runs as root, has a debug endpoint with command injection via a "log_level" parameter.

The intended attack chain your agents should discover:
Weak JWT → forge a token → enumerate users → access another user's order via BOLA → use the SSRF in the webhook field to hit the payment service's debug endpoint → command injection → root shell in the payment container → read the mounted secrets.

Each vulnerability alone is medium severity. Chained together across services, it's a full compromise. That's exactly the story you want to tell in the demo.
