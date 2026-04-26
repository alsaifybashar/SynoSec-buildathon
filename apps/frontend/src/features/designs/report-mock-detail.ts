import type { ExecutionReportDetail } from "@synosec/contracts";

export const mockReportDetail: ExecutionReportDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  executionId: "exec_01J9F2KX7Y0M3R7Q4D9KQ2H4ZP",
  executionKind: "attack-map",
  sourceDefinitionId: null,
  status: "completed",
  title: "Edge Authority — Black Pine Quarter",
  targetLabel: "auth.blackpine.internal",
  sourceLabel: "Workflow · Atlas-2 Posture Sweep",
  findingsCount: 4,
  highestSeverity: "critical",
  generatedAt: "2026-04-22T14:08:00.000Z",
  updatedAt: "2026-04-22T16:42:00.000Z",
  archivedAt: null,
  executiveSummary: `## Executive summary

An external posture sweep against the **Black Pine identity surface** surfaced a chain of three high-impact issues that, in isolation, would each have shipped to backlog — but together enable a **cross-tenant session graft**.

### What I found

- A permissive \`Access-Control-Allow-Origin: *\` on the legacy SSO bridge with \`Allow-Credentials: true\`
- A long-lived refresh token (\`ATLAS_RT\`, 89 days remaining) leaked in the public \`atlas-release.tar.gz\` artifact
- A missing \`aud\` claim check on the staging audience proxy, which accepts JWTs minted for unrelated tenants
- A cookie scoped to \`.blackpine.internal\`, exposing the prod identity cookie to weaker staging subdomains

### Why it matters

Combined, these turn a stale release artifact into a working session for **any tenant that authenticated via the legacy bridge in the last 90 days** — roughly *12 tenants in 1 region*.

### Recommended order of operations

1. **Revoke** \`ATLAS_RT\` and rotate the seed-env signing key today
2. **Tighten** the audience proxy validator to enforce \`aud == staging-aud-proxy\`
3. **Replace** the wildcard CORS policy with an explicit tenant allowlist
4. **Re-scope** the auth cookie to the \`auth.\` subdomain and introduce host-bound session tokens

> The chain is the story here. Steps 1–2 close the live exposure window; steps 3–4 prevent the same shape of finding from re-appearing.`,
  graph: {
    nodes: [
      {
        id: "ev-01",
        kind: "evidence",
        title: "Permissive Access-Control-Allow-Origin",
        summary: "SSO bridge responds with `*` for unauthenticated OPTIONS preflight on /v1/session.",
        sourceTool: "http-probe",
        quote: "access-control-allow-origin: *\naccess-control-allow-credentials: true",
        refs: [{ toolRunRef: "http-probe-3", observationRef: "obs-001" }],
        createdAt: "2026-04-22T14:08:30.000Z"
      },
      {
        id: "ev-02",
        kind: "evidence",
        title: "Refresh token in artifact bundle",
        summary: "Public release archive contains a long-lived refresh token under /etc/atlas/seed.env.",
        sourceTool: "artifact-scan",
        quote: "ATLAS_RT=eyJhbGciOiJSUzI1NiIs… (89d remaining)",
        severity: "critical",
        refs: [{ artifactRef: "atlas-release", observationRef: "scan-77" }],
        createdAt: "2026-04-22T14:11:00.000Z"
      },
      {
        id: "ev-03",
        kind: "evidence",
        title: "Missing aud claim check",
        summary: "Audience proxy accepts any signed JWT regardless of audience binding.",
        sourceTool: "jwt-fuzz",
        quote: '200 OK ← {"aud":"unrelated-tenant"}',
        severity: "high",
        refs: [{ toolRunRef: "jwt-fuzz-12" }],
        createdAt: "2026-04-22T14:21:00.000Z"
      },
      {
        id: "ev-04",
        kind: "evidence",
        title: "Legacy bridge cookie scope",
        summary: "Cookie sets Domain=.blackpine.internal, exposing it to all subdomains including staging.",
        sourceTool: "http-probe",
        quote: "set-cookie: bp_session=…; Domain=.blackpine.internal; Path=/",
        refs: [{ toolRunRef: "http-probe-3" }],
        createdAt: "2026-04-22T14:09:10.000Z"
      },
      {
        id: "ev-05",
        kind: "evidence",
        title: "Wildcard CSP frame-ancestors",
        summary: "Login page allows framing by any origin; precondition for clickjacked consent.",
        sourceTool: "http-probe",
        quote: "content-security-policy: frame-ancestors *",
        refs: [{ toolRunRef: "http-probe-7" }],
        createdAt: "2026-04-22T14:14:00.000Z"
      },
      {
        id: "fn-01",
        kind: "finding",
        findingId: "fn-01",
        title: "Cross-origin credentialed read on /v1/session",
        summary: "Any origin can read user session payload due to permissive CORS with credentials.",
        severity: "high",
        confidence: 0.85,
        targetLabel: "sso-bridge.blackpine.internal",
        createdAt: "2026-04-22T14:23:00.000Z"
      },
      {
        id: "fn-02",
        kind: "finding",
        findingId: "fn-02",
        title: "Long-lived refresh token disclosure",
        summary: "Refresh token leaked in public artifact valid for 89 days; usable from any IP.",
        severity: "critical",
        confidence: 0.95,
        targetLabel: "atlas-release.tar.gz",
        createdAt: "2026-04-22T14:25:00.000Z"
      },
      {
        id: "fn-03",
        kind: "finding",
        findingId: "fn-03",
        title: "Audience confusion in staging proxy",
        summary: "Audience proxy fails closed only on signature, not on aud — accepts cross-tenant tokens.",
        severity: "high",
        confidence: 0.9,
        targetLabel: "aud-proxy.staging.blackpine.internal",
        createdAt: "2026-04-22T14:27:00.000Z"
      },
      {
        id: "fn-04",
        kind: "finding",
        findingId: "fn-04",
        title: "Subdomain cookie sharing",
        summary: "Authentication cookie scoped too widely; staging subdomain can read prod identity cookie.",
        severity: "medium",
        confidence: 0.7,
        targetLabel: "sso-bridge.blackpine.internal",
        createdAt: "2026-04-22T14:29:00.000Z"
      },
      {
        id: "ch-01",
        kind: "chain",
        title: "Cross-tenant session graft",
        summary:
          "Combine the leaked refresh token, audience confusion, and broad cookie scope to mint sessions for any tenant that authenticated via the legacy bridge in the last 90 days.",
        severity: "critical",
        findingIds: ["fn-02", "fn-03", "fn-04"],
        createdAt: "2026-04-22T14:35:00.000Z"
      }
    ],
    edges: [
      { id: "e1", kind: "supports", source: "ev-01", target: "fn-01", label: "supports", createdAt: "2026-04-22T14:23:01.000Z" },
      { id: "e2", kind: "supports", source: "ev-04", target: "fn-04", label: "supports", createdAt: "2026-04-22T14:29:01.000Z" },
      { id: "e3", kind: "supports", source: "ev-02", target: "fn-02", label: "supports", createdAt: "2026-04-22T14:25:01.000Z" },
      { id: "e4", kind: "supports", source: "ev-03", target: "fn-03", label: "supports", createdAt: "2026-04-22T14:27:01.000Z" },
      { id: "e5", kind: "correlates_with", source: "ev-05", target: "fn-01", label: "related", createdAt: "2026-04-22T14:24:01.000Z" },
      { id: "e6", kind: "enables", source: "fn-02", target: "ch-01", label: "enables", createdAt: "2026-04-22T14:35:01.000Z" },
      { id: "e7", kind: "enables", source: "fn-03", target: "ch-01", label: "enables", createdAt: "2026-04-22T14:35:02.000Z" },
      { id: "e8", kind: "derived_from", source: "fn-04", target: "ch-01", label: "derived", createdAt: "2026-04-22T14:35:03.000Z" },
      { id: "e9", kind: "correlates_with", source: "fn-01", target: "ch-01", label: "related", createdAt: "2026-04-22T14:35:04.000Z" }
    ]
  },
  findings: [
    {
      id: "fn-02",
      executionId: "exec_01J9F2KX7Y0M3R7Q4D9KQ2H4ZP",
      executionKind: "attack-map",
      source: "attack-map-finding",
      severity: "critical",
      title: "Long-lived refresh token disclosure",
      type: "secret-disclosure",
      summary:
        "Public release artifact contains a refresh token with 89 days remaining and no IP binding. Any party with the artifact can mint access tokens until the token's natural expiry.",
      recommendation:
        "Revoke ATLAS_RT immediately; rotate the seed-env signing key and rebuild release. Add an artifact secret-scan gate to the release workflow.",
      confidence: 0.95,
      validationStatus: "reproduced",
      explanationSummary: "A release artifact contained a live refresh token with enough remaining lifetime to mint access tokens well after disclosure.",
      confidenceReason: "The token value was extracted directly from the artifact and verified against its remaining validity window.",
      targetLabel: "atlas-release.tar.gz",
      derivedFromFindingIds: [],
      relatedFindingIds: ["fn-01"],
      enablesFindingIds: ["fn-03"],
      relationshipExplanations: {
        relatedTo: "The exposed token becomes more damaging when combined with the weak session controls elsewhere in the environment.",
        enables: "The refresh token can be exchanged into a session that reaches the downstream audience-confusion weakness.",
        chainRole: "entry"
      },
      chain: {
        id: "ch-01",
        title: "Cross-tenant session graft",
        summary: "Refresh-token disclosure, audience confusion, and weak cookie scope can be chained into cross-tenant access.",
        severity: "critical"
      },
      reproduction: null,
      evidence: [
        { sourceTool: "artifact-scan", quote: "ATLAS_RT=eyJhbGciOiJSUzI1NiIs… (89d remaining)", artifactRef: "atlas-release" }
      ],
      sourceToolIds: ["artifact-scan", "secrets-grep"],
      sourceToolRunIds: [],
      createdAt: "2026-04-22T14:25:00.000Z"
    },
    {
      id: "fn-01",
      executionId: "exec_01J9F2KX7Y0M3R7Q4D9KQ2H4ZP",
      executionKind: "attack-map",
      source: "attack-map-finding",
      severity: "high",
      title: "Cross-origin credentialed read on /v1/session",
      type: "cors-misconfiguration",
      summary:
        "The legacy SSO bridge responds with Access-Control-Allow-Origin: * alongside Allow-Credentials: true. The misconfig signals broader inattention and is exploitable via origin reflection on adjacent paths.",
      recommendation:
        "Replace wildcard with an explicit allowlist tied to the tenant routing table; remove Allow-Credentials where unused.",
      confidence: 0.85,
      validationStatus: "single_source",
      explanationSummary: "The live response exposed a permissive credentialed CORS posture on a sensitive session endpoint.",
      confidenceReason: "The probe captured the exact response headers from the target service.",
      targetLabel: "sso-bridge.blackpine.internal",
      derivedFromFindingIds: [],
      relatedFindingIds: ["fn-02"],
      enablesFindingIds: [],
      relationshipExplanations: {
        relatedTo: "The CORS exposure increases the operational impact of the leaked refresh token by widening where session material can be replayed."
      },
      chain: null,
      reproduction: null,
      evidence: [
        { sourceTool: "http-probe", quote: "access-control-allow-origin: *", toolRunRef: "http-probe-3" }
      ],
      sourceToolIds: ["http-probe", "header-audit"],
      sourceToolRunIds: [],
      createdAt: "2026-04-22T14:23:00.000Z"
    },
    {
      id: "fn-03",
      executionId: "exec_01J9F2KX7Y0M3R7Q4D9KQ2H4ZP",
      executionKind: "attack-map",
      source: "attack-map-finding",
      severity: "high",
      title: "Audience confusion in staging proxy",
      type: "auth-token-validation",
      summary:
        "Audience proxy validates signature against the JWKS but never inspects the aud claim, accepting tokens minted for unrelated tenants.",
      recommendation:
        "Enforce aud == staging-aud-proxy in the proxy validator; add a contract test that fails on cross-tenant aud.",
      confidence: 0.9,
      validationStatus: "cross_validated",
      explanationSummary: "The proxy accepted tokens minted for the wrong audience, which breaks tenant isolation assumptions.",
      confidenceReason: "JWT fuzzing produced a successful response using a deliberately mismatched audience claim.",
      targetLabel: "aud-proxy.staging.blackpine.internal",
      derivedFromFindingIds: ["fn-02"],
      relatedFindingIds: [],
      enablesFindingIds: ["fn-04"],
      relationshipExplanations: {
        derivedFrom: "The leaked refresh token supplied a practical token source for probing the proxy validation path.",
        enables: "Once the proxy accepts a wrong-audience token, broad cookie scope increases where that session can travel.",
        chainRole: "pivot"
      },
      chain: {
        id: "ch-01",
        title: "Cross-tenant session graft",
        summary: "Refresh-token disclosure, audience confusion, and weak cookie scope can be chained into cross-tenant access.",
        severity: "critical"
      },
      reproduction: null,
      evidence: [{ sourceTool: "jwt-fuzz", quote: "200 OK ← unrelated-tenant aud accepted", toolRunRef: "jwt-fuzz-12" }],
      sourceToolIds: ["jwt-fuzz"],
      sourceToolRunIds: [],
      createdAt: "2026-04-22T14:27:00.000Z"
    },
    {
      id: "fn-04",
      executionId: "exec_01J9F2KX7Y0M3R7Q4D9KQ2H4ZP",
      executionKind: "attack-map",
      source: "attack-map-finding",
      severity: "medium",
      title: "Subdomain cookie sharing",
      type: "cookie-scope",
      summary:
        "Authentication cookie scoped to .blackpine.internal makes it readable by every subdomain, including staging environments with weaker hardening.",
      recommendation:
        "Tighten scope to the auth subdomain; introduce a host-bound session token for downstream services.",
      confidence: 0.7,
      validationStatus: "suspected",
      explanationSummary: "The cookie domain spans all subdomains, increasing the lateral exposure of any stolen or mis-issued session.",
      confidenceReason: "The scope is directly visible in the Set-Cookie header, but downstream abuse still depends on other weaknesses.",
      targetLabel: "sso-bridge.blackpine.internal",
      derivedFromFindingIds: ["fn-03"],
      relatedFindingIds: [],
      enablesFindingIds: [],
      relationshipExplanations: {
        derivedFrom: "This becomes materially exploitable after the audience-confusion path produces a usable cross-tenant session.",
        chainRole: "impact"
      },
      chain: {
        id: "ch-01",
        title: "Cross-tenant session graft",
        summary: "Refresh-token disclosure, audience confusion, and weak cookie scope can be chained into cross-tenant access.",
        severity: "critical"
      },
      reproduction: null,
      evidence: [{ sourceTool: "http-probe", quote: "Domain=.blackpine.internal", toolRunRef: "http-probe-3" }],
      sourceToolIds: ["http-probe"],
      sourceToolRunIds: [],
      createdAt: "2026-04-22T14:29:00.000Z"
    }
  ],
  toolActivity: [
    {
      id: "ta-01",
      executionId: "exec_01J9F2KX7Y0M3R7Q4D9KQ2H4ZP",
      executionKind: "attack-map",
      phase: "recon",
      toolId: "http-probe",
      toolName: "http-probe",
      command: "http-probe --target sso-bridge.blackpine.internal --headers --verbose",
      status: "completed",
      outputPreview:
        "HTTP/2 200\naccess-control-allow-origin: *\naccess-control-allow-credentials: true\nset-cookie: bp_session=…; Domain=.blackpine.internal; Path=/",
      exitCode: 0,
      startedAt: "2026-04-22T14:08:30.000Z",
      completedAt: "2026-04-22T14:09:50.000Z"
    },
    {
      id: "ta-02",
      executionId: "exec_01J9F2KX7Y0M3R7Q4D9KQ2H4ZP",
      executionKind: "attack-map",
      phase: "discovery",
      toolId: "artifact-scan",
      toolName: "artifact-scan",
      command: "artifact-scan --bundle atlas-release.tar.gz --rules secrets,jwt",
      status: "completed",
      outputPreview:
        "[hit] /etc/atlas/seed.env  rule=secrets/jwt-refresh\n  ATLAS_RT=eyJhbGciOiJSUzI1NiIs… (89d remaining)",
      exitCode: 0,
      startedAt: "2026-04-22T14:11:00.000Z",
      completedAt: "2026-04-22T14:13:30.000Z"
    },
    {
      id: "ta-03",
      executionId: "exec_01J9F2KX7Y0M3R7Q4D9KQ2H4ZP",
      executionKind: "attack-map",
      phase: "exploitation",
      toolId: "jwt-fuzz",
      toolName: "jwt-fuzz",
      command: "jwt-fuzz --proxy aud-proxy.staging.blackpine.internal --aud unrelated-tenant",
      status: "completed",
      outputPreview: "200 OK ← unrelated-tenant aud accepted (10/10 attempts)",
      exitCode: 0,
      startedAt: "2026-04-22T14:21:00.000Z",
      completedAt: "2026-04-22T14:22:40.000Z"
    },
    {
      id: "ta-04",
      executionId: "exec_01J9F2KX7Y0M3R7Q4D9KQ2H4ZP",
      executionKind: "attack-map",
      phase: "synthesis",
      toolId: "chain-builder",
      toolName: "chain-builder",
      command: "chain-builder --input findings.json --strategy graft",
      status: "completed",
      outputPreview:
        "chain ch-01 built: fn-02 → fn-03 → fn-04 (severity=critical)\nestimated blast: 1 region · 12 tenants · 90d window",
      exitCode: 0,
      startedAt: "2026-04-22T14:35:00.000Z",
      completedAt: "2026-04-22T14:36:10.000Z"
    }
  ],
  coverageOverview: {},
  sourceSummary: {
    executionKind: "attack-map",
    runId: "00000000-0000-4000-8000-000000000099",
    phase: "synthesis",
    overallRisk: "critical",
    chainCount: 1,
    findingNodeCount: 4
  },
  raw: {}
};
