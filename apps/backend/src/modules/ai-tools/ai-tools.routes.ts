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
import { type AiToolsRepository } from "@/modules/ai-tools/ai-tools.repository.js";
import { runAiTool } from "./ai-tool-runner.js";
import { createToolRuntime, type ToolRuntime } from "./tool-runtime.js";

export function registerAiToolsRoutes(
  app: Express,
  repository: AiToolsRepository,
  toolRuntime: ToolRuntime = createToolRuntime(repository)
) {
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
      const input = aiToolRunBodySchema.parse(request.body);
      const result = await runAiTool(toolRuntime, request.params.id, input.input);
      response.json(aiToolRunResultSchema.parse(result));
    } catch (error) {
      next(error);
    }
  });
}

export function registerAiToolCapabilityRoutes(
  app: Express,
  toolRuntime: Pick<ToolRuntime, "listCapabilities">
) {
  app.get("/api/tools/capabilities", async (_request, response, next) => {
    try {
      response.json(await toolRuntime.listCapabilities());
    } catch (error) {
      next(error);
    }
  });
}
