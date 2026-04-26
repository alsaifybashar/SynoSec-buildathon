import { describe, expect, it } from "vitest";
import {
  attackVectorPlanningWorkflowId,
  getSeededRoleDefinition,
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
    expect(compactWorkflow?.stages[0]?.agentId).toBe(seededAgentId("compact-evaluator"));
    expect(compactWorkflow?.stages[0]?.allowedToolIds).toEqual(expect.arrayContaining([
      "builtin-http-surface-assessment",
      "builtin-content-discovery",
      "builtin-network-host-discovery",
      "builtin-memory-forensics"
    ]));
    expect(compactWorkflow?.stages[0]?.objective).toContain("family capabilities rather than tool brands");

    expect(planningWorkflow).toBeDefined();
    expect(planningWorkflow?.executionKind).toBe("workflow");
    expect(planningWorkflow?.stages.map((stage) => stage.label)).toEqual(["Attack Vector Planning"]);
    expect(planningWorkflow?.stages[0]?.agentId).toBe(seededAgentId("attack-vector-planner"));
    expect(planningWorkflow?.stages[0]?.allowedToolIds).toEqual(expect.arrayContaining([
      "builtin-http-surface-assessment",
      "builtin-content-discovery",
      "builtin-network-host-discovery",
      "builtin-memory-forensics"
    ]));
    expect(planningWorkflow?.stages[0]?.objective).toContain("link plausible vulnerabilities into explicit attack paths");
    expect(planningWorkflow?.stages[0]?.objective).toContain("report_finding");
    expect(planningWorkflow?.stages[0]?.objective).toContain("complete_run");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("attack vectors and attack venues");
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
      getSeededRoleDefinition("compact-evaluator")?.systemPrompt,
      getSeededRoleDefinition("attack-vector-planner")?.systemPrompt
    ];

    for (const prompt of prompts) {
      expect(prompt).toBeDefined();
      for (const section of canonicalPromptSections) {
        expect(prompt).toContain(section);
      }
    }
  });

  it("steers the compact evaluator toward semantic-family evidence reporting", () => {
    const compactEvaluator = getSeededRoleDefinition("compact-evaluator");

    expect(compactEvaluator?.systemPrompt).toContain("semantic tool families rather than raw tool brands");
    expect(compactEvaluator?.systemPrompt).toContain("Use only the available semantic family tools");
    expect(compactEvaluator?.systemPrompt).toContain("Prefer structured evidence-backed findings over free-form narrative.");
    expect(compactEvaluator?.systemPrompt).toContain("Distinguish confirmed findings, plausible hypotheses, and rejected leads");
    expect(compactEvaluator?.systemPrompt).toContain("derivedFromFindingIds, relatedFindingIds, or enablesFindingIds");
    expect(compactEvaluator?.systemPrompt).toContain("treat log_progress as secondary to high-quality report_finding calls");
    expect(compactEvaluator?.systemPrompt).not.toContain("stop when confidence stops improving");
  });

  it("steers the attack vector planner toward linked vulnerability mapping", () => {
    const attackVectorPlanner = getSeededRoleDefinition("attack-vector-planner");

    expect(attackVectorPlanner).toBeDefined();
    expect(attackVectorPlanner?.name).toBe("Attack Vector Planner");
    expect(attackVectorPlanner?.toolIds).toEqual([
      ...getSeededRoleDefinition("compact-evaluator")?.toolIds ?? []
    ]);
    expect(attackVectorPlanner?.systemPrompt).toContain("map how weaknesses may connect");
    expect(attackVectorPlanner?.systemPrompt).toContain("Focus on linking potential vulnerabilities");
    expect(attackVectorPlanner?.systemPrompt).toContain("lower confidence and validationStatus such as suspected or unverified");
    expect(attackVectorPlanner?.systemPrompt).toContain("relationshipExplanations, chain, explanationSummary, and confidenceReason");
    expect(attackVectorPlanner?.systemPrompt).toContain("Do not ask for raw tool access");
    expect(attackVectorPlanner?.systemPrompt).not.toContain("raw pentest catalog");
  });
});
