import { describe, expect, it } from "vitest";
import {
  getSeededSingleAgentScanDefinition,
  getSeededWorkflowDefinitions,
  seededAgentId,
  seededSingleAgentScanId,
  seededSingleAgentVulnerabilityId
} from "./ai-builder-defaults.js";

describe("getSeededWorkflowDefinitions", () => {
  it("seeds only the OSI single-agent workflow", () => {
    const workflows = getSeededWorkflowDefinitions();
    const workflow = workflows.find((candidate) => candidate.name === "OSI Single-Agent");

    expect(workflows).toHaveLength(1);
    expect(workflow).toBeDefined();
    expect(workflow?.description).toContain("prompt-driven OSI security pass");
    expect(workflow?.stages.map((stage) => stage.label)).toEqual(["OSI Security Pass"]);
    expect(workflow?.stages[0]?.objective).toContain("prompt-driven");
    expect(workflow?.stages[0]?.agentId).toBe(seededAgentId("local", "orchestrator"));
  });
});

describe("getSeededSingleAgentScanDefinition", () => {
  it("seeds one completed single-agent scan with artifacts for the local target", () => {
    const scan = getSeededSingleAgentScanDefinition();

    expect(scan.id).toBe(seededSingleAgentScanId);
    expect(scan.scan.status).toBe("complete");
    expect(scan.scan.scope.layers).toEqual(["L1", "L4", "L7"]);
    expect(scan.agentId).toBe(seededAgentId("local", "orchestrator"));
    expect(scan.layerCoverage.map((entry) => entry.layer)).toEqual(["L1", "L4", "L7"]);
    expect(scan.vulnerability.id).toBe(seededSingleAgentVulnerabilityId);
    expect(scan.vulnerability.primaryLayer).toBe("L7");
    expect(scan.auditEntries.map((entry) => entry.action)).toEqual([
      "single-agent-scan-started",
      "single-agent-vulnerability-reported",
      "single-agent-scan-completed"
    ]);
  });
});
