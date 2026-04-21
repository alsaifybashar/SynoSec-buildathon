import {
  apiRoutes,
  applicationSchema,
  applicationsListQuerySchema,
  createApplicationBodySchema,
  listApplicationsResponseSchema,
  updateApplicationBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { registerCrudRoutes } from "@/core/http/register-crud-routes.js";
import { type ApplicationsRepository } from "../applications/applications.repository.js";

export function registerApplicationsRoutes(app: Express, repository: ApplicationsRepository) {
  registerCrudRoutes(app, {
    resourcePath: apiRoutes.applications,
    repository,
    querySchema: applicationsListQuerySchema,
    listResponseSchema: listApplicationsResponseSchema,
    listDataKey: "applications",
    itemSchema: applicationSchema,
    createBodySchema: createApplicationBodySchema,
    updateBodySchema: updateApplicationBodySchema,
    notFoundMessage: "Application not found."
  });
}
