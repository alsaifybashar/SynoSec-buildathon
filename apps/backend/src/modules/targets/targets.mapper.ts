import type {
  Application,
  ApplicationConstraintBinding,
  ExecutionConstraint
} from "@prisma/client";
import type { Target } from "@synosec/contracts";

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

export function mapTargetRow(row: Application & {
  constraintBindings?: Array<ApplicationConstraintBinding & { constraint?: ExecutionConstraint | null }>;
}): Target {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    environment: row.environment,
    status: row.status,
    lastScannedAt: row.lastScannedAt?.toISOString() ?? null,
    ...(row.constraintBindings ? { constraintBindings: row.constraintBindings.map(mapConstraintBindingRow) } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
