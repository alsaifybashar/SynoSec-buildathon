import crypto from "node:crypto";
import { type Response } from "express";
import { type EnabledAuthConfig } from "@/modules/auth/auth-config.js";

type CookieOptions = {
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
};

function encodeCookieValue(value: string) {
  return encodeURIComponent(value);
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  return header.split(";").reduce<Record<string, string>>((cookies, cookie) => {
    const [namePart, ...valueParts] = cookie.trim().split("=");
    if (!namePart || valueParts.length === 0) {
      return cookies;
    }

    cookies[namePart] = decodeURIComponent(valueParts.join("="));
    return cookies;
  }, {});
}

function appendCookie(response: Response, value: string) {
  const current = response.getHeader("Set-Cookie");
  if (!current) {
    response.setHeader("Set-Cookie", [value]);
    return;
  }

  if (Array.isArray(current)) {
    response.setHeader("Set-Cookie", [...current, value]);
    return;
  }

  response.setHeader("Set-Cookie", [String(current), value]);
}

function buildCookie(name: string, value: string, config: EnabledAuthConfig, options: CookieOptions = {}) {
  const parts = [
    `${name}=${encodeCookieValue(value)}`,
    "Path=/",
    "SameSite=Lax"
  ];

  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }
  if (config.cookieSecure) {
    parts.push("Secure");
  }
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  return parts.join("; ");
}

export function setSessionCookie(response: Response, sessionToken: string, config: EnabledAuthConfig, expiresAt: Date) {
  const ttlSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  appendCookie(response, buildCookie(config.cookieName, sessionToken, config, {
    maxAge: ttlSeconds,
    expires: expiresAt
  }));
}

export function clearSessionCookie(response: Response, config: EnabledAuthConfig) {
  appendCookie(response, buildCookie(config.cookieName, "", config, {
    maxAge: 0,
    expires: new Date(0)
  }));
}

const oauthStateCookieName = "synosec_oauth_state";
const oauthVerifierCookieName = "synosec_oauth_verifier";

export function setOauthStateCookie(response: Response, state: string, config: EnabledAuthConfig) {
  appendCookie(response, buildCookie(oauthStateCookieName, state, config, {
    maxAge: 600,
    expires: new Date(Date.now() + 10 * 60 * 1000)
  }));
}

export function clearOauthStateCookie(response: Response, config: EnabledAuthConfig) {
  appendCookie(response, buildCookie(oauthStateCookieName, "", config, {
    maxAge: 0,
    expires: new Date(0)
  }));
}

export function setOauthVerifierCookie(response: Response, verifier: string, config: EnabledAuthConfig) {
  appendCookie(response, buildCookie(oauthVerifierCookieName, verifier, config, {
    maxAge: 600,
    expires: new Date(Date.now() + 10 * 60 * 1000)
  }));
}

export function clearOauthVerifierCookie(response: Response, config: EnabledAuthConfig) {
  appendCookie(response, buildCookie(oauthVerifierCookieName, "", config, {
    maxAge: 0,
    expires: new Date(0)
  }));
}

export function readOauthStateCookie(rawCookieHeader: string | undefined) {
  return parseCookies(rawCookieHeader)[oauthStateCookieName];
}

export function readOauthVerifierCookie(rawCookieHeader: string | undefined) {
  return parseCookies(rawCookieHeader)[oauthVerifierCookieName];
}

export function createOauthState(secret: string, redirectTo: string) {
  const nonce = crypto.randomUUID();
  const payload = Buffer.from(JSON.stringify({ nonce, redirectTo }), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOauthState(secret: string, rawState: string | undefined): { redirectTo: string } | null {
  if (!rawState) {
    return null;
  }

  const [payload, signature] = rawState.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature !== expected) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { redirectTo?: unknown };
    if (typeof decoded.redirectTo !== "string") {
      return null;
    }

    return { redirectTo: decoded.redirectTo };
  } catch {
    return null;
  }
}
