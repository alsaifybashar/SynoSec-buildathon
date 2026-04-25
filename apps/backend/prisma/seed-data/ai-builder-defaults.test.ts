import { describe, expect, it } from "vitest";
import {
  getSeededRoleDefinition,
  getSeededWorkflowDefinitions,
  localApplicationId,
  osiCompactFamilyWorkflowId,
  portfolioApplicationId,
  portfolioEvidenceGraphWorkflowId,
  seededAgentId
} from "./ai-builder-defaults.js";

describe("getSeededWorkflowDefinitions", () => {
  it("seeds the default workflow catalog including the compact evaluation workflow", () => {
    const workflows = getSeededWorkflowDefinitions();
    const workflow = workflows.find((candidate) => candidate.name === "Single-Agent");
    const attackMapWorkflow = workflows.find((candidate) => candidate.name === "Orchestration Attack Map");
    const compactWorkflow = workflows.find((candidate) => candidate.id === osiCompactFamilyWorkflowId);
    const portfolioWorkflow = workflows.find((candidate) => candidate.id === portfolioEvidenceGraphWorkflowId);

    expect(workflows).toHaveLength(4);
    expect(workflow).toBeDefined();
    expect(workflow?.executionKind).toBe("workflow");
    expect(workflow?.description).toContain("transparent evidence pipeline");
    expect(workflow?.stages.map((stage) => stage.label)).toEqual(["Pipeline"]);
    expect(workflow?.stages[0]?.objective).toContain("transparent pipeline");
    expect(workflow?.stages[0]?.objective).toContain("operator-visible progress updates");
    expect(workflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "orchestrator"));
    expect(workflow?.stages[0]?.allowedToolIds).toEqual([
      ...getSeededRoleDefinition("orchestrator")?.toolIds ?? [],
      "seed-vuln-audit"
    ]);
    expect(attackMapWorkflow).toBeDefined();
    expect(attackMapWorkflow?.executionKind).toBe("attack-map");
    expect(attackMapWorkflow?.stages.map((stage) => stage.label)).toEqual(["Attack Map"]);
    expect(attackMapWorkflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "orchestrator"));
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
    expect(portfolioWorkflow?.stages[0]?.agentId).toBe(seededAgentId("anthropic", "compact-evaluator"));
    expect(portfolioWorkflow?.stages[0]?.allowedToolIds).toEqual([
      ...getSeededRoleDefinition("compact-evaluator")?.toolIds ?? []
    ]);
    expect(portfolioWorkflow?.stages[0]?.objective).toContain("Treat OSI-inspired terms only as shorthand for dependency boundaries");
    expect(portfolioWorkflow?.stages[0]?.objective).toContain("derivedFromFindingIds, relatedFindingIds, or enablesFindingIds");
    expect(portfolioWorkflow?.stages[0]?.objective).toContain("highest-confidence connected findings");
    expect(portfolioWorkflow?.stages[0]?.objective).toContain("minimum-cut remediation");
    expect(attackMapWorkflow?.stages[0]?.objective).toContain("operator-visible progress updates");
    expect(compactWorkflow?.stages[0]?.objective).toContain("operator-visible progress updates");
    expect(workflow?.applicationId).toBe(localApplicationId);
    expect(attackMapWorkflow?.applicationId).toBe(localApplicationId);
    expect(compactWorkflow?.applicationId).toBe(localApplicationId);
    expect(portfolioWorkflow?.applicationId).toBe(portfolioApplicationId);
  });

  it("steers the compact evaluator toward evidence-graph reporting", () => {
    const compactEvaluator = getSeededRoleDefinition("compact-evaluator");

    expect(compactEvaluator?.systemPrompt).toContain("Prefer structured evidence-backed findings over free-form narrative.");
    expect(compactEvaluator?.systemPrompt).toContain("Distinguish confirmed findings, plausible hypotheses, and rejected leads");
    expect(compactEvaluator?.systemPrompt).toContain("derivedFromFindingIds, relatedFindingIds, or enablesFindingIds");
    expect(compactEvaluator?.systemPrompt).toContain("treat log_progress as secondary to high-quality report_finding calls");
  });
});
