import { describe, expect, it } from "vitest";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";
import { getSemanticFamilyDefinitions } from "./semantic-family-tools.js";

describe("semantic family tools", () => {
  it("covers every script-backed seeded tool with at least one semantic family", () => {
    const definitions = getSemanticFamilyDefinitions();
    const coveredToolIds = new Set(definitions.flatMap((definition) => definition.coveredToolIds));
    const missing = seededToolDefinitions
      .filter((tool) => tool.executorType === "bash")
      .map((tool) => tool.id)
      .filter((toolId) => !coveredToolIds.has(toolId));

    expect(missing).toEqual([]);
  });

  it("only uses covered seeded tools as semantic family execution candidates", () => {
    const definitions = getSemanticFamilyDefinitions();

    for (const definition of definitions) {
      for (const candidateToolId of definition.candidateToolIds) {
        expect(definition.coveredToolIds).toContain(candidateToolId);
      }
    }
  });
});
