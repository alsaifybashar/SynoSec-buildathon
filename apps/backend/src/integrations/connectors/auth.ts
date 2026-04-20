import type { Request } from "express";
import { RequestError } from "@/platform/core/http/request-error.js";

const defaultConnectorToken = "synosec-connector-dev";

export function assertConnectorAuth(request: Request): void {
  const configuredToken = process.env["CONNECTOR_SHARED_TOKEN"] ?? defaultConnectorToken;
  const header = request.header("authorization") ?? "";
  const providedToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (providedToken !== configuredToken) {
    throw new RequestError(401, "Unauthorized connector request.");
  }
}
