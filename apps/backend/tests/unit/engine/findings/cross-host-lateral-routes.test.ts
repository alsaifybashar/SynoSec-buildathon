import { describe, expect, it } from "vitest";
import type { WorkflowReportedFinding } from "@synosec/contracts";
import { inferCrossHostLateralRoutes } from "@/engine/findings/cross-host-lateral-routes.js";

function finding(overrides: Partial<WorkflowReportedFinding>): WorkflowReportedFinding {
  return {
    id: crypto.randomUUID(),
    workflowRunId: crypto.randomUUID(),
    type: "auth_weakness",
    title: "JWT token accepted",
    severity: "high",
    confidence: 0.8,
    target: { host: "a.internal" },
    evidence: [{ sourceTool: "jwt", quote: "token" }],
    impact: "Session token can be reused.",
    recommendation: "Rotate token controls.",
    validationStatus: "single_source",
    tags: ["auth"],
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("inferCrossHostLateralRoutes", () => {
  it("links credential findings to compatible auth findings on another host", () => {
    const routes = inferCrossHostLateralRoutes("scan-1", [
      finding({ target: { host: "a.internal" }, title: "Session token exposed" }),
      finding({ target: { host: "b.internal" }, title: "Same authentication accepts JWT" })
    ]);

    expect(routes).toHaveLength(2);
    expect(routes[0]?.crossHost).toBe(true);
    expect(routes[0]?.links[0]?.edgeType).toBe("lateral_movement");
  });
});
