import { type NextFunction, type Request, type Response } from "express";
import { authSessionResponseSchema } from "@synosec/contracts";
import { type AuthConfig, type EnabledAuthConfig } from "@/features/auth/auth-config.js";
import { clearSessionCookie, parseCookies } from "@/features/auth/auth-cookies.js";
import { hashToken, normalizeEmail } from "@/features/auth/auth-crypto.js";
import { authRepository } from "@/features/auth/auth-repository.js";
import { RequestError } from "@/shared/http/request-error.js";

function isSafeMethod(method: string) {
  return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function toAuthenticatedUser(session: NonNullable<Awaited<ReturnType<typeof authRepository.findSessionByHash>>>) {
  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    avatarUrl: session.user.avatarUrl
  };
}

export async function attachAuthContext(request: Request, response: Response, config: AuthConfig) {
  request.auth = {
    config,
    session: null,
    user: null
  };

  if (!config.authEnabled) {
    return;
  }

  const cookies = parseCookies(request.header("cookie"));
  const sessionToken = cookies[config.cookieName];
  if (!sessionToken) {
    return;
  }

  const session = await authRepository.findSessionByHash(hashToken(sessionToken, config.sessionSecret));
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    clearSessionCookie(response, config);
    return;
  }

  if (!config.allowedEmails.includes(normalizeEmail(session.user.email))) {
    await authRepository.revokeSession(session.id);
    clearSessionCookie(response, config);
    return;
  }

  request.auth = {
    config,
    session,
    user: toAuthenticatedUser(session)
  };

  const touchIntervalMs = config.sessionTouchIntervalSeconds * 1000;
  const lastSeenAtMs = session.lastSeenAt.getTime();
  if (touchIntervalMs === 0 || Date.now() - lastSeenAtMs >= touchIntervalMs) {
    await authRepository.touchSession(session.id);
  }
}

export function requireAuthenticatedApi(request: Request, _response: Response, next: NextFunction) {
  if (!request.auth?.config.authEnabled) {
    next();
    return;
  }

  if (!request.auth.user || !request.auth.session) {
    next(new RequestError(401, "Authentication is required for this request."));
    return;
  }

  next();
}

export function requireCsrfProtection(request: Request, _response: Response, next: NextFunction) {
  if (!request.auth?.config.authEnabled || isSafeMethod(request.method)) {
    next();
    return;
  }

  if (!request.auth.session) {
    next(new RequestError(401, "Authentication is required for this request."));
    return;
  }

  const providedToken = request.header("x-csrf-token");
  if (!providedToken || providedToken !== request.auth.session.csrfToken) {
    next(new RequestError(403, "A valid CSRF token is required for this request."));
    return;
  }

  next();
}

export function buildAuthSessionPayload(request: Request) {
  const googleClientId =
    request.auth?.config.authEnabled && request.auth.config.googleEnabled
      ? request.auth.config.googleClientId
      : null;

  return authSessionResponseSchema.parse({
    authEnabled: request.auth?.config.authEnabled ?? false,
    authenticated: Boolean(request.auth?.user),
    csrfToken: request.auth?.session?.csrfToken ?? null,
    googleClientId,
    user: request.auth?.user ?? null
  });
}

export function assertEnabledAuthConfig(config: AuthConfig): EnabledAuthConfig {
  if (!config.authEnabled) {
    throw new RequestError(404, "Authentication is not enabled.");
  }

  return config;
}
