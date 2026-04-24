import {
  apiRoutes,
  applicationSchema,
  createApplicationBodySchema,
  type Application,
  type CreateApplicationBody
} from "@synosec/contracts";
import { type ResourceTransferConfig } from "@/shared/lib/resource-transfer";

export const applicationTransfer = {
  table: "applications",
  route: apiRoutes.applications,
  itemSchema: applicationSchema,
  createBodySchema: createApplicationBodySchema,
  toCreateBody: (application: Application): CreateApplicationBody => ({
    name: application.name,
    baseUrl: application.baseUrl,
    environment: application.environment,
    status: application.status,
    lastScannedAt: application.lastScannedAt
  })
} satisfies ResourceTransferConfig<Application, CreateApplicationBody>;
