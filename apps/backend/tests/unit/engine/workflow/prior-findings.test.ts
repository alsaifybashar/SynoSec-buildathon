import { describe, expect, it } from "vitest";
import type { WorkflowReportedFinding } from "@synosec/contracts";
import { formatPriorFindingLineage } from "@/engine/workflow/prior-findings.js";

function createFinding(overrides: Partial<WorkflowReportedFinding> = {}): WorkflowReportedFinding {
  return {
    id: "F-1",
    workflowRunId: "00000000-0000-0000-0000-000000000001",
    createdAt: "2026-05-01T00:00:00.000Z",
    type: "service_exposure",
    title: "Login form exposes verbose error message",
    severity: "medium",
    confidence: 0.7,
    target: { kind: "url", value: "https://example.com/login" },
    evidence: [{
      sourceTool: "http_surface_assessment",
      quote: "Server returned a stack trace including framework version.",
      toolRunRef: "run-abc-123"
    }],
    impact: "Discloses internal implementation details.",
    recommendation: "Suppress stack traces.",
    validationStatus: "unverified",
    derivedFromFindingIds: [],
    relatedFindingIds: [],
    enablesFindingIds: [],
    tags: [],
    ...overrides
  };
}

describe("formatPriorFindingLineage", () => {
  it("returns null for an empty list", () => {
    expect(formatPriorFindingLineage([])).toBeNull();
  });

  it("renders source, run ref and a summary per finding", () => {
    const out = formatPriorFindingLineage([createFinding()]);
    expect(out).toContain("## Prior findings & lineage");
    expect(out).toContain("[F-1]");
    expect(out).toContain("severity=medium");
    expect(out).toContain("source=http_surface_assessment/run-abc-123");
    expect(out).toContain("summary: Server returned a stack trace");
  });

  it("falls back to 'unknown' source and omits run ref when missing", () => {
    const finding = createFinding({
      evidence: [{ sourceTool: "", quote: "obs", traceEventId: "00000000-0000-0000-0000-000000000abc" }]
    });
    const out = formatPriorFindingLineage([finding])!;
    expect(out).toContain("source=unknown,");
  });

  it("collapses overflow when count exceeds maxFindings", () => {
    const findings = Array.from({ length: 5 }, (_, index) =>
      createFinding({
        id: `F-${index}`,
        createdAt: `2026-05-01T00:0${index}:00.000Z`
      })
    );
    const out = formatPriorFindingLineage(findings, { maxFindings: 2 })!;
    expect(out).toContain("…and 3 more earlier findings.");
    expect(out).toContain("[F-3]");
    expect(out).toContain("[F-4]");
    expect(out).not.toContain("[F-0]");
  });

  it("uses explanationSummary when present", () => {
    const finding = createFinding({ explanationSummary: "Custom explanation." });
    const out = formatPriorFindingLineage([finding])!;
    expect(out).toContain("summary: Custom explanation.");
  });
});
