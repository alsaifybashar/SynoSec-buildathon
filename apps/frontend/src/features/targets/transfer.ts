import {
  apiRoutes,
  createTargetBodySchema,
  targetSchema,
  type CreateTargetBody,
  type Target
} from "@synosec/contracts";
import { type ResourceTransferConfig } from "@/shared/lib/resource-transfer";

export const targetTransfer = {
  table: "targets",
  route: apiRoutes.targets,
  itemSchema: targetSchema,
  createBodySchema: createTargetBodySchema,
  toCreateBody: (target: Target): CreateTargetBody => ({
    name: target.name,
    baseUrl: target.baseUrl,
    environment: target.environment,
    status: target.status,
    lastScannedAt: target.lastScannedAt
  })
} satisfies ResourceTransferConfig<Target, CreateTargetBody>;
