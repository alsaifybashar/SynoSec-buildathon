import type { Request } from "express";
import { RequestError } from "@/shared/http/request-error.js";

export function assertConnectorAuth(request: Request): void {
  const configuredToken = process.env["CONNECTOR_SHARED_TOKEN"];
  if (!configuredToken) {
    throw new Error("CONNECTOR_SHARED_TOKEN is required for connector authentication.");
  }

  const header = request.header("authorization") ?? "";
  const providedToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (providedToken !== configuredToken) {
    throw new RequestError(401, "Unauthorized connector request.");
  }
}
