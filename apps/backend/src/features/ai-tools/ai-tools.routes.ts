import {
  aiToolSchema,
  aiToolRunBodySchema,
  aiToolRunResultSchema,
  aiToolsListQuerySchema,
  apiRoutes,
  createAiToolBodySchema,
  listAiToolsResponseSchema,
  updateAiToolBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { registerCrudRoutes } from "@/shared/http/register-crud-routes.js";
import { type AiToolsRepository } from "@/features/ai-tools/ai-tools.repository.js";
import { runAiTool } from "./ai-tool-runner.js";

export function registerAiToolsRoutes(app: Express, repository: AiToolsRepository) {
  registerCrudRoutes(app, {
    resourcePath: apiRoutes.aiTools,
    repository,
    querySchema: aiToolsListQuerySchema,
    listResponseSchema: listAiToolsResponseSchema,
    listDataKey: "tools",
    itemSchema: aiToolSchema,
    createBodySchema: createAiToolBodySchema,
    updateBodySchema: updateAiToolBodySchema,
    notFoundMessage: "AI tool not found."
  });

  app.post(`${apiRoutes.aiTools}/:id/run`, async (request, response, next) => {
    try {
      const tool = await repository.getById(request.params.id);
      if (!tool) {
        response.status(404).json({ message: "AI tool not found." });
        return;
      }

      const input = aiToolRunBodySchema.parse(request.body);
      const result = await runAiTool(tool, input.input);
      response.json(aiToolRunResultSchema.parse(result));
    } catch (error) {
      next(error);
    }
  });
}
