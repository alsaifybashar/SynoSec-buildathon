import { z } from "zod";
import "@/core/env/load-env.js";

const booleanEnvSchema = z
  .enum(["true", "false", "TRUE", "FALSE", "1", "0"])
  .transform((value) => value === "true" || value === "TRUE" || value === "1");

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

const backendEnvSchema = z.object({
  backendEnv: z.string().min(1).default("development"),
  nodeEnv: z.string().min(1).default("development"),
  backendPort: z.coerce.number().int().positive().default(3001),
  databaseUrl: z.string().min(1, "DATABASE_URL is required."),
  frontendUrl: z.string().url("FRONTEND_URL must be a valid URL."),
  toolExecutionMode: z.enum(["local", "connector"]).default("local"),
  connectorSharedToken: z.string().min(1).optional(),
  authEnabled: z.boolean().default(false),
  googleEnabled: z.boolean().default(true),
  googleClientId: z.string().optional(),
  allowedEmails: z.array(z.string().email()).default([]),
  sessionSecret: z.string().optional(),
  cookieName: z.string().min(1).default("synosec_session"),
  cookieSecure: z.boolean(),
  sessionTtlHours: z.coerce.number().int().min(1).max(24 * 30).default(168),
  sessionTouchIntervalSeconds: z.coerce.number().int().min(0).max(24 * 60 * 60).default(600)
}).superRefine((env, ctx) => {
  if (env.toolExecutionMode === "connector" && !env.connectorSharedToken) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["connectorSharedToken"],
      message: "CONNECTOR_SHARED_TOKEN is required when TOOL_EXECUTION_MODE=connector."
    });
  }

  if (!env.authEnabled) {
    return;
  }

  if (!env.googleEnabled) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["googleEnabled"],
      message: "AUTH_GOOGLE_ENABLED must be true when AUTH_ENABLED=true."
    });
  }

  if (!env.googleClientId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["googleClientId"],
      message: "AUTH_GOOGLE_CLIENT_ID is required when AUTH_ENABLED=true."
    });
  }

  if (env.allowedEmails.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["allowedEmails"],
      message: "AUTH_ALLOWED_EMAILS must include at least one email when AUTH_ENABLED=true."
    });
  }

  if (!env.sessionSecret || env.sessionSecret.length < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sessionSecret"],
      message: "AUTH_SESSION_SECRET must be at least 32 characters when AUTH_ENABLED=true."
    });
  }
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;

export function loadBackendEnv(): BackendEnv {
  return backendEnvSchema.parse({
    backendEnv: process.env["BACKEND_ENV"] ?? "development",
    nodeEnv: process.env["NODE_ENV"] ?? "development",
    backendPort: process.env["BACKEND_PORT"] ?? "3001",
    databaseUrl: process.env["DATABASE_URL"],
    frontendUrl: process.env["FRONTEND_URL"],
    toolExecutionMode: process.env["TOOL_EXECUTION_MODE"] ?? "local",
    connectorSharedToken: process.env["CONNECTOR_SHARED_TOKEN"],
    authEnabled: parseBoolean(process.env["AUTH_ENABLED"], false),
    googleEnabled: parseBoolean(process.env["AUTH_GOOGLE_ENABLED"], true),
    googleClientId: process.env["AUTH_GOOGLE_CLIENT_ID"],
    allowedEmails: parseAllowedEmails(process.env["AUTH_ALLOWED_EMAILS"]),
    sessionSecret: process.env["AUTH_SESSION_SECRET"],
    cookieName: process.env["AUTH_COOKIE_NAME"] ?? "synosec_session",
    cookieSecure: parseBoolean(process.env["AUTH_COOKIE_SECURE"], defaultCookieSecure()),
    sessionTtlHours: process.env["AUTH_SESSION_TTL_HOURS"] ?? "168",
    sessionTouchIntervalSeconds: process.env["AUTH_SESSION_TOUCH_INTERVAL_SECONDS"] ?? "600"
  });
}
