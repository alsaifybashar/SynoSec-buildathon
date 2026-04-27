import { describe, expect, it } from "vitest";
import { getBuiltinAiTool, getBuiltinAiTools } from "./builtin-ai-tools.js";

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
      "builtin-report-finding",
      "builtin-report-attack-vectors",
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
    expect(getBuiltinAiTool("builtin-report-finding")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "report_finding"
    });
    expect(getBuiltinAiTool("builtin-report-attack-vectors")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "report_attack_vectors"
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

  it("documents split finding and attack-vector reporting inputs and outputs", () => {
    const tool = getBuiltinAiTool("builtin-report-finding");
    const vectorTool = getBuiltinAiTool("builtin-report-attack-vectors");
    expect(tool).not.toBeNull();
    expect(vectorTool).not.toBeNull();

    const description = tool?.description ?? "";
    expect(description).toContain("JSON-string payloads");
    expect(description).toContain("string `target`");
    expect(description).toContain("finding-only");

    const findingMode = tool?.inputSchema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(findingMode.required).toEqual(["title", "evidence"]);
    expect(findingMode.properties["target"]).toMatchObject({
      oneOf: expect.arrayContaining([
        expect.objectContaining({ type: "string" }),
        expect.objectContaining({ type: "object" })
      ])
    });
    expect(findingMode.properties["confidence"]).toMatchObject({
      oneOf: expect.arrayContaining([
        expect.objectContaining({ type: "number" }),
        expect.objectContaining({ type: "string" })
      ])
    });
    expect(findingMode.properties["attackVectors"]).toBeUndefined();
    expect(findingMode.properties["derivedFromFindingIds"]).toBeUndefined();
    const findingOutput = tool?.outputSchema as {
      required: string[];
    };
    expect(findingOutput.required).toEqual(["accepted", "findingId", "title", "severity", "host"]);

    const vectorInput = vectorTool?.inputSchema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(vectorInput.required).toEqual(["attackVectors"]);
    expect(vectorInput.properties["attackVectors"]).toBeDefined();
    const vectorOutput = vectorTool?.outputSchema as {
      required: string[];
    };
    expect(vectorOutput.required).toEqual(["accepted", "attackVectorIds"]);
  });
});
