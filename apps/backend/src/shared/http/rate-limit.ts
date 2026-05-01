import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { apiRoutes } from "@synosec/contracts";
import { type NextFunction, type Request, type Response } from "express";
import { type RateLimitConfig, type RateLimitPolicy } from "@/shared/config/backend-env.js";
import { RequestError } from "@/shared/http/request-error.js";

function isEventStreamRequest(request: Request) {
  const accept = request.header("accept");
  return typeof accept === "string" && accept.includes("text/event-stream");
}

function getIpKey(request: Request) {
  return ipKeyGenerator(request.ip || request.socket.remoteAddress || "unknown");
}

function buildRateLimitHandler(surface: string) {
  return (_request: Request, _response: Response, next: NextFunction, _options: unknown) => {
    next(new RequestError(
      429,
      `Rate limit exceeded for ${surface} requests.`,
      {
        code: "RATE_LIMITED",
        userFriendlyMessage: "Too many requests. Try again shortly."
      }
    ));
  };
}

function createLimiter(
  surface: "health" | "auth" | "connector" | "api",
  policy: RateLimitPolicy,
  keyGenerator: (request: Request) => string,
  skip?: (request: Request) => boolean
) {
  return rateLimit({
    windowMs: policy.windowMs,
    limit: policy.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    ...(skip ? { skip } : {}),
    handler: buildRateLimitHandler(surface)
  });
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  if (!config.enabled) {
    return (_request: Request, _response: Response, next: NextFunction) => {
      next();
    };
  }

  const healthLimiter = createLimiter("health", config.health, getIpKey);
  const authLimiter = createLimiter("auth", config.auth, getIpKey);
  const connectorLimiter = createLimiter("connector", config.connector, getIpKey);
  const apiLimiter = createLimiter(
    "api",
    config.api,
    (request) => request.auth?.user?.id ?? getIpKey(request),
    (request) => isEventStreamRequest(request) || /^\/api\/workflow-runs\/[^/]+\/events$/.test(request.path)
  );

  return (request: Request, response: Response, next: NextFunction) => {
    if (request.path === apiRoutes.health) {
      healthLimiter(request, response, next);
      return;
    }

    if (request.path.startsWith("/auth") || request.path.startsWith("/api/auth")) {
      authLimiter(request, response, next);
      return;
    }

    if (request.path.startsWith("/api/connectors")) {
      connectorLimiter(request, response, next);
      return;
    }

    if (request.path.startsWith("/api")) {
      apiLimiter(request, response, next);
      return;
    }

    next();
  };
}
