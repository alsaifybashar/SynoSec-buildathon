import { apiRoutes, briefResponseSchema } from "@synosec/contracts";
import { type Express } from "express";
import { buildBriefResponse } from "./brief.service.js";

export function registerBriefRoutes(app: Express) {
  app.get(apiRoutes.brief, (_request, response) => {
    response.json(briefResponseSchema.parse(buildBriefResponse()));
  });
}
