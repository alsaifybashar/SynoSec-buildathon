import {
  getSeededRoleDefinition,
  seededRoleDefinitions,
  seededToolDefinitions,
  type SeededRoleKey
} from "@/shared/seed-data/ai-builder-defaults.js";

export type ToolSelectionScenario = {
  name: string;
  roleKey: SeededRoleKey;
  requiredToolCount: number;
  scenarioPrompt: string;
  extraInstructions?: string;
  expectedToolIds: string[];
  forbiddenToolIds: string[];
};

export const liveToolSelectionScenarios: ToolSelectionScenario[] = [
  {
    name: "orchestrator starts with passive web evidence gathering",
    roleKey: "orchestrator",
    requiredToolCount: 2,
    scenarioPrompt:
      "Scenario: A new web target is reachable at https://demo.example. The HTTP service is already confirmed, network port enumeration is out of scope for this step, and we need a safe first pass before any active probing.",
    extraInstructions:
      "The first tool should expand reachable web content and paths. The second tool should probe the confirmed web surface for headers, status codes, titles, and fingerprints.",
    expectedToolIds: ["seed-web-crawl", "seed-http-recon"],
    forbiddenToolIds: ["seed-content-discovery"]
  },
  {
    name: "qa analyst prefers verification over offensive expansion",
    roleKey: "qa-analyst",
    requiredToolCount: 2,
    scenarioPrompt:
      "Scenario: A likely issue was reported from an earlier scan, but confidence is low and the team wants the smallest follow-up to verify the claim without jumping into broader offensive work.",
    expectedToolIds: ["seed-http-recon", "seed-evidence-review"],
    forbiddenToolIds: ["seed-content-discovery", "seed-sql-injection-check"]
  },
  {
    name: "pen tester uses passive context before targeted sql validation",
    roleKey: "pen-tester",
    requiredToolCount: 2,
    scenarioPrompt:
      "Scenario: A suspicious injectable parameter was already found in prior evidence and the goal is to confirm exploitability with the least invasive approved active validation.",
    extraInstructions:
      "The first tool must gather supporting web evidence passively. The second tool must be the most targeted active validation for that injectable parameter. Do not use broad discovery as the second step.",
    expectedToolIds: ["seed-http-recon", "seed-sql-injection-check"],
    forbiddenToolIds: ["seed-content-discovery"]
  },
  {
    name: "reporter reviews evidence before writing",
    roleKey: "reporter",
    requiredToolCount: 2,
    scenarioPrompt:
      "Scenario: Findings already exist and the goal is to publish a clear report with no unsupported claims.",
    expectedToolIds: ["seed-evidence-review", "seed-report-writer"],
    forbiddenToolIds: ["seed-http-recon", "seed-vuln-audit"]
  }
];

export function getScenarioRole(roleKey: SeededRoleKey) {
  const role = getSeededRoleDefinition(roleKey);

  if (!role) {
    throw new Error(`Seeded role not found: ${roleKey}`);
  }

  return role;
}

export function getScenarioTools(roleKey: SeededRoleKey) {
  const role = getScenarioRole(roleKey);

  return role.toolIds.map((toolId) => {
    const tool = seededToolDefinitions.find((candidate) => candidate.id === toolId);

    if (!tool) {
      throw new Error(`Seeded tool not found: ${toolId}`);
    }

    return tool;
  });
}

export const seededRoleKeys = seededRoleDefinitions.map((role) => role.key);
