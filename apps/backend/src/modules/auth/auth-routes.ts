import crypto from "node:crypto";
import { type Request, Router } from "express";
import { apiRoutes, googleLoginBodySchema } from "@synosec/contracts";
import { type AuthConfig } from "@/modules/auth/auth-config.js";
import { buildAuthSessionPayload, assertEnabledAuthConfig } from "@/modules/auth/auth-middleware.js";
import { clearSessionCookie, parseCookies, setSessionCookie } from "@/modules/auth/auth-cookies.js";
import { createOpaqueToken, hashToken, normalizeEmail } from "@/modules/auth/auth-crypto.js";
import { verifyGoogleIdToken } from "@/modules/auth/google-id-token.js";
import { authRepository } from "@/modules/auth/auth-repository.js";
import { RequestError } from "@/shared/http/request-error.js";

function parseRedirectTarget(rawRedirectTo: unknown) {
  if (rawRedirectTo === undefined) {
    return "/applications";
  }

  if (typeof rawRedirectTo !== "string" || !rawRedirectTo.startsWith("/") || rawRedirectTo.startsWith("//")) {
    throw new RequestError(400, "redirectTo must be an absolute in-app path.");
  }

  return rawRedirectTo;
}

function readGoogleCredential(request: Request) {
  if (request.is("application/json")) {
    return googleLoginBodySchema.parse(request.body).idToken;
  }

  const credential = request.body?.credential;
  if (typeof credential !== "string" || credential.length === 0) {
    throw new RequestError(400, "Google sign-in did not include a credential.");
  }

  const csrfCookie = parseCookies(request.header("cookie"))["g_csrf_token"];
  const csrfBody = request.body?.g_csrf_token;

  if (typeof csrfCookie !== "string" || typeof csrfBody !== "string" || csrfCookie !== csrfBody) {
    throw new RequestError(400, "Google sign-in CSRF validation failed.");
  }

  return credential;
}

export function createAuthRouter(config: AuthConfig): Router {
  const router = Router();

  router.get(apiRoutes.authSession, (request, response) => {
    response.json(buildAuthSessionPayload(request));
  });

  router.post(apiRoutes.authGoogleLogin, async (request, response, next) => {
    try {
      const enabledConfig = assertEnabledAuthConfig(config);
      if (!enabledConfig.googleEnabled) {
        throw new RequestError(404, "Google sign-in is not enabled.");
      }
      const idToken = readGoogleCredential(request);
      const googleUser = await verifyGoogleIdToken(idToken, enabledConfig.googleClientId);
      const normalizedEmail = normalizeEmail(googleUser.email);

      if (!enabledConfig.allowedEmails.includes(normalizedEmail)) {
        throw new RequestError(403, "This Google account is not allowed to access SynoSec.");
      }

      const user = await authRepository.upsertUser({
        email: normalizedEmail,
        googleSubject: googleUser.subject,
        displayName: googleUser.displayName,
        avatarUrl: googleUser.avatarUrl
      });

      const sessionToken = createOpaqueToken();
      const expiresAt = new Date(Date.now() + enabledConfig.sessionTtlHours * 60 * 60 * 1000);

      await authRepository.createSession({
        sessionId: crypto.randomUUID(),
        sessionTokenHash: hashToken(sessionToken, enabledConfig.sessionSecret),
        csrfToken: createOpaqueToken(),
        userId: user.id,
        expiresAt
      });

      setSessionCookie(response, sessionToken, enabledConfig, expiresAt);

      if (request.is("application/json")) {
        response.status(204).send();
        return;
      }

      response.redirect(303, parseRedirectTarget(request.query["redirectTo"]));
    } catch (error) {
      next(error);
    }
  });

  router.post(apiRoutes.authLogout, async (request, response, next) => {
    try {
      if (!request.auth?.config.authEnabled) {
        response.status(204).send();
        return;
      }

      if (!request.auth.session) {
        response.status(204).send();
        return;
      }

      const csrfToken = request.header("x-csrf-token");
      if (!csrfToken || csrfToken !== request.auth.session.csrfToken) {
        throw new RequestError(403, "A valid CSRF token is required for this request.");
      }

      await authRepository.revokeSession(request.auth.session.id);
      clearSessionCookie(response, request.auth.config);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
