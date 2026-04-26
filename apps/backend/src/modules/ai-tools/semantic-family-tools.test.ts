import { describe, expect, it } from "vitest";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";
import { getSemanticFamilyDefinitions } from "./semantic-family-tools.js";

describe("semantic family tools", () => {
  const semanticFamilyExemptSeededToolIds = new Set([
    "seed-agent-bash-command"
  ]);

  it("gives every semantic family an agent-facing description", () => {
    for (const definition of getSemanticFamilyDefinitions()) {
      const description = definition.tool.description ?? "";
      const guidanceSignals = [
        /\bUse\b/i,
        /\bProvide\b/i,
        /\bReturns\b/i,
        /\bDo not\b/i,
        /\bdoes not\b/i
      ].filter((pattern) => pattern.test(description));

      expect(description.length, `${definition.tool.id} description should be specific enough for agent selection`).toBeGreaterThanOrEqual(140);
      expect(guidanceSignals.length, `${definition.tool.id} description should explain use, inputs, outputs, or boundaries`).toBeGreaterThanOrEqual(3);
    }
  });

  it("covers every script-backed seeded tool with at least one semantic family", () => {
    const definitions = getSemanticFamilyDefinitions();
    const coveredToolIds = new Set(definitions.flatMap((definition) => definition.coveredToolIds));
    const missing = seededToolDefinitions
      .filter((tool) => tool.executorType === "bash")
      .map((tool) => tool.id)
      .filter((toolId) => !semanticFamilyExemptSeededToolIds.has(toolId))
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

  it("keeps the delegated bash candidates aligned with the family tool target contract", () => {
    const definitions = getSemanticFamilyDefinitions();
    const toolsById = new Map(seededToolDefinitions.map((tool) => [tool.id, tool]));

    for (const definition of definitions) {
      for (const candidateToolId of definition.candidateToolIds) {
        const candidate = toolsById.get(candidateToolId);
        expect(candidate, `${definition.tool.name} is missing candidate ${candidateToolId}`).toBeDefined();
        expect(candidate?.executorType).toBe("bash");

        const candidateProperties = candidate?.inputSchema?.properties ?? {};
        if (definition.tool.constraintProfile.networkBehavior !== "none") {
          expect(candidateProperties, `${candidateToolId} must accept target input for ${definition.tool.name}`).toHaveProperty("target");
        }

        if ("baseUrl" in candidateProperties) {
          expect(definition.tool.inputSchema.properties).toHaveProperty("baseUrl");
        }

        if ("port" in candidateProperties) {
          expect(definition.tool.inputSchema.properties).toHaveProperty("port");
        }

        for (const requiredField of definition.requiredInputFields) {
          expect(candidateProperties, `${candidateToolId} must accept ${requiredField} for ${definition.tool.name}`).toHaveProperty(requiredField);
        }
      }
    }
  });
});
