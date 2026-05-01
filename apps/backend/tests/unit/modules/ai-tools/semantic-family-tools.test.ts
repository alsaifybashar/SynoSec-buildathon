import { describe, expect, it } from "vitest";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";
import { builtinNativeAiTools } from "@/modules/ai-tools/native-tools/index.js";
import { getSemanticFamilyDefinitions } from "@/modules/ai-tools/semantic-family-tools.js";

describe("semantic family tools", () => {
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

  it("no longer seeds script-backed runtime tools", () => {
    expect(seededToolDefinitions).toEqual([]);
  });

  it("only uses covered seeded tools as semantic family execution candidates", () => {
    const definitions = getSemanticFamilyDefinitions();

    for (const definition of definitions) {
      for (const candidateToolId of definition.candidateToolIds) {
        expect(definition.coveredToolIds).toContain(candidateToolId);
      }
    }
  });

  it("keeps delegated native candidates aligned with the family tool target contract", () => {
    const definitions = getSemanticFamilyDefinitions();
    const toolsById = new Map(builtinNativeAiTools.map((tool) => [tool.id, tool]));

    for (const definition of definitions) {
      for (const candidateToolId of definition.candidateToolIds) {
        const candidate = toolsById.get(candidateToolId);
        expect(candidate, `${definition.tool.name} is missing candidate ${candidateToolId}`).toBeDefined();
        expect(candidate?.executorType).toBe("native-ts");
      }
    }
  });

  it("exposes only the minimal model-facing output schema for semantic families", () => {
    for (const definition of getSemanticFamilyDefinitions()) {
      expect(definition.tool.outputSchema).toMatchObject({
        type: "object",
        required: ["id", "summary"]
      });
      expect(definition.tool.outputSchema.properties).toMatchObject({
        id: { type: "string" },
        summary: { type: "string" }
      });
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("rawOutput");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("observationSummaries");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("usedToolId");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("usedToolName");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("fallbackUsed");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("attempts");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("toolRunId");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("toolId");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("toolName");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("status");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("outputPreview");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("observations");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("totalObservations");
      expect(definition.tool.outputSchema.properties).not.toHaveProperty("truncated");
    }
  });
});
