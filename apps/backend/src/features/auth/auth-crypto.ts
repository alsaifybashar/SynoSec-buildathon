import crypto from "node:crypto";

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function createPkceVerifier() {
  return crypto.randomBytes(64).toString("base64url");
}

export function createPkceChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function hashToken(token: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
