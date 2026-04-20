import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createErrorHandler } from "@/platform/core/http/error-handler.js";

describe("error handler", () => {
  it("returns a generic error payload in production", async () => {
    const errorApp = express();
    errorApp.get("/boom", () => {
      throw new Error("sensitive stack detail");
    });
    errorApp.use(createErrorHandler({ isProduction: true }));

    const response = await request(errorApp).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Something went wrong." });
  });

  it("returns the error message outside production", async () => {
    const errorApp = express();
    errorApp.get("/boom", () => {
      throw new Error("sensitive stack detail");
    });
    errorApp.use(createErrorHandler({ isProduction: false }));

    const response = await request(errorApp).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "sensitive stack detail" });
  });
});
