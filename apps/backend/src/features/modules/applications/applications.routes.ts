import {
  apiRoutes,
  applicationSchema,
  applicationsListQuerySchema,
  createApplicationBodySchema,
  listApplicationsResponseSchema,
  updateApplicationBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { handlePaginatedListRoute } from "../../../platform/core/http/paginated-list-route.js";
import { type ApplicationsRepository } from "../applications/applications.repository.js";

export function registerApplicationsRoutes(app: Express, repository: ApplicationsRepository) {
  app.get(apiRoutes.applications, async (request, response, next) => {
    await handlePaginatedListRoute({
      request,
      response,
      next,
      querySchema: applicationsListQuerySchema,
      responseSchema: listApplicationsResponseSchema,
      dataKey: "applications",
      load: (query) => repository.list(query)
    });
  });

  app.get(`${apiRoutes.applications}/:id`, async (request, response, next) => {
    try {
      const application = await repository.getById(request.params.id);

      if (!application) {
        response.status(404).json({ message: "Application not found." });
        return;
      }

      response.json(applicationSchema.parse(application));
    } catch (error) {
      next(error);
    }
  });

  app.post(apiRoutes.applications, async (request, response, next) => {
    try {
      const input = createApplicationBodySchema.parse(request.body);
      const application = await repository.create(input);
      response.status(201).json(applicationSchema.parse(application));
    } catch (error) {
      next(error);
    }
  });

  app.patch(`${apiRoutes.applications}/:id`, async (request, response, next) => {
    try {
      const input = updateApplicationBodySchema.parse(request.body);
      const application = await repository.update(request.params.id, input);

      if (!application) {
        response.status(404).json({ message: "Application not found." });
        return;
      }

      response.json(applicationSchema.parse(application));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`${apiRoutes.applications}/:id`, async (request, response, next) => {
    try {
      const removed = await repository.remove(request.params.id);

      if (!removed) {
        response.status(404).json({ message: "Application not found." });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
}
