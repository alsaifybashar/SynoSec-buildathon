import {
  apiRoutes,
  executionReportDetailSchema,
  executionReportsListQuerySchema,
  listExecutionReportsResponseSchema
} from "@synosec/contracts";
import type { Express } from "express";
import { handlePaginatedListRoute } from "@/shared/http/paginated-list-route.js";
import { RequestError } from "@/shared/http/request-error.js";
import { ExecutionReportsService } from "./execution-reports.service.js";

export function registerExecutionReportsRoutes(app: Express, service: ExecutionReportsService) {
  app.get(apiRoutes.executionReports, async (request, response, next) => {
    await handlePaginatedListRoute({
      request,
      response,
      next,
      querySchema: executionReportsListQuerySchema,
      responseSchema: listExecutionReportsResponseSchema,
      dataKey: "reports",
      load: (query) => service.list(query)
    });
  });

  app.get(`${apiRoutes.executionReports}/:id`, async (request, response, next) => {
    try {
      const reportId = request.params["id"];
      if (typeof reportId !== "string") {
        throw new RequestError(400, "Execution report id is required.");
      }
      response.json(executionReportDetailSchema.parse(
        await service.getById(reportId)
      ));
    } catch (error) {
      next(error);
    }
  });

  app.post(apiRoutes.executionReportArchive, async (request, response, next) => {
    try {
      const reportId = request.params["id"];
      if (typeof reportId !== "string") {
        throw new RequestError(400, "Execution report id is required.");
      }
      response.json(executionReportDetailSchema.parse(
        await service.archive(reportId)
      ));
    } catch (error) {
      next(error);
    }
  });

  app.post(apiRoutes.executionReportUnarchive, async (request, response, next) => {
    try {
      const reportId = request.params["id"];
      if (typeof reportId !== "string") {
        throw new RequestError(400, "Execution report id is required.");
      }
      response.json(executionReportDetailSchema.parse(
        await service.unarchive(reportId)
      ));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`${apiRoutes.executionReports}/:id`, async (request, response, next) => {
    try {
      const reportId = request.params["id"];
      if (typeof reportId !== "string") {
        throw new RequestError(400, "Execution report id is required.");
      }

      const removed = await service.remove(reportId);
      if (!removed) {
        response.status(404).json({ message: "Execution report not found." });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
}
