import { beforeAll, describe, expect, it } from "vitest";
import { LocalToolSelectionEvaluator } from "@/workflows/evals/local-tool-selection-evaluator.js";
import {
  getScenarioRole,
  getScenarioTools,
  liveToolSelectionScenarios
} from "@/workflows/evals/local-tool-selection-scenarios.js";

describe("live qwen seeded tool selection", () => {
  const evaluator = new LocalToolSelectionEvaluator({
    apiPath: "/api/chat"
  });

  beforeAll(async () => {
    await evaluator.assertReady();
  }, 30000);

  for (const scenario of liveToolSelectionScenarios) {
    it(
      scenario.name,
      async () => {
        const role = getScenarioRole(scenario.roleKey);
        const result = await evaluator.evaluate({
          roleName: role.name,
          systemPrompt: role.systemPrompt,
          scenarioPrompt: scenario.scenarioPrompt,
          requiredToolCount: scenario.requiredToolCount,
          availableTools: getScenarioTools(scenario.roleKey),
          ...(scenario.extraInstructions ? { extraInstructions: scenario.extraInstructions } : {})
        });

        expect(result.parsed.selectedToolIds).toEqual(scenario.expectedToolIds);
        expect(
          result.parsed.selectedToolIds.every((toolId) => role.toolIds.some((allowedToolId) => allowedToolId === toolId))
        ).toBe(true);

        for (const forbiddenToolId of scenario.forbiddenToolIds) {
          expect(result.parsed.selectedToolIds).not.toContain(forbiddenToolId);
        }
      },
      45000
    );
  }
});
