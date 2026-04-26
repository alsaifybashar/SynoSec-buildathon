import { apiRoutes, healthResponseSchema, type HealthResponse } from "@synosec/contracts";
import { type Express } from "express";
import { loadFixedAiRuntime } from "@/shared/config/fixed-ai-runtime.js";

export function registerHealthRoutes(app: Express) {
  app.get(apiRoutes.health, (_request, response) => {
    const runtime = loadFixedAiRuntime();
    const payload: HealthResponse = {
      status: "ok",
      service: "synosec-backend",
      timestamp: new Date().toISOString(),
      runtime: {
        provider: runtime.provider,
        providerName: runtime.providerName,
        model: runtime.model,
        label: runtime.label
      }
    };

    response.json(healthResponseSchema.parse(payload));
  });
}
