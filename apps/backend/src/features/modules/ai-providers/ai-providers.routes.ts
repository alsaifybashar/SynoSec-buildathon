import {
  aiProviderSchema,
  aiProvidersListQuerySchema,
  apiRoutes,
  createAiProviderBodySchema,
  listAiProvidersResponseSchema,
  updateAiProviderBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { handlePaginatedListRoute } from "../../../platform/core/http/paginated-list-route.js";
import { type AiProvidersRepository } from "../ai-providers/ai-providers.repository.js";

export function registerAiProvidersRoutes(app: Express, repository: AiProvidersRepository) {
  app.get(apiRoutes.aiProviders, async (request, response, next) => {
    await handlePaginatedListRoute({
      request,
      response,
      next,
      querySchema: aiProvidersListQuerySchema,
      responseSchema: listAiProvidersResponseSchema,
      dataKey: "providers",
      load: (query) => repository.list(query)
    });
  });

  app.get(`${apiRoutes.aiProviders}/:id`, async (request, response, next) => {
    try {
      const provider = await repository.getById(request.params.id);
      if (!provider) {
        response.status(404).json({ message: "AI provider not found." });
        return;
      }

      response.json(aiProviderSchema.parse(provider));
    } catch (error) {
      next(error);
    }
  });

  app.post(apiRoutes.aiProviders, async (request, response, next) => {
    try {
      const input = createAiProviderBodySchema.parse(request.body);
      const provider = await repository.create(input);
      response.status(201).json(aiProviderSchema.parse(provider));
    } catch (error) {
      next(error);
    }
  });

  app.patch(`${apiRoutes.aiProviders}/:id`, async (request, response, next) => {
    try {
      const input = updateAiProviderBodySchema.parse(request.body);
      const provider = await repository.update(request.params.id, input);
      if (!provider) {
        response.status(404).json({ message: "AI provider not found." });
        return;
      }

      response.json(aiProviderSchema.parse(provider));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`${apiRoutes.aiProviders}/:id`, async (request, response, next) => {
    try {
      const removed = await repository.remove(request.params.id);
      if (!removed) {
        response.status(404).json({ message: "AI provider not found." });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
}
