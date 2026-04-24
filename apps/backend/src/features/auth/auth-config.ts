import { z } from "zod";

const booleanEnvSchema = z
  .enum(["true", "false", "TRUE", "FALSE", "1", "0"])
  .transform((value) => value === "true" || value === "TRUE" || value === "1");

export type EnabledAuthConfig = {
  authEnabled: true;
  googleEnabled: true;
  googleClientId: string;
  allowedEmails: string[];
  sessionSecret: string;
  cookieName: string;
  cookieSecure: boolean;
  sessionTtlHours: number;
  sessionTouchIntervalSeconds: number;
  frontendUrl: string;
};

export type AuthConfig =
  | { authEnabled: false; frontendUrl: string }
  | EnabledAuthConfig;

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return booleanEnvSchema.parse(value);
}

function parseAllowedEmails(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function defaultCookieSecure() {
  const backendEnv = process.env["BACKEND_ENV"] ?? process.env["NODE_ENV"] ?? "development";
  return backendEnv.toLowerCase() === "production";
}

export function loadAuthConfig(): AuthConfig {
  const frontendUrl = z.string().url("FRONTEND_URL must be a valid URL.").parse(process.env["FRONTEND_URL"]);
  const authEnabled = parseBoolean(process.env["AUTH_ENABLED"], false);

  if (!authEnabled) {
    return {
      authEnabled: false,
      frontendUrl
    };
  }

  return {
    authEnabled: true,
    googleEnabled: true,
    googleClientId: z.string().min(1).parse(process.env["AUTH_GOOGLE_CLIENT_ID"]),
    allowedEmails: z.array(z.string().email()).min(1).parse(parseAllowedEmails(process.env["AUTH_ALLOWED_EMAILS"])),
    sessionSecret: z.string().min(32).parse(process.env["AUTH_SESSION_SECRET"]),
    cookieName: z.string().min(1).parse(process.env["AUTH_COOKIE_NAME"] ?? "synosec_session"),
    cookieSecure: parseBoolean(process.env["AUTH_COOKIE_SECURE"], defaultCookieSecure()),
    sessionTtlHours: z.coerce.number().int().min(1).max(24 * 30).parse(process.env["AUTH_SESSION_TTL_HOURS"] ?? "168"),
    sessionTouchIntervalSeconds: z.coerce.number().int().min(0).max(24 * 60 * 60).parse(process.env["AUTH_SESSION_TOUCH_INTERVAL_SECONDS"] ?? "600"),
    frontendUrl
  };
}
