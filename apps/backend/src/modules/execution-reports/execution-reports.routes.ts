import { apiRoutes, executionReportDetailSchema, executionReportsListQuerySchema, listExecutionReportsResponseSchema } from "@synosec/contracts";
import type { Express } from "express";
import { handlePaginatedListRoute } from "@/shared/http/paginated-list-route.js";
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
      response.json(executionReportDetailSchema.parse(
        await service.getById(request.params.id)
      ));
    } catch (error) {
      next(error);
    }
  });
}
