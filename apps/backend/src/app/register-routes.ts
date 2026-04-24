import { type Express } from "express";
import {
  createAuthRouter,
  requireAuthenticatedApi,
  requireCsrfProtection,
  type AuthConfig
} from "@/features/auth/index.js";
import { registerHealthRoutes } from "@/features/health/index.js";
import { registerApplicationsRoutes, type ApplicationsRepository } from "@/features/applications/index.js";
import { registerRuntimesRoutes, type RuntimesRepository } from "@/features/runtimes/index.js";
import { registerAiProvidersRoutes, type AiProvidersRepository } from "@/features/ai-providers/index.js";
import { registerAiAgentsRoutes, type AiAgentsRepository } from "@/features/ai-agents/index.js";
import { registerAiToolsRoutes, type AiToolsRepository } from "@/features/ai-tools/index.js";
import { registerWorkflowsRoutes, type WorkflowsRepository } from "@/features/workflows/index.js";
import { createToolsRouter } from "@/execution-engine/tools/index.js";
import { createConnectorsRouter } from "@/integrations/connectors/routes.js";
import { registerOrchestratorRoutes } from "@/features/orchestrator/index.js";
import { createRouteServices } from "@/app/create-route-services.js";

export function registerRoutes(app: Express, dependencies: {
  authConfig: AuthConfig;
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  workflowsRepository: WorkflowsRepository;
}) {
  const routeServices = createRouteServices(dependencies);

  registerHealthRoutes(app);
  app.use(createAuthRouter(dependencies.authConfig));
  app.use(createConnectorsRouter());

  app.use("/api", requireAuthenticatedApi, requireCsrfProtection);

  registerApplicationsRoutes(app, dependencies.applicationsRepository);
  registerRuntimesRoutes(app, dependencies.runtimesRepository);
  registerAiProvidersRoutes(app, dependencies.aiProvidersRepository);
  registerAiAgentsRoutes(app, dependencies.aiAgentsRepository);
  registerAiToolsRoutes(app, dependencies.aiToolsRepository);
  registerWorkflowsRoutes(
    app,
    dependencies.workflowsRepository,
    routeServices.workflowExecutionEngine,
    routeServices.workflowRunEventStream,
    routeServices.workflowRunArtifactsService
  );
  registerOrchestratorRoutes(app, routeServices.orchestratorExecutionEngine, routeServices.orchestratorEventStream);
  app.use(createToolsRouter());
}
