import { describe, expect, it, vi } from "vitest";
import type { Finding, Report } from "@synosec/contracts";
import { generateReport } from "./report.js";

describe("generateReport", () => {
  it("uses deterministic local report generation with node targets", async () => {
    const now = new Date().toISOString();
    const finding: Finding = {
      id: "finding-1",
      nodeId: "node-1",
      scanId: "scan-1",
      agentId: "l7-application-agent",
      severity: "medium",
      confidence: 0.9,
      title: "Interesting Application Path: /admin",
      description: "/admin responded with HTTP 200.",
      evidence: "curl ...",
      technique: "Auth bypass",
      reproduceCommand: "curl ...",
      validated: false,
      createdAt: now
    };

    const reportModule = await import("./report.js");
    const dbModule = await import("../db/neo4j.js");

    const getFindingsForScanSpy = vi.spyOn(dbModule, "getFindingsForScan").mockResolvedValue([finding]);
    const getAttackPathsSpy = vi.spyOn(dbModule, "getAttackPaths").mockResolvedValue([]);
    const getScanSpy = vi.spyOn(dbModule, "getScan").mockResolvedValue({
      id: "scan-1",
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L4", "L6", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false
      },
      status: "complete",
      currentRound: 0,
      nodesTotal: 2,
      nodesComplete: 2,
      createdAt: now,
      completedAt: now
    });
    const getGraphForScanSpy = vi.spyOn(dbModule, "getGraphForScan").mockResolvedValue({
      nodes: [
        {
          id: "node-1",
          scanId: "scan-1",
          target: "localhost:8888",
          layer: "L7",
          service: "http",
          port: 8888,
          riskScore: 0.8,
          status: "complete",
          parentId: null,
          depth: 0,
          createdAt: now
        }
      ],
      edges: []
    });

    const events: Array<{ type: string; report?: Report }> = [];
    const report = await reportModule.generateReport("scan-1", (event) => events.push(event), {
      provider: "local"
    });

    expect(report.topRisks[0]?.nodeTarget).toBe("localhost:8888");
    expect(report.executiveSummary).toContain("localhost:8888");
    expect(events.at(-1)?.type).toBe("report_ready");

    getFindingsForScanSpy.mockRestore();
    getAttackPathsSpy.mockRestore();
    getScanSpy.mockRestore();
    getGraphForScanSpy.mockRestore();
  });
});
