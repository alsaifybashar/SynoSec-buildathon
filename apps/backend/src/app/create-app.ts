import cors from "cors";
import express, { type Express } from "express";
import { createErrorHandler } from "../core/http/error-handler.js";
import { registerRoutes } from "./register-routes.js";
import { type ApplicationsRepository } from "../modules/applications/applications.repository.js";
import { type RuntimesRepository } from "../modules/runtimes/runtimes.repository.js";
import { type WorkflowsRepository } from "../modules/workflows/workflows.repository.js";
import type { WsEvent } from "@synosec/contracts";

export function createApp(options: {
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  workflowsRepository: WorkflowsRepository;
  broadcast?: (event: WsEvent) => void;
}): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  registerRoutes(app, options);
  app.use(createErrorHandler());

  return app;
}
