import { describe, expect, it } from "vitest";
import { getBuiltinAiTool, getBuiltinAiTools } from "@/modules/ai-tools/builtin-ai-tools.js";

describe("builtin ai tools", () => {
  it("gives every builtin tool an agent-facing description", () => {
    for (const tool of getBuiltinAiTools()) {
      const description = tool.description ?? "";
      const guidanceSignals = [
        /\bUse\b/i,
        /\bProvide\b/i,
        /\bReturns\b/i,
        /\bDo not\b/i,
        /\bdoes not\b/i
      ].filter((pattern) => pattern.test(description));

      expect(description.length, `${tool.id} description should be specific enough for agent selection`).toBeGreaterThanOrEqual(140);
      expect(guidanceSignals.length, `${tool.id} description should explain use, inputs, outputs, or boundaries`).toBeGreaterThanOrEqual(3);
    }
  });

  it("defines the system builtin tools for reporting and semantic family execution", () => {
    const ids = getBuiltinAiTools().map((tool) => tool.id);

    expect(ids).toEqual(expect.arrayContaining([
      "builtin-log-progress",
      "builtin-report-system-graph-batch",
      "builtin-complete-run",
      "builtin-http-surface-assessment",
      "builtin-content-discovery",
      "builtin-auth-flow-assessment",
      "builtin-network-host-discovery",
      "builtin-controlled-exploitation",
      "builtin-cloud-posture-audit",
      "builtin-memory-forensics"
    ]));
    expect(getBuiltinAiTool("builtin-log-progress")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "log_progress"
    });
    expect(getBuiltinAiTool("builtin-report-system-graph-batch")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "report_system_graph_batch"
    });
    expect(getBuiltinAiTool("builtin-complete-run")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "complete_run"
    });
    expect(getBuiltinAiTool("builtin-http-surface-assessment")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "http_surface_assessment"
    });
  });

  it("documents batched system graph reporting inputs and outputs", () => {
    const tool = getBuiltinAiTool("builtin-report-system-graph-batch");
    expect(tool).not.toBeNull();

    const description = tool?.description ?? "";
    expect(description).toContain("stable ids");
    expect(description).toContain("resourceRelationships");
    expect(description).toContain("findingRelationships");

    const batchInput = tool?.inputSchema as {
      additionalProperties?: boolean;
      properties: Record<string, unknown>;
    };
    expect(batchInput.additionalProperties).toBe(false);
    expect(batchInput.properties["resources"]).toBeDefined();
    expect(batchInput.properties["findings"]).toBeDefined();
    expect(batchInput.properties["findingRelationships"]).toBeDefined();
    const findings = batchInput.properties["findings"] as {
      items: {
        properties: Record<string, unknown>;
        additionalProperties?: boolean;
      };
    };
    expect(findings.items.additionalProperties).toBe(false);
    expect(findings.items.properties["evidence"]).toMatchObject({
      type: "array"
    });
    const batchOutput = tool?.outputSchema as {
      required: string[];
    };
    expect(batchOutput.required).toEqual(["accepted", "resourceIds", "findingIds", "relationshipIds", "pathIds"]);
  });
});
