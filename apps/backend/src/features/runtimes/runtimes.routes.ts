import {
  apiRoutes,
  createRuntimeBodySchema,
  runtimesListQuerySchema,
  listRuntimesResponseSchema,
  runtimeSchema,
  updateRuntimeBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { registerCrudRoutes } from "@/shared/http/register-crud-routes.js";
import { type RuntimesRepository } from "../runtimes/runtimes.repository.js";

export function registerRuntimesRoutes(app: Express, repository: RuntimesRepository) {
  registerCrudRoutes(app, {
    resourcePath: apiRoutes.runtimes,
    repository,
    querySchema: runtimesListQuerySchema,
    listResponseSchema: listRuntimesResponseSchema,
    listDataKey: "runtimes",
    itemSchema: runtimeSchema,
    createBodySchema: createRuntimeBodySchema,
    updateBodySchema: updateRuntimeBodySchema,
    notFoundMessage: "Runtime not found."
  });
}
