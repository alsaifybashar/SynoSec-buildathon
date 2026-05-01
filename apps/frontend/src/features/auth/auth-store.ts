import { QueryClient } from "@tanstack/react-query";
import { apiRoutes, authSessionResponseSchema, type AuthSessionResponse } from "@synosec/contracts";

export type AuthStoreState =
  | { status: "loading"; session: null; message: null }
  | { status: "error"; session: null; message: string }
  | { status: "ready"; session: AuthSessionResponse; message: null };

export const authSessionQueryKey = ["auth", "session"] as const;

const authBootstrapRetryDelaysMs = [200, 600];

let authQueryClient: QueryClient | null = null;

function getAuthQueryClient() {
  if (!authQueryClient) {
    throw new Error("Auth query client has not been initialized.");
  }

  return authQueryClient;
}

export function registerAuthQueryClient(queryClient: QueryClient) {
  authQueryClient = queryClient;
}

export async function fetchSessionPayload() {
  const response = await fetch(apiRoutes.authSession, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Session request failed with status ${response.status}.`);
  }

  return authSessionResponseSchema.parse(await response.json());
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function bootstrapAuthSession() {
  const queryClient = getAuthQueryClient();
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= authBootstrapRetryDelaysMs.length; attempt += 1) {
    try {
      return await queryClient.fetchQuery({
        queryKey: authSessionQueryKey,
        queryFn: fetchSessionPayload,
        staleTime: 0
      });
    } catch (error) {
      lastError = error;

      if (attempt === authBootstrapRetryDelaysMs.length) {
        break;
      }

      await delay(authBootstrapRetryDelaysMs[attempt]!);
    }
  }

  throw lastError;
}

export async function refreshAuthSession() {
  return getAuthQueryClient().fetchQuery({
    queryKey: authSessionQueryKey,
    queryFn: fetchSessionPayload,
    staleTime: 0
  });
}

export function markAuthUnauthorized() {
  const queryClient = authQueryClient;
  if (!queryClient) {
    return;
  }

  const current = queryClient.getQueryData<AuthSessionResponse>(authSessionQueryKey);
  if (!current?.authEnabled) {
    return;
  }

  queryClient.setQueryData<AuthSessionResponse>(authSessionQueryKey, {
    authEnabled: true,
    authenticated: false,
    csrfToken: null,
    googleClientId: current.googleClientId,
    user: null
  });
}

async function fetchAuthCsrfToken() {
  const response = await fetch("/auth/csrf", {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Auth CSRF request failed with status ${response.status}.`);
  }

  const payload = await response.json() as { csrfToken?: unknown };
  if (typeof payload.csrfToken !== "string" || payload.csrfToken.length === 0) {
    throw new Error("Auth CSRF request did not return a CSRF token.");
  }

  return payload.csrfToken;
}

function submitAuthForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export async function logout(callbackUrl = "/login") {
  const csrfToken = await fetchAuthCsrfToken();
  submitAuthForm("/auth/signout", {
    csrfToken,
    callbackUrl
  });
}

export async function loginWithGoogleIdToken(idToken: string, callbackUrl = "/targets") {
  const csrfToken = await fetchAuthCsrfToken();
  submitAuthForm("/auth/callback/google-id-token", {
    csrfToken,
    callbackUrl,
    idToken
  });
}
