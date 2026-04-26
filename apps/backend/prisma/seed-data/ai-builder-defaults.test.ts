import { describe, expect, it } from "vitest";
import {
  attackVectorPlanningWorkflowId,
  getSeededRoleDefinition,
  seededToolDefinitions,
  getSeededWorkflowDefinitions,
  osiCompactFamilyWorkflowId,
  seededAgentId
} from "./ai-builder-defaults.js";

const canonicalPromptSections = [
  "Role and goal:",
  "Scope and safety boundaries:",
  "Evidence and reporting requirements:",
  "Completion requirements:",
  "Blocked or failed behavior:"
] as const;

describe("getSeededWorkflowDefinitions", () => {
  it("seeds the compact and attack-vector planning workflows", () => {
    const workflows = getSeededWorkflowDefinitions();
    const compactWorkflow = workflows.find((candidate) => candidate.id === osiCompactFamilyWorkflowId);
    const planningWorkflow = workflows.find((candidate) => candidate.id === attackVectorPlanningWorkflowId);

    expect(workflows).toHaveLength(2);
    expect(compactWorkflow).toBeDefined();
    expect(compactWorkflow?.executionKind).toBe("workflow");
    expect(compactWorkflow?.stages.map((stage) => stage.label)).toEqual(["Compact Evaluation"]);
    expect(compactWorkflow?.stages[0]?.agentId).toBe(seededAgentId("generic-pentester"));
    expect(compactWorkflow?.stages[0]?.allowedToolIds).toEqual(expect.arrayContaining([
      "builtin-http-surface-assessment",
      "builtin-content-discovery",
      "builtin-network-service-enumeration",
      "builtin-web-vulnerability-audit"
    ]));
    expect(compactWorkflow?.stages[0]?.allowedToolIds).not.toContain("builtin-memory-forensics");
    expect(compactWorkflow?.stages[0]?.objective).toContain("assessment intent rather than tool brands");

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
    expect(planningWorkflow?.stages[0]?.allowedToolIds).not.toContain("builtin-memory-forensics");
    expect(planningWorkflow?.stages[0]?.objective).toContain("link plausible vulnerabilities into explicit attack paths");
    expect(planningWorkflow?.stages[0]?.objective).toContain("report_finding");
    expect(planningWorkflow?.stages[0]?.objective).toContain("complete_run");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("attack vectors and attack venues");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("Before complete_run");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("report_finding");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("finding ids");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("handoff.attackVenues");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("handoff.attackVectors");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("handoff.attackPaths");
    expect(planningWorkflow?.stages[0]?.completionRule).toMatchObject({
      minFindings: 1,
      requireEvidenceBackedWeakness: true,
      requireChainedFindings: true
    });
    expect(planningWorkflow?.stages[0]?.handoffSchema).toMatchObject({
      required: ["attackVenues", "attackVectors", "attackPaths"]
    });
    expect(planningWorkflow?.stages[0]?.handoffSchema?.["properties"]).toMatchObject({
      attackVenues: expect.any(Object),
      attackVectors: expect.any(Object),
      attackPaths: expect.any(Object)
    });
  });

  it("gives the seeded system prompts a canonical instruction shape", () => {
    const prompts = [
      getSeededRoleDefinition("generic-pentester")?.systemPrompt
    ];

    for (const prompt of prompts) {
      expect(prompt).toBeDefined();
      for (const section of canonicalPromptSections) {
        expect(prompt).toContain(section);
      }
    }
  });

  it("seeds one generic pentester agent with attack-path-oriented guidance", () => {
    const genericPentester = getSeededRoleDefinition("generic-pentester");

    expect(genericPentester).toBeDefined();
    expect(genericPentester?.name).toBe("Generic Pentester");
    expect(genericPentester?.systemPrompt).toContain("map how weaknesses may connect");
    expect(genericPentester?.systemPrompt).toContain("Focus on linking potential vulnerabilities");
    expect(genericPentester?.systemPrompt).toContain("lower confidence and validationStatus such as suspected or unverified");
    expect(genericPentester?.systemPrompt).toContain("relationshipExplanations, chain, explanationSummary, and confidenceReason");
    expect(genericPentester?.systemPrompt).toContain("Do not ask for raw tool access");
    expect(genericPentester?.systemPrompt).toContain("Use only the available capability tools");
    expect(genericPentester?.systemPrompt).toContain("treat log_progress as secondary to high-quality report_finding calls");
    expect(genericPentester?.systemPrompt).toContain("report_finding is mandatory before complete_run");
    expect(genericPentester?.systemPrompt).not.toContain("raw pentest catalog");
    expect(genericPentester?.toolIds.every((toolId) => toolId.startsWith("builtin-"))).toBe(true);
  });

  it("does not seed legacy bash family wrapper tools", () => {
    expect(seededToolDefinitions.map((tool) => tool.id).filter((toolId) => toolId.startsWith("seed-family-"))).toEqual([]);
  });

  it("exposes steering inputs on the generalized seeded web adapters", () => {
    const toolIds = [
      "seed-content-discovery",
      "seed-web-crawl",
      "seed-vuln-audit"
    ];

    for (const toolId of toolIds) {
      const tool = seededToolDefinitions.find((candidate) => candidate.id === toolId);
      expect(tool).toBeDefined();
      expect(tool?.inputSchema).toMatchObject({
        properties: expect.objectContaining({
          candidatePaths: expect.any(Object),
          candidateEndpoints: expect.any(Object),
          candidateParameters: expect.any(Object),
          validationTargets: expect.any(Object),
          maxPaths: expect.any(Object),
          maxPages: expect.any(Object),
          notes: expect.any(Object)
        })
      });
    }
  });
});
