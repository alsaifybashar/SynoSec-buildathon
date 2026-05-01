import { describe, expect, it } from "vitest";
import {
  attackVectorPlanningWorkflowId,
  directScriptToolIds,
  getSeededRoleDefinition,
  seededToolDefinitions,
  getSeededWorkflowDefinitions,
  seededAgentId
} from "@/prisma/seed-data/ai-builder-defaults.js";

const canonicalPromptSections = [
  "Role and goal:",
  "Scope and safety boundaries:",
  "Evidence and reporting requirements:",
  "Blocked or failed behavior:"
] as const;

describe("getSeededWorkflowDefinitions", () => {
  it("seeds only the attack-vector planning workflow", () => {
    const workflows = getSeededWorkflowDefinitions();
    const planningWorkflow = workflows.find((candidate) => candidate.id === attackVectorPlanningWorkflowId);

    expect(workflows).toHaveLength(1);
    expect(planningWorkflow).toBeDefined();
    expect(planningWorkflow?.executionKind).toBe("workflow");
    expect(planningWorkflow?.stages.map((stage) => stage.label)).toEqual(["Attack Vector Planning"]);
    expect(planningWorkflow?.stages[0]?.agentId).toBe(seededAgentId("generic-pentester"));
    expect(planningWorkflow?.stages[0]?.allowedToolIds).toEqual(expect.arrayContaining([
      "builtin-http-surface-assessment",
      "builtin-content-discovery",
      "builtin-network-service-enumeration",
      "builtin-web-vulnerability-audit"
    ]));
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("Map plausible attack venues, attack vectors, and prioritized attack paths");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("Produce attackVenues, attackVectors, and attackPaths in the handoff.");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("Separate confirmed findings from unverified attack-path outcomes.");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).not.toContain("Examples:");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).not.toContain("<examples>");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).not.toContain("/api/support/cases/");
  });

  it("gives the seeded system prompts a canonical instruction shape", () => {
    const prompt = getSeededRoleDefinition("generic-pentester")?.systemPrompt;

    expect(prompt).toBeDefined();
    for (const section of canonicalPromptSections) {
      expect(prompt).toContain(section);
    }
  });

  it("seeds one generic pentester agent with attack-path-oriented guidance", () => {
    const genericPentester = getSeededRoleDefinition("generic-pentester");

    expect(genericPentester).toBeDefined();
    expect(genericPentester?.name).toBe("Wrapped Tool Family");
    expect(genericPentester?.toolAccessMode).toBe("system");
    expect(genericPentester?.systemPrompt).toContain("Map plausible attack paths");
    expect(genericPentester?.systemPrompt).toContain("Prefer evidence-backed findings over unsupported narrative.");
    expect(genericPentester?.systemPrompt).toContain("Separate confirmed findings from suspected or unverified conclusions.");
    expect(genericPentester?.systemPrompt).toContain("capture the relationship with explicit attack-vector records");
    expect(genericPentester?.systemPrompt).not.toContain("Examples:");
  });

  it("does not seed bash-backed runtime tools", () => {
    expect(seededToolDefinitions).toEqual([]);
    expect(directScriptToolIds).toEqual([]);
  });
});
