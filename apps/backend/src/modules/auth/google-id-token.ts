import { createRemoteJWKSet, jwtVerify } from "jose";
import { RequestError } from "@/core/http/request-error.js";

type GoogleIdentityPayload = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
};

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function verifyGoogleIdToken(idToken: string, audience: string) {
  try {
    const result = await jwtVerify(idToken, googleJwks, {
      audience,
      issuer: ["accounts.google.com", "https://accounts.google.com"]
    });

    const payload = result.payload as GoogleIdentityPayload;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      payload.email_verified !== true
    ) {
      throw new RequestError(401, "Google ID token is missing required identity claims.");
    }

    return {
      subject: payload.sub,
      email: payload.email,
      displayName: typeof payload.name === "string" ? payload.name : null,
      avatarUrl: typeof payload.picture === "string" ? payload.picture : null
    };
  } catch (error) {
    if (error instanceof RequestError) {
      throw error;
    }

    throw new RequestError(502, "Google identity verification is temporarily unavailable.", {
      code: "GOOGLE_IDENTITY_PROVIDER_UNAVAILABLE",
      userFriendlyMessage: "Google sign-in is temporarily unavailable. Please retry shortly.",
      cause: error
    });
  }
}
