import {
  aiProviderSchema,
  apiRoutes,
  createAiProviderBodySchema,
  type AiProvider,
  type CreateAiProviderBody
} from "@synosec/contracts";
import { type ResourceTransferConfig } from "@/shared/lib/resource-transfer";

export const aiProviderTransfer = {
  table: "ai-providers",
  route: apiRoutes.aiProviders,
  itemSchema: aiProviderSchema,
  createBodySchema: createAiProviderBodySchema,
  toCreateBody: (provider: AiProvider): CreateAiProviderBody => ({
    name: provider.name,
    kind: provider.kind,
    status: provider.status,
    description: provider.description,
    baseUrl: provider.baseUrl,
    model: provider.model
  })
} satisfies ResourceTransferConfig<AiProvider, CreateAiProviderBody>;
