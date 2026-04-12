import { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { RequestError } from "./request-error.js";

function isProductionEnvironment() {
  return process.env["BACKEND_ENV"] === "production";
}

export function createErrorHandler(options?: { isProduction?: boolean }): ErrorRequestHandler {
  const isProduction = options?.isProduction ?? isProductionEnvironment();

  return (error, _request, response, _next) => {
    if (error instanceof ZodError && !response.headersSent) {
      response.status(400).json({
        message: error.issues[0]?.message ?? "Invalid request."
      });
      return;
    }

    if (error instanceof RequestError && !response.headersSent) {
      response.status(error.status).json({
        message: error.message
      });
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    if (!response.headersSent) {
      response.status(500).json({
        message: isProduction ? "Something went wrong." : message
      });
    }
  };
}
