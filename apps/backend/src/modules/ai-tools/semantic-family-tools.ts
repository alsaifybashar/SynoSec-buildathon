import type { AiTool, ToolBuiltinActionKey, ToolConstraintProfile } from "@synosec/contracts";

const builtinTimestamp = "2026-04-26T00:00:00.000Z";

type FamilyInputField =
  | "target"
  | "baseUrl"
  | "port"
  | "loginUrl"
  | "token"
  | "hash"
  | "mode"
  | "filePath"
  | "passphrase"
  | "module";

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
    toolRunId: { type: "string" },
    toolId: { type: "string" },
    toolName: { type: "string" },
    status: { type: "string" },
    outputPreview: { type: "string" },
    rawOutput: { type: "string" },
    observations: { type: "array" },
    observationSummaries: { type: "array" },
    usedToolId: { type: "string" },
    usedToolName: { type: "string" },
    fallbackUsed: { type: "boolean" },
    attempts: { type: "array" }
  },
  required: [
    "toolRunId",
    "toolId",
    "toolName",
    "status",
    "outputPreview",
    "rawOutput",
    "observations",
    "observationSummaries",
    "usedToolId",
    "usedToolName",
    "fallbackUsed",
    "attempts"
  ]
} as const;

const commonFamilyInputProperties = {
  target: { type: "string" },
  baseUrl: { type: "string" },
  port: { type: "number" },
  loginUrl: { type: "string" },
  token: { type: "string" },
  hash: { type: "string" },
  mode: { type: "number" },
  filePath: { type: "string" },
  passphrase: { type: "string" },
  module: { type: "string" }
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
      status: "active",
      source: "system",
      description: input.description,
      executorType: "builtin",
      builtinActionKey: input.builtinActionKey,
      bashSource: null,
      capabilities: input.capabilities,
      category: input.category,
      riskTier: input.riskTier,
      timeoutMs: input.timeoutMs,
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
    description: "Inspect a reachable web target to collect status, headers, titles, and fingerprint signals before deeper testing.",
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
      "seed-whatweb",
      "seed-family-http-surface"
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
    description: "Expand the known reachable URL set for an in-scope web target through controlled crawling and archive discovery.",
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
      "seed-waybackurls",
      "seed-family-web-crawl"
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
    description: "Enumerate likely hidden paths, panels, and API routes on a known web target with bounded path guessing.",
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
      "seed-feroxbuster",
      "seed-family-content-discovery"
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
    description: "Discover likely query and body parameters worth validating on a web surface without attempting exploitation.",
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
    description: "Validate likely web weaknesses and misconfigurations after recon has identified a concrete candidate surface.",
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
      "seed-burp-suite",
      "seed-family-vulnerability-validation"
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
    description: "Check a specific web target for SQL injection signals, starting with validation before any exploit-grade automation.",
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
    description: "Probe a candidate web target for reflected or parameter-driven cross-site scripting with dedicated validators.",
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
    description: "Assess a WordPress target for version, plugin, and configuration weaknesses with WordPress-specific coverage.",
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
    description: "Assess live login and session flows for weak controls such as rate-limit gaps, response differences, and timing oracles.",
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
    description: "Inspect a supplied token offline for weak algorithms, claim issues, and session hygiene problems.",
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
    description: "Discover reachable services and ports on a host to establish the network attack surface.",
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
      "seed-autorecon",
      "seed-family-network-enumeration"
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
    description: "Enumerate identified services to collect banners, versions, and service metadata for validation and correlation.",
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
    description: "Assess a target's TLS and certificate posture for weak protocols, ciphers, or trust issues.",
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
    description: "Map network segments, trust boundaries, and lateral-movement-relevant topology signals around a target.",
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
    description: "Expand a domain's reachable attack surface through passive and bounded subdomain discovery.",
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
      "seed-sublist3r-enum",
      "seed-family-subdomain-discovery"
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
    description: "Enumerate DNS records and misconfiguration clues such as brute-force results or zone-transfer-adjacent exposure.",
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
    description: "Identify likely hash or cipher families before choosing an offline cracking or decryption approach.",
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
    description: "Run bounded online credential attacks against an approved service when validation of weak credentials is explicitly in scope.",
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
    description: "Perform offline cracking or recovery against captured password material inside the authorized lab boundary.",
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
    description: "Enumerate SMB, AD, and Windows host signals to understand reachable identity and lateral movement surface.",
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
    description: "Validate whether remote Windows management access is reachable and usable for an approved target.",
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
    description: "Run LLMNR or similar poisoning validation in the controlled exploit boundary when credential capture risk must be proven.",
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
    description: "Run an explicitly authorized exploit framework step in the lab boundary to validate whether an exploit path is real.",
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
    description: "Audit a cloud target or account posture for broad configuration and exposure weaknesses.",
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
    description: "Assess a Kubernetes deployment or cluster for configuration and exposure weaknesses.",
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
    description: "Perform fast static triage of a binary or artifact to surface strings, sections, or hardening metadata.",
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
    description: "Use an advanced reverse engineering or debugger tool when deeper artifact inspection is required.",
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
    description: "Extract metadata and embedded structure signals from a local file or collected artifact.",
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
    description: "Recover carved files or bulk extracted artifacts from collected forensic material.",
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
    description: "Inspect a memory image or memory-derived artifact for processes, secrets, and volatile compromise evidence.",
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
    description: "Inspect a local artifact for embedded data or steganographic metadata without modifying the source file.",
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
    description: "Run a deterministic local probe to verify wiring, argument handling, and structured tool output.",
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
