import { type Express } from "express";
import { registerBriefRoutes } from "@/features/modules/brief/brief.routes.js";
import { registerDemoRoutes } from "@/features/modules/demo/demo.routes.js";
import { registerHealthRoutes } from "@/features/modules/health/health.routes.js";
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
import { createToolsRouter } from "@/platform/routes/tools.js";
import { createConnectorsRouter } from "@/integrations/connectors/routes.js";

export function registerRoutes(app: Express, dependencies: {
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
}) {
  registerHealthRoutes(app);
  registerDemoRoutes(app);
  registerBriefRoutes(app);
  registerApplicationsRoutes(app, dependencies.applicationsRepository);
  registerRuntimesRoutes(app, dependencies.runtimesRepository);
  registerAiProvidersRoutes(app, dependencies.aiProvidersRepository);
  registerAiAgentsRoutes(app, dependencies.aiAgentsRepository);
  registerAiToolsRoutes(app, dependencies.aiToolsRepository);
  app.use(createToolsRouter());
  app.use(createConnectorsRouter());
}
