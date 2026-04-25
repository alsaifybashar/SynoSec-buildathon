import {
  aiAgentSchema,
  aiAgentsListQuerySchema,
  apiRoutes,
  createAiAgentBodySchema,
  listAiAgentsResponseSchema,
  updateAiAgentBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { registerCrudRoutes } from "@/shared/http/register-crud-routes.js";
import { type AiAgentsRepository } from "@/modules/ai-agents/ai-agents.repository.js";

export function registerAiAgentsRoutes(app: Express, repository: AiAgentsRepository) {
  registerCrudRoutes(app, {
    resourcePath: apiRoutes.aiAgents,
    repository,
    querySchema: aiAgentsListQuerySchema,
    listResponseSchema: listAiAgentsResponseSchema,
    listDataKey: "agents",
    itemSchema: aiAgentSchema,
    createBodySchema: createAiAgentBodySchema,
    updateBodySchema: updateAiAgentBodySchema,
    notFoundMessage: "AI agent not found."
  });
}
