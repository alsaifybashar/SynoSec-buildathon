import type { AiTool, ToolBuiltinActionKey, ToolConstraintProfile } from "@synosec/contracts";

const builtinTimestamp = "2026-05-01T00:00:00.000Z";

type FamilyInputField =
  | "targetUrl"
  | "baseUrl"
  | "url"
  | "startUrl"
  | "host"
  | "domain"
  | "ports"
  | "candidatePorts"
  | "targets"
  | "endpoints";

type SemanticFamilyDefinitionInput = {
  builtinActionKey: ToolBuiltinActionKey;
  name: string;
  description: string;
  category: AiTool["category"];
  riskTier: AiTool["riskTier"];
  capabilities: string[];
  timeoutMs: number;
  constraintProfile: ToolConstraintProfile;
  requiredInputFields?: FamilyInputField[];
  candidateToolId: string;
  inputSchema: Record<string, unknown>;
};

export type SemanticFamilyDefinition = {
  tool: AiTool;
  requiredInputFields: FamilyInputField[];
  coveredToolIds: string[];
  candidateToolIds: string[];
};

const commonFamilyOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    summary: { type: "string" }
  },
  required: ["id", "summary"]
} as const;

function builtinToolId(actionKey: ToolBuiltinActionKey) {
  return `builtin-${actionKey.replaceAll("_", "-")}`;
}

function createSemanticFamilyDefinition(input: SemanticFamilyDefinitionInput): SemanticFamilyDefinition {
  const candidateToolIds = [input.candidateToolId];
  return {
    tool: {
      id: builtinToolId(input.builtinActionKey),
      name: input.name,
      kind: "builtin-action",
      status: "active",
      source: "system",
      accessProfile: "standard",
      description: input.description,
      executorType: "builtin",
      builtinActionKey: input.builtinActionKey,
      bashSource: null,
      capabilities: input.capabilities,
      category: input.category,
      riskTier: input.riskTier,
      timeoutMs: input.timeoutMs,
      coveredToolIds: candidateToolIds,
      candidateToolIds,
      constraintProfile: input.constraintProfile,
      inputSchema: input.inputSchema,
      outputSchema: commonFamilyOutputSchema,
      createdAt: builtinTimestamp,
      updatedAt: builtinTimestamp
    },
    requiredInputFields: input.requiredInputFields ?? [],
    coveredToolIds: candidateToolIds,
    candidateToolIds
  };
}

