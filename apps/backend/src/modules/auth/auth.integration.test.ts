import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRoutes } from "@synosec/contracts";
import { createApp } from "@/app/create-app.js";
import { applySecurityHeaders } from "@/shared/http/security-headers.js";
import { createAuthRouter, loadAuthConfig } from "@/modules/auth/index.js";
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

  app.disable("x-powered-by");
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

  registerHealthRoutes(app);
  app.use(createAuthRouter(config));
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

describe("auth integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    setAuthEnv(false);
    process.env["CONNECTOR_SHARED_TOKEN"] = "connector-secret";
    vi.mocked(authRepository.findSessionByHash).mockResolvedValue(null);
    vi.mocked(authRepository.touchSession).mockResolvedValue({} as never);
    vi.mocked(authRepository.upsertUser).mockResolvedValue({
      id: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
      email: "allowed@example.com",
      googleSubject: "google-subject",
      displayName: "Allowed User",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    vi.mocked(authRepository.createSession).mockResolvedValue({
      id: "0eb7776b-1e13-4fe3-b594-6a3f73c5b3d4",
      sessionTokenHash: "hash",
      csrfToken: "csrf-token",
      userId: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
        email: "allowed@example.com",
        googleSubject: "google-subject",
        displayName: "Allowed User",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    vi.mocked(authRepository.revokeSession).mockResolvedValue({ count: 1 });
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

  it("requires a CSRF token for state-changing protected requests", async () => {
    setAuthEnv(true);
    vi.mocked(authRepository.findSessionByHash).mockResolvedValue({
      id: "0eb7776b-1e13-4fe3-b594-6a3f73c5b3d4",
      sessionTokenHash: "hash",
      csrfToken: "csrf-token",
      userId: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
        email: "allowed@example.com",
        googleSubject: "google-subject",
        displayName: "Allowed User",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    const app = createTestApp();

    await request(app)
      .post("/api/protected")
      .set("Cookie", "synosec_session=session-token")
      .expect(403);

    await request(app)
      .post("/api/protected")
      .set("Cookie", "synosec_session=session-token")
      .set("x-csrf-token", "csrf-token")
      .expect(201, { ok: true });
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

  it("adds HSTS for secure requests", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get(apiRoutes.health)
      .set("X-Forwarded-Proto", "https")
      .expect(200);

    expect(response.headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
  });

  it("keeps route-specific streaming headers intact", async () => {
    const app = createTestApp();

    app.get("/events", (_req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.status(200).end();
    });

    const response = await request(app)
      .get("/events")
      .expect(200);

    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.headers["cache-control"]).toBe("no-cache, no-transform");
    expect(response.headers["connection"]).toBe("keep-alive");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'"
    );
  });

  it("rejects disallowed origins with hardened headers intact", async () => {
    const app = createApp({
      targetsRepository: {} as never,
      executionConstraintsRepository: {} as never,
      aiAgentsRepository: {} as never,
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

  it("allows Google Identity Services redirect POSTs from accounts.google.com", async () => {
    setAuthEnv(true);
    const app = createTestApp();
    const response = await request(app)
      .post(`${apiRoutes.authGoogleLogin}?redirectTo=%2Ftargets`)
      .set("Origin", "https://accounts.google.com")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("Cookie", "g_csrf_token=csrf-value")
      .send("credential=google-id-token&g_csrf_token=csrf-value")
      .expect(303);

    expect(response.headers["location"]).toBe("/targets");
    expect(response.headers["set-cookie"]?.join(";")).toContain("synosec_session=");
  });

  it("allows Google Identity Services redirect POSTs when the browser sends Origin null", async () => {
    setAuthEnv(true);
    const app = createTestApp();
    const response = await request(app)
      .post(`${apiRoutes.authGoogleLogin}?redirectTo=%2Ftargets`)
      .set("Origin", "null")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("Cookie", "g_csrf_token=csrf-value")
      .send("credential=google-id-token&g_csrf_token=csrf-value")
      .expect(303);

    expect(response.headers["location"]).toBe("/targets");
    expect(response.headers["set-cookie"]?.join(";")).toContain("synosec_session=");
  });

  it("revokes existing sessions immediately when the user is no longer allowlisted", async () => {
    setAuthEnv(true);
    process.env["AUTH_ALLOWED_EMAILS"] = "different@example.com";
    vi.mocked(authRepository.findSessionByHash).mockResolvedValue({
      id: "0eb7776b-1e13-4fe3-b594-6a3f73c5b3d4",
      sessionTokenHash: "hash",
      csrfToken: "csrf-token",
      userId: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
        email: "allowed@example.com",
        googleSubject: "google-subject",
        displayName: "Allowed User",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const app = createTestApp();
    const response = await request(app)
      .get("/api/protected")
      .set("Cookie", "synosec_session=session-token")
      .expect(401);

    expect(response.headers["set-cookie"]?.join(";")).toContain("synosec_session=");
    expect(authRepository.revokeSession).toHaveBeenCalledWith("0eb7776b-1e13-4fe3-b594-6a3f73c5b3d4");
    expect(authRepository.touchSession).not.toHaveBeenCalled();
  });

  it("does not touch sessions inside the throttle window", async () => {
    setAuthEnv(true);
    vi.mocked(authRepository.findSessionByHash).mockResolvedValue({
      id: "0eb7776b-1e13-4fe3-b594-6a3f73c5b3d4",
      sessionTokenHash: "hash",
      csrfToken: "csrf-token",
      userId: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
        email: "allowed@example.com",
        googleSubject: "google-subject",
        displayName: "Allowed User",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const app = createTestApp();
    await request(app)
      .get("/api/protected")
      .set("Cookie", "synosec_session=session-token")
      .expect(200, { ok: true });

    expect(authRepository.touchSession).not.toHaveBeenCalled();
  });

  it("touches sessions after the throttle window passes", async () => {
    setAuthEnv(true);
    vi.mocked(authRepository.findSessionByHash).mockResolvedValue({
      id: "0eb7776b-1e13-4fe3-b594-6a3f73c5b3d4",
      sessionTokenHash: "hash",
      csrfToken: "csrf-token",
      userId: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(Date.now() - 20 * 60_000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: "9a6d8811-c674-4e0a-9331-07d9ab96861b",
        email: "allowed@example.com",
        googleSubject: "google-subject",
        displayName: "Allowed User",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const app = createTestApp();
    await request(app)
      .get("/api/protected")
      .set("Cookie", "synosec_session=session-token")
      .expect(200, { ok: true });

    expect(authRepository.touchSession).toHaveBeenCalledWith("0eb7776b-1e13-4fe3-b594-6a3f73c5b3d4");
  });

  it("keeps connector bearer auth separate from session auth", async () => {
    setAuthEnv(true);
    const app = createTestApp();

    await request(app)
      .get(apiRoutes.connectorStatus)
      .set("Authorization", "Bearer connector-secret")
      .expect(200);
  });

  it("creates a session cookie from a verified Google ID token for allowlisted users", async () => {
    setAuthEnv(true);
    const app = createTestApp();
    const response = await request(app)
      .post(apiRoutes.authGoogleLogin)
      .send({ idToken: "google-id-token" })
      .expect(204);

    expect(response.headers["set-cookie"]?.join(";")).toContain("synosec_session=");
    expect(verifyGoogleIdToken).toHaveBeenCalledWith("google-id-token", "google-client-id");
    expect(authRepository.createSession).toHaveBeenCalled();
  });

  it("accepts Google redirect POSTs, creates a session, and redirects to the requested app path", async () => {
    setAuthEnv(true);
    const app = createTestApp();
    const response = await request(app)
      .post(`${apiRoutes.authGoogleLogin}?redirectTo=%2Fai-agents`)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("Cookie", "g_csrf_token=csrf-value")
      .send("credential=google-id-token&g_csrf_token=csrf-value")
      .expect(303);

    expect(response.headers["location"]).toBe("/ai-agents");
    expect(response.headers["set-cookie"]?.join(";")).toContain("synosec_session=");
    expect(verifyGoogleIdToken).toHaveBeenCalledWith("google-id-token", "google-client-id");
    expect(authRepository.createSession).toHaveBeenCalled();
  });

  it("rejects Google redirect POSTs when the requested redirect path is unsafe", async () => {
    setAuthEnv(true);
    const app = createTestApp();

    await request(app)
      .post(`${apiRoutes.authGoogleLogin}?redirectTo=https://evil.test`)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("Cookie", "g_csrf_token=csrf-value")
      .send("credential=google-id-token&g_csrf_token=csrf-value")
      .expect(400, {
        code: "REQUEST_ERROR",
        message: "redirectTo must be an absolute in-app path."
      });
  });

  it("defaults auth cookies to Secure in production when AUTH_COOKIE_SECURE is unset", async () => {
    setAuthEnv(true);
    process.env["BACKEND_ENV"] = "production";
    delete process.env["AUTH_COOKIE_SECURE"];
    const app = createTestApp();
    const response = await request(app)
      .post(apiRoutes.authGoogleLogin)
      .send({ idToken: "google-id-token" })
      .expect(204);

    expect(response.headers["set-cookie"]?.join(";")).toContain("Secure");
  });
});
