import { type Express } from "express";
import {
  createAuthRouter,
  requireAuthenticatedApi,
  requireCsrfProtection,
  type AuthConfig
} from "@/modules/auth/index.js";
import { registerHealthRoutes } from "@/modules/health/index.js";
import { registerApplicationsRoutes, type ApplicationsRepository } from "@/modules/applications/index.js";
import { registerExecutionConstraintsRoutes, type ExecutionConstraintsRepository } from "@/modules/execution-constraints/index.js";
import { registerRuntimesRoutes, type RuntimesRepository } from "@/modules/runtimes/index.js";
import { registerAiProvidersRoutes, type AiProvidersRepository } from "@/modules/ai-providers/index.js";
import { registerAiAgentsRoutes, type AiAgentsRepository } from "@/modules/ai-agents/index.js";
import {
  registerAiToolCapabilityRoutes,
  registerAiToolsRoutes,
  type AiToolsRepository
} from "@/modules/ai-tools/index.js";
import { registerExecutionReportsRoutes } from "@/modules/execution-reports/index.js";
import { registerWorkflowsRoutes, type WorkflowsRepository } from "@/modules/workflows/index.js";
import { createConnectorsRouter } from "@/integrations/connectors/routes.js";
import { createRouteServices } from "@/app/create-route-services.js";
import { registerOrchestratorRoutes } from "@/engine/index.js";

export function registerRoutes(app: Express, dependencies: {
  authConfig: AuthConfig;
  applicationsRepository: ApplicationsRepository;
  executionConstraintsRepository: ExecutionConstraintsRepository;
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
  registerExecutionConstraintsRoutes(app, dependencies.executionConstraintsRepository);
  registerRuntimesRoutes(app, dependencies.runtimesRepository);
  registerAiProvidersRoutes(app, dependencies.aiProvidersRepository);
  registerAiAgentsRoutes(app, dependencies.aiAgentsRepository);
  registerAiToolsRoutes(app, dependencies.aiToolsRepository);
  registerAiToolCapabilityRoutes(app);
  registerExecutionReportsRoutes(app, routeServices.executionReportsService);
  registerWorkflowsRoutes(
    app,
    dependencies.workflowsRepository,
    routeServices.workflowExecutionEngine,
    routeServices.workflowRunEventStream,
    routeServices.workflowRunArtifactsService
  );
  registerOrchestratorRoutes(app, routeServices.orchestratorExecutionEngine, routeServices.orchestratorEventStream);
}
