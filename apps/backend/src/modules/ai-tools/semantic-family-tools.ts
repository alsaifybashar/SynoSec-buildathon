import type { AiTool, ToolBuiltinActionKey, ToolConstraintProfile } from "@synosec/contracts";

const builtinTimestamp = "2026-04-26T00:00:00.000Z";

type FamilyInputField =
  | "target"
  | "baseUrl"
  | "url"
  | "startUrl"
  | "port"
  | "loginUrl"
  | "token"
  | "hash"
  | "hashes"
  | "hashType"
  | "method"
  | "mode"
  | "filePath"
  | "passphrase"
  | "module"
  | "username"
  | "password"
  | "candidateUsernames"
  | "candidatePasswords"
  | "credentialCandidates"
  | "service"
  | "protocol"
  | "provider"
  | "account"
  | "profile"
  | "cluster"
  | "namespace"
  | "options"
  | "candidateEndpoints"
  | "candidateParameters"
  | "validationTargets"
  | "candidatePorts"
  | "candidateDomains"
  | "knownSubdomains"
  | "maxEndpoints"
  | "maxRequests"
  | "maxPorts"
  | "maxResults"
  | "maxAttempts"
  | "notes"
  | "hypotheses";

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
  coveredToolIds: string[];
  candidateToolIds: string[];
};

export type SemanticFamilyDefinition = {
  tool: AiTool;
  requiredInputFields: FamilyInputField[];
  coveredToolIds: string[];
  candidateToolIds: string[];
};

const commonFamilyOutputSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    summary: { type: "string" }
  },
  required: [
    "id",
    "summary"
  ]
} as const;

const commonFamilyInputProperties = {
  target: { type: "string" },
  baseUrl: { type: "string" },
  url: { type: "string" },
  startUrl: { type: "string" },
  port: { type: "number" },
  loginUrl: { type: "string" },
  token: { type: "string" },
  hash: { type: "string" },
  hashes: {
    type: "array",
    items: { type: "string" }
  },
  hashType: { type: "string" },
  method: { type: "string" },
  mode: { type: "number" },
  filePath: { type: "string" },
  passphrase: { type: "string" },
  module: { type: "string" },
  username: { type: "string" },
  password: { type: "string" },
  service: { type: "string" },
  protocol: { type: "string" },
  provider: { type: "string" },
  account: { type: "string" },
  profile: { type: "string" },
  cluster: { type: "string" },
  namespace: { type: "string" },
  options: { type: "object" },
  candidateUsernames: {
    type: "array",
    items: { type: "string" }
  },
  candidatePasswords: {
    type: "array",
    items: { type: "string" }
  },
  credentialCandidates: {
    type: "array",
    items: { type: "object" }
  },
  candidateEndpoints: {
    type: "array",
    items: { type: "string" }
  },
  candidateParameters: {
    type: "array",
    items: { type: "string" }
  },
  validationTargets: {
    type: "array",
    items: { type: "object" }
  },
  candidatePorts: {
    type: "array",
    items: { type: "number" }
  },
  candidateDomains: {
    type: "array",
    items: { type: "string" }
  },
  knownSubdomains: {
    type: "array",
    items: { type: "string" }
  },
  maxEndpoints: { type: "number" },
  maxRequests: { type: "number" },
  maxPorts: { type: "number" },
  maxResults: { type: "number" },
  maxAttempts: { type: "number" },
  notes: { type: "string" },
  hypotheses: { type: "string" }
} as const;

function builtinToolId(actionKey: ToolBuiltinActionKey) {
  return `builtin-${actionKey.replaceAll("_", "-")}`;
}

function createConstraintProfile(input: {
  mutationClass: ToolConstraintProfile["mutationClass"];
  networkBehavior: ToolConstraintProfile["networkBehavior"];
  targetKinds: ToolConstraintProfile["targetKinds"];
  supportsHostAllowlist?: boolean;
  supportsPathExclusions?: boolean;
  supportsRateLimit?: boolean;
  enforced?: boolean;
}) {
  return {
    enforced: input.enforced ?? true,
    targetKinds: input.targetKinds,
    networkBehavior: input.networkBehavior,
    mutationClass: input.mutationClass,
    supportsHostAllowlist: input.supportsHostAllowlist ?? false,
    supportsPathExclusions: input.supportsPathExclusions ?? false,
    supportsRateLimit: input.supportsRateLimit ?? false
  } satisfies ToolConstraintProfile;
}

