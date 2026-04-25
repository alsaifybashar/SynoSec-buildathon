import { describe, expect, it } from "vitest";
import {
  getSeededSingleAgentScanDefinition,
  getSeededWorkflowDefinitions,
  seededAgentId,
  seededSingleAgentScanId,
  seededSingleAgentVulnerabilityId
} from "./ai-builder-defaults.js";

describe("getSeededWorkflowDefinitions", () => {
  it("seeds the default workflow catalog including the attack-map workflow", () => {
    const workflows = getSeededWorkflowDefinitions();
    const workflow = workflows.find((candidate) => candidate.name === "OSI Single-Agent");
    const attackMapWorkflow = workflows.find((candidate) => candidate.name === "Orchestration Attack Map");

    expect(workflows).toHaveLength(2);
    expect(workflow).toBeDefined();
    expect(workflow?.executionKind).toBe("workflow");
    expect(workflow?.description).toContain("transparent evidence pipeline");
    expect(workflow?.stages.map((stage) => stage.label)).toEqual(["Pipeline"]);
    expect(workflow?.stages[0]?.objective).toContain("transparent pipeline");
    expect(workflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "orchestrator"));
    expect(attackMapWorkflow).toBeDefined();
    expect(attackMapWorkflow?.executionKind).toBe("attack-map");
    expect(attackMapWorkflow?.stages.map((stage) => stage.label)).toEqual(["Attack Map"]);
    expect(attackMapWorkflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "orchestrator"));
  });
});

describe("getSeededSingleAgentScanDefinition", () => {
  it("seeds one completed single-agent scan with artifacts for the local target", () => {
    const scan = getSeededSingleAgentScanDefinition();

    expect(scan.id).toBe(seededSingleAgentScanId);
    expect(scan.scan.status).toBe("complete");
    expect(scan.scan.scope.layers).toEqual(["L1", "L4", "L7"]);
    expect(scan.agentId).toBe(seededAgentId("anthropic", "orchestrator"));
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
