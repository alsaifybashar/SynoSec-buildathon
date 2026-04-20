import type { Scan, ToolRequest } from "@synosec/contracts";

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
}

const PASSIVE_CAPABILITIES = new Set([
  "passive",
  "web-recon",
  "network-recon",
  "content-discovery"
]);

const ACTIVE_RECON_CAPABILITIES = new Set([
  "active-recon",
  "vulnerability-audit"
]);

const EXPLOIT_CAPABILITIES = new Set([
  "controlled-exploit",
  "database-security"
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
      candidate === normalized
      || candidate.startsWith(normalized)
      || normalized.startsWith(candidate)
    );
  });
}

function hasCapability(request: ToolRequest, allowed: Set<string>): boolean {
  return request.capabilities.some((capability) => allowed.has(capability));
}

export function authorizeToolRequest(scan: Scan, request: ToolRequest): PolicyDecision {
  if (!isTargetInScope(scan, request.target)) {
    return {
      allowed: false,
      reason: `Target ${request.target} is outside the approved scan scope.`
    };
  }

  if (request.riskTier === "controlled-exploit" && scan.scope.allowActiveExploits !== true) {
    return {
      allowed: false,
      reason: "Controlled exploit tooling is disabled for this scan."
    };
  }

  if (hasCapability(request, EXPLOIT_CAPABILITIES)) {
    if (scan.scope.allowActiveExploits !== true) {
      return {
        allowed: false,
        reason: `Exploit capabilities ${request.capabilities.join(", ")} require allowActiveExploits=true.`
      };
    }
    return { allowed: true, reason: `Exploit capabilities authorized for ${request.tool}.` };
  }

  if (hasCapability(request, ACTIVE_RECON_CAPABILITIES)) {
    return {
      allowed: true,
      reason: `Active reconnaissance capabilities are permitted for ${request.tool}.`
    };
  }

  if (hasCapability(request, PASSIVE_CAPABILITIES) || request.riskTier === "passive") {
    return {
      allowed: true,
      reason: `Passive reconnaissance allowed for ${request.tool}.`
    };
  }

  return { allowed: true, reason: `Allowed by ${request.riskTier} policy for ${request.tool}.` };
}
