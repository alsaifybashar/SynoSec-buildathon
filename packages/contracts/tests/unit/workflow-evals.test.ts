import { describe, expect, it } from "vitest";
import { workflowRunEvaluationResponseSchema } from "../../src/workflow-evals.js";

describe("workflowRunEvaluationResponseSchema", () => {
  it("accepts an available evaluation response", () => {
    const result = workflowRunEvaluationResponseSchema.safeParse({
      status: "available",
      runId: "60000000-0000-0000-0000-000000000001",
      targetPack: "juice-shop",
      score: 84,
      label: "84 / 100",
      summary: "Matched most documented expectations.",
      subscores: [{ key: "run-status", label: "Run status", score: 20, maxScore: 20 }],
      explanation: ["Run completed successfully."],
      totalExpectations: 111,
      unmetExpectationsTruncatedCount: 86,
      matchedExpectations: [{ key: "admin", label: "Admin path", met: true, evidence: ["/admin"] }],
      unmetExpectations: []
    });

    expect(result.success).toBe(true);
  });

  it("accepts an unavailable evaluation response", () => {
    const result = workflowRunEvaluationResponseSchema.safeParse({
      status: "unavailable",
      runId: "60000000-0000-0000-0000-000000000001",
      reason: "unsupported_target",
      label: "Not available",
      summary: "No evaluation pack exists."
    });

    expect(result.success).toBe(true);
  });
});
