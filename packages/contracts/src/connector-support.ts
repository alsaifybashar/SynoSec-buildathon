import type { ConnectorRegistrationRequest } from "./tooling.js";
import type { ToolPrivilegeProfile, ToolSandboxProfile } from "./resources.js";

export const KNOWN_SCRIPT_BINARIES = [
  "amass",
  "arjun",
  "autorecon",
  "binwalk",
  "bulk_extractor",
  "burp",
  "checksec",
  "cipher-identifier",
  "crackmapexec",
  "curl",
  "dalfox",
  "dirb",
  "dirsearch",
  "dnsenum",
  "enum4linux",
  "enum4linux-ng",
  "evil-winrm",
  "exiftool",
  "feroxbuster",
  "ffuf",
  "fierce",
  "foremost",
  "gau",
  "gdb",
  "ghidra",
  "gobuster",
  "hakrawler",
  "hash-identifier",
  "hashcat",
  "httpx",
  "hydra",
  "john",
  "katana",
  "kube-bench",
  "kube-hunter",
  "masscan",
  "medusa",
  "msfconsole",
  "nc",
  "ncat",
  "nikto",
  "nmap",
  "nuclei",
  "nxc",
  "objdump",
  "ophcrack",
  "openssl",
  "paramspider",
  "patator",
  "prowler",
  "r2",
  "responder",
  "rustscan",
  "scalpel",
  "scout",
  "sqlmap",
  "steghide",
  "strings",
  "subfinder",
  "sublist3r",
  "theHarvester",
  "trivy",
  "volatility",
  "waybackurls",
  "whatweb",
  "wpscan"
] as const;

export const DEFAULT_CONNECTOR_ALLOWED_CAPABILITIES = [
  "agent-bash-command",
  "active-recon",
  "analysis",
  "auth",
  "aws",
  "banner-grab",
  "binary-analysis",
  "brute-force",
  "cloud",
  "cloud-audit",
  "cms",
  "content-discovery",
  "containers",
  "controlled-exploit",
  "crypto",
  "data-extraction",
  "database-security",
  "debugging",
  "decompilation",
  "dns",
  "dns-recon",
  "enum",
  "exploit-validation",
  "exploitation",
  "extraction",
  "file-recovery",
  "fingerprinting",
  "forensics",
  "forensics-analysis",
  "framework",
  "fuzzing",
  "hash-id",
  "http-surface",
  "identifier",
  "k8s",
  "kubernetes-audit",
  "login",
  "memory-forensics",
  "metadata",
  "network",
  "network-enumeration",
  "network-recon",
  "osint",
  "param-discovery",
  "passive",
  "password",
  "password-audit",
  "password-cracking",
  "poisoning",
  "port-scan",
  "proxy",
  "recon",
  "remote-shell",
  "reversing",
  "security-audit",
  "security-headers",
  "semantic-family",
  "service-enum",
  "session",
  "smb",
  "sqli",
  "steganography",
  "subdomain-discovery",
  "subdomain-enum",
  "subdomain-recon",
  "topology",
  "utility",
  "vulnerability-audit",
  "vulnerability-validation",
  "vuln-scan",
  "web",
  "web-crawl",
  "web-recon",
  "windows",
  "windows-enum",
  "xss"
] as const;

export const DEFAULT_CONNECTOR_ALLOWED_SANDBOX_PROFILES: ToolSandboxProfile[] = [
  "network-recon",
  "read-only-parser",
  "active-recon",
  "controlled-exploit-lab"
];

export const DEFAULT_CONNECTOR_ALLOWED_PRIVILEGE_PROFILES: ToolPrivilegeProfile[] = [
  "read-only-network",
  "active-network",
  "controlled-exploit"
];

const commandCheckPattern = /command -v\s+([^\s>]+)\s*>/g;

export interface ConnectorSupportSubject {
  toolId?: string;
  tool: string;
  capabilities: string[];
  sandboxProfile: ToolSandboxProfile;
  privilegeProfile: ToolPrivilegeProfile;
  parameters: Record<string, unknown>;
}

export interface ConnectorExecutionPolicyInput {
  allowedCapabilities: ConnectorRegistrationRequest["allowedCapabilities"];
  allowedSandboxProfiles: ConnectorRegistrationRequest["allowedSandboxProfiles"];
  allowedPrivilegeProfiles: ConnectorRegistrationRequest["allowedPrivilegeProfiles"];
  installedBinaries: readonly string[];
}

export interface ConnectorToolSupportResult {
  supported: boolean;
  statusReason?: string;
  requiredBinaries: string[];
  missingBinaries: string[];
}

export function extractRequiredBinariesFromBashSource(bashSource: string): string[] {
  const matches = [...bashSource.matchAll(commandCheckPattern)].map((match) => match[1]?.trim()).filter(Boolean) as string[];
  return [...new Set(matches)].sort((left, right) => left.localeCompare(right));
}

export function evaluateConnectorToolSupport(
  subject: ConnectorSupportSubject,
  policy: ConnectorExecutionPolicyInput
): ConnectorToolSupportResult {
  if (!subject.capabilities.some((capability) => policy.allowedCapabilities.includes(capability))) {
    return {
      supported: false,
      statusReason: `Capabilities ${subject.capabilities.join(", ")} are not allowed by this connector.`,
      requiredBinaries: [],
      missingBinaries: []
    };
  }

  if (!policy.allowedSandboxProfiles.includes(subject.sandboxProfile)) {
    return {
      supported: false,
      statusReason: `Sandbox profile ${subject.sandboxProfile} is not allowed by this connector.`,
      requiredBinaries: [],
      missingBinaries: []
    };
  }

  if (!policy.allowedPrivilegeProfiles.includes(subject.privilegeProfile)) {
    return {
      supported: false,
      statusReason: `Privilege profile ${subject.privilegeProfile} is not allowed by this connector.`,
      requiredBinaries: [],
      missingBinaries: []
    };
  }

  const bashSource = typeof subject.parameters["bashSource"] === "string"
    ? subject.parameters["bashSource"]
    : null;

  if (!bashSource) {
    return {
      supported: false,
      statusReason: "Structured bash source is required for connector execution.",
      requiredBinaries: [],
      missingBinaries: []
    };
  }

  const requiredBinaries = extractRequiredBinariesFromBashSource(bashSource);
  const installed = new Set(policy.installedBinaries);
  const missingBinaries = requiredBinaries.filter((binary) => !installed.has(binary));

  if (missingBinaries.length > 0) {
    return {
      supported: false,
      statusReason: `Missing required binaries: ${missingBinaries.join(", ")}.`,
      requiredBinaries,
      missingBinaries
    };
  }

  return {
    supported: true,
    requiredBinaries,
    missingBinaries: []
  };
}
