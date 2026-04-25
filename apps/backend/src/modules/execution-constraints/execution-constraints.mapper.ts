import type { ExecutionConstraint as PrismaExecutionConstraint } from "@prisma/client";
import type { ExecutionConstraint } from "@synosec/contracts";

export function mapExecutionConstraintRow(row: PrismaExecutionConstraint): ExecutionConstraint {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    provider: row.provider,
    version: row.version,
    description: row.description,
    bypassForLocalTargets: row.bypassForLocalTargets,
    denyProviderOwnedTargets: row.denyProviderOwnedTargets,
    requireVerifiedOwnership: row.requireVerifiedOwnership,
    allowActiveExploit: row.allowActiveExploit,
    requireRateLimitSupport: row.requireRateLimitSupport,
    rateLimitRps: row.rateLimitRps,
    requireHostAllowlistSupport: row.requireHostAllowlistSupport,
    requirePathExclusionSupport: row.requirePathExclusionSupport,
    documentationUrls: row.documentationUrls,
    excludedPaths: row.excludedPaths,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
