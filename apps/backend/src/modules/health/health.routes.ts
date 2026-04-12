import { apiRoutes, healthResponseSchema, type HealthResponse } from "@synosec/contracts";
import { type Express } from "express";

export function registerHealthRoutes(app: Express) {
  app.get(apiRoutes.health, (_request, response) => {
    const payload: HealthResponse = {
      status: "ok",
      service: "synosec-backend",
      timestamp: new Date().toISOString()
    };

    response.json(healthResponseSchema.parse(payload));
  });
}
