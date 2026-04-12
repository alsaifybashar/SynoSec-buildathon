import type { Runtime } from "@prisma/client";
import type { Runtime as ContractRuntime } from "@synosec/contracts";

function mapProvider(provider: Runtime["provider"]): ContractRuntime["provider"] {
  return provider === "on_prem" ? "on-prem" : provider;
}

export function mapRuntimeRow(row: Runtime): ContractRuntime {
  return {
    id: row.id,
    name: row.name,
    serviceType: row.serviceType,
    provider: mapProvider(row.provider),
    environment: row.environment,
    region: row.region,
    status: row.status,
    applicationId: row.applicationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
