import {
  type AiTool,
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
import { RequestError } from "@/shared/http/request-error.js";
import { runAiTool } from "./ai-tool-runner.js";
import { isRegistryVisibleAiTool } from "./ai-tool-surface.js";
import { createToolRuntime, type ToolRuntime } from "./tool-runtime.js";

function rejectRawAdapterExposure(): never {
  throw new RequestError(400, "Raw adapter tools are internal-only and cannot be managed through the Tool Registry.", {
    code: "AI_TOOL_REGISTRY_READ_ONLY",
    userFriendlyMessage: "The Tool Registry is read-only for workflow-facing tools."
  });
}

function paginateVisibleTools(items: AiTool[], page: number, pageSize: number) {
  const total = items.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page: normalizedPage,
    pageSize: safePageSize,
    total,
    totalPages
  };
}

function createPublicAiToolsRepository(repository: AiToolsRepository): AiToolsRepository {
  return {
    async list(query) {
      const result = await repository.list({
        ...query,
        page: 1,
        pageSize: 10_000
      });

      return paginateVisibleTools(
        result.items.filter(isRegistryVisibleAiTool),
        query.page,
        query.pageSize
      );
    },
    async getById(id) {
      const tool = await repository.getById(id);
      return tool && isRegistryVisibleAiTool(tool) ? tool : null;
    },
    async create() {
      rejectRawAdapterExposure();
    },
    async update() {
      rejectRawAdapterExposure();
    },
    async remove() {
      rejectRawAdapterExposure();
    }
  };
}

export function registerAiToolsRoutes(
  app: Express,
  repository: AiToolsRepository,
  toolRuntime: ToolRuntime = createToolRuntime(repository)
) {
  const publicRepository = createPublicAiToolsRepository(repository);

  registerCrudRoutes(app, {
    resourcePath: apiRoutes.toolRegistry,
    repository: publicRepository,
    querySchema: aiToolsListQuerySchema,
    listResponseSchema: listAiToolsResponseSchema,
    listDataKey: "tools",
    itemSchema: aiToolSchema,
    createBodySchema: createAiToolBodySchema,
    updateBodySchema: updateAiToolBodySchema,
    notFoundMessage: "AI tool not found."
  });

  app.post(`${apiRoutes.toolRegistry}/:id/run`, async (request, response, next) => {
    try {
      const tool = await publicRepository.getById(request.params.id);
      if (!tool) {
        response.status(404).json({ message: "AI tool not found." });
        return;
      }

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
