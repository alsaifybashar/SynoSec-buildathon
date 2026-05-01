const originalEnv = { ...process.env };

const defaultBackendTestEnv: Record<string, string> = {
  BACKEND_ENV: "development",
  NODE_ENV: "test",
  FRONTEND_URL: "http://localhost:5173",
  DATABASE_URL: "postgresql://synosec:synosec@127.0.0.1:5432/synosec_test",
  LLM_PROVIDER: "anthropic",
  ANTHROPIC_API_KEY: "test-anthropic-key",
  AUTH_ENABLED: "false",
  AUTH_GOOGLE_ENABLED: "true",
  AUTH_GOOGLE_CLIENT_ID: "google-client-id",
  AUTH_ALLOWED_EMAILS: "allowed@example.com",
  AUTH_SESSION_SECRET: "12345678901234567890123456789012",
  AUTH_COOKIE_NAME: "synosec_session",
  AUTH_COOKIE_SECURE: "false",
  AUTH_SESSION_TTL_HOURS: "24",
  AUTH_SESSION_TOUCH_INTERVAL_SECONDS: "600",
  TOOL_EXECUTION_MODE: "local",
  CONNECTOR_SHARED_TOKEN: "connector-secret"
};

function replaceEnv(nextEnv: Record<string, string | undefined>) {
  for (const key of Object.keys(process.env)) {
    if (!(key in nextEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(nextEnv)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

export function installBackendTestEnv(overrides: Record<string, string | undefined> = {}) {
  replaceEnv({
    ...originalEnv,
    ...defaultBackendTestEnv,
    ...overrides
  });
}

export function restoreBackendTestEnv() {
  replaceEnv(originalEnv);
}
