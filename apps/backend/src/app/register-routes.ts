import { type Express } from "express";
import { registerBriefRoutes } from "../modules/brief/brief.routes.js";
import { registerDemoRoutes } from "../modules/demo/demo.routes.js";
import { registerHealthRoutes } from "../modules/health/health.routes.js";
import { registerApplicationsRoutes } from "../modules/applications/applications.routes.js";
import { type ApplicationsRepository } from "../modules/applications/applications.repository.js";
import { createScanRouter } from "../routes/scan.js";
import type { WsEvent } from "@synosec/contracts";

export function registerRoutes(app: Express, dependencies: {
  applicationsRepository: ApplicationsRepository;
  broadcast?: (event: WsEvent) => void;
}) {
  registerHealthRoutes(app);
  registerDemoRoutes(app);
  registerBriefRoutes(app);
  registerApplicationsRoutes(app, dependencies.applicationsRepository);
  app.use(createScanRouter(dependencies.broadcast ?? (() => {})));
}
