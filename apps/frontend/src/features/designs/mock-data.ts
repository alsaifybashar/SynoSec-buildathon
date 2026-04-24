export type MockSeverity = "critical" | "high" | "medium" | "low";

export type MockToolCall = {
  id: string;
  name: string;
  callTitle: string;
  input: string;
  output: string;
  observations: string[];
  status: "completed" | "running" | "failed";
  durationMs: number;
};

export type MockFinding = {
  id: string;
  title: string;
  severity: MockSeverity;
  confidence: number;
  host: string;
  impact: string;
  recommendation: string;
};

export type MockPromptContext = {
  id: string;
  title: string;
  body: string;
  kind: "system" | "directive" | "memory";
};

export type MockTurn = {
  id: string;
  step: number;
  createdAt: string;
  agentName: string;
  promptContexts: MockPromptContext[];
  reasoning: string;
  body: string;
  tools: MockToolCall[];
  findings: MockFinding[];
  usage: { input: number; output: number; reasoning: number };
};

export type MockWorkflow = {
  name: string;
  target: string;
  objective: string;
  agentName: string;
  systemPrompt: string;
  turns: MockTurn[];
};

export const mockWorkflow: MockWorkflow = {
  name: "Corvid · Recon Sweep",
  target: "orchid.internal.acme.corp",
  agentName: "Sentinel-04",
  systemPrompt:
    "You are Sentinel-04, an autonomous red-team operator. Enumerate the target network with minimal noise. Prefer passive reconnaissance. Escalate only when explicitly authorized. Report findings with CVSS-style severity and cite evidence.",
  objective:
    "Identify exposed services and unauthenticated endpoints across orchid.internal.acme.corp, produce a prioritized remediation brief within one autonomy window.",
  turns: [
    {
      id: "turn-01",
      step: 1,
      createdAt: "2026-04-24T08:14:02Z",
      agentName: "Sentinel-04",
      promptContexts: [
        {
          id: "ctx-01",
          kind: "system",
          title: "Operator Directive",
          body: "Begin with passive enumeration. Do not issue exploit payloads in this window. Snapshot the attack surface and surface any low-hanging misconfigurations.",
        },
        {
          id: "ctx-02",
          kind: "memory",
          title: "Target Fingerprint",
          body: "Target belongs to acme-orchid segment · last scan 11 days ago · two subdomains previously flagged for legacy TLS.",
        },
      ],
      reasoning:
        "Start from authoritative DNS, then fan out to HTTP banners. Avoid authenticated probes until surface is mapped.",
      body: "Mapping the edge of the orchid segment. I'll begin with DNS reconnaissance and passive port discovery, then triage any services that respond with noteworthy banners.",
      tools: [
        {
          id: "tool-01",
          name: "dns.enumerate",
          callTitle: "Enumerate DNS records for orchid.internal.acme.corp",
          input: '{ "zone": "orchid.internal.acme.corp", "types": ["A","AAAA","TXT","MX","SRV"] }',
          output: "resolved 14 A records · 3 CNAMEs chain to legacy-auth.acme.corp · SPF policy ~all",
          observations: [
            "legacy-auth.acme.corp appears 3x — candidate for lateral pivot",
            "SPF uses soft-fail, spoofing surface is open",
          ],
          status: "completed",
          durationMs: 820,
        },
      ],
      findings: [],
      usage: { input: 1420, output: 612, reasoning: 184 },
    },
    {
      id: "turn-02",
      step: 2,
      createdAt: "2026-04-24T08:14:27Z",
      agentName: "Sentinel-04",
      promptContexts: [
        {
          id: "ctx-03",
          kind: "directive",
          title: "Scope Expansion",
          body: "Given SPF softfail, include mail.orchid.internal.acme.corp in the sweep. Stay non-intrusive.",
        },
      ],
      reasoning:
        "SPF softfail suggests deliverability risk but not directly exploitable from here. Prioritize service-level banners on the three hosts returning 200.",
      body: "DNS surface looks broader than expected. Pivoting to HTTP probes against the three hosts returning authoritative answers. I suspect at least one is running an outdated reverse proxy.",
      tools: [
        {
          id: "tool-02",
          name: "http.probe",
          callTitle: "Banner-grab the three live HTTP endpoints",
          input: '{ "hosts": ["api.orchid","mail.orchid","auth.orchid"], "tls": true }',
          output:
            "api.orchid → nginx 1.18.0 (2020-04) · mail.orchid → Postfix 3.4 · auth.orchid → HAProxy 2.1 (EoL)",
          observations: [
            "auth.orchid is past its end-of-life window",
            "api.orchid exposes server tokens",
            "mail.orchid accepts STARTTLS but downgrades to TLS 1.0",
          ],
          status: "completed",
          durationMs: 1_430,
        },
        {
          id: "tool-03",
          name: "tls.inspect",
          callTitle: "Inspect TLS parameters on mail.orchid",
          input: '{ "host": "mail.orchid.internal.acme.corp", "port": 465 }',
          output: "Cert chain valid · negotiates TLS 1.0 · RSA-1024 intermediate present",
          observations: ["RSA-1024 intermediate violates internal policy A-9"],
          status: "completed",
          durationMs: 612,
        },
      ],
      findings: [
        {
          id: "f-01",
          title: "Mail host downgrades to TLS 1.0",
          severity: "high",
          confidence: 0.92,
          host: "mail.orchid.internal.acme.corp",
          impact:
            "Cleartext recovery of email credentials is possible for any network-adjacent adversary via downgrade negotiation.",
          recommendation: "Disable TLS 1.0/1.1 on Postfix submission port. Enforce TLS 1.2 minimum with modern ciphers.",
        },
      ],
      usage: { input: 1880, output: 744, reasoning: 232 },
    },
    {
      id: "turn-03",
      step: 3,
      createdAt: "2026-04-24T08:15:04Z",
      agentName: "Sentinel-04",
      promptContexts: [
        {
          id: "ctx-04",
          kind: "system",
          title: "Deepen on auth.orchid",
          body: "End-of-life HAProxy is a classic pivot. Fingerprint the upstream service it fronts — stay passive on the auth flow.",
        },
      ],
      reasoning:
        "HAProxy 2.1 EoL means known CVEs are unpatched. I should probe response headers for upstream identifiers without triggering auth flows.",
      body: "Digging into auth.orchid. The EoL load balancer is advertising upstream fingerprints in X-Upstream headers — a subtle leak that can seed further inference.",
      tools: [
        {
          id: "tool-04",
          name: "http.headers",
          callTitle: "Harvest non-cached response headers on auth.orchid",
          input: '{ "host": "auth.orchid.internal.acme.corp", "paths": ["/", "/healthz", "/.well-known/openid-configuration"] }',
          output:
            "200 / · X-Upstream: keycloak-7.1.4 · 200 /healthz · X-Frame-Options missing · 404 /.well-known/... but leak: Server: HAProxy",
          observations: [
            "Keycloak 7.1.4 has two known CVEs affecting token validation",
            "X-Frame-Options absent across the board — clickjacking surface",
          ],
          status: "completed",
          durationMs: 980,
        },
      ],
      findings: [
        {
          id: "f-02",
          title: "End-of-life HAProxy exposes upstream Keycloak 7.1.4",
          severity: "critical",
          confidence: 0.97,
          host: "auth.orchid.internal.acme.corp",
          impact:
            "Authentication front-end runs unmaintained software and leaks upstream identity provider version, enabling targeted CVE chaining.",
          recommendation:
            "Upgrade HAProxy to a supported branch, strip X-Upstream headers at egress, and migrate Keycloak to a maintained line.",
        },
        {
          id: "f-03",
          title: "Missing clickjacking protection across auth surface",
          severity: "medium",
          confidence: 0.78,
          host: "auth.orchid.internal.acme.corp",
          impact: "UI redress attacks can frame consent screens and exfiltrate OAuth grants.",
          recommendation: "Apply Content-Security-Policy frame-ancestors and X-Frame-Options DENY at the edge.",
        },
      ],
      usage: { input: 2214, output: 861, reasoning: 298 },
    },
    {
      id: "turn-04",
      step: 4,
      createdAt: "2026-04-24T08:15:41Z",
      agentName: "Sentinel-04",
      promptContexts: [],
      reasoning:
        "Consolidating. Three surfaces, two critical-class issues. The report should lead with the auth pivot since it gates identity for the whole segment.",
      body: "Sweep complete. The recommended remediation order is auth.orchid → mail.orchid → api.orchid. All evidence captured to the run ledger. Standing by for the next directive.",
      tools: [],
      findings: [],
      usage: { input: 2402, output: 310, reasoning: 112 },
    },
  ],
};

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(iso));
}
