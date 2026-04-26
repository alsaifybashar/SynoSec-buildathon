import { describe, expect, it } from "vitest";
import {
  attackVectorPlanningWorkflowId,
  bashSingleToolWorkflowId,
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
  "Blocked or failed behavior:"
] as const;

describe("getSeededWorkflowDefinitions", () => {
  it("seeds the compact, attack-vector planning, and bash PoC workflows", () => {
    const workflows = getSeededWorkflowDefinitions();
    const compactWorkflow = workflows.find((candidate) => candidate.id === osiCompactFamilyWorkflowId);
    const planningWorkflow = workflows.find((candidate) => candidate.id === attackVectorPlanningWorkflowId);
    const bashWorkflow = workflows.find((candidate) => candidate.id === bashSingleToolWorkflowId);

    expect(workflows).toHaveLength(3);
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
    expect(compactWorkflow?.stages[0]?.objective).not.toContain("complete_run");

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
    expect(planningWorkflow?.stages[0]?.objective).toContain("Link plausible vulnerabilities into explicit attack paths");
    expect(planningWorkflow?.stages[0]?.objective).not.toContain("report_finding");
    expect(planningWorkflow?.stages[0]?.objective).not.toContain("complete_run");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("attack venues, attack vectors, and prioritized attack paths");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).not.toContain("Before complete_run");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).not.toContain("Call complete_run");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("finding ids");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("attackVenues");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("attackVectors");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("attackPaths");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("Do not describe an attack path as confirmed compromise");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("Separate confirmed findings from unproven attack-path outcomes");
    expect(planningWorkflow?.stages[0]?.completionRule).toMatchObject({
      minFindings: 1,
      requireEvidenceBackedWeakness: true,
      requireChainedFindings: true
    });
    expect(planningWorkflow?.stages[0]?.handoffSchema).toMatchObject({
      additionalProperties: false,
      required: ["attackVenues", "attackVectors", "attackPaths"]
    });
    expect(planningWorkflow?.stages[0]?.handoffSchema?.["properties"]).toMatchObject({
      attackVenues: {
        minItems: 1,
        items: {
          additionalProperties: false,
          properties: {
            findingIds: { items: { format: "uuid" } }
          }
        }
      },
      attackVectors: {
        items: {
          properties: {
            confidence: { minimum: 0, maximum: 1 }
          }
        }
      },
      attackPaths: {
        items: {
          properties: {
            severity: { enum: ["info", "low", "medium", "high", "critical"] }
          }
        }
      }
    });

    expect(bashWorkflow).toBeDefined();
    expect(bashWorkflow?.executionKind).toBe("workflow");
    expect(bashWorkflow?.stages.map((stage) => stage.label)).toEqual(["Bash Execution"]);
    expect(bashWorkflow?.stages[0]?.agentId).toBe(seededAgentId("bash-poc-agent"));
    expect(bashWorkflow?.stages[0]?.allowedToolIds).toEqual([
      "builtin-log-progress",
      "builtin-report-finding",
      "builtin-complete-run",
      "seed-agent-bash-command"
    ]);
    expect(bashWorkflow?.stages[0]?.completionRule).toMatchObject({
      requireToolCall: true,
      requireEvidenceBackedWeakness: false
    });
  });

  it("gives the seeded system prompts a canonical instruction shape", () => {
    const prompts = [
      getSeededRoleDefinition("generic-pentester")?.systemPrompt,
      getSeededRoleDefinition("bash-poc-agent")?.systemPrompt
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
    expect(genericPentester?.systemPrompt).toContain("Map how weaknesses may connect");
    expect(genericPentester?.systemPrompt).toContain("Focus on linking potential vulnerabilities");
    expect(genericPentester?.systemPrompt).toContain("lower confidence and validationStatus such as suspected or unverified");
    expect(genericPentester?.systemPrompt).toContain("relationshipExplanations, chain, explanationSummary, and confidenceReason");
    expect(genericPentester?.systemPrompt).toContain("Do not ask for raw tool access");
    expect(genericPentester?.systemPrompt).toContain("Keep operator-visible progress updates short");
    expect(genericPentester?.systemPrompt).not.toContain("SynoSec");
    expect(genericPentester?.systemPrompt).not.toContain("Do not expose private chain-of-thought");
    expect(genericPentester?.systemPrompt).not.toContain("report_finding is mandatory before complete_run");
    expect(genericPentester?.systemPrompt).not.toContain("raw pentest catalog");
    expect(genericPentester?.toolIds.every((toolId) => toolId.startsWith("builtin-"))).toBe(true);
  });

  it("seeds a bash PoC agent with only the single seeded bash command tool", () => {
    const bashAgent = getSeededRoleDefinition("bash-poc-agent");

    expect(bashAgent).toBeDefined();
    expect(bashAgent?.name).toBe("Bash PoC Agent");
    expect(bashAgent?.systemPrompt).toContain("Write bash source in the `command` argument.");
    expect(bashAgent?.systemPrompt).toContain("`cwd`, `timeout_ms`, `env`, `stdin`");
    expect(bashAgent?.toolIds).toEqual(["seed-agent-bash-command"]);
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

  it("seeds the agent bash command tool with structured command input", () => {
    const tool = seededToolDefinitions.find((candidate) => candidate.id === "seed-agent-bash-command");

    expect(tool).toBeDefined();
    expect(tool?.executorType).toBe("bash");
    expect(tool?.inputSchema).toMatchObject({
      required: ["command"],
      properties: {
        command: { type: "string" },
        cwd: { type: "string" },
        timeout_ms: { type: "number" }
      }
    });
  });
});
