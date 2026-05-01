import type { Target } from "@synosec/contracts";

export function buildTarget(overrides: Partial<Target> = {}): Target {
  return {
    id: "20000000-0000-0000-0000-000000000001",
    name: "Demo Target",
    baseUrl: "http://localhost:3000",
    executionBaseUrl: null,
    environment: "production",
    status: "active",
    lastScannedAt: null,
    constraintBindings: [],
    createdAt: "2026-04-24T10:00:00.000Z",
    updatedAt: "2026-04-24T10:00:00.000Z",
    ...overrides
  };
}
