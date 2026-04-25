import { describe, expect, it } from "vitest";
import {
  getSeededWorkflowDefinitions,
  localApplicationId,
  seededAgentId
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
    expect(workflow?.applicationId).toBe(localApplicationId);
    expect(attackMapWorkflow?.applicationId).toBe(localApplicationId);
  });
});