export const semanticFamilyDefinitions: SemanticFamilyDefinition[] = [
  createSemanticFamilyDefinition({
    builtinActionKey: "http_surface_assessment",
    name: "Assess HTTP Surface",
    description: "Assess one explicit HTTP or HTTPS target for reachability, redirects, headers, cookies, title text, and light fingerprint hints. Use this when you need a bounded first look at a known web surface before crawling or validation. Provide `targetUrl`, `baseUrl`, or `url`, and optionally `followRedirects` when redirect behavior itself is part of the evidence. Returns grounded observations only from the fetched response and clearly states what was actually observed. It does not prove hidden routes, authenticated behavior, or broad application coverage.",
    category: "web",
    riskTier: "passive",
    capabilities: ["http-surface", "web", "passive", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain", "url"],
      networkBehavior: "outbound-read",
      mutationClass: "none",
      supportsHostAllowlist: true,
      supportsPathExclusions: false,
      supportsRateLimit: true
    },
    candidateToolId: "native-http-surface-assessment",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        targetUrl: { type: "string" },
        baseUrl: { type: "string" },
        url: { type: "string" },
        followRedirects: { type: "boolean" }
      },
      required: []
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "web_crawl_mapping",
    name: "Map Web Entry Point",
    description: "Map one explicit web entrypoint with a tight request budget by collecting the page itself and optional crawl hints such as `robots.txt`. Use this when you need bounded discovery of links, forms, and scripts from a known URL instead of broad traversal. Provide `startUrl` or `baseUrl`, and optionally `includeRobots` when crawl hints matter. Returns only the page elements and crawl hints actually observed in fetched content. It does not perform a deep crawl, prove full site coverage, or bypass access controls.",
    category: "web",
    riskTier: "passive",
    capabilities: ["web-crawl", "web", "passive", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain", "url"],
      networkBehavior: "outbound-read",
      mutationClass: "none",
      supportsHostAllowlist: true,
      supportsPathExclusions: false,
      supportsRateLimit: true
    },
    candidateToolId: "native-web-crawl-mapping",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        startUrl: { type: "string" },
        baseUrl: { type: "string" },
        includeRobots: { type: "boolean" }
      },
      required: []
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "content_discovery",
    name: "Validate Candidate Paths",
    description: "Validate a bounded candidate-path list against one explicit base URL. Use this when you already have concrete path candidates or you want the strict default set, and need grounded confirmation of which routes respond. Provide `baseUrl`, and optionally `candidatePaths` or `method` if HEAD is sufficient. Returns only the candidate paths that actually produced a non-404 response. It does not brute-force large wordlists, infer hidden content beyond the supplied list, or prove authorization bypass.",
    category: "content",
    riskTier: "active",
    capabilities: ["content-discovery", "web", "active-recon", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain", "url"],
      networkBehavior: "outbound-active",
      mutationClass: "content-enumeration",
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    },
    requiredInputFields: ["baseUrl"],
    candidateToolId: "native-content-discovery",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        baseUrl: { type: "string" },
        candidatePaths: { type: "array", items: { type: "string" } },
        method: { type: "string", enum: ["GET", "HEAD"] }
      },
      required: ["baseUrl"]
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "parameter_discovery",
    name: "Probe Candidate Parameters",
    description: "Probe explicit endpoints for candidate parameter acceptance or reflection with one bounded test value per named parameter. Use this when you already know the endpoints and candidate parameter names and need grounded evidence of reflection or response changes. Provide `endpoints` with the exact URL, method, candidate parameters, and any baseline query or body fields required by the request. Returns only the reflection or response deltas actually observed during those requests. It does not crawl for new endpoints, fuzz arbitrary names, or prove exploitability.",
    category: "web",
    riskTier: "active",
    capabilities: ["param-discovery", "web", "active-recon", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain", "url"],
      networkBehavior: "outbound-active",
      mutationClass: "active-validation",
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    },
    requiredInputFields: ["endpoints"],
    candidateToolId: "native-parameter-discovery",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        endpoints: { type: "array", items: { type: "object" } }
      },
      required: ["endpoints"]
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "auth_flow_assessment",
    name: "Assess Authentication Flow",
    description: "Assess one explicit authentication flow for missing rate limits, user-enumeration signals, timing-oracle leakage, or artifact acceptance, using only bounded native requests. Use this when you have a specific login endpoint, application base URL, or artifact-validation target set and need grounded auth-control evidence. Provide the same concrete fields used by the underlying auth flow runtime, such as `targetUrl`, `targetKind`, login request details, or `artifactValidationTargets`. Returns only the auth weaknesses and flow observations that were actually observed during the run. It does not crawl broadly, brute-force accounts, or imply exploitability beyond the collected evidence.",
    category: "auth",
    riskTier: "active",
    capabilities: ["auth", "session", "active-recon", "builtin-active-function"],
    timeoutMs: 60000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain", "url"],
      networkBehavior: "outbound-active",
      mutationClass: "active-validation",
      supportsHostAllowlist: true,
      supportsPathExclusions: false,
      supportsRateLimit: true
    },
    candidateToolId: "native-auth-flow-probe",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { type: "string", enum: ["login-probe", "artifact-validation"] },
        targetUrl: { type: "string" },
        targetKind: { type: "string", enum: ["login-endpoint", "app-base"] },
        usernameField: { type: "string" },
        passwordField: { type: "string" },
        requestEncoding: { type: "string", enum: ["form", "json"] },
        requestHeaders: { type: "object", additionalProperties: { type: "string" } },
        preflightRequest: { type: "object" },
        csrf: { type: "object" },
        artifactValidationTargets: { type: "array", items: { type: "object" } },
        knownUser: { type: "string" },
        unknownUser: { type: "string" },
        weakPasswordCandidates: { type: "array", items: { type: "string" } },
        successRedirectPath: { type: "string" },
        successBodyStrings: { type: "array", items: { type: "string" } },
        successHeaderKeys: { type: "array", items: { type: "string" } },
        rateLimitAttemptCount: { type: "number" },
        oracleSampleCount: { type: "number" },
        paceMs: { type: "number" },
        baselineRepeats: { type: "number" }
      },
      required: []
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "sql_injection_validation",
    name: "Validate SQL Injection Signals",
    description: "Validate explicit parameters for likely SQL-injection behavior using deterministic baseline and quote-based test payloads. Use this when you already know the exact endpoint and parameter to test and need bounded confirmation of SQL error leakage or strong response divergence. Provide `targets` with the URL, method, parameter, and any baseline query or body fields required by the request shape. Returns only the SQL error evidence or deterministic response changes that were actually observed. It does not dump data, authenticate past controls, or prove full exploitability.",
    category: "web",
    riskTier: "active",
    capabilities: ["sqli", "web", "active-validation", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain", "url"],
      networkBehavior: "outbound-active",
      mutationClass: "active-validation",
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    },
    requiredInputFields: ["targets"],
    candidateToolId: "native-sql-injection-validation",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        targets: { type: "array", items: { type: "object" } }
      },
      required: ["targets"]
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "xss_validation",
    name: "Validate Reflected Input",
    description: "Validate explicit parameters for simple reflected-input exposure with a bounded marker payload. Use this when you already know the exact endpoint and parameter to test and need confirmation that untrusted input is reflected into the response body. Provide `targets` with the URL, method, parameter, and any baseline query or body fields required by the request shape. Returns only the reflections that were actually observed in the response body. It does not execute JavaScript, prove stored or DOM-based XSS, or perform general fuzzing.",
    category: "web",
    riskTier: "active",
    capabilities: ["xss", "web", "active-validation", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain", "url"],
      networkBehavior: "outbound-active",
      mutationClass: "active-validation",
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    },
    requiredInputFields: ["targets"],
    candidateToolId: "native-xss-validation",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        targets: { type: "array", items: { type: "object" } }
      },
      required: ["targets"]
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "network_host_discovery",
    name: "Check Host Reachability",
    description: "Check one explicit host and a bounded candidate port list for direct TCP reachability. Use this when you need grounded evidence of which common ports accept connections before deeper service probing. Provide `host`, and optionally `candidatePorts` or `timeoutMs` when the default bounded list is not appropriate. Returns only the connection outcomes that were actually observed for the tested ports. It does not identify application-layer services or prove what is behind a reachable port.",
    category: "network",
    riskTier: "passive",
    capabilities: ["network", "port-scan", "passive", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain"],
      networkBehavior: "outbound-read",
      mutationClass: "none",
      supportsHostAllowlist: true,
      supportsPathExclusions: false,
      supportsRateLimit: true
    },
    requiredInputFields: ["host"],
    candidateToolId: "native-network-host-discovery",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        host: { type: "string" },
        candidatePorts: { type: "array", items: { type: "number" } },
        timeoutMs: { type: "number" }
      },
      required: ["host"]
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "network_service_enumeration",
    name: "Enumerate Known Services",
    description: "Enumerate explicit TCP services on a known host by connecting to bounded ports and capturing any immediate banner or protocol hint. Use this after host discovery when you already know which ports are worth examining and need grounded evidence of likely service identity. Provide `host` and explicit `ports`, and optionally `send` or `timeoutMs` when a light probe is needed to elicit a banner. Returns only the banners and protocol hints actually observed during those connections. It does not complete full protocol negotiation, run exploit checks, or scan beyond the supplied ports.",
    category: "network",
    riskTier: "active",
    capabilities: ["service-enum", "network", "active-recon", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain"],
      networkBehavior: "outbound-active",
      mutationClass: "active-validation",
      supportsHostAllowlist: true,
      supportsPathExclusions: false,
      supportsRateLimit: true
    },
    requiredInputFields: ["host", "ports"],
    candidateToolId: "native-network-service-enumeration",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        host: { type: "string" },
        ports: { type: "array", items: { type: "number" } },
        send: { type: "string" },
        timeoutMs: { type: "number" }
      },
      required: ["host", "ports"]
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "tls_posture_audit",
    name: "Audit TLS Posture",
    description: "Audit the TLS handshake posture of one explicit host and port by collecting the negotiated protocol, cipher, and peer certificate metadata. Use this when you need grounded transport-security evidence for a known TLS listener before interpreting higher-level web findings. Provide `host`, and optionally `port`, `serverName`, or `timeoutMs` when SNI or non-default ports are required. Returns only the handshake metadata that was actually negotiated with the target. It does not grade every compliance requirement, test every cipher suite, or prove client-side hostname validation.",
    category: "network",
    riskTier: "passive",
    capabilities: ["tls", "network", "passive", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["host", "domain"],
      networkBehavior: "outbound-read",
      mutationClass: "none",
      supportsHostAllowlist: true,
      supportsPathExclusions: false,
      supportsRateLimit: true
    },
    requiredInputFields: ["host"],
    candidateToolId: "native-tls-posture-audit",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        host: { type: "string" },
        port: { type: "number" },
        serverName: { type: "string" },
        timeoutMs: { type: "number" }
      },
      required: ["host"]
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "subdomain_discovery",
    name: "Discover Bounded Subdomains",
    description: "Discover bounded subdomain candidates for one explicit parent domain using DNS lookups and optional direct HTTP reachability checks. Use this when you need grounded confirmation of likely subdomains from a strict candidate set rather than passive OSINT collection or brute force. Provide `domain`, and optionally custom `candidateLabels` or disable `includeHttpChecks` when DNS-only evidence is enough. Returns only subdomains that actually resolved or responded to HTTP(S) during the run. It does not enumerate the full namespace or prove ownership of every discovered hostname.",
    category: "subdomain",
    riskTier: "active",
    capabilities: ["subdomain-discovery", "dns", "web", "active-recon", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["domain"],
      networkBehavior: "outbound-active",
      mutationClass: "active-validation",
      supportsHostAllowlist: true,
      supportsPathExclusions: false,
      supportsRateLimit: true
    },
    requiredInputFields: ["domain"],
    candidateToolId: "native-subdomain-discovery",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        domain: { type: "string" },
        candidateLabels: { type: "array", items: { type: "string" } },
        includeHttpChecks: { type: "boolean" }
      },
      required: ["domain"]
    }
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "dns_enumeration",
    name: "Enumerate DNS Records",
    description: "Enumerate deterministic DNS record sets for one explicit domain. Use this when you need grounded A, AAAA, MX, NS, SOA, TXT, or CAA evidence for a known domain without relying on external passive data sources. Provide `domain`, and optionally narrow or expand `recordTypes` within the supported bounded set. Returns only the record answers and response codes actually observed from DNS resolution. It does not brute-force names, derive hidden zones, or prove service reachability on the returned hosts.",
    category: "dns",
    riskTier: "passive",
    capabilities: ["dns", "passive", "builtin-active-function"],
    timeoutMs: 30000,
    constraintProfile: {
      enforced: true,
      targetKinds: ["domain"],
      networkBehavior: "outbound-read",
      mutationClass: "none",
      supportsHostAllowlist: true,
      supportsPathExclusions: false,
      supportsRateLimit: true
    },
    requiredInputFields: ["domain"],
    candidateToolId: "native-dns-enumeration",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        domain: { type: "string" },
        recordTypes: { type: "array", items: { type: "string" } }
      },
      required: ["domain"]
    }
  })
];

