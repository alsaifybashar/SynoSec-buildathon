import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestLogger, shouldEnableRequestLogging } from "@/shared/http/request-logger.js";

describe("request logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env["BACKEND_ENV"];
    delete process.env["NODE_ENV"];
  });

  it("logs method, path, status, and duration when the response finishes", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const app = express();

    app.use(createRequestLogger());
    app.get("/health", (_request, response) => {
      response.status(204).end();
    });

    await request(app).get("/health?full=true").expect(204);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0]?.[0]).toMatch(/^GET \/health\?full=true 204 \d+\.\dms$/);
  });

  it("enables request logging in development", () => {
    process.env["BACKEND_ENV"] = "development";

    expect(shouldEnableRequestLogging()).toBe(true);
  });

  it("disables request logging outside development", () => {
    process.env["BACKEND_ENV"] = "production";

    expect(shouldEnableRequestLogging()).toBe(false);
  });
});
