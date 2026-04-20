import {
  aiAgentSchema,
  aiAgentsListQuerySchema,
  apiRoutes,
  createAiAgentBodySchema,
  listAiAgentsResponseSchema,
  updateAiAgentBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { handlePaginatedListRoute } from "../../../platform/core/http/paginated-list-route.js";
import { type AiAgentsRepository } from "../ai-agents/ai-agents.repository.js";

export function registerAiAgentsRoutes(app: Express, repository: AiAgentsRepository) {
  app.get(apiRoutes.aiAgents, async (request, response, next) => {
    await handlePaginatedListRoute({
      request,
      response,
      next,
      querySchema: aiAgentsListQuerySchema,
      responseSchema: listAiAgentsResponseSchema,
      dataKey: "agents",
      load: (query) => repository.list(query)
    });
  });

  app.get(`${apiRoutes.aiAgents}/:id`, async (request, response, next) => {
    try {
      const agent = await repository.getById(request.params.id);
      if (!agent) {
        response.status(404).json({ message: "AI agent not found." });
        return;
      }

      response.json(aiAgentSchema.parse(agent));
    } catch (error) {
      next(error);
    }
  });

  app.post(apiRoutes.aiAgents, async (request, response, next) => {
    try {
      const input = createAiAgentBodySchema.parse(request.body);
      const agent = await repository.create(input);
      response.status(201).json(aiAgentSchema.parse(agent));
    } catch (error) {
      next(error);
    }
  });

  app.patch(`${apiRoutes.aiAgents}/:id`, async (request, response, next) => {
    try {
      const input = updateAiAgentBodySchema.parse(request.body);
      const agent = await repository.update(request.params.id, input);
      if (!agent) {
        response.status(404).json({ message: "AI agent not found." });
        return;
      }

      response.json(aiAgentSchema.parse(agent));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`${apiRoutes.aiAgents}/:id`, async (request, response, next) => {
    try {
      const removed = await repository.remove(request.params.id);
      if (!removed) {
        response.status(404).json({ message: "AI agent not found." });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
}
