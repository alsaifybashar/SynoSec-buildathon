import { describe, expect, it } from "vitest";
import { getBuiltinAiTool, getBuiltinAiTools } from "./builtin-ai-tools.js";

describe("builtin ai tools", () => {
  it("defines the system builtin tools for reporting and semantic family execution", () => {
    const ids = getBuiltinAiTools().map((tool) => tool.id);

    expect(ids).toEqual(expect.arrayContaining([
      "builtin-log-progress",
      "builtin-report-finding",
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
});
