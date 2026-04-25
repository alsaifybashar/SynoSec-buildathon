import type {
  Application,
  ApplicationConstraintBinding,
  ExecutionConstraint,
  Runtime,
  TargetAsset
} from "@prisma/client";
import type { Target } from "@synosec/contracts";

function mapTargetAssetRow(row: TargetAsset) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    label: row.label,
    kind: row.kind,
    hostname: row.hostname,
    baseUrl: row.baseUrl,
    ipAddress: row.ipAddress,
    cidr: row.cidr,
    provider: row.provider,
    ownershipStatus: row.ownershipStatus,
    isDefault: row.isDefault,
    metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapConstraintBindingRow(row: ApplicationConstraintBinding & {
  constraint?: ExecutionConstraint | null;
}) {
  return {
    constraintId: row.constraintId,
    createdAt: row.createdAt.toISOString(),
    ...(row.constraint ? {
      constraint: {
        id: row.constraint.id,
        name: row.constraint.name,
        kind: row.constraint.kind,
        provider: row.constraint.provider,
        version: row.constraint.version,
        description: row.constraint.description,
        bypassForLocalTargets: row.constraint.bypassForLocalTargets,
        denyProviderOwnedTargets: row.constraint.denyProviderOwnedTargets,
        requireVerifiedOwnership: row.constraint.requireVerifiedOwnership,
        allowActiveExploit: row.constraint.allowActiveExploit,
        requireRateLimitSupport: row.constraint.requireRateLimitSupport,
        rateLimitRps: row.constraint.rateLimitRps,
        requireHostAllowlistSupport: row.constraint.requireHostAllowlistSupport,
        requirePathExclusionSupport: row.constraint.requirePathExclusionSupport,
        documentationUrls: row.constraint.documentationUrls,
        excludedPaths: row.constraint.excludedPaths,
        createdAt: row.constraint.createdAt.toISOString(),
        updatedAt: row.constraint.updatedAt.toISOString()
      }
    } : {})
  };
}

function mapDeploymentRow(row: Runtime): NonNullable<Target["deployments"]>[number] {
  return {
    id: row.id,
    name: row.name,
    serviceType: row.serviceType === "other" ? "other" : row.serviceType,
    provider: row.provider === "on_prem" ? "on-prem" : row.provider,
    environment: row.environment,
    region: row.region,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function mapTargetRow(row: Application & {
  targetAssets?: TargetAsset[];
  constraintBindings?: Array<ApplicationConstraintBinding & { constraint?: ExecutionConstraint | null }>;
  runtimes?: Runtime[];
}): Target {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    environment: row.environment,
    status: row.status,
    lastScannedAt: row.lastScannedAt?.toISOString() ?? null,
    ...(row.targetAssets ? { targetAssets: row.targetAssets.map(mapTargetAssetRow) } : {}),
    ...(row.constraintBindings ? { constraintBindings: row.constraintBindings.map(mapConstraintBindingRow) } : {}),
    ...(row.runtimes ? { deployments: row.runtimes.map(mapDeploymentRow) } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
