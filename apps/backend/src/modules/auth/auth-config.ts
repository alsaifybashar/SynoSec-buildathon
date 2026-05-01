import type { ExpressAuthConfig } from "@auth/express";
import Credentials from "@auth/express/providers/credentials";
import { CredentialsSignin } from "@auth/express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authRepository } from "@/modules/auth/auth-repository.js";
import { normalizeEmail } from "@/modules/auth/auth-crypto.js";
import { verifyGoogleIdToken } from "@/modules/auth/google-id-token.js";

const booleanEnvSchema = z
  .enum(["true", "false", "TRUE", "FALSE", "1", "0"])
  .transform((value) => value === "true" || value === "TRUE" || value === "1");

export type AuthenticatedSessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

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

function defaultSessionCookieName(config: EnabledAuthConfig) {
  return config.cookieSecure ? `__Secure-${config.cookieName}` : config.cookieName;
}

function buildCredentialsError(message: string) {
  const error = new CredentialsSignin();
  error.code = "google_id_token";
  error.message = message;
  return error;
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

export function createExpressAuthConfig(config: AuthConfig): ExpressAuthConfig | null {
  if (!config.authEnabled) {
    return null;
  }

  return {
    trustHost: true,
    secret: config.sessionSecret,
    session: {
      strategy: "jwt",
      maxAge: config.sessionTtlHours * 60 * 60,
      updateAge: config.sessionTouchIntervalSeconds
    },
    cookies: {
      sessionToken: {
        name: defaultSessionCookieName(config),
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: config.cookieSecure
        }
      }
    },
    providers: [
      Credentials({
        id: "google-id-token",
        name: "Google",
        credentials: {
          idToken: { label: "Google ID Token", type: "text" }
        },
        authorize: async (credentials) => {
          const idToken = typeof credentials?.idToken === "string" ? credentials.idToken : null;
          if (!idToken) {
            throw buildCredentialsError("Google sign-in did not include a credential.");
          }

          const googleUser = await verifyGoogleIdToken(idToken, config.googleClientId);
          const normalizedEmail = normalizeEmail(googleUser.email);
          if (!config.allowedEmails.includes(normalizedEmail)) {
            throw buildCredentialsError("This Google account is not allowed to access SynoSec.");
          }

          const user = await authRepository.upsertUser({
            email: normalizedEmail,
            googleSubject: googleUser.subject,
            displayName: googleUser.displayName,
            avatarUrl: googleUser.avatarUrl,
            createUserId: randomUUID()
          });

          return {
            id: user.id,
            email: user.email,
            name: user.displayName,
            image: user.avatarUrl
          };
        }
      })
    ],
    callbacks: {
      redirect({ url, baseUrl }) {
        if (url.startsWith("/")) {
          return `${baseUrl}${url}`;
        }

        try {
          const parsed = new URL(url);
          return parsed.origin === baseUrl ? parsed.toString() : baseUrl;
        } catch {
          return baseUrl;
        }
      },
      jwt({ token, user }) {
        if (user) {
          if (typeof user.id === "string") {
            token.sub = user.id;
          }
          if (typeof user.email === "string") {
            token.email = user.email;
          }
          if (typeof user.name === "string" || user.name === null) {
            token.name = user.name;
          }
          if (typeof user.image === "string" || user.image === null) {
            token.picture = user.image;
          }
        }
        return token;
      },
      session({ session, token }) {
        if (!token.sub || typeof token.email !== "string") {
          return session;
        }

        session.user = {
          ...(session.user ?? {}),
          id: token.sub,
          email: token.email,
          name: typeof token.name === "string" ? token.name : null,
          image: typeof token.picture === "string" ? token.picture : null
        } as typeof session.user & { id: string };

        return session;
      }
    }
  };
}
