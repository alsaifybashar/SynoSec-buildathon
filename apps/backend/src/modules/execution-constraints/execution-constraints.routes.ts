import {
  apiRoutes,
  createExecutionConstraintBodySchema,
  executionConstraintSchema,
  executionConstraintsListQuerySchema,
  listExecutionConstraintsResponseSchema,
  updateExecutionConstraintBodySchema
} from "@synosec/contracts";
import type { Express } from "express";
import { registerCrudRoutes } from "@/shared/http/register-crud-routes.js";
import type { ExecutionConstraintsRepository } from "./execution-constraints.repository.js";

export function registerExecutionConstraintsRoutes(app: Express, repository: ExecutionConstraintsRepository) {
  registerCrudRoutes(app, {
    resourcePath: apiRoutes.executionConstraints,
    repository,
    querySchema: executionConstraintsListQuerySchema,
    listResponseSchema: listExecutionConstraintsResponseSchema,
    listDataKey: "constraints",
    itemSchema: executionConstraintSchema,
    createBodySchema: createExecutionConstraintBodySchema,
    updateBodySchema: updateExecutionConstraintBodySchema,
    notFoundMessage: "Execution constraint not found."
  });
}
