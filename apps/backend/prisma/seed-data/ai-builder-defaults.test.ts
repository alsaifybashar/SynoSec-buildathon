import { describe, expect, it } from "vitest";
import {
  attackVectorPlanningWorkflowId,
  bashSingleToolWorkflowId,
  broadScriptToolIds,
  broadScriptToolWorkflowId,
  directScriptToolIds,
  getSeededRoleDefinition,
  seededToolDefinitions,
  getSeededWorkflowDefinitions,
  seededAgentId
} from "./ai-builder-defaults.js";

const canonicalPromptSections = [
  "Role and goal:",
  "Scope and safety boundaries:",
  "Evidence and reporting requirements:",
  "Blocked or failed behavior:"
] as const;

const exampleTags = [
  "<examples>",
  "<example>",
  "<input>",
  "<expected_behavior>"
] as const;

function countMatches(text: string, pattern: string) {
  return text.split(pattern).length - 1;
}

describe("getSeededWorkflowDefinitions", () => {
  it("seeds the attack-vector planning and bash PoC workflows", () => {
    const workflows = getSeededWorkflowDefinitions();
    const planningWorkflow = workflows.find((candidate) => candidate.id === attackVectorPlanningWorkflowId);
    const bashWorkflow = workflows.find((candidate) => candidate.id === bashSingleToolWorkflowId);
    const broadScriptWorkflow = workflows.find((candidate) => candidate.id === broadScriptToolWorkflowId);

    expect(workflows).toHaveLength(3);

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
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("Examples:");
    for (const tag of exampleTags) {
      expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain(tag);
    }
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("/api/support/cases/cs-4821?workspace=acme-support");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("/api/auth/magic-link");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("/api/release/secrets");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("Do not invent those auth or approval surfaces as the next step.");
    expect(planningWorkflow?.stages[0]?.stageSystemPrompt).toContain("Prefer one derived transition request using the observed artifact over repeating the same audit, crawl, or fetch with no new hypothesis.");
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
            findingIds: { items: { type: "string", minLength: 1 } }
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
      "builtin-report-attack-vectors",
      "builtin-complete-run",
      "seed-agent-bash-command"
    ]);
    expect(bashWorkflow?.stages[0]?.stageSystemPrompt).toContain(
      "Evaluate the target’s cybersecurity with an attack-path-first approach."
    );
    expect(bashWorkflow?.stages[0]?.stageSystemPrompt).toContain("Examples:");
    for (const tag of exampleTags) {
      expect(bashWorkflow?.stages[0]?.stageSystemPrompt).toContain(tag);
    }
    expect(bashWorkflow?.stages[0]?.stageSystemPrompt).not.toContain(
      "Complete the current workflow stage using the approved capability surface for this run."
    );
    expect(bashWorkflow?.stages[0]?.completionRule).toMatchObject({
      requireToolCall: true,
      requireEvidenceBackedWeakness: false
    });

    expect(broadScriptWorkflow).toBeDefined();
    expect(broadScriptWorkflow?.executionKind).toBe("workflow");
    expect(broadScriptWorkflow?.stages.map((stage) => stage.label)).toEqual(["Broad Script Execution"]);
    expect(broadScriptWorkflow?.stages[0]?.agentId).toBe(seededAgentId("broad-script-agent"));
    expect(broadScriptWorkflow?.stages[0]?.allowedToolIds).toEqual([
      "builtin-log-progress",
      "builtin-report-finding",
      "builtin-report-attack-vectors",
      "builtin-complete-run",
      ...broadScriptToolIds
    ]);
    expect(broadScriptWorkflow?.stages[0]?.allowedToolIds).not.toContain("builtin-report-attack-vector");
    expect(broadScriptWorkflow?.stages[0]?.allowedToolIds).not.toContain("seed-agent-bash-command");
    expect(broadScriptWorkflow?.stages[0]?.objective).toContain("approved direct script-backed tools");
    expect(broadScriptWorkflow?.stages[0]?.completionRule).toMatchObject({
      requireToolCall: true,
      requireEvidenceBackedWeakness: false
    });
  });

  it("gives the seeded system prompts a canonical instruction shape", () => {
    const prompts = [
      getSeededRoleDefinition("generic-pentester")?.systemPrompt,
      getSeededRoleDefinition("bash-poc-agent")?.systemPrompt,
      getSeededRoleDefinition("broad-script-agent")?.systemPrompt
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
    expect(genericPentester?.name).toBe("Wrapped Tool Family");
    expect(genericPentester?.systemPrompt).toContain("Map how weaknesses may connect");
    expect(genericPentester?.systemPrompt).toContain("Focus on linking potential vulnerabilities");
    expect(genericPentester?.systemPrompt).toContain("lower confidence and validationStatus such as suspected or unverified");
    expect(genericPentester?.systemPrompt).toContain("report the findings first and then capture the relationship with explicit attack-vector records");
    expect(genericPentester?.systemPrompt).toContain("Do not ask for raw tool access");
    expect(genericPentester?.systemPrompt).toContain("Keep operator-visible progress updates short");
    expect(genericPentester?.systemPrompt).not.toContain("SynoSec");
    expect(genericPentester?.systemPrompt).not.toContain("Do not expose private chain-of-thought");
    expect(genericPentester?.systemPrompt).not.toContain("report_finding is mandatory before complete_run");
    expect(genericPentester?.systemPrompt).not.toContain("raw pentest catalog");
    expect(genericPentester?.toolAccessMode).toBe("system");
  });

  it("seeds a bash PoC agent with only the single seeded bash command tool", () => {
    const bashAgent = getSeededRoleDefinition("bash-poc-agent");

    expect(bashAgent).toBeDefined();
    expect(bashAgent?.name).toBe("Just Bash");
    expect(bashAgent?.systemPrompt).toContain("Evaluate the target’s cybersecurity with an attack-path-first approach.");
    expect(bashAgent?.systemPrompt).toContain("multiple lower-severity weaknesses can be chained");
    expect(bashAgent?.systemPrompt).toContain("invoke installed binaries available in the execution environment");
    expect(bashAgent?.systemPrompt).toContain("derive the exact next request");
    expect(bashAgent?.systemPrompt).toContain("Do not invent unsupported endpoint families such as `/promote` or `/validate`");
    expect(bashAgent?.systemPrompt).toContain("Validate attack vectors by proving that output from one step is accepted by the next step.");
    expect(bashAgent?.systemPrompt).toContain("Prefer one concrete transition validation over repeated fetches of already-seen pages");
    expect(bashAgent?.systemPrompt).toContain("Do not treat scanner-friendly issues as the main result");
    expect(bashAgent?.systemPrompt).toContain("Stop probing unsupported routes after route-not-found style errors");
    expect(bashAgent?.systemPrompt).toContain("Examples:");
    expect(bashAgent?.systemPrompt).toContain("Make the derived request next: `GET /api/support/cases/cs-4821?workspace=acme-support`.");
    expect(bashAgent?.systemPrompt).toContain("Test the exact adjacent endpoint next: `POST /api/auth/magic-link` with that `email` and `nonce`.");
    expect(bashAgent?.systemPrompt).toContain("Use those exact prerequisites to test `GET /api/release/secrets?buildId=rel-202`");
    expect(bashAgent?.systemPrompt).toContain("Do not invent those auth or approval surfaces.");
    expect(bashAgent?.systemPrompt).toContain("Do not switch to invented `/login` or password-reset routes");
    expect(bashAgent?.systemPrompt).toContain("Prefer one derived transition request using the observed artifact over repeating the same audit, crawl, or fetch on already-seen pages.");
    expect(bashAgent?.systemPrompt).not.toContain("Suggested attack-path workflow:");
    expect(bashAgent?.systemPrompt).not.toContain("Available dependencies:");
    expect(bashAgent?.systemPrompt).not.toContain("sqlmap");
    expect(bashAgent?.systemPrompt).not.toContain("wpscan");
    expect(countMatches(bashAgent?.systemPrompt ?? "", "Do not treat scanner-friendly issues as the main result")).toBe(1);
    expect(bashAgent?.toolAccessMode).toBe("system_plus_custom");
  });

  it("seeds a broad script agent with purpose-built direct seeded bash tools", () => {
    const broadScriptAgent = getSeededRoleDefinition("broad-script-agent");

    expect(broadScriptAgent).toBeDefined();
    expect(broadScriptAgent?.name).toBe("Individual Tools");
    expect(broadScriptAgent?.systemPrompt).toContain("approved direct script-backed tools exposed in this workflow");
    expect(broadScriptAgent?.systemPrompt).toContain("invoke installed binaries available in the execution environment");
    expect(broadScriptAgent?.systemPrompt).toContain("derive the exact next request");
    expect(broadScriptAgent?.systemPrompt).toContain("Do not invent unsupported endpoint families such as `/promote` or `/validate`");
    expect(broadScriptAgent?.systemPrompt).toContain("Prefer one concrete transition validation over repeated fetches of already-seen pages");
    expect(broadScriptAgent?.systemPrompt).toContain("Preserve original tool failures.");
    expect(broadScriptAgent?.systemPrompt).toContain("Examples:");
    expect(broadScriptAgent?.systemPrompt).toContain("Make the derived request next: `GET /api/support/cases/cs-4821?workspace=acme-support`.");
    expect(broadScriptAgent?.systemPrompt).toContain("Test the exact adjacent endpoint next: `POST /api/auth/magic-link` with that `email` and `nonce`.");
    expect(broadScriptAgent?.systemPrompt).toContain("Use those exact prerequisites to test `GET /api/release/secrets?buildId=rel-202`");
    expect(broadScriptAgent?.systemPrompt).toContain("Do not invent those auth or approval surfaces.");
    expect(broadScriptAgent?.systemPrompt).toContain("Do not switch to invented `/login` or password-reset routes");
    expect(broadScriptAgent?.systemPrompt).toContain("Prefer one derived transition request using the observed artifact over repeating the same audit, crawl, or fetch on already-seen pages.");
    expect(broadScriptAgent?.toolAccessMode).toBe("system_plus_custom");
    expect(directScriptToolIds).toContain("seed-agent-bash-command");
    expect(broadScriptToolIds).not.toContain("seed-agent-bash-command");
    expect(broadScriptToolIds.every((toolId) => toolId.startsWith("seed-"))).toBe(true);
    expect(broadScriptToolIds).not.toContain("builtin-log-progress");
    expect(broadScriptToolIds).not.toContain("builtin-report-finding");
    expect(broadScriptToolIds).not.toContain("builtin-complete-run");
    expect(broadScriptAgent?.systemPrompt).not.toContain("Available dependencies:");
    expect(countMatches(broadScriptAgent?.systemPrompt ?? "", "Do not treat scanner-friendly issues as the main result")).toBe(1);
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
