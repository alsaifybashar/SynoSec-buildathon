import { type Express } from "express";
import { registerBriefRoutes } from "../modules/brief/brief.routes.js";
import { registerDemoRoutes } from "../modules/demo/demo.routes.js";
import { registerHealthRoutes } from "../modules/health/health.routes.js";
import { registerApplicationsRoutes } from "../modules/applications/applications.routes.js";
import { type ApplicationsRepository } from "../modules/applications/applications.repository.js";
import { registerRuntimesRoutes } from "../modules/runtimes/runtimes.routes.js";
import { type RuntimesRepository } from "../modules/runtimes/runtimes.repository.js";
import { registerWorkflowsRoutes } from "../modules/workflows/workflows.routes.js";
import { type WorkflowsRepository } from "../modules/workflows/workflows.repository.js";
import { createScanRouter } from "../routes/scan.js";
import type { WsEvent } from "@synosec/contracts";

export function registerRoutes(app: Express, dependencies: {
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  workflowsRepository: WorkflowsRepository;
  broadcast?: (event: WsEvent) => void;
}) {
  registerHealthRoutes(app);
  registerDemoRoutes(app);
  registerBriefRoutes(app);
  registerApplicationsRoutes(app, dependencies.applicationsRepository);
  registerRuntimesRoutes(app, dependencies.runtimesRepository);
  registerWorkflowsRoutes(app, dependencies.workflowsRepository);
  app.use(createScanRouter(dependencies.broadcast ?? (() => {})));
}
