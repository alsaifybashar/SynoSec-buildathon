import { describe, expect, it } from "vitest";
import { seededToolDefinitions } from "../../../../prisma/seed-data/ai-builder-defaults.js";
import { compileToolRequestFromDefinition } from "./tool-definition.compiler.js";

describe("seeded tool definitions", () => {
  it("compiles every sandboxed seeded tool into a scripted structured request", () => {
    const executableTools = seededToolDefinitions.filter((tool) => tool.executionMode === "sandboxed");

    expect(executableTools.length).toBeGreaterThan(0);

    for (const tool of executableTools) {
      const request = compileToolRequestFromDefinition(tool, {
        target: "example.com",
        layer: "L7",
        justification: `Verify seeded tool ${tool.id} compiles for sandbox execution.`
      });

      expect(request.toolId).toBe(tool.id);
      expect(request.sandboxProfile).toBe(tool.sandboxProfile);
      expect(request.privilegeProfile).toBe(tool.privilegeProfile);
      expect(request.scriptPath).toBe(tool.scriptPath);
      expect(request.capabilities).toEqual(tool.capabilities);
      expect(request.parameters["scriptPath"]).toBe(tool.scriptPath);
      expect(request.parameters["scriptArgs"]).toEqual(
        tool.defaultArgs.map((value) =>
          value
            .replaceAll("{target}", "example.com")
            .replaceAll("{baseUrl}", "http://example.com")
            .replaceAll("{port}", "")
        )
      );
    }
  });

  it("marks the reporting seeded tools as catalog-only", () => {
    const catalogTools = seededToolDefinitions.filter((tool) => tool.executionMode === "catalog");

    expect(catalogTools.map((tool) => tool.id)).toEqual([
      "seed-evidence-review",
      "seed-report-writer"
    ]);
  });
});
