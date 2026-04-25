import { RequestError } from "@/shared/http/request-error.js";

type GoogleTokenResponse = {
  access_token?: string;
};

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export function buildGoogleLoginUrl(input: {
  clientId: string;
  callbackUrl: string;
  state: string;
  codeChallenge: string;
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256"
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(input: {
  clientId: string;
  callbackUrl: string;
  code: string;
  codeVerifier: string;
}) {
  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code: input.code,
        client_id: input.clientId,
        redirect_uri: input.callbackUrl,
        grant_type: "authorization_code",
        code_verifier: input.codeVerifier
      })
    });
  } catch (error) {
    throw new RequestError(502, "Google token exchange is temporarily unavailable.", {
      code: "GOOGLE_TOKEN_EXCHANGE_UNAVAILABLE",
      userFriendlyMessage: "Google sign-in is temporarily unavailable. Please retry shortly.",
      cause: error
    });
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new RequestError(502, "Google token exchange is temporarily unavailable.", {
        code: "GOOGLE_TOKEN_EXCHANGE_UNAVAILABLE",
        userFriendlyMessage: "Google sign-in is temporarily unavailable. Please retry shortly."
      });
    }

    throw new RequestError(401, "Google sign-in could not be completed.");
  }

  const payload = (await response.json()) as GoogleTokenResponse;
  if (!payload.access_token) {
    throw new RequestError(401, "Google sign-in did not return an access token.");
  }

  return payload.access_token;
}

export async function fetchGoogleUserInfo(accessToken: string) {
  let response: Response;
  try {
    response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });
  } catch (error) {
    throw new RequestError(502, "Google account details are temporarily unavailable.", {
      code: "GOOGLE_USERINFO_UNAVAILABLE",
      userFriendlyMessage: "Google sign-in is temporarily unavailable. Please retry shortly.",
      cause: error
    });
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new RequestError(502, "Google account details are temporarily unavailable.", {
        code: "GOOGLE_USERINFO_UNAVAILABLE",
        userFriendlyMessage: "Google sign-in is temporarily unavailable. Please retry shortly."
      });
    }

    throw new RequestError(401, "Google account details could not be loaded.");
  }

  const payload = (await response.json()) as GoogleUserInfoResponse;

  if (!payload.sub || !payload.email || payload.email_verified !== true) {
    throw new RequestError(403, "Google account email must be verified.");
  }

  return {
    subject: payload.sub,
    email: payload.email,
    displayName: payload.name ?? null,
    avatarUrl: payload.picture ?? null
  };
}
