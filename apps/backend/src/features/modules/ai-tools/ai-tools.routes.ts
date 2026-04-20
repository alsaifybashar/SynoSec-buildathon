import {
  aiToolSchema,
  aiToolsListQuerySchema,
  apiRoutes,
  createAiToolBodySchema,
  listAiToolsResponseSchema,
  updateAiToolBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { handlePaginatedListRoute } from "../../../platform/core/http/paginated-list-route.js";
import { type AiToolsRepository } from "../ai-tools/ai-tools.repository.js";

export function registerAiToolsRoutes(app: Express, repository: AiToolsRepository) {
  app.get(apiRoutes.aiTools, async (request, response, next) => {
    await handlePaginatedListRoute({
      request,
      response,
      next,
      querySchema: aiToolsListQuerySchema,
      responseSchema: listAiToolsResponseSchema,
      dataKey: "tools",
      load: (query) => repository.list(query)
    });
  });

  app.get(`${apiRoutes.aiTools}/:id`, async (request, response, next) => {
    try {
      const tool = await repository.getById(request.params.id);
      if (!tool) {
        response.status(404).json({ message: "AI tool not found." });
        return;
      }

      response.json(aiToolSchema.parse(tool));
    } catch (error) {
      next(error);
    }
  });

  app.post(apiRoutes.aiTools, async (request, response, next) => {
    try {
      const input = createAiToolBodySchema.parse(request.body);
      const tool = await repository.create(input);
      response.status(201).json(aiToolSchema.parse(tool));
    } catch (error) {
      next(error);
    }
  });

  app.patch(`${apiRoutes.aiTools}/:id`, async (request, response, next) => {
    try {
      const input = updateAiToolBodySchema.parse(request.body);
      const tool = await repository.update(request.params.id, input);
      if (!tool) {
        response.status(404).json({ message: "AI tool not found." });
        return;
      }

      response.json(aiToolSchema.parse(tool));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`${apiRoutes.aiTools}/:id`, async (request, response, next) => {
    try {
      const removed = await repository.remove(request.params.id);
      if (!removed) {
        response.status(404).json({ message: "AI tool not found." });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
}
