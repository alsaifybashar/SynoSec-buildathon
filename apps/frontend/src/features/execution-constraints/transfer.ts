import {
  apiRoutes,
  createExecutionConstraintBodySchema,
  executionConstraintSchema,
  type CreateExecutionConstraintBody,
  type ExecutionConstraint
} from "@synosec/contracts";
import type { ResourceTransferConfig } from "@/shared/lib/resource-transfer";

export const executionConstraintTransfer = {
  table: "execution-constraints",
  route: apiRoutes.executionConstraints,
  itemSchema: executionConstraintSchema,
  createBodySchema: createExecutionConstraintBodySchema,
  toCreateBody: (constraint: ExecutionConstraint): CreateExecutionConstraintBody => ({
    name: constraint.name,
    kind: constraint.kind,
    provider: constraint.provider,
    version: constraint.version,
    description: constraint.description,
    denyProviderOwnedTargets: constraint.denyProviderOwnedTargets,
    requireVerifiedOwnership: constraint.requireVerifiedOwnership,
    allowActiveExploit: constraint.allowActiveExploit,
    requireRateLimitSupport: constraint.requireRateLimitSupport,
    rateLimitRps: constraint.rateLimitRps,
    requireHostAllowlistSupport: constraint.requireHostAllowlistSupport,
    requirePathExclusionSupport: constraint.requirePathExclusionSupport,
    excludedPaths: constraint.excludedPaths
  })
} satisfies ResourceTransferConfig<ExecutionConstraint, CreateExecutionConstraintBody>;