function createSemanticFamilyDefinition(input: SemanticFamilyDefinitionInput): SemanticFamilyDefinition {
  const requiredInputFields = input.requiredInputFields ?? [];
  return {
    tool: {
      id: builtinToolId(input.builtinActionKey),
      name: input.name,
      kind: "semantic-family",
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
      coveredToolIds: [...input.coveredToolIds],
      candidateToolIds: [...input.candidateToolIds],
      constraintProfile: input.constraintProfile,
      inputSchema: {
        type: "object",
        properties: commonFamilyInputProperties,
        required: requiredInputFields
      },
      outputSchema: commonFamilyOutputSchema,
      createdAt: builtinTimestamp,
      updatedAt: builtinTimestamp
    },
    requiredInputFields,
    coveredToolIds: [...input.coveredToolIds],
    candidateToolIds: [...input.candidateToolIds]
  };
}

export const semanticFamilyDefinitions: SemanticFamilyDefinition[] = [
  createSemanticFamilyDefinition({
    builtinActionKey: "http_surface_assessment",
    name: "HTTP Surface Assessment",
    description: "Assess a known HTTP or HTTPS surface without crawling, path guessing, or exploit validation. Use this first for web targets to collect reachability, status, redirects, headers, cookies, titles, versions, build IDs, and auth/session hints. Provide `baseUrl`, `url`, or `target`; optionally include candidate endpoints to focus the check. Returns observations suitable for evidence quotes and follow-on attack-path reasoning.",
    category: "web",
    riskTier: "passive",
    capabilities: ["semantic-family", "web", "http-surface", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "outbound-read",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true
    }),
    coveredToolIds: [
      "seed-httpx",
      "seed-http-recon",
      "seed-http-headers",
      "seed-whatweb"
    ],
    candidateToolIds: [
      "seed-http-recon",
      "seed-httpx",
      "seed-http-headers",
      "seed-whatweb"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "web_crawl_mapping",
    name: "Web Crawl Mapping",
    description: "Map reachable in-scope URLs for a confirmed web target by controlled crawling and passive archive expansion. Use this after HTTP surface assessment when you need routes, forms, linked pages, or candidate endpoints for later validation. Provide `baseUrl`, `startUrl`, or `target`; optionally bound with `candidateEndpoints`, `maxEndpoints`, or notes. Do not use for brute-force path guessing or vulnerability confirmation.",
    category: "content",
    riskTier: "passive",
    capabilities: ["semantic-family", "web-crawl", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "content-enumeration",
      networkBehavior: "outbound-read",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-web-crawl",
      "seed-katana",
      "seed-hakrawler",
      "seed-gau",
      "seed-waybackurls"
    ],
    candidateToolIds: [
      "seed-web-crawl",
      "seed-katana",
      "seed-hakrawler",
      "seed-gau",
      "seed-waybackurls"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "content_discovery",
    name: "Content Discovery",
    description: "Discover likely hidden paths, panels, API routes, and addressable content on a known web target with bounded path guessing. Use this when content enumeration is in scope and passive crawling is insufficient. Provide `baseUrl` or `target`; optionally steer with candidate endpoints, max limits, and notes. Returns status-backed content observations, not vulnerability proof by itself.",
    category: "content",
    riskTier: "active",
    capabilities: ["semantic-family", "content-discovery", "active-recon"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "content-enumeration",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-content-discovery",
      "seed-dirb-scan",
      "seed-gobuster-scan",
      "seed-ffuf-scan",
      "seed-dirsearch",
      "seed-feroxbuster"
    ],
    candidateToolIds: [
      "seed-content-discovery",
      "seed-dirsearch",
      "seed-feroxbuster",
      "seed-gobuster-scan",
      "seed-ffuf-scan",
      "seed-dirb-scan"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "parameter_discovery",
    name: "Parameter Discovery",
    description: "Discover likely query or body parameters on known candidate endpoints without claiming exploitability. Use this before injection or XSS validation when you need parameter names or request shapes. Provide `baseUrl`, `url`, or `candidateEndpoints`; optionally include notes or max limits. Returns parameter observations that should be validated by a separate vulnerability action.",
    category: "web",
    riskTier: "passive",
    capabilities: ["semantic-family", "parameter-discovery", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "content-enumeration",
      networkBehavior: "outbound-read",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-arjun",
      "seed-paramspider"
    ],
    candidateToolIds: [
      "seed-arjun",
      "seed-paramspider"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "web_vulnerability_audit",
    name: "Web Vulnerability Audit",
    description: "Validate plausible web weaknesses and misconfigurations on a concrete candidate surface after reconnaissance. Use this for targeted checks of known-signature issues, risky exposed behavior, or configuration problems. Provide `baseUrl` or `target`; steer with `candidateEndpoints`, `candidateParameters`, `validationTargets`, `hypotheses`, or notes. Returns evidence-backed validation observations; do not use for initial discovery.",
    category: "web",
    riskTier: "active",
    capabilities: ["semantic-family", "web-vuln-audit", "active-recon"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "active-validation",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-vuln-audit",
      "seed-nikto-scan",
      "seed-nuclei",
      "seed-burp-suite"
    ],
    candidateToolIds: [
      "seed-vuln-audit",
      "seed-nuclei",
      "seed-nikto-scan"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "sql_injection_validation",
    name: "SQL Injection Validation",
    description: "Validate SQL injection signals on approved endpoints, parameters, or structured validation targets. Use this only after recon has produced a concrete candidate URL, parameter, or hypothesis and controlled-exploit checks are in scope. Provide `baseUrl`, `url`, `candidateParameters`, or `validationTargets`. Returns payload and response evidence; do not use for broad crawling or generic discovery.",
    category: "web",
    riskTier: "controlled-exploit",
    capabilities: ["semantic-family", "sqli", "controlled-exploit"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "exploit",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-sql-injection-check",
      "seed-sqlmap-scan"
    ],
    candidateToolIds: [
      "seed-sql-injection-check",
      "seed-sqlmap-scan"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "xss_validation",
    name: "XSS Validation",
    description: "Validate reflected or parameter-driven XSS sinks on known endpoints and parameters. Use this after parameter or crawl evidence identifies a candidate sink. Provide `baseUrl`, `url`, `candidateEndpoints`, `candidateParameters`, or validation notes. Returns payload, reflection, and response observations suitable for suspected or confirmed findings; do not use for content discovery.",
    category: "web",
    riskTier: "active",
    capabilities: ["semantic-family", "xss", "active-recon"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "active-validation",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-dalfox"
    ],
    candidateToolIds: [
      "seed-dalfox"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "wordpress_assessment",
    name: "WordPress Assessment",
    description: "Assess a confirmed WordPress target for core version, plugin, theme, user, and configuration weaknesses. Use this only after HTTP evidence indicates WordPress. Provide `baseUrl` or `target`; optionally include notes about known paths or hypotheses. Returns WordPress-specific observations and evidence; do not use for non-WordPress web applications.",
    category: "web",
    riskTier: "active",
    capabilities: ["semantic-family", "wordpress", "active-recon"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "active-validation",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-wpscan"
    ],
    candidateToolIds: [
      "seed-wpscan"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "auth_flow_assessment",
    name: "Auth Flow Assessment",
    description: "Assess known authentication or session endpoints for weak controls. Use this when login, token, or session behavior is in scope and you have a specific auth surface. Provide `baseUrl`, `loginUrl`, `url`, or `target`; optionally add expected behavior, candidate endpoints, or notes. Returns observations about artifact acceptance, response differences, rate-limit gaps, timing signals, and weak-password acceptance.",
    category: "auth",
    riskTier: "active",
    capabilities: ["semantic-family", "auth", "session", "active-recon"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "active-validation",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsPathExclusions: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-auth-flow-probe"
    ],
    candidateToolIds: [
      "seed-auth-flow-probe"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "token_analysis",
    name: "Token Analysis",
    description: "Analyze a supplied token offline for unsafe algorithms, key IDs, missing or risky claims, role-like authorization artifacts, weak HMAC secrets, and session lifetime signals. Provide `token`. Returns decoded-token and validation observations. This action does not replay tokens online or prove server-side authorization bypass.",
    category: "auth",
    riskTier: "passive",
    capabilities: ["semantic-family", "auth", "jwt", "offline-analysis"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    requiredInputFields: ["token"],
    coveredToolIds: [
      "seed-jwt-analyzer"
    ],
    candidateToolIds: [
      "seed-jwt-analyzer"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "network_host_discovery",
    name: "Network Host Discovery",
    description: "Discover reachable ports and services on an approved host to establish network attack surface. Use this before protocol-specific enumeration or validation. Provide `target`; optionally include candidate ports or max limits. Returns port and service observations. Do not use for web path discovery, subdomain expansion, or exploit validation.",
    category: "network",
    riskTier: "passive",
    capabilities: ["semantic-family", "network", "host-discovery", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "outbound-read",
      targetKinds: ["host", "domain", "cidr"],
      supportsHostAllowlist: true
    }),
    coveredToolIds: [
      "seed-service-scan",
      "seed-rustscan",
      "seed-masscan",
      "seed-autorecon"
    ],
    candidateToolIds: [
      "seed-service-scan",
      "seed-rustscan",
      "seed-masscan",
      "seed-autorecon"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "network_service_enumeration",
    name: "Network Service Enumeration",
    description: "Enumerate known or candidate services on explicit ports to collect banners, versions, protocol hints, and service metadata. Use this after host discovery or when a specific port is already known. Provide `target`, `port`, or `candidatePorts`. Returns service evidence for correlation and follow-on checks; do not use for broad vulnerability exploitation.",
    category: "network",
    riskTier: "passive",
    capabilities: ["semantic-family", "network", "service-enumeration", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "outbound-read",
      targetKinds: ["host", "domain"],
      supportsHostAllowlist: true
    }),
    coveredToolIds: [
      "seed-nmap-scan",
      "seed-ncat-probe",
      "seed-netcat-probe",
      "seed-service-fingerprint"
    ],
    candidateToolIds: [
      "seed-nmap-scan",
      "seed-service-fingerprint",
      "seed-ncat-probe",
      "seed-netcat-probe"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "tls_posture_audit",
    name: "TLS Posture Audit",
    description: "Audit TLS posture for a known host and port. Use this when HTTPS, STARTTLS, or TLS-enabled services are suspected and you need protocol, cipher, certificate, expiry, trust, or plaintext-transport evidence. Provide `target` and optionally `port` or candidate ports. Returns TLS observations; do not use for non-TLS service enumeration.",
    category: "network",
    riskTier: "passive",
    capabilities: ["semantic-family", "tls", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "outbound-read",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true
    }),
    coveredToolIds: [
      "seed-tls-audit"
    ],
    candidateToolIds: [
      "seed-tls-audit"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "network_topology_mapping",
    name: "Network Topology Mapping",
    description: "Map adjacent hosts, inferred subnets, gateway-facing ports, and trust-boundary signals around an approved target. Use this when attack-path reasoning needs topology context or lateral-movement preconditions. Provide `target` or CIDR-like context where in scope. Returns topology observations, not vulnerability proof.",
    category: "topology",
    riskTier: "passive",
    capabilities: ["semantic-family", "topology", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "outbound-read",
      targetKinds: ["host", "domain", "cidr"],
      supportsHostAllowlist: true
    }),
    coveredToolIds: [
      "seed-network-segment-map"
    ],
    candidateToolIds: [
      "seed-network-segment-map"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "subdomain_discovery",
    name: "Subdomain Discovery",
    description: "Discover likely subdomains for an in-scope domain through passive and bounded expansion. Use this before host, HTTP, or service assessment when the initial target is a domain. Provide `target` or `domain`; optionally include known subdomains, candidate domains, or max results. Returns hostname observations; do not use for single-host validation.",
    category: "subdomain",
    riskTier: "passive",
    capabilities: ["semantic-family", "subdomain", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "outbound-read",
      targetKinds: ["domain"],
      supportsHostAllowlist: true
    }),
    coveredToolIds: [
      "seed-subfinder",
      "seed-theharvester",
      "seed-amass-enum",
      "seed-sublist3r-enum"
    ],
    candidateToolIds: [
      "seed-subfinder",
      "seed-theharvester",
      "seed-amass-enum",
      "seed-sublist3r-enum"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "dns_enumeration",
    name: "DNS Enumeration",
    description: "Enumerate DNS records and DNS-adjacent exposure for an in-scope domain. Use this to collect A, AAAA, MX, TXT, NS, CNAME, brute-force, or zone-transfer-adjacent clues before host validation. Provide `target` or `domain`. Returns DNS observations; do not treat DNS discovery alone as exploit confirmation.",
    category: "dns",
    riskTier: "passive",
    capabilities: ["semantic-family", "dns", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "outbound-read",
      targetKinds: ["domain"],
      supportsHostAllowlist: true
    }),
    coveredToolIds: [
      "seed-dnsenum",
      "seed-fierce"
    ],
    candidateToolIds: [
      "seed-dnsenum",
      "seed-fierce"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "credential_format_identification",
    name: "Credential Format Identification",
    description: "Identify likely hash or cipher formats from supplied material before choosing an offline cracking or decoding approach. Provide `hash`, `hashes`, or candidate text. Returns format hypotheses and confidence signals; it does not crack passwords or decrypt content.",
    category: "password",
    riskTier: "passive",
    capabilities: ["semantic-family", "password", "identification", "offline-analysis"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    coveredToolIds: [
      "seed-hash-identifier",
      "seed-cipher-identifier"
    ],
    candidateToolIds: [
      "seed-hash-identifier",
      "seed-cipher-identifier"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "online_credential_attack",
    name: "Online Credential Attack",
    description: "Run bounded online credential validation against an explicitly approved service. Use only when weak-credential testing is authorized and rate limits are understood. Provide `target`, service or protocol context, candidate usernames/passwords, and max attempts where available. Returns attempt evidence and observations; do not use for discovery or unbounded brute forcing.",
    category: "password",
    riskTier: "active",
    capabilities: ["semantic-family", "password", "online-attack", "active-recon"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "active-validation",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-hydra",
      "seed-medusa",
      "seed-patator"
    ],
    candidateToolIds: [
      "seed-hydra",
      "seed-medusa",
      "seed-patator"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "offline_password_cracking",
    name: "Offline Password Cracking",
    description: "Perform offline password cracking or recovery against captured hash material inside the authorized lab boundary. Provide `hash`, `hashes`, and optional `hashType` or mode. Returns cracking attempt output and observations. It does not contact the target service and should not be used for online login attempts.",
    category: "password",
    riskTier: "controlled-exploit",
    capabilities: ["semantic-family", "password", "offline-cracking", "controlled-exploit"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "exploit",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    requiredInputFields: ["hash"],
    coveredToolIds: [
      "seed-hashcat-crack",
      "seed-john-the-ripper",
      "seed-ophcrack"
    ],
    candidateToolIds: [
      "seed-hashcat-crack"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "windows_enumeration",
    name: "Windows Enumeration",
    description: "Enumerate SMB, Active Directory, and Windows host signals to understand identity and lateral-movement surface. Use this after a Windows or SMB service is identified. Provide `target` and optional port or notes. Returns shares, users, domain, signing, and host metadata observations where available.",
    category: "windows",
    riskTier: "active",
    capabilities: ["semantic-family", "windows", "enumeration", "active-recon"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "active-validation",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain"],
      supportsHostAllowlist: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-enum4linux",
      "seed-enum4linux-ng",
      "seed-crackmapexec",
      "seed-netexec"
    ],
    candidateToolIds: [
      "seed-enum4linux",
      "seed-enum4linux-ng",
      "seed-crackmapexec",
      "seed-netexec"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "windows_remote_access_validation",
    name: "Windows Remote Access Validation",
    description: "Validate whether remote Windows management access such as WinRM or SMB execution is reachable and usable on an approved target. Use only when credentialed remote-access validation is explicitly in scope. Provide target, service context, and credentials where required. Returns access validation evidence; do not use for broad Windows enumeration.",
    category: "windows",
    riskTier: "controlled-exploit",
    capabilities: ["semantic-family", "windows", "remote-access", "controlled-exploit"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "exploit",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain"],
      supportsHostAllowlist: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-evil-winrm"
    ],
    candidateToolIds: [
      "seed-evil-winrm"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "windows_poisoning_and_capture",
    name: "Windows Poisoning and Capture",
    description: "Validate LLMNR, NBT-NS, mDNS, or similar poisoning exposure inside the controlled exploit boundary. Use only when credential-capture risk must be proven in an authorized lab or scoped network. Provide target or network context. Returns poisoning/capture evidence or failure context; do not use for passive enumeration.",
    category: "windows",
    riskTier: "controlled-exploit",
    capabilities: ["semantic-family", "windows", "poisoning", "controlled-exploit"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "exploit",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain"],
      supportsHostAllowlist: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-responder"
    ],
    candidateToolIds: [
      "seed-responder"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "controlled_exploitation",
    name: "Controlled Exploitation",
    description: "Run an explicitly authorized exploit-framework step inside the controlled lab boundary to validate whether a specific exploit path is real. Provide module, target, and required options. Returns execution evidence and observations. Do not use for discovery, broad scanning, or targets without explicit exploit authorization.",
    category: "exploitation",
    riskTier: "controlled-exploit",
    capabilities: ["semantic-family", "controlled-exploit", "framework"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "exploit",
      networkBehavior: "outbound-active",
      targetKinds: ["host", "domain", "url"],
      supportsHostAllowlist: true,
      supportsRateLimit: true
    }),
    coveredToolIds: [
      "seed-metasploit-framework"
    ],
    candidateToolIds: [
      "seed-metasploit-framework"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "cloud_posture_audit",
    name: "Cloud Posture Audit",
    description: "Audit a cloud account or target posture for configuration, identity, exposure, logging, and compliance weaknesses. Use when cloud credentials or scoped cloud context are available and authorized. Provide target/account context and notes. Returns posture observations; do not use for network exploitation.",
    category: "cloud",
    riskTier: "passive",
    capabilities: ["semantic-family", "cloud", "posture-audit", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "outbound-read",
      targetKinds: ["host", "domain", "url"]
    }),
    coveredToolIds: [
      "seed-prowler",
      "seed-scout-suite",
      "seed-trivy"
    ],
    candidateToolIds: [
      "seed-prowler",
      "seed-scout-suite",
      "seed-trivy"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "kubernetes_posture_audit",
    name: "Kubernetes Posture Audit",
    description: "Assess a Kubernetes cluster or deployment for configuration, RBAC, workload, API server, and exposure weaknesses. Use when Kubernetes context is in scope and available. Provide target or cluster context plus notes. Returns posture observations; do not use for generic host scanning.",
    category: "kubernetes",
    riskTier: "passive",
    capabilities: ["semantic-family", "kubernetes", "posture-audit", "passive"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "outbound-read",
      targetKinds: ["host", "domain", "url"]
    }),
    coveredToolIds: [
      "seed-kube-bench",
      "seed-kube-hunter"
    ],
    candidateToolIds: [
      "seed-kube-bench",
      "seed-kube-hunter"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "binary_triage",
    name: "Binary Triage",
    description: "Perform fast static triage of a local binary or artifact to surface strings, sections, linked libraries, architecture, and hardening metadata. Provide `filePath` and optional notes. Returns artifact observations for later reverse-engineering or vulnerability analysis; it does not execute the artifact.",
    category: "reversing",
    riskTier: "passive",
    capabilities: ["semantic-family", "reversing", "triage", "offline-analysis"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    coveredToolIds: [
      "seed-checksec",
      "seed-strings",
      "seed-objdump"
    ],
    candidateToolIds: [
      "seed-checksec",
      "seed-strings",
      "seed-objdump"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "interactive_reverse_engineering",
    name: "Interactive Reverse Engineering",
    description: "Open or run an advanced reverse-engineering or debugger workflow for deeper artifact inspection. Use after static triage identifies a binary that needs manual or structured analysis. Provide `filePath`, optional module, and notes. Returns analysis output or setup evidence; do not use for basic metadata extraction.",
    category: "reversing",
    riskTier: "passive",
    capabilities: ["semantic-family", "reversing", "interactive-analysis", "offline-analysis"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    coveredToolIds: [
      "seed-ghidra",
      "seed-radare2",
      "seed-gdb"
    ],
    candidateToolIds: [
      "seed-ghidra",
      "seed-radare2",
      "seed-gdb"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "artifact_metadata_extraction",
    name: "Artifact Metadata Extraction",
    description: "Extract metadata, embedded structure, timestamps, authoring hints, and format-specific signals from a local file or collected artifact. Provide `filePath`. Returns metadata observations; do not use for carving, cracking, or executing the artifact.",
    category: "forensics",
    riskTier: "passive",
    capabilities: ["semantic-family", "forensics", "metadata", "offline-analysis"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    coveredToolIds: [
      "seed-exiftool",
      "seed-binwalk"
    ],
    candidateToolIds: [
      "seed-exiftool",
      "seed-binwalk"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "file_carving_and_bulk_extraction",
    name: "File Carving and Bulk Extraction",
    description: "Recover carved files or bulk extracted artifacts from collected forensic material such as disk images or binary blobs. Provide `filePath` and optional notes. Returns extracted-artifact summaries and observations; do not use for memory analysis or metadata-only inspection.",
    category: "forensics",
    riskTier: "passive",
    capabilities: ["semantic-family", "forensics", "carving", "offline-analysis"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    coveredToolIds: [
      "seed-foremost",
      "seed-scalpel",
      "seed-bulk-extractor"
    ],
    candidateToolIds: [
      "seed-foremost",
      "seed-scalpel",
      "seed-bulk-extractor"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "memory_forensics",
    name: "Memory Forensics",
    description: "Inspect a memory image or memory-derived artifact for processes, network connections, loaded modules, credentials, and volatile compromise evidence. Provide `filePath` and optional profile or notes. Returns memory-forensics observations; do not use for disk carving or live exploitation.",
    category: "forensics",
    riskTier: "passive",
    capabilities: ["semantic-family", "forensics", "memory", "offline-analysis"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    coveredToolIds: [
      "seed-volatility"
    ],
    candidateToolIds: [
      "seed-volatility"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "steganography_analysis",
    name: "Steganography Analysis",
    description: "Inspect a local artifact for embedded data, steganographic metadata, and passphrase-protected payload signals without modifying the source file. Provide `filePath` and optional passphrase or notes. Returns steganography observations; do not use for general file metadata extraction.",
    category: "forensics",
    riskTier: "passive",
    capabilities: ["semantic-family", "forensics", "steganography", "offline-analysis"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    requiredInputFields: ["filePath"],
    coveredToolIds: [
      "seed-steghide-info"
    ],
    candidateToolIds: [
      "seed-steghide-info"
    ]
  }),
  createSemanticFamilyDefinition({
    builtinActionKey: "local_shell_probe",
    name: "Local Shell Probe",
    description: "Run a deterministic local probe to verify tool wiring, argument handling, sandbox behavior, and structured JSON output. Use only for smoke tests or pipeline diagnostics. Provide any input accepted by the test harness. Returns predictable observations; it does not assess the target.",
    category: "utility",
    riskTier: "passive",
    capabilities: ["semantic-family", "utility", "local-probe", "offline-analysis"],
    timeoutMs: 10000,
    constraintProfile: createConstraintProfile({
      mutationClass: "none",
      networkBehavior: "none",
      targetKinds: ["host", "domain", "url"]
    }),
    coveredToolIds: [
      "seed-bash-probe"
    ],
    candidateToolIds: [
      "seed-bash-probe"
    ]
  })
];

const semanticFamilyByBuiltinActionKey = new Map(
  semanticFamilyDefinitions.map((definition) => [definition.tool.builtinActionKey, definition] as const)
);

export function getSemanticFamilyDefinitions() {
  return semanticFamilyDefinitions.map((definition) => ({
    ...definition,
    tool: { ...definition.tool },
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
    tool: { ...definition.tool },
    requiredInputFields: [...definition.requiredInputFields],
    coveredToolIds: [...definition.coveredToolIds],
    candidateToolIds: [...definition.candidateToolIds]
  };
}

export function getSemanticFamilyBuiltinAiTools() {
  return semanticFamilyDefinitions.map((definition) => ({ ...definition.tool }));
}
