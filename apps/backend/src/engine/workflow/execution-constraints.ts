import type {
  AiTool,
  Application,
  ExecutionConstraint,
  TargetAsset,
  ToolRequest
} from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";

type NormalizedTarget = {
  baseUrl: string | null;
  host: string;
  port?: number;
};

type ConstraintRuleSet = {
  excludedPaths: string[];
  requireRateLimitSupport: boolean;
  denyCloudflareOwnedTargets: boolean;
  allowActiveExploit: boolean;
};

export type ConstraintDecision = {
  allowed: boolean;
  reason: string;
  constraintId?: string;
};

export type EffectiveExecutionConstraintSet = {
  targetAsset: TargetAsset;
  normalizedTarget: NormalizedTarget;
  localhostException: boolean;
  excludedPaths: string[];
  rateLimitRps: number;
  allowActiveExploit: boolean;
  constraints: ExecutionConstraint[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHost(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return trimmed
      .replace(/^[a-z]+:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .toLowerCase();
  }
}

function parseBaseUrl(baseUrl: string | null) {
  if (!baseUrl) {
    return null;
  }

  try {
    return new URL(baseUrl);
  } catch (error) {
    throw new RequestError(400, `Invalid target asset base URL: ${baseUrl}.`, {
      code: "WORKFLOW_TARGET_INVALID",
      userFriendlyMessage: "The selected workflow target URL is invalid.",
      cause: error
    });
  }
}

function targetAssetToNormalizedTarget(asset: TargetAsset): NormalizedTarget {
  const parsedUrl = parseBaseUrl(asset.baseUrl ?? null);
  const host = normalizeHost(
    asset.hostname
    ?? parsedUrl?.hostname
    ?? asset.ipAddress
    ?? asset.cidr
    ?? ""
  );

  if (!host) {
    throw new RequestError(400, `Target asset ${asset.label} is missing a usable host.`, {
      code: "WORKFLOW_TARGET_MISSING",
      userFriendlyMessage: "The selected workflow target is missing a usable host."
    });
  }

  return {
    baseUrl: parsedUrl?.toString() ?? asset.baseUrl ?? null,
    host,
    ...(parsedUrl?.port ? { port: Number(parsedUrl.port) } : {})
  };
}

function isLocalHost(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isPrivateDevHost(host: string) {
  return (
    host.endsWith(".local")
    || host === "host.docker.internal"
    || host.endsWith(".internal")
    || host.endsWith(".docker")
    || host.startsWith("172.")
    || host.startsWith("10.")
    || host.startsWith("192.168.")
  );
}

export function resolveTargetAsset(application: Application, requestedTargetAssetId?: string): TargetAsset {
  const targetAssets = application.targetAssets ?? [];
  if (targetAssets.length === 0) {
    throw new RequestError(400, "Application has no registered target assets.", {
      code: "WORKFLOW_TARGET_ASSET_REQUIRED",
      userFriendlyMessage: "This application does not have any registered targets."
    });
  }

  if (requestedTargetAssetId) {
    const exact = targetAssets.find((asset) => asset.id === requestedTargetAssetId);
    if (!exact) {
      throw new RequestError(400, `Target asset ${requestedTargetAssetId} is not registered for this application.`, {
        code: "WORKFLOW_TARGET_ASSET_INVALID",
        userFriendlyMessage: "The selected workflow target is not registered for this application."
      });
    }
    return exact;
  }

  const defaultTarget = targetAssets.find((asset) => asset.isDefault);
  if (defaultTarget) {
    return defaultTarget;
  }

  if (targetAssets.length === 1) {
    return targetAssets[0] as TargetAsset;
  }

  throw new RequestError(400, "Application has multiple registered targets and requires an explicit target selection.", {
    code: "WORKFLOW_TARGET_ASSET_REQUIRED",
    userFriendlyMessage: "Select a registered target before starting the workflow run."
  });
}

function loadConstraintRuleSet(constraint: ExecutionConstraint): ConstraintRuleSet {
  const rawRuleSpec = constraint.ruleSpec;
  const record = isRecord(rawRuleSpec) ? rawRuleSpec : {};
  return {
    excludedPaths: Array.isArray(record["excludedPaths"])
      ? record["excludedPaths"].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [],
    requireRateLimitSupport: record["requireRateLimitSupport"] === true,
    denyCloudflareOwnedTargets: record["denyCloudflareOwnedTargets"] === true,
    allowActiveExploit: record["allowActiveExploit"] === true
  };
}

function isCloudflareOwnedTarget(host: string) {
  return host === "cloudflare.com" || host.endsWith(".cloudflare.com");
}

export function resolveEffectiveExecutionConstraints(application: Application, targetAsset: TargetAsset, rateLimitRps: number): EffectiveExecutionConstraintSet {
  const normalizedTarget = targetAssetToNormalizedTarget(targetAsset);
  const localhostException = isLocalHost(normalizedTarget.host) || isPrivateDevHost(normalizedTarget.host);
  const bindings = application.constraintBindings ?? [];
  const constraints = bindings
    .map((binding) => binding.constraint)
    .filter((constraint): constraint is ExecutionConstraint => Boolean(constraint));

  if (localhostException) {
    return {
      targetAsset,
      normalizedTarget,
      localhostException: true,
      excludedPaths: [],
      rateLimitRps,
      allowActiveExploit: true,
      constraints: []
    };
  }

  if (targetAsset.ownershipStatus !== "verified") {
    throw new RequestError(400, `Target asset ${targetAsset.label} is not ownership-verified.`, {
      code: "WORKFLOW_TARGET_UNVERIFIED",
      userFriendlyMessage: "Workflow runs require a verified owned target."
    });
  }

  const aggregate = constraints.reduce<ConstraintRuleSet>((accumulator, constraint) => {
    const rules = loadConstraintRuleSet(constraint);
    return {
      excludedPaths: [...new Set([...accumulator.excludedPaths, ...rules.excludedPaths])],
      requireRateLimitSupport: accumulator.requireRateLimitSupport || rules.requireRateLimitSupport,
      denyCloudflareOwnedTargets: accumulator.denyCloudflareOwnedTargets || rules.denyCloudflareOwnedTargets,
      allowActiveExploit: accumulator.allowActiveExploit || rules.allowActiveExploit
    };
  }, {
    excludedPaths: [],
    requireRateLimitSupport: false,
    denyCloudflareOwnedTargets: false,
    allowActiveExploit: false
  });

  if (aggregate.denyCloudflareOwnedTargets && isCloudflareOwnedTarget(normalizedTarget.host)) {
    throw new RequestError(400, `Target ${normalizedTarget.host} is Cloudflare-owned and outside customer-run scope.`, {
      code: "WORKFLOW_TARGET_PROVIDER_DENIED",
      userFriendlyMessage: "That target is provider-owned and not allowed for customer-run testing."
    });
  }

  return {
    targetAsset,
    normalizedTarget,
    localhostException: false,
    excludedPaths: aggregate.excludedPaths,
    rateLimitRps,
    allowActiveExploit: aggregate.allowActiveExploit,
    constraints
  };
}

export function authorizeToolAgainstConstraints(
  constraints: EffectiveExecutionConstraintSet,
  tool: AiTool,
  request: ToolRequest
): ConstraintDecision {
  if (constraints.localhostException) {
    return { allowed: true, reason: "Local development target bypasses provider constraints." };
  }

  const profile = tool.constraintProfile;
  if (!profile?.enforced) {
    return {
      allowed: false,
      reason: `Tool ${tool.name} is not constraint-compatible for provider-governed targets.`
    };
  }

  if (request.riskTier === "controlled-exploit" && !constraints.allowActiveExploit) {
    return {
      allowed: false,
      reason: `Tool ${tool.name} requires exploit authorization that this application does not allow.`
    };
  }

  if (constraints.excludedPaths.length > 0 && !profile.supportsPathExclusions) {
    return {
      allowed: false,
      reason: `Tool ${tool.name} cannot enforce required path exclusions for this target.`
    };
  }

  if (constraints.rateLimitRps > 0 && !profile.supportsRateLimit) {
    return {
      allowed: false,
      reason: `Tool ${tool.name} cannot enforce the required request throttling policy.`
    };
  }

  if (!profile.supportsHostAllowlist) {
    return {
      allowed: false,
      reason: `Tool ${tool.name} cannot enforce host allowlisting for a constrained target.`
    };
  }

  return {
    allowed: true,
    reason: `Tool ${tool.name} is compatible with the active application constraints.`
  };
}

export function applyConstraintInputs(
  request: ToolRequest,
  constraints: EffectiveExecutionConstraintSet
): ToolRequest {
  if (constraints.localhostException) {
    return request;
  }

  const toolInput = isRecord(request.parameters["toolInput"])
    ? request.parameters["toolInput"] as Record<string, string | number | boolean | string[]>
    : {};

  return {
    ...request,
    target: constraints.normalizedTarget.host,
    ...(constraints.normalizedTarget.port ? { port: constraints.normalizedTarget.port } : {}),
    parameters: {
      ...request.parameters,
      toolInput: {
        ...toolInput,
        target: constraints.normalizedTarget.host,
        ...(constraints.normalizedTarget.baseUrl ? { baseUrl: constraints.normalizedTarget.baseUrl } : {}),
        ...(constraints.normalizedTarget.port ? { port: constraints.normalizedTarget.port } : {}),
        ...(constraints.excludedPaths.length > 0 ? { excludedPaths: constraints.excludedPaths } : {}),
        ...(constraints.rateLimitRps > 0 ? { rateLimitRps: constraints.rateLimitRps } : {})
      }
    }
  };
}
