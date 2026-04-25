import { describe, expect, it } from "vitest";
import type {
  Application,
  ApplicationConstraintBinding,
  ApplicationEnvironment,
  ApplicationStatus,
  ExecutionConstraint,
  ExecutionConstraintKind
} from "@prisma/client";
import { mapTargetRow } from "./targets.mapper.js";

function createApplicationRow(overrides: Partial<Application> = {}): Application {
  return {
    id: "1f92a3d7-4f70-4950-b750-9bf74c6f3591",
    name: "Nils Wickman Portfolio",
    baseUrl: "https://nilswickman.com",
    environment: "production" as ApplicationEnvironment,
    status: "active" as ApplicationStatus,
    lastScannedAt: null,
    createdAt: new Date("2026-04-25T00:00:00.000Z"),
    updatedAt: new Date("2026-04-25T00:00:00.000Z"),
    ...overrides
  };
}

function createConstraintRow(overrides: Partial<ExecutionConstraint> = {}): ExecutionConstraint {
  return {
    id: "seed-constraint-cloudflare-v1",
    name: "Cloudflare Owned Asset Policy",
    kind: "provider_policy" as ExecutionConstraintKind,
    provider: "cloudflare",
    version: 1,
    description: "Restricts testing to customer-owned assets behind Cloudflare.",
    bypassForLocalTargets: false,
    denyProviderOwnedTargets: true,
    requireVerifiedOwnership: true,
    allowActiveExploit: false,
    requireRateLimitSupport: true,
    rateLimitRps: 5,
    requireHostAllowlistSupport: true,
    requirePathExclusionSupport: true,
    documentationUrls: ["https://developers.cloudflare.com/fundamentals/reference/scans-penetration/"],
    excludedPaths: ["/cdn-cgi/"],
    createdAt: new Date("2026-04-25T00:00:00.000Z"),
    updatedAt: new Date("2026-04-25T00:00:00.000Z"),
    ...overrides
  };
}

function createConstraintBindingRow(overrides: Partial<ApplicationConstraintBinding> = {}): ApplicationConstraintBinding {
  return {
    applicationId: "1f92a3d7-4f70-4950-b750-9bf74c6f3591",
    constraintId: "seed-constraint-cloudflare-v1",
    createdAt: new Date("2026-04-25T00:00:00.000Z"),
    ...overrides
  };
}

describe("mapTargetRow", () => {
  it("maps a Cloudflare-backed target with constraint bindings", () => {
    const target = mapTargetRow({
      ...createApplicationRow(),
      constraintBindings: [
        {
          ...createConstraintBindingRow(),
          constraint: createConstraintRow()
        }
      ]
    });

    expect(target.name).toBe("Nils Wickman Portfolio");
    expect(target.baseUrl).toBe("https://nilswickman.com");
    expect(target.constraintBindings).toHaveLength(1);
    expect(target.constraintBindings?.[0]?.constraint?.provider).toBe("cloudflare");
    expect(target.constraintBindings?.[0]?.constraint?.documentationUrls).toEqual([
      "https://developers.cloudflare.com/fundamentals/reference/scans-penetration/"
    ]);
  });
});
