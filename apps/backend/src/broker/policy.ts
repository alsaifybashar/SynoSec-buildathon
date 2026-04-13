import type { Scan, ToolAdapter, ToolRequest } from "@synosec/contracts";

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
}

// Adapters that perform read-only reconnaissance — always allowed in scope
const PASSIVE_ADAPTERS = new Set<ToolAdapter>([
  "network_scan",
  "service_scan",
  "tls_audit",
  "http_probe",
  "web_fingerprint",
  "content_discovery"
]);

// Adapters that probe/test but do not exploit — allowed when scan is active (default)
const ACTIVE_RECON_ADAPTERS = new Set<ToolAdapter>([
  "session_audit",
  "nikto_scan",
  "nuclei_scan",
  "vuln_check"
]);

// Adapters that may send exploit-class payloads — require explicit opt-in
const EXPLOIT_ADAPTERS = new Set<ToolAdapter>([
  "db_injection_check"
]);

function isTargetInScope(scan: Scan, target: string): boolean {
  const stripPort = (value: string) => value.replace(/:\d+$/, "");
  const candidate = stripPort(target);

  for (const exclusion of scan.scope.exclusions) {
    const exclusionHost = stripPort(exclusion);
    if (candidate === exclusionHost || candidate.startsWith(exclusionHost)) {
      return false;
    }
  }

  return scan.scope.targets.some((scopeTarget) => {
    const normalized = stripPort(scopeTarget);
    return (
      candidate === normalized ||
      candidate.startsWith(normalized) ||
      normalized.startsWith(candidate)
    );
  });
}

export function authorizeToolRequest(scan: Scan, request: ToolRequest): PolicyDecision {
  if (!isTargetInScope(scan, request.target)) {
    return {
      allowed: false,
      reason: `Target ${request.target} is outside the approved scan scope.`
    };
  }

  // controlled-exploit risk tier always requires explicit opt-in — checked first
  if (request.riskTier === "controlled-exploit" && scan.scope.allowActiveExploits !== true) {
    return {
      allowed: false,
      reason: "Controlled exploit tooling is disabled for this scan."
    };
  }

  // Exploit-class adapters (e.g. sqlmap) require allowActiveExploits
  if (EXPLOIT_ADAPTERS.has(request.adapter)) {
    if (scan.scope.allowActiveExploits !== true) {
      return {
        allowed: false,
        reason: `Exploit adapter ${request.adapter} requires allowActiveExploits=true.`
      };
    }
    return { allowed: true, reason: `Exploit adapter authorized for ${request.adapter}.` };
  }

  // Active recon adapters (nikto, nuclei, vuln_check, session_audit) are always permitted
  if (ACTIVE_RECON_ADAPTERS.has(request.adapter)) {
    return {
      allowed: true,
      reason: `Active reconnaissance adapter ${request.adapter} is permitted.`
    };
  }

  // Passive adapters are always allowed
  if (PASSIVE_ADAPTERS.has(request.adapter)) {
    return { allowed: true, reason: `Passive reconnaissance allowed for ${request.adapter}.` };
  }

  return { allowed: true, reason: `Allowed by ${request.riskTier} policy for ${request.adapter}.` };
}
