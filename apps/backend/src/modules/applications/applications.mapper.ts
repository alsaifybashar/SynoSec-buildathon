import type {
  Application,
  ApplicationConstraintBinding,
  ExecutionConstraint,
  TargetAsset
} from "@prisma/client";
import type { Application as ContractApplication } from "@synosec/contracts";

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
        denyProviderOwnedTargets: row.constraint.denyProviderOwnedTargets,
        requireVerifiedOwnership: row.constraint.requireVerifiedOwnership,
        allowActiveExploit: row.constraint.allowActiveExploit,
        requireRateLimitSupport: row.constraint.requireRateLimitSupport,
        rateLimitRps: row.constraint.rateLimitRps,
        requireHostAllowlistSupport: row.constraint.requireHostAllowlistSupport,
        requirePathExclusionSupport: row.constraint.requirePathExclusionSupport,
        excludedPaths: row.constraint.excludedPaths,
        createdAt: row.constraint.createdAt.toISOString(),
        updatedAt: row.constraint.updatedAt.toISOString()
      }
    } : {})
  };
}

export function mapApplicationRow(row: Application & {
  targetAssets?: TargetAsset[];
  constraintBindings?: Array<ApplicationConstraintBinding & { constraint?: ExecutionConstraint | null }>;
}): ContractApplication {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    environment: row.environment,
    status: row.status,
    lastScannedAt: row.lastScannedAt?.toISOString() ?? null,
    ...(row.targetAssets ? { targetAssets: row.targetAssets.map(mapTargetAssetRow) } : {}),
    ...(row.constraintBindings ? { constraintBindings: row.constraintBindings.map(mapConstraintBindingRow) } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
