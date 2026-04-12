import type { Scan, ToolRequest } from "@synosec/contracts";

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
}

function isControlledExploitAllowed(scan: Scan): boolean {
  return scan.scope.allowActiveExploits === true;
}

function isNonPassiveToolAllowed(scan: Scan): boolean {
  return scan.scope.allowActiveExploits === true;
}

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

  if (request.riskTier === "controlled-exploit" && !isControlledExploitAllowed(scan)) {
    return {
      allowed: false,
      reason: "Controlled exploit tooling is disabled for this scan."
    };
  }

  if (request.riskTier === "active" && !isNonPassiveToolAllowed(scan)) {
    return {
      allowed: false,
      reason: "Active tooling is disabled for this scan."
    };
  }

  return {
    allowed: true,
    reason: `Allowed by ${request.riskTier} policy for ${request.adapter}.`
  };
}
