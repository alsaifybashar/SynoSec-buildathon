# Cloudflare Penetration Testing Requirements

This document summarizes Cloudflare's published requirements for scanning and penetration testing assets behind Cloudflare, plus the available ways to engage Cloudflare for adjacent security workflows.

## What Cloudflare allows

As of `2026-04-20`, Cloudflare states that customers may conduct scans and penetration tests on application-layer and network-layer aspects of their own assets behind Cloudflare, as long as testing stays within Cloudflare's policy scope.

Permitted targets are limited to:

- Customer-owned IPs
- Cloudflare's designated public IPs
- The customer's registered DNS entries

Cloudflare-owned destinations such as `*.cloudflare.com` are out of scope for customer-run testing unless they are tested through Cloudflare's Public Bug Bounty program on HackerOne.

## Scan requirements

For vulnerability scans, Cloudflare's policy says:

- Scans should be throttled to a reasonable rate.
- Scans should identify vulnerabilities without actively exploiting them.
- `/cdn-cgi/` endpoints should be excluded to reduce false positives and irrelevant findings.
- PCI compliance scans are allowed.

## Penetration test prerequisites

Before running a penetration test against zones behind Cloudflare, Cloudflare says each tested zone should have the following controls configured:

1. Cloudflare Managed Ruleset deployed with all rules enabled.
2. Cloudflare OWASP Core Ruleset deployed with:
   - `Paranoia Level: PL4`
   - `Score threshold: High - 25 and higher`
3. A WAF custom rule that blocks requests with attack score `1-20`.
4. A custom rule for malicious uploads detection that blocks malicious content objects.
5. Bot protection enabled:
   - `Super Bot Fight Mode` for Pro and Business plans without Bot Management
   - `Bot Management` when available
6. Rate limiting rules protecting key endpoints of the tested zone.

Cloudflare also notes that other active security and performance settings on the account or zone can affect test outcomes.

## Important testing notes

Cloudflare explicitly calls out several behaviors that can otherwise look like findings:

- Ports other than `80` and `443` may appear open on Cloudflare's anycast network. This is expected behavior and does not by itself indicate a vulnerability.
- Non-standard HTTP ports may appear open in tools such as Netcat, but that does not mean the customer origin is reachable on those ports.
- Findings related to the `ROBOT` vulnerability are known false positives for customer assets behind Cloudflare.

## DDoS simulation

As of `2026-04-25`, Cloudflare's DDoS testing guidance says customers do not need prior permission from Cloudflare to simulate DDoS attacks against their own Internet properties if:

- The properties are not shared with other organizations or individuals.
- The properties are onboarded to Cloudflare in an account under the customer's name or ownership.

Cloudflare also warns that the service under test must match the attack type. For example, testing HTTP DDoS protection requires the HTTP application to be onboarded behind Cloudflare's reverse proxy.

## How to enlist all relevant Cloudflare paths

### 1. Customer-run or third-party pentest on your own assets

This is the default route if the targets are your own zones, DNS names, and IPs behind Cloudflare.

Use this route when:

- You are testing your own Internet properties.
- You already have an internal security team or external pentest vendor.
- You want to stay within Cloudflare's published self-service policy.

Required preparation:

- Confirm that the targets are owned by your organization.
- Confirm that the targets are in scope under the Cloudflare policy.
- Configure the required WAF, bot, and rate limiting controls before testing.

### 2. Download Cloudflare's own penetration test and compliance documents

Cloudflare states that Super Administrators can download compliance documentation through the Cloudflare dashboard.

Dashboard path:

- `Support > Compliance Documents`

Requirements:

- You must be a `Super Administrator` on the relevant Cloudflare account.
- First-time access requires acceptance of the confidentiality statement.

Cloudflare's scans and penetration testing policy also states that customers can download the latest Cloudflare Penetration Test Report through the dashboard.

Use this route when:

- Procurement, risk, legal, or compliance needs Cloudflare's own assurance artifacts.
- You need Cloudflare's report alongside your own pentest evidence.

### 3. Cloudflare Public Bug Bounty on HackerOne

If the intended target is Cloudflare infrastructure or a Cloudflare-owned destination, the approved path is Cloudflare's public bug bounty program on HackerOne.

Use this route when:

- The target is `cloudflare.com`, `*.cloudflare.com`, or another Cloudflare-owned destination.
- You are reporting a Cloudflare vulnerability rather than testing your own assets.

Do not use customer-run testing against Cloudflare-owned assets outside the bug bounty scope.

### 4. Cloudforce One security services

As of `2026-04-16`, Cloudflare documents that Cloudforce One customers can request services through the dashboard.

Dashboard path:

- `Threat Intelligence > Incident response services`

Documented options include:

- `Receive post-incident support`
- `Request penetration tests`
- `Conduct table-top exercises`
- `Ask for general security advice`

Requirement:

- You must have a `Cloudforce One` subscription.

Use this route when:

- You want Cloudflare to provide or coordinate security services.
- You want a formal Cloudflare service engagement rather than only self-service testing guidance.

## Practical checklist for this project

- Confirm which domains, zones, and IPs are owned by the organization.
- Confirm which of those assets are proxied or otherwise onboarded to Cloudflare.
- Confirm whether the account team has `Super Administrator` access.
- Confirm whether the account has a `Cloudforce One` subscription.
- Download Cloudflare compliance artifacts from `Support > Compliance Documents`.
- Configure the required Cloudflare security controls on each in-scope zone before testing.
- Use a third-party pentest vendor or internal team for customer-owned assets.
- Use HackerOne only for Cloudflare-owned targets.
- Use Cloudforce One if Cloudflare-assisted penetration testing or advisory services are desired.

## Sources

- Cloudflare, "Scans and penetration testing policy" (last updated `2026-04-20`): https://developers.cloudflare.com/fundamentals/reference/scans-penetration/
- Cloudflare, "Compliance documentation": https://developers.cloudflare.com/fundamentals/reference/policies-compliances/compliance-docs/
- Cloudflare, "Simulating test DDoS attacks": https://developers.cloudflare.com/ddos-protection/reference/simulate-ddos-attack/
- Cloudflare, "Vulnerability Disclosure Policy": https://www.cloudflare.com/disclosure/
- Cloudflare, "Cloudforce One" (last updated `2026-04-16`): https://developers.cloudflare.com/security-center/cloudforce-one/
