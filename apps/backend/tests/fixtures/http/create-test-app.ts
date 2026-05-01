import { createApp, type AppDependencies } from "@/app/create-app.js";
import { installBackendTestEnv } from "../env/backend-env.js";
import { createTestBackendDependencies } from "../dependencies/create-test-backend-dependencies.js";

export function createTestApp(options: {
  envOverrides?: Record<string, string | undefined>;
  dependencies?: Parameters<typeof createTestBackendDependencies>[0];
  dependencyOverrides?: Partial<AppDependencies>;
} = {}) {
  installBackendTestEnv(options.envOverrides);
  return createApp(createTestBackendDependencies({
    ...options.dependencies,
    overrides: {
      ...options.dependencies?.overrides,
      ...options.dependencyOverrides
    }
  }));
}
