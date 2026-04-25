import { describe, expect, it } from "vitest";
import { buildCrossScanPatternLearningSnapshotFromRows, inferPatternTargetType } from "./pattern-learning.js";

const now = "2026-04-25T00:00:00.000Z";

function finding(overrides: Record<string, unknown> = {}) {
  return {
    id: `finding-${Math.random()}`,
    executionId: "run-1",
    executionKind: "workflow",
    source: "workflow-finding",
    severity: "high",
    title: "Finding",
    type: "sql injection",
    summary: "SQL injection was confirmed.",
    recommendation: null,
    confidence: 0.9,
    targetLabel: "https://app.example/login",
    evidence: [{
      sourceTool: "Nuclei",
      quote: "confirmed finding"
    }],
    sourceToolIds: ["seed-nuclei"],
    sourceToolRunIds: [],
    createdAt: now,
    ...overrides
  };
}

function toolActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: `activity-${Math.random()}`,
    executionId: "run-1",
    executionKind: "workflow",
    phase: "Tool completed",
    toolId: "seed-nuclei",
    toolName: "Nuclei",
    command: "nuclei -u https://app.example",
    status: "completed",
    outputPreview: "ok",
    exitCode: 0,
    startedAt: now,
    completedAt: now,
    ...overrides
  };
}

describe("cross-scan pattern learning", () => {
  it("infers target families from technology and finding context", () => {
    expect(inferPatternTargetType({ technologies: ["Express", "Node.js"] })).toBe("node-express");
    expect(inferPatternTargetType({ categories: ["jwt weak secret"] })).toBe("auth-session");
    expect(inferPatternTargetType({ targetLabel: "10.0.0.0/24" })).toBe("network-segment");
  });

  it("aggregates completed reports into tool-selection biases", () => {
    const snapshot = buildCrossScanPatternLearningSnapshotFromRows({
      reports: [
        {
          id: "report-1",
          targetLabel: "https://app.example",
          findings: [finding()],
          toolActivity: [toolActivity()]
        },
        {
          id: "report-2",
          targetLabel: "https://app.example",
          findings: [finding({ id: "finding-2", executionId: "run-2" })],
          toolActivity: [toolActivity({ id: "activity-2", executionId: "run-2" })]
        },
        {
          id: "report-3",
          targetLabel: "https://app.example",
          findings: [finding({
            id: "finding-3",
            executionId: "run-3",
            confidence: 0.2,
            evidence: [],
            sourceToolIds: ["seed-nikto"]
          })],
          toolActivity: [toolActivity({
            id: "activity-3",
            executionId: "run-3",
            toolId: "seed-nikto",
            toolName: "Nikto"
          })]
        },
        {
          id: "report-4",
          targetLabel: "https://app.example",
          findings: [finding({
            id: "finding-4",
            executionId: "run-4",
            confidence: 0.2,
            evidence: [],
            sourceToolIds: ["seed-nikto"]
          })],
          toolActivity: [toolActivity({
            id: "activity-4",
            executionId: "run-4",
            toolId: "seed-nikto",
            toolName: "Nikto"
          })]
        }
      ],
      verificationEvents: [
        { status: "completed", payload: { status: "single_source" } },
        { status: "failed", payload: { status: "rejected" } }
      ],
      escalationRoutes: [
        { technique: "credential chaining", crossHost: true, confidence: 0.9 },
        { technique: "credential chaining", crossHost: true, confidence: 0.4 }
      ]
    });

    const nuclei = snapshot.toolTargetPatterns.find((pattern) => pattern.toolName === "Nuclei");
    const nikto = snapshot.toolTargetPatterns.find((pattern) => pattern.toolName === "Nikto");
    expect(nuclei?.confirmationRate).toBe(1);
    expect(nuclei?.bias).toBeGreaterThan(0);
    expect(nikto?.falsePositiveRate).toBe(1);
    expect(nikto?.bias).toBeLessThan(0);
    expect(snapshot.toolSelectionBiases.map((bias) => bias.toolName)).toContain("Nuclei");
    expect(snapshot.assertionPatterns).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "rejected", rejectedCount: 1 })
    ]));
    expect(snapshot.escalationRoutePatterns[0]).toMatchObject({
      routeType: "cross-host",
      sampleCount: 2,
      acceptedCount: 1,
      rejectedCount: 1
    });
  });
});
