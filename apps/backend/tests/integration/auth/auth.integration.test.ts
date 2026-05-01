import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpressAuth } from "@auth/express";
import { apiRoutes } from "@synosec/contracts";
import { createApp } from "@/app/create-app.js";
import { applySecurityHeaders } from "@/shared/http/security-headers.js";
import { createExpressAuthConfig, createAuthRouter, loadAuthConfig } from "@/modules/auth/index.js";
import { authRepository } from "@/modules/auth/auth-repository.js";
import { attachAuthContext, requireAuthenticatedApi, requireCsrfProtection } from "@/modules/auth/auth-middleware.js";
import { verifyGoogleIdToken } from "@/modules/auth/google-id-token.js";
import { registerHealthRoutes } from "@/modules/health/index.js";
import { createConnectorsRouter } from "@/integrations/connectors/routes.js";
import { createErrorHandler } from "@/shared/http/error-handler.js";

vi.mock("@/modules/auth/auth-repository.js", () => ({
  authRepository: {
    upsertUser: vi.fn(),
    createSession: vi.fn(),
    findSessionByHash: vi.fn(),
    touchSession: vi.fn(),
    revokeSession: vi.fn()
  }
}));

vi.mock("@/modules/auth/google-id-token.js", () => ({
  verifyGoogleIdToken: vi.fn()
}));

function setAuthEnv(enabled: boolean) {
  process.env["BACKEND_ENV"] = "development";
  process.env["ANTHROPIC_API_KEY"] = "test-anthropic-key";
  process.env["AUTH_ENABLED"] = enabled ? "true" : "false";
  process.env["AUTH_GOOGLE_ENABLED"] = "true";
  process.env["AUTH_GOOGLE_CLIENT_ID"] = "google-client-id";
  process.env["AUTH_ALLOWED_EMAILS"] = "allowed@example.com";
  process.env["AUTH_SESSION_SECRET"] = "12345678901234567890123456789012";
  process.env["AUTH_COOKIE_NAME"] = "synosec_session";
  process.env["AUTH_COOKIE_SECURE"] = "false";
  process.env["AUTH_SESSION_TTL_HOURS"] = "24";
  process.env["AUTH_SESSION_TOUCH_INTERVAL_SECONDS"] = "600";
  process.env["FRONTEND_URL"] = "http://localhost:5173";
}

function createTestApp() {
  const app = express();
  const config = loadAuthConfig();
  const expressAuthConfig = createExpressAuthConfig(config);

  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(applySecurityHeaders);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(async (req, res, next) => {
    try {
      await attachAuthContext(req, res, config);
      next();
    } catch (error) {
      next(error);
    }
  });

  if (expressAuthConfig) {
    app.use(/^\/auth(.*)/, ExpressAuth(expressAuthConfig));
  }

  registerHealthRoutes(app);
  app.use(createAuthRouter());
  app.use(createConnectorsRouter());
  app.use("/api", requireAuthenticatedApi, requireCsrfProtection);

  app.get("/api/protected", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/protected", (_req, res) => {
    res.status(201).json({ ok: true });
  });

  app.use(createErrorHandler());
  return app;
}

async function signInWithGoogleIdToken(agent: request.SuperAgentTest, idToken = "google-id-token", callbackUrl = "/targets") {
  const csrfResponse = await agent
    .get("/auth/csrf")
    .expect(200);

  const csrfToken = csrfResponse.body?.csrfToken;
  expect(typeof csrfToken).toBe("string");

  return agent
    .post("/auth/callback/google-id-token")
    .type("form")
    .send({
      csrfToken,
      callbackUrl,
      idToken
    });
}

describe("auth integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthEnv(false);
    process.env["CONNECTOR_SHARED_TOKEN"] = "connector-secret";
    vi.mocked(authRepository.upsertUser).mockResolvedValue({
      id: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
      email: "allowed@example.com",
      googleSubject: "google-subject",
      displayName: "Allowed User",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      subject: "google-subject",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: "https://example.com/avatar.png"
    });
  });

  it("keeps protected routes open when auth is disabled", async () => {
    const app = createTestApp();

    await request(app).get("/api/protected").expect(200, { ok: true });
  });

  it("keeps health public and protects application APIs when auth is enabled", async () => {
    setAuthEnv(true);
    const app = createTestApp();

    await request(app).get(apiRoutes.health).expect(200);
    await request(app).get("/api/protected").expect(401);
  });

  it("creates an authenticated Auth.js session from a verified Google ID token", async () => {
    setAuthEnv(true);
    const app = createTestApp();
    const agent = request.agent(app);

    const signInResponse = await signInWithGoogleIdToken(agent);
    expect(signInResponse.status).toBeGreaterThanOrEqual(300);
    expect(signInResponse.status).toBeLessThan(400);
    expect(signInResponse.headers["set-cookie"]?.join(";")).toContain("synosec_session=");
    expect(verifyGoogleIdToken).toHaveBeenCalledWith("google-id-token", "google-client-id");
    expect(authRepository.upsertUser).toHaveBeenCalled();

    const sessionResponse = await agent
      .get(apiRoutes.authSession)
      .expect(200);

    expect(sessionResponse.body).toMatchObject({
      authEnabled: true,
      authenticated: true,
      googleClientId: "google-client-id",
      user: {
        id: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
        email: "allowed@example.com",
        displayName: "Allowed User"
      }
    });

    await agent.get("/api/protected").expect(200, { ok: true });
    await agent.post("/api/protected").expect(201, { ok: true });
  });

  it("rejects non-allowlisted users during Auth.js sign-in", async () => {
    setAuthEnv(true);
    process.env["AUTH_ALLOWED_EMAILS"] = "different@example.com";
    const app = createTestApp();
    const agent = request.agent(app);

    const response = await signInWithGoogleIdToken(agent);
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(authRepository.upsertUser).not.toHaveBeenCalled();

    const sessionResponse = await agent
      .get(apiRoutes.authSession)
      .expect(200);

    expect(sessionResponse.body).toMatchObject({
      authEnabled: true,
      authenticated: false,
      user: null
    });
  });

  it("defaults auth cookies to Secure in production when AUTH_COOKIE_SECURE is unset", async () => {
    setAuthEnv(true);
    process.env["BACKEND_ENV"] = "production";
    delete process.env["AUTH_COOKIE_SECURE"];
    const app = createTestApp();
    const agent = request.agent(app);

    const response = await signInWithGoogleIdToken(agent);
    expect(response.headers["set-cookie"]?.join(";")).toContain("Secure");
  });

  it("applies default security headers and suppresses framework leakage", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get(apiRoutes.health)
      .expect(200);

    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'"
    );
    expect(response.headers["strict-transport-security"]).toBeUndefined();
    expect(response.headers["permissions-policy"]).toBe(
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
    );
  });

  it("rejects disallowed origins with hardened headers intact", async () => {
    const app = createApp({
      targetsRepository: {} as never,
      executionConstraintsRepository: {} as never,
      aiToolsRepository: {} as never,
      workflowsRepository: {} as never
    });

    const response = await request(app)
      .get(apiRoutes.health)
      .set("Origin", "http://evil.test")
      .expect(403);

    expect(response.body).toEqual({
      code: "ORIGIN_NOT_ALLOWED",
      message: "Origin http://evil.test is not allowed."
    });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'"
    );
  });

  it("keeps connector bearer auth separate from user session auth", async () => {
    setAuthEnv(true);
    const app = createTestApp();

    await request(app)
      .get(apiRoutes.connectorStatus)
      .set("Authorization", "Bearer connector-secret")
      .expect(200);
  });
});
