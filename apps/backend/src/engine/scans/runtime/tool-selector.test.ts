import { describe, expect, it } from "vitest";
import type { AiTool, OsiLayer, ScanLayerCoverage } from "@synosec/contracts";
import { selectToolsForContext } from "./tool-selector.js";

function createTool(overrides: Partial<AiTool> & Pick<AiTool, "id" | "name" | "category" | "riskTier">): AiTool {
  return {
    id: overrides.id,
    name: overrides.name,
    status: "active",
    source: "system",
    description: overrides.description ?? null,
    executorType: "bash",
    bashSource: overrides.bashSource ?? "#!/usr/bin/env bash\necho ok",
    capabilities: overrides.capabilities ?? [],
    category: overrides.category,
    riskTier: overrides.riskTier,
    timeoutMs: overrides.timeoutMs ?? 30000,
    inputSchema: overrides.inputSchema ?? { type: "object", properties: {} },
    outputSchema: overrides.outputSchema ?? { type: "object", properties: {} },
    createdAt: overrides.createdAt ?? "2026-04-24T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-24T00:00:00.000Z"
  };
}

function createCoverage(layer: OsiLayer, coverageStatus: ScanLayerCoverage["coverageStatus"]): ScanLayerCoverage {
  return {
    scanId: "scan-1",
    layer,
    coverageStatus,
    confidenceSummary: `${layer} is ${coverageStatus}`,
    toolRefs: [],
    evidenceRefs: [],
    vulnerabilityIds: [],
    gaps: [],
    updatedAt: "2026-04-24T00:00:00.000Z"
  };
}

describe("selectToolsForContext", () => {
  it("hard-gates controlled exploit tools when active exploits are not allowed", () => {
    const selected = selectToolsForContext(
      [
        createTool({ id: "seed-sql-injection-check", name: "SQL Injection Check", category: "web", riskTier: "controlled-exploit" }),
        createTool({ id: "seed-http-recon", name: "HTTP Recon", category: "web", riskTier: "passive" }),
        createTool({ id: "seed-web-crawl", name: "Web Crawl", category: "content", riskTier: "passive" })
      ],
      {
        requestedLayers: ["L7"],
        currentCoverage: new Map(),
        executedToolIds: [],
        findings: [],
        allowActiveExploits: false
      },
      { maxTools: 3, minTools: 2 }
    );

    expect(selected.map((tool) => tool.id)).not.toContain("seed-sql-injection-check");
  });

  it("prefers tools aligned to uncovered requested layers and penalizes recently executed tools", () => {
    const selected = selectToolsForContext(
      [
        createTool({ id: "seed-http-recon", name: "HTTP Recon", category: "web", riskTier: "passive" }),
        createTool({ id: "seed-service-scan", name: "Service Scan", category: "network", riskTier: "passive" }),
        createTool({ id: "seed-vuln-audit", name: "Vulnerability Audit", category: "web", riskTier: "active" })
      ],
      {
        requestedLayers: ["L4", "L7"],
        currentCoverage: new Map<OsiLayer, ScanLayerCoverage>([
          ["L7", createCoverage("L7", "covered")]
        ]),
        executedToolIds: ["seed-http-recon"],
        findings: [],
        allowActiveExploits: true
      },
      { maxTools: 2, minTools: 2 }
    );

    expect(selected[0]?.id).toBe("seed-service-scan");
  });

  it("guarantees category diversity when the top slice is homogeneous", () => {
    const selected = selectToolsForContext(
      [
        createTool({ id: "seed-http-recon", name: "HTTP Recon", category: "web", riskTier: "passive" }),
        createTool({ id: "seed-http-headers", name: "HTTP Headers", category: "web", riskTier: "passive" }),
        createTool({ id: "seed-web-crawl", name: "Web Crawl", category: "content", riskTier: "passive" }),
        createTool({ id: "seed-bash-probe", name: "Bash Probe", category: "utility", riskTier: "passive" })
      ],
      {
        requestedLayers: ["L7"],
        currentCoverage: new Map(),
        executedToolIds: [],
        findings: [],
        allowActiveExploits: false
      },
      { maxTools: 2, minTools: 2 }
    );

    expect(new Set(selected.map((tool) => tool.category)).size).toBeGreaterThan(1);
  });
});
