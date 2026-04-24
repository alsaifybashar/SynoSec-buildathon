import { apiRoutes } from "@synosec/contracts";
import { type NextFunction, type Request, type Response } from "express";
import { type RateLimitConfig, type RateLimitPolicy } from "@/shared/config/backend-env.js";
import { RequestError } from "@/shared/http/request-error.js";

type RateLimitSurface = "health" | "auth" | "connector" | "api";

type CounterEntry = {
  count: number;
  resetAt: number;
};

const authRoutes = new Set<string>([
  apiRoutes.authSession,
  apiRoutes.authGoogleLogin,
  apiRoutes.authLogout
]);

function classifySurface(request: Request): RateLimitSurface | null {
  const path = request.path;
  if (path === apiRoutes.health) {
    return "health";
  }
  if (authRoutes.has(path)) {
    return "auth";
  }
  if (path.startsWith("/api/connectors")) {
    return "connector";
  }
  if (path.startsWith("/api")) {
    return "api";
  }

  return null;
}

function getPolicy(config: RateLimitConfig, surface: RateLimitSurface): RateLimitPolicy {
  return config[surface];
}

function getIpKey(request: Request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

function getRateLimitKey(request: Request, surface: RateLimitSurface) {
  if (surface === "api" && request.auth?.user?.id) {
    return `${surface}:user:${request.auth.user.id}`;
  }

  return `${surface}:ip:${getIpKey(request)}`;
}

function getResetSeconds(resetAt: number, now: number) {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  if (!config.enabled) {
    return (_request: Request, _response: Response, next: NextFunction) => {
      next();
    };
  }

  const counters = new Map<string, CounterEntry>();
  let nextCleanupAt = 0;

  return (request: Request, response: Response, next: NextFunction) => {
    const surface = classifySurface(request);
    if (!surface) {
      next();
      return;
    }

    const now = Date.now();
    if (now >= nextCleanupAt) {
      for (const [key, entry] of counters.entries()) {
        if (entry.resetAt <= now) {
          counters.delete(key);
        }
      }
      nextCleanupAt = now + config.cleanupIntervalMs;
    }

    const policy = getPolicy(config, surface);
    const key = getRateLimitKey(request, surface);
    const currentEntry = counters.get(key);
    const entry =
      currentEntry && currentEntry.resetAt > now
        ? currentEntry
        : {
            count: 0,
            resetAt: now + policy.windowMs
          };

    entry.count += 1;
    counters.set(key, entry);

    const resetSeconds = getResetSeconds(entry.resetAt, now);
    const remaining = Math.max(policy.max - entry.count, 0);

    response.setHeader("RateLimit-Limit", String(policy.max));
    response.setHeader("RateLimit-Remaining", String(remaining));
    response.setHeader("RateLimit-Reset", String(resetSeconds));

    if (entry.count > policy.max) {
      response.setHeader("Retry-After", String(resetSeconds));
      next(new RequestError(
        429,
        `Rate limit exceeded for ${surface} requests.`,
        {
          code: "RATE_LIMITED",
          userFriendlyMessage: "Too many requests. Try again shortly."
        }
      ));
      return;
    }

    next();
  };
}
