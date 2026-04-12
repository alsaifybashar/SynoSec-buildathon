import { type Express } from "express";
import { registerBriefRoutes } from "../modules/brief/brief.routes.js";
import { registerDemoRoutes } from "../modules/demo/demo.routes.js";
import { registerHealthRoutes } from "../modules/health/health.routes.js";
import { registerApplicationsRoutes } from "../modules/applications/applications.routes.js";
import { type ApplicationsRepository } from "../modules/applications/applications.repository.js";

export function registerRoutes(app: Express, dependencies: { applicationsRepository: ApplicationsRepository }) {
  registerHealthRoutes(app);
  registerDemoRoutes(app);
  registerBriefRoutes(app);
  registerApplicationsRoutes(app, dependencies.applicationsRepository);
}
