import { describe, expect, it } from "vitest";
import {
  getSeededWorkflowDefinitions,
  localApplicationId,
  osiCompactFamilyWorkflowId,
  seededAgentId
} from "./ai-builder-defaults.js";

describe("getSeededWorkflowDefinitions", () => {
  it("seeds the default workflow catalog including the compact evaluation workflow", () => {
    const workflows = getSeededWorkflowDefinitions();
    const workflow = workflows.find((candidate) => candidate.name === "OSI Single-Agent");
    const attackMapWorkflow = workflows.find((candidate) => candidate.name === "Orchestration Attack Map");
    const compactWorkflow = workflows.find((candidate) => candidate.id === osiCompactFamilyWorkflowId);

    expect(workflows).toHaveLength(3);
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
    expect(compactWorkflow).toBeDefined();
    expect(compactWorkflow?.executionKind).toBe("workflow");
    expect(compactWorkflow?.stages.map((stage) => stage.label)).toEqual(["Compact Evaluation"]);
    expect(compactWorkflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "compact-evaluator"));
    expect(compactWorkflow?.stages[0]?.allowedToolIds).toEqual([
      "seed-family-http-surface",
      "seed-family-network-enumeration",
      "seed-family-subdomain-discovery",
      "seed-family-web-crawl",
      "seed-family-content-discovery",
      "seed-family-vulnerability-validation"
    ]);
    expect(workflow?.applicationId).toBe(localApplicationId);
    expect(attackMapWorkflow?.applicationId).toBe(localApplicationId);
    expect(compactWorkflow?.applicationId).toBe(localApplicationId);
  });
});
