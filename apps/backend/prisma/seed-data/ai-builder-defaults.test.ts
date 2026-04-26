import { describe, expect, it } from "vitest";
import {
  adaptivePlanningAttackMapWorkflowId,
  getSeededRoleDefinition,
  getSeededWorkflowDefinitions,
  localApplicationId,
  osiCompactFamilyWorkflowId,
  portfolioApplicationId,
  portfolioEvidenceGraphWorkflowId,
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
  it("seeds the default workflow catalog including the compact evaluation workflow", () => {
    const workflows = getSeededWorkflowDefinitions();
    const workflow = workflows.find((candidate) => candidate.name === "Single-Agent");
    const attackMapWorkflow = workflows.find((candidate) => candidate.name === "Orchestration Attack Map");
    const adaptiveAttackMapWorkflow = workflows.find((candidate) => candidate.id === adaptivePlanningAttackMapWorkflowId);
    const compactWorkflow = workflows.find((candidate) => candidate.id === osiCompactFamilyWorkflowId);
    const portfolioWorkflow = workflows.find((candidate) => candidate.id === portfolioEvidenceGraphWorkflowId);

    expect(workflows).toHaveLength(5);
    expect(workflow).toBeDefined();
    expect(workflow?.executionKind).toBe("workflow");
    expect(workflow?.description).toContain("transparent evidence pipeline");
    expect(workflow?.stages.map((stage) => stage.label)).toEqual(["Pipeline"]);
    expect(workflow?.stages[0]?.objective).toContain("transparent evidence-backed pipeline");
    expect(workflow?.stages[0]?.objective).toContain("progress updates short and operator-visible");
    expect(workflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "orchestrator"));
    expect(workflow?.stages[0]?.allowedToolIds).toEqual([
      ...getSeededRoleDefinition("orchestrator")?.toolIds ?? [],
      "seed-vuln-audit"
    ]);
    expect(attackMapWorkflow).toBeDefined();
    expect(attackMapWorkflow?.executionKind).toBe("attack-map");
    expect(attackMapWorkflow?.stages.map((stage) => stage.label)).toEqual(["Attack Map"]);
    expect(attackMapWorkflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "orchestrator"));
    expect(adaptiveAttackMapWorkflow).toBeDefined();
    expect(adaptiveAttackMapWorkflow?.executionKind).toBe("attack-map");
    expect(adaptiveAttackMapWorkflow?.description).toContain("continuously updates its attack plan");
    expect(adaptiveAttackMapWorkflow?.stages.map((stage) => stage.label)).toEqual(["Adaptive Attack Map"]);
    expect(adaptiveAttackMapWorkflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "orchestrator"));
    expect(adaptiveAttackMapWorkflow?.stages[0]?.objective).toContain("update the plan after each completed phase");
    expect(adaptiveAttackMapWorkflow?.stages[0]?.objective).toContain("skip stale paths");
    expect(compactWorkflow).toBeDefined();
    expect(compactWorkflow?.executionKind).toBe("workflow");
    expect(compactWorkflow?.stages.map((stage) => stage.label)).toEqual(["Compact Evaluation"]);
    expect(compactWorkflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "compact-evaluator"));
    expect(compactWorkflow?.stages[0]?.allowedToolIds).toEqual([
      ...getSeededRoleDefinition("compact-evaluator")?.toolIds ?? []
    ]);
    expect(portfolioWorkflow).toBeDefined();
    expect(portfolioWorkflow?.executionKind).toBe("workflow");
    expect(portfolioWorkflow?.description).toContain("evidence-graph-oriented reporting");
    expect(portfolioWorkflow?.stages.map((stage) => stage.label)).toEqual(["Portfolio Assessment"]);
    expect(portfolioWorkflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "portfolio-evaluator"));
    expect(portfolioWorkflow?.stages[0]?.allowedToolIds).toEqual([
      ...getSeededRoleDefinition("portfolio-evaluator")?.toolIds ?? []
    ]);
    expect(portfolioWorkflow?.stages[0]?.objective).toContain("prerendered Nuxt site");
    expect(portfolioWorkflow?.stages[0]?.objective).toContain("headers, redirects, public assets, sitemap and robots exposure");
    expect(portfolioWorkflow?.stages[0]?.objective).toContain("derivedFromFindingIds, relatedFindingIds, or enablesFindingIds");
    expect(portfolioWorkflow?.stages[0]?.objective).toContain("highest-confidence connected findings");
    expect(portfolioWorkflow?.stages[0]?.objective).toContain("minimum-cut remediation");
    expect(attackMapWorkflow?.stages[0]?.objective).toContain("Prioritize realistic attack paths");
    expect(attackMapWorkflow?.stages[0]?.objective).toContain("strongest supported path");
    expect(compactWorkflow?.stages[0]?.objective).toContain("family capabilities rather than tool brands");
    expect(workflow?.stages[0]?.objective).toContain("transparent evidence-backed pipeline");
    expect(workflow?.applicationId).toBe(localApplicationId);
    expect(attackMapWorkflow?.applicationId).toBe(localApplicationId);
    expect(adaptiveAttackMapWorkflow?.applicationId).toBe(localApplicationId);
    expect(compactWorkflow?.applicationId).toBe(localApplicationId);
    expect(portfolioWorkflow?.applicationId).toBe(portfolioApplicationId);
  });

  it("gives the seeded system prompts a canonical instruction shape", () => {
    const prompts = [
      getSeededRoleDefinition("orchestrator")?.systemPrompt,
      getSeededRoleDefinition("compact-evaluator")?.systemPrompt,
      getSeededRoleDefinition("portfolio-evaluator")?.systemPrompt
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

  it("gives the portfolio workflow its own seeded evaluator agent", () => {
    const portfolioEvaluator = getSeededRoleDefinition("portfolio-evaluator");

    expect(portfolioEvaluator).toBeDefined();
    expect(portfolioEvaluator?.name).toBe("Portfolio Evaluator");
    expect(portfolioEvaluator?.toolIds).toEqual([
      ...getSeededRoleDefinition("compact-evaluator")?.toolIds ?? []
    ]);
    expect(portfolioEvaluator?.systemPrompt).toContain("portfolio-style web targets");
    expect(portfolioEvaluator?.systemPrompt).toContain("evidence-graph-first reporting");
    expect(portfolioEvaluator?.systemPrompt).toContain("Treat OSI-inspired language only as shorthand");
    expect(portfolioEvaluator?.systemPrompt).toContain("derivedFromFindingIds, relatedFindingIds, or enablesFindingIds");
    expect(portfolioEvaluator?.systemPrompt).not.toContain("prerendered Nuxt site");
    expect(portfolioEvaluator?.systemPrompt).not.toContain("headers, redirects, public assets, sitemap and robots exposure");
  });
});
