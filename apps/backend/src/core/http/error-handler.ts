import { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { RequestError } from "@/core/http/request-error.js";

function defaultMessageForStatus(status: number) {
  if (status === 400) {
    return "The request could not be processed.";
  }
  if (status === 401) {
    return "Authentication is required for this request.";
  }
  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (status === 404) {
    return "The requested resource was not found.";
  }
  if (status === 409) {
    return "The request could not be completed because the resource changed.";
  }
  if (status >= 500) {
    return "Something went wrong while processing the request.";
  }

  return "The request could not be completed.";
}

function sanitizeMessage(message: string | undefined, fallback: string) {
  if (!message) {
    return fallback;
  }

  const singleLine = message
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!singleLine || /\bat\s+.+:\d+:\d+\b/.test(singleLine)) {
    return fallback;
  }

  return singleLine;
}

export function createErrorHandler(): ErrorRequestHandler {
  return (error, _request, response, _next) => {
    if (response.headersSent) {
      return;
    }

    if (error instanceof ZodError) {
      response.status(400).json({
        code: "VALIDATION_ERROR",
        message: sanitizeMessage(error.issues[0]?.message, "Invalid request.")
      });
      return;
    }

    if (error instanceof RequestError) {
      response.status(error.status).json({
        code: error.code ?? (error.status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
        message: sanitizeMessage(error.message, defaultMessageForStatus(error.status)),
        ...(error.userFriendlyMessage
          ? { userFriendlyMessage: sanitizeMessage(error.userFriendlyMessage, defaultMessageForStatus(error.status)) }
          : {})
      });
      return;
    }

    console.error(error);

    response.status(500).json({
      code: "INTERNAL_ERROR",
      message: defaultMessageForStatus(500)
    });
  };
}
