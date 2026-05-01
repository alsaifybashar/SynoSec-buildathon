import { afterEach, beforeEach, vi } from "vitest";
import { installBackendTestEnv, restoreBackendTestEnv } from "../fixtures/env/backend-env.js";

beforeEach(() => {
  installBackendTestEnv();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  restoreBackendTestEnv();
});
