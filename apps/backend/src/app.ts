import cors from "cors";
import express, { type Express } from "express";
import {
  apiRoutes,
  briefResponseSchema,
  healthResponseSchema,
  type BriefResponse,
  type HealthResponse,
  type WsEvent
} from "@synosec/contracts";
import { createScanRouter } from "./routes/scan.js";

function buildBriefResponse(): BriefResponse {
  return {
    headline: "Manual backend fetch completed.",
    actions: [
      "Enumerate reachable hosts before deeper probing.",
      "Re-run high-severity services with authenticated checks.",
      "Queue new nodes for depth-first traversal."
    ],
    generatedAt: new Date().toISOString()
  };
}

export function createApp(broadcast: (event: WsEvent) => void = () => {}): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get(apiRoutes.health, (_request, response) => {
    const payload: HealthResponse = {
      status: "ok",
      service: "synosec-backend",
      timestamp: new Date().toISOString()
    };

    response.json(healthResponseSchema.parse(payload));
  });

  app.get(apiRoutes.brief, (_request, response) => {
    response.json(briefResponseSchema.parse(buildBriefResponse()));
  });

  // Mount scan router with broadcast capability
  app.use(createScanRouter(broadcast));

  return app;
}
