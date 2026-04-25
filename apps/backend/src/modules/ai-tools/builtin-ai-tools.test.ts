import { describe, expect, it } from "vitest";
import { getBuiltinAiTool, getBuiltinAiTools } from "./builtin-ai-tools.js";

describe("builtin ai tools", () => {
  it("defines the system builtin tools for reporting and orchestrator analysis", () => {
    const ids = getBuiltinAiTools().map((tool) => tool.id);

    expect(ids).toEqual([
      "builtin-log-progress",
      "builtin-report-finding",
      "builtin-complete-run",
      "builtin-fail-run",
      "builtin-deep-analysis",
      "builtin-attack-chain-correlation"
    ]);
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
    expect(getBuiltinAiTool("builtin-complete-run")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "complete_run"
    });
    expect(getBuiltinAiTool("builtin-fail-run")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "fail_run"
    });
    expect(getBuiltinAiTool("builtin-deep-analysis")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "deep_analysis"
    });
  });
});
