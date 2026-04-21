import { apiRoutes, authSessionResponseSchema, type AuthSessionResponse } from "@synosec/contracts";

export type AuthStoreState =
  | { status: "loading"; session: null; message: null }
  | { status: "error"; session: null; message: string }
  | { status: "ready"; session: AuthSessionResponse; message: null };

const listeners = new Set<() => void>();
const authBootstrapRetryDelaysMs = [200, 600];

let authState: AuthStoreState = {
  status: "loading",
  session: null,
  message: null
};

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(nextState: AuthStoreState) {
  authState = nextState;
  emit();
}

export function subscribeAuthStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthStoreState() {
  return authState;
}

export function getCsrfToken() {
  return authState.status === "ready" ? authState.session.csrfToken : null;
}

function setLoadingState() {
  setState({
    status: "loading",
    session: null,
    message: null
  });
}

async function fetchSessionPayload() {
  const response = await fetch(apiRoutes.authSession, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Session request failed with status ${response.status}.`);
  }

  return authSessionResponseSchema.parse(await response.json());
}

export function markAuthUnauthorized() {
  if (authState.status !== "ready" || !authState.session.authEnabled) {
    return;
  }

  setState({
    status: "ready",
    session: {
      authEnabled: true,
      authenticated: false,
      csrfToken: null,
      googleClientId: authState.session.googleClientId,
      user: null
    },
    message: null
  });
}

export async function refreshAuthSession() {
  try {
    const payload = await fetchSessionPayload();
    setState({
      status: "ready",
      session: payload,
      message: null
    });
    return payload;
  } catch (error) {
    setState({
      status: "error",
      session: null,
      message: error instanceof Error ? error.message : "Unable to load session state."
    });
    throw error;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function bootstrapAuthSession() {
  setLoadingState();

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= authBootstrapRetryDelaysMs.length; attempt += 1) {
    try {
      const payload = await fetchSessionPayload();
      setState({
        status: "ready",
        session: payload,
        message: null
      });
      return payload;
    } catch (error) {
      lastError = error;

      if (attempt === authBootstrapRetryDelaysMs.length) {
        break;
      }

      await delay(authBootstrapRetryDelaysMs[attempt]!);
    }
  }

  setState({
    status: "error",
    session: null,
    message: lastError instanceof Error ? lastError.message : "Unable to load session state."
  });
  throw lastError;
}

export async function logout() {
  const csrfToken = getCsrfToken();

  const response = await fetch(apiRoutes.authLogout, {
    method: "POST",
    credentials: "include",
    headers: csrfToken ? { "x-csrf-token": csrfToken } : {}
  });

  if (!response.ok) {
    throw new Error(`Logout failed with status ${response.status}.`);
  }

  window.google?.accounts.id.disableAutoSelect?.();

  setState({
    status: "ready",
    session: {
      authEnabled: true,
      authenticated: false,
      csrfToken: null,
      googleClientId: authState.status === "ready" ? authState.session.googleClientId : null,
      user: null
    },
    message: null
  });
}

export async function loginWithGoogleIdToken(idToken: string) {
  const response = await fetch(apiRoutes.authGoogleLogin, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) {
    let message = `Google sign-in failed with status ${response.status}.`;

    try {
      const payload = await response.json() as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Keep the generic message when the response has no JSON body.
    }

    throw new Error(message);
  }

  return refreshAuthSession();
}
