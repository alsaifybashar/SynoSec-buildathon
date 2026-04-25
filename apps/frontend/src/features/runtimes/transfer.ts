import {
  apiRoutes,
  createRuntimeBodySchema,
  runtimeSchema,
  type CreateRuntimeBody,
  type Runtime
} from "@synosec/contracts";
import { type ResourceTransferConfig } from "@/shared/lib/resource-transfer";

export const runtimeTransfer = {
  table: "runtimes",
  route: apiRoutes.runtimes,
  itemSchema: runtimeSchema,
  createBodySchema: createRuntimeBodySchema,
  toCreateBody: (runtime: Runtime): CreateRuntimeBody => ({
    name: runtime.name,
    serviceType: runtime.serviceType,
    provider: runtime.provider,
    environment: runtime.environment,
    region: runtime.region,
    status: runtime.status,
    applicationId: runtime.applicationId
  })
} satisfies ResourceTransferConfig<Runtime, CreateRuntimeBody>;