const semanticFamilyByBuiltinActionKey = new Map(
  semanticFamilyDefinitions.map((definition) => [definition.tool.builtinActionKey, definition] as const)
);

export function getSemanticFamilyDefinitions() {
  return semanticFamilyDefinitions.map((definition) => ({
    ...definition,
    tool: {
      ...definition.tool,
      coveredToolIds: [...definition.coveredToolIds],
      candidateToolIds: [...definition.candidateToolIds]
    },
    requiredInputFields: [...definition.requiredInputFields],
    coveredToolIds: [...definition.coveredToolIds],
    candidateToolIds: [...definition.candidateToolIds]
  }));
}

export function getSemanticFamilyDefinition(actionKey: ToolBuiltinActionKey) {
  const definition = semanticFamilyByBuiltinActionKey.get(actionKey);
  if (!definition) {
    return null;
  }

  return {
    ...definition,
    tool: {
      ...definition.tool,
      coveredToolIds: [...definition.coveredToolIds],
      candidateToolIds: [...definition.candidateToolIds]
    },
    requiredInputFields: [...definition.requiredInputFields],
    coveredToolIds: [...definition.coveredToolIds],
    candidateToolIds: [...definition.candidateToolIds]
  };
}

export function getSemanticFamilyBuiltinAiTools() {
  return semanticFamilyDefinitions.map((definition) => ({ ...definition.tool }));
}
