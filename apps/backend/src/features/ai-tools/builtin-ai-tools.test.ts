import { describe, expect, it } from "vitest";
import { getBuiltinAiTool, getBuiltinAiTools } from "./builtin-ai-tools.js";

describe("builtin ai tools", () => {
  it("defines the reporting actions as system builtin tools", () => {
    const ids = getBuiltinAiTools().map((tool) => tool.id);

    expect(ids).toEqual(["builtin-report-finding", "builtin-report-vulnerability"]);
    expect(getBuiltinAiTool("builtin-report-finding")).toMatchObject({
      source: "system",
      executorType: "builtin",
      builtinActionKey: "report_finding"
    });
  });
});
