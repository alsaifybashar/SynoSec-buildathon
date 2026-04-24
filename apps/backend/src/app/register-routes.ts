import { type Express } from "express";
import { type AuthConfig } from "@/features/auth/auth-config.js";
import { requireAuthenticatedApi, requireCsrfProtection } from "@/features/auth/auth-middleware.js";
import { createAuthRouter } from "@/features/auth/auth-routes.js";
import { registerHealthRoutes } from "@/features/health/health.routes.js";
import { registerApplicationsRoutes } from "@/features/applications/applications.routes.js";
import { type ApplicationsRepository } from "@/features/applications/applications.repository.js";
import { registerRuntimesRoutes } from "@/features/runtimes/runtimes.routes.js";
import { type RuntimesRepository } from "@/features/runtimes/runtimes.repository.js";
import { registerAiProvidersRoutes } from "@/features/ai-providers/ai-providers.routes.js";
import { type AiProvidersRepository } from "@/features/ai-providers/ai-providers.repository.js";
import { registerAiAgentsRoutes } from "@/features/ai-agents/ai-agents.routes.js";
import { type AiAgentsRepository } from "@/features/ai-agents/ai-agents.repository.js";
import { registerAiToolsRoutes } from "@/features/ai-tools/ai-tools.routes.js";
import { type AiToolsRepository } from "@/features/ai-tools/ai-tools.repository.js";
import { registerWorkflowsRoutes } from "@/features/workflows/workflows.routes.js";
import { type WorkflowsRepository } from "@/features/workflows/workflows.repository.js";
import { createToolsRouter } from "@/features/ai-tools/runtime/tools.routes.js";
import { createConnectorsRouter } from "@/integrations/connectors/routes.js";
import { registerOrchestratorRoutes } from "@/features/orchestrator/orchestrator.routes.js";
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
  registerWorkflowsRoutes(app, dependencies.workflowsRepository, routeServices.workflowExecutionService, routeServices.workflowRunStream);
  registerOrchestratorRoutes(app, routeServices.orchestratorService, routeServices.orchestratorStream);
  app.use(createToolsRouter());
}
