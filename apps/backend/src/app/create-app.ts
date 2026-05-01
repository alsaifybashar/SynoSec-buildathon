import cors from "cors";
import express, { type Express } from "express";
import { apiRoutes } from "@synosec/contracts";
import { loadRateLimitConfig } from "@/shared/config/backend-env.js";
import { applySecurityHeaders } from "@/shared/http/security-headers.js";
import { createRateLimitMiddleware } from "@/shared/http/rate-limit.js";
import { RequestError } from "@/shared/http/request-error.js";
import { attachAuthContext, loadAuthConfig } from "@/modules/auth/index.js";
import { createErrorHandler } from "@/shared/http/error-handler.js";
import { createRequestLogger, shouldEnableRequestLogging } from "@/shared/http/request-logger.js";
import { registerRoutes } from "@/app/register-routes.js";
import type { ExecutionConstraintsRepository } from "@/modules/execution-constraints/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { TargetsRepository } from "@/modules/targets/index.js";
import type { WorkflowsRepository } from "@/modules/workflows/index.js";

export type AppDependencies = {
  targetsRepository: TargetsRepository;
  executionConstraintsRepository: ExecutionConstraintsRepository;
  aiToolsRepository: AiToolsRepository;
  workflowsRepository: WorkflowsRepository;
};

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

export function createApp(options: AppDependencies): Express {
  const app = express();
  const authConfig = loadAuthConfig();

  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(applySecurityHeaders);
  if (shouldEnableRequestLogging()) {
    app.use(createRequestLogger());
  }
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
