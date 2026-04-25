import type { AiProvider as PrismaAiProvider } from "@prisma/client";
import type { AiProvider } from "@synosec/contracts";

export function mapAiProviderRow(row: PrismaAiProvider): AiProvider {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    description: row.description,
    baseUrl: row.baseUrl,
    model: row.model,
    apiKeyConfigured: Boolean(row.apiKey && row.apiKey.length > 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
