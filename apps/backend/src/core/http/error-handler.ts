import { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";

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

    const message = error instanceof Error ? error.message : "Unknown error";

    if (!response.headersSent) {
      response.status(500).json({
        message: isProduction ? "Something went wrong." : message
      });
    }
  };
}
