import { type Express } from "express";
import { type AuthConfig } from "@/modules/auth/auth-config.js";
import { requireAuthenticatedApi, requireCsrfProtection } from "@/modules/auth/auth-middleware.js";
import { createAuthRouter } from "@/modules/auth/auth-routes.js";
import { registerHealthRoutes } from "@/modules/health/health.routes.js";
import { registerApplicationsRoutes } from "@/features/modules/applications/applications.routes.js";
import { type ApplicationsRepository } from "@/features/modules/applications/applications.repository.js";
import { registerRuntimesRoutes } from "@/features/modules/runtimes/runtimes.routes.js";
import { type RuntimesRepository } from "@/features/modules/runtimes/runtimes.repository.js";
import { registerAiProvidersRoutes } from "@/features/modules/ai-providers/ai-providers.routes.js";
import { type AiProvidersRepository } from "@/features/modules/ai-providers/ai-providers.repository.js";
import { registerAiAgentsRoutes } from "@/features/modules/ai-agents/ai-agents.routes.js";
import { type AiAgentsRepository } from "@/features/modules/ai-agents/ai-agents.repository.js";
import { registerAiToolsRoutes } from "@/features/modules/ai-tools/ai-tools.routes.js";
import { type AiToolsRepository } from "@/features/modules/ai-tools/ai-tools.repository.js";
import { registerScansRoutes } from "@/features/modules/scans/scans.routes.js";
import { SingleAgentScanService } from "@/features/modules/scans/single-agent-scan.service.js";
import { registerWorkflowsRoutes } from "@/features/modules/workflows/workflows.routes.js";
import { WorkflowExecutionService } from "@/features/modules/workflows/workflow-execution.service.js";
import { type WorkflowsRepository } from "@/features/modules/workflows/workflows.repository.js";
import { WorkflowRunStream } from "@/features/modules/workflows/workflow-run-stream.js";
import { createToolsRouter } from "@/platform/routes/tools.js";
import { createConnectorsRouter } from "@/integrations/connectors/routes.js";

export function registerRoutes(app: Express, dependencies: {
  authConfig: AuthConfig;
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  workflowsRepository: WorkflowsRepository;
}) {
  const workflowRunStream = new WorkflowRunStream();
  const singleAgentScanService = new SingleAgentScanService(
    dependencies.applicationsRepository,
    dependencies.runtimesRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository
  );
  const workflowExecutionService = new WorkflowExecutionService(
    dependencies.workflowsRepository,
    dependencies.applicationsRepository,
    dependencies.runtimesRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository,
    workflowRunStream,
    singleAgentScanService
  );

  registerHealthRoutes(app);
  app.use(createAuthRouter(dependencies.authConfig));
  app.use(createConnectorsRouter());

  app.use("/api", requireAuthenticatedApi, requireCsrfProtection);

  registerApplicationsRoutes(app, dependencies.applicationsRepository);
  registerRuntimesRoutes(app, dependencies.runtimesRepository);
  registerAiProvidersRoutes(app, dependencies.aiProvidersRepository);
  registerAiAgentsRoutes(app, dependencies.aiAgentsRepository);
  registerAiToolsRoutes(app, dependencies.aiToolsRepository);
  registerScansRoutes(app, singleAgentScanService);
  registerWorkflowsRoutes(app, dependencies.workflowsRepository, workflowExecutionService, workflowRunStream);
  app.use(createToolsRouter());
}
