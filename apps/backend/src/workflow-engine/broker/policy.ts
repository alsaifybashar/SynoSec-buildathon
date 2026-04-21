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
  const normalize = (value: string) => {
    const trimmed = value.trim().replace(/\/+$/, "");
    if (trimmed.length === 0) {
      return "";
    }

    try {
      const hasScheme = trimmed.includes("://");
      const parsed = new URL(hasScheme ? trimmed : `http://${trimmed}`);
      const host = parsed.hostname.toLowerCase();
      const hasExplicitPort = hasScheme ? /:\d+(?:\/|$)/.test(trimmed) : /:\d+$/.test(trimmed);
      const port = hasExplicitPort ? parsed.port : "";
      return port ? `${host}:${port}` : host;
    } catch {
      return trimmed
        .replace(/^[a-z]+:\/\//i, "")
        .replace(/\/.*$/, "")
        .toLowerCase();
    }
  };

  const candidate = normalize(target);

  for (const exclusion of scan.scope.exclusions) {
    const exclusionHost = normalize(exclusion);
    if (candidate === exclusionHost || candidate.startsWith(`${exclusionHost}:`) || exclusionHost.startsWith(`${candidate}:`)) {
      return false;
    }
  }

  return scan.scope.targets.some((scopeTarget) => {
    const normalized = normalize(scopeTarget);
    return (
      candidate === normalized
      || candidate.startsWith(`${normalized}:`)
      || normalized.startsWith(`${candidate}:`)
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
