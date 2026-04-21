import { type NextFunction, type Request, type Response } from "express";

const apiPermissionsPolicy = [
  "accelerometer=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()"
].join(", ");

const apiContentSecurityPolicy = [
  "default-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'"
].join("; ");

function setHeaderIfMissing(response: Response, name: string, value: string) {
  if (!response.hasHeader(name)) {
    response.setHeader(name, value);
  }
}

function isSecureRequest(request: Request) {
  return request.secure || request.headers["x-forwarded-proto"] === "https";
}

export function applySecurityHeaders(request: Request, response: Response, next: NextFunction) {
  setHeaderIfMissing(response, "X-Content-Type-Options", "nosniff");
  setHeaderIfMissing(response, "Referrer-Policy", "no-referrer");
  setHeaderIfMissing(response, "Permissions-Policy", apiPermissionsPolicy);
  setHeaderIfMissing(response, "X-Frame-Options", "DENY");
  setHeaderIfMissing(response, "Content-Security-Policy", apiContentSecurityPolicy);

  if (isSecureRequest(request)) {
    setHeaderIfMissing(response, "Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}
