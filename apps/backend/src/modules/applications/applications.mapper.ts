import type { Application } from "@prisma/client";
import type { Application as ContractApplication } from "@synosec/contracts";

export function mapApplicationRow(row: Application): ContractApplication {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    environment: row.environment,
    status: row.status,
    lastScannedAt: row.lastScannedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
