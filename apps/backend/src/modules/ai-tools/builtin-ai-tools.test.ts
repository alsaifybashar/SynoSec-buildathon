import { describe, expect, it } from "vitest";
import { getBuiltinAiTool, getBuiltinAiTools } from "./builtin-ai-tools.js";

describe("builtin ai tools", () => {
  it("defines the system builtin tools for reporting and orchestrator analysis", () => {
    const ids = getBuiltinAiTools().map((tool) => tool.id);

    expect(ids).toEqual([
      "builtin-report-finding",
      "builtin-deep-analysis",
      "builtin-attack-chain-correlation"
    ]);
    expect(getBuiltinAiTool("builtin-report-finding")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "report_finding"
    });
    expect(getBuiltinAiTool("builtin-deep-analysis")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "deep_analysis"
    });
  });
});
