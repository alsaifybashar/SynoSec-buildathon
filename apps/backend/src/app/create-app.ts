import cors from "cors";
import express, { type Express } from "express";
import { apiRoutes } from "@synosec/contracts";
import { loadRateLimitConfig } from "@/core/env/backend-env.js";
import { applySecurityHeaders } from "@/core/http/security-headers.js";
import { createRateLimitMiddleware } from "@/core/http/rate-limit.js";
import { RequestError } from "@/core/http/request-error.js";
import { loadAuthConfig } from "@/modules/auth/auth-config.js";
import { attachAuthContext } from "@/modules/auth/auth-middleware.js";
import { createErrorHandler } from "@/core/http/error-handler.js";
import { registerRoutes } from "@/app/register-routes.js";
import { type ApplicationsRepository } from "@/features/modules/applications/applications.repository.js";
import { type RuntimesRepository } from "@/features/modules/runtimes/runtimes.repository.js";
import { type AiProvidersRepository } from "@/features/modules/ai-providers/ai-providers.repository.js";
import { type AiAgentsRepository } from "@/features/modules/ai-agents/ai-agents.repository.js";
import { type AiToolsRepository } from "@/features/modules/ai-tools/ai-tools.repository.js";
import { type WorkflowsRepository } from "@/features/modules/workflows/workflows.repository.js";

function isAllowedRequestOrigin(origin: string, frontendUrl: string, path: string) {
  if (origin === frontendUrl) {
    return true;
  }

  // Google Identity Services redirect mode can send the credential POST with either
  // the Google origin or the opaque "null" origin on top-level navigation form posts.
  if (path === apiRoutes.authGoogleLogin && (origin === "https://accounts.google.com" || origin === "null")) {
      return true;
  }

  return false;
}

export function createApp(options: {
  applicationsRepository: ApplicationsRepository;
  runtimesRepository: RuntimesRepository;
  aiProvidersRepository: AiProvidersRepository;
  aiAgentsRepository: AiAgentsRepository;
  aiToolsRepository: AiToolsRepository;
  workflowsRepository: WorkflowsRepository;
}): Express {
  const app = express();
  const authConfig = loadAuthConfig();

  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(applySecurityHeaders);
  app.use((request, _response, next) => {
    const origin = request.headers.origin;
    if (!origin || isAllowedRequestOrigin(origin, authConfig.frontendUrl, request.path)) {
      next();
      return;
    }

    next(new RequestError(403, `Origin ${origin} is not allowed.`, "ORIGIN_NOT_ALLOWED"));
  });
  app.use(cors({
    origin: authConfig.frontendUrl,
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(async (request, response, next) => {
    try {
      await attachAuthContext(request, response, authConfig);
      next();
    } catch (error) {
      next(error);
    }
  });
  app.use(createRateLimitMiddleware(loadRateLimitConfig()));

  registerRoutes(app, {
    ...options,
    authConfig
  });
  app.use(createErrorHandler());

  return app;
}
