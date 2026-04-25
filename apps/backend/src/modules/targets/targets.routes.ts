import {
  apiRoutes,
  createTargetBodySchema,
  listTargetsResponseSchema,
  targetSchema,
  targetsListQuerySchema,
  updateTargetBodySchema
} from "@synosec/contracts";
import { type Express } from "express";
import { registerCrudRoutes } from "@/shared/http/register-crud-routes.js";
import { type TargetsRepository } from "@/modules/targets/targets.repository.js";

export function registerTargetsRoutes(app: Express, repository: TargetsRepository) {
  registerCrudRoutes(app, {
    resourcePath: apiRoutes.targets,
    repository,
    querySchema: targetsListQuerySchema,
    listResponseSchema: listTargetsResponseSchema,
    listDataKey: "targets",
    itemSchema: targetSchema,
    createBodySchema: createTargetBodySchema,
    updateBodySchema: updateTargetBodySchema,
    notFoundMessage: "Target not found."
  });
}
