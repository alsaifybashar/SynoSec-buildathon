import cors from "cors";
import express, { type Express } from "express";
import { createErrorHandler } from "@/platform/core/http/error-handler.js";
import { registerRoutes } from "@/platform/app/register-routes.js";
import { type ApplicationsRepository } from "@/features/modules/applications/applications.repository.js";
import { type RuntimesRepository } from "@/features/modules/runtimes/runtimes.repository.js";
import { type AiProvidersRepository } from "@/features/modules/ai-providers/ai-providers.repository.js";
import { type AiAgentsRepository } from "@/features/modules/ai-agents/ai-agents.repository.js";
import { type AiToolsRepository } from "@/features/modules/ai-tools/ai-tools.repository.js";
import { type WorkflowsRepository } from "@/features/modules/workflows/workflows.repository.js";

export function createApp(options: {
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  workflowsRepository: WorkflowsRepository;
}): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  registerRoutes(app, options);
  app.use(createErrorHandler());

  return app;
}
