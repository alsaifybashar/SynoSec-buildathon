import { getSession, type Session } from "@auth/express";
import { type NextFunction, type Request, type Response } from "express";
import { authSessionResponseSchema } from "@synosec/contracts";
import {
  type AuthConfig,
  type AuthenticatedSessionUser,
  type EnabledAuthConfig,
  createExpressAuthConfig
} from "@/modules/auth/auth-config.js";
import { normalizeEmail } from "@/modules/auth/auth-crypto.js";
import { RequestError } from "@/shared/http/request-error.js";

function isAllowlisted(config: EnabledAuthConfig, email: string) {
  return config.allowedEmails.includes(normalizeEmail(email));
}

function toAuthenticatedUser(session: Session): AuthenticatedSessionUser | null {
  const sessionUser = session.user;
  if (
    !sessionUser
    || typeof sessionUser.id !== "string"
    || typeof sessionUser.email !== "string"
  ) {
    return null;
  }

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    displayName: typeof sessionUser.name === "string" ? sessionUser.name : null,
    avatarUrl: typeof sessionUser.image === "string" ? sessionUser.image : null
  };
}

export async function attachAuthContext(request: Request, _response: Response, config: AuthConfig) {
  request.auth = {
    config,
    session: null,
    user: null
  };

  if (!config.authEnabled) {
    return;
  }

  const expressAuthConfig = createExpressAuthConfig(config);
  if (!expressAuthConfig) {
    return;
  }

  const session = await getSession(request, expressAuthConfig);
  if (!session) {
    return;
  }

  const user = toAuthenticatedUser(session);
  if (!user || !isAllowlisted(config, user.email)) {
    return;
  }

  request.auth = {
    config,
    session,
    user
  };
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

export function requireCsrfProtection(_request: Request, _response: Response, next: NextFunction) {
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
    csrfToken: null,
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
