import {
  aiProviderSchema,
  aiProvidersListQuerySchema,
  apiRoutes,
  createAiProviderBodySchema,
  listAiProvidersResponseSchema,
  updateAiProviderBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { registerCrudRoutes } from "@/shared/http/register-crud-routes.js";
import { type AiProvidersRepository } from "@/modules/ai-providers/ai-providers.repository.js";

export function registerAiProvidersRoutes(app: Express, repository: AiProvidersRepository) {
  registerCrudRoutes(app, {
    resourcePath: apiRoutes.aiProviders,
    repository,
    querySchema: aiProvidersListQuerySchema,
    listResponseSchema: listAiProvidersResponseSchema,
    listDataKey: "providers",
    itemSchema: aiProviderSchema,
    createBodySchema: createAiProviderBodySchema,
    updateBodySchema: updateAiProviderBodySchema,
    notFoundMessage: "AI provider not found."
  });
}
