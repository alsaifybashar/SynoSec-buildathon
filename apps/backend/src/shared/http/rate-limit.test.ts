import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createErrorHandler } from "@/shared/http/error-handler.js";
import { createRateLimitMiddleware } from "@/shared/http/rate-limit.js";
import { type RateLimitConfig } from "@/shared/config/backend-env.js";

function createTestConfig(overrides?: Partial<RateLimitConfig>): RateLimitConfig {
  return {
    enabled: true,
    cleanupIntervalMs: 60_000,
    health: { windowMs: 60_000, max: 2 },
    auth: { windowMs: 60_000, max: 1 },
    connector: { windowMs: 60_000, max: 2 },
    api: { windowMs: 60_000, max: 1 },
    ...overrides
  };
}

function createTestApp(config = createTestConfig()) {
  const app = express();
  app.set("trust proxy", true);
  app.use((req, _res, next) => {
    const userId = req.header("x-user-id");
    req.auth = {
      config: { authEnabled: false, frontendUrl: "http://localhost:5173" },
      session: userId ? { id: `${userId}-session`, csrfToken: "csrf-token" } : null,
      user: userId ? {
        id: userId,
        email: `${userId}@example.com`,
        displayName: userId,
        avatarUrl: null
      } : null
    };
    next();
  });
  app.use(createRateLimitMiddleware(config));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/api/auth/session", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/api/connectors/status", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/api/applications", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(createErrorHandler());
  return app;
}

describe("createRateLimitMiddleware", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies the configured health cap and emits rate-limit headers", async () => {
    const app = createTestApp(createTestConfig({
      health: { windowMs: 60_000, max: 2 }
    }));

    await request(app)
      .get("/api/health")
      .set("X-Forwarded-For", "198.51.100.10")
      .expect(200);

    const response = await request(app)
      .get("/api/health")
      .set("X-Forwarded-For", "198.51.100.10")
      .expect(200);

    expect(response.headers["ratelimit-limit"]).toBe("2");
    expect(response.headers["ratelimit-remaining"]).toBe("0");

    const blocked = await request(app)
      .get("/api/health")
      .set("X-Forwarded-For", "198.51.100.10")
      .expect(429);

    expect(blocked.body).toEqual({
      code: "RATE_LIMITED",
      message: "Rate limit exceeded for health requests.",
      userFriendlyMessage: "Too many requests. Try again shortly."
    });
    expect(blocked.headers["ratelimit-limit"]).toBe("2");
    expect(blocked.headers["ratelimit-remaining"]).toBe("0");
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("keys auth traffic by client IP", async () => {
    const app = createTestApp(createTestConfig({
      auth: { windowMs: 60_000, max: 1 }
    }));

    await request(app)
      .get("/api/auth/session")
      .set("X-Forwarded-For", "198.51.100.20")
      .expect(200);

    await request(app)
      .get("/api/auth/session")
      .set("X-Forwarded-For", "198.51.100.21")
      .expect(200);

    await request(app)
      .get("/api/auth/session")
      .set("X-Forwarded-For", "198.51.100.20")
      .expect(429);
  });

  it("keys connector traffic by client IP and uses its own cap", async () => {
    const app = createTestApp(createTestConfig({
      connector: { windowMs: 60_000, max: 2 }
    }));

    await request(app)
      .get("/api/connectors/status")
      .set("X-Forwarded-For", "198.51.100.30")
      .expect(200);

    await request(app)
      .get("/api/connectors/status")
      .set("X-Forwarded-For", "198.51.100.30")
      .expect(200);

    await request(app)
      .get("/api/connectors/status")
      .set("X-Forwarded-For", "198.51.100.30")
      .expect(429);
  });

  it("keys authenticated API traffic by user identity instead of IP", async () => {
    const app = createTestApp(createTestConfig({
      api: { windowMs: 60_000, max: 1 }
    }));

    await request(app)
      .get("/api/applications")
      .set("X-Forwarded-For", "198.51.100.40")
      .set("x-user-id", "user-1")
      .expect(200);

    await request(app)
      .get("/api/applications")
      .set("X-Forwarded-For", "198.51.100.41")
      .set("x-user-id", "user-2")
      .expect(200);

    await request(app)
      .get("/api/applications")
      .set("X-Forwarded-For", "198.51.100.99")
      .set("x-user-id", "user-1")
      .expect(429);
  });

  it("resets counters after the configured window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T10:00:00.000Z"));

    const app = createTestApp(createTestConfig({
      auth: { windowMs: 1_000, max: 1 }
    }));

    await request(app)
      .get("/api/auth/session")
      .set("X-Forwarded-For", "198.51.100.50")
      .expect(200);

    await request(app)
      .get("/api/auth/session")
      .set("X-Forwarded-For", "198.51.100.50")
      .expect(429);

    vi.advanceTimersByTime(1_001);

    await request(app)
      .get("/api/auth/session")
      .set("X-Forwarded-For", "198.51.100.50")
      .expect(200);
  });
});
