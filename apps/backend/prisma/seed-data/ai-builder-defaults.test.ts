import { describe, expect, it } from "vitest";
import {
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
  it("seeds only the compact evaluation workflow", () => {
    const workflows = getSeededWorkflowDefinitions();
    const compactWorkflow = workflows.find((candidate) => candidate.id === osiCompactFamilyWorkflowId);

    expect(workflows).toHaveLength(1);
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
  });

  it("gives the seeded system prompts a canonical instruction shape", () => {
    const prompts = [
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
