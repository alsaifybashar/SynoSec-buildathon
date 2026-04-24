import { describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { runAiTool } from "./ai-tool-runner.js";

function createTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    id: "tool-1",
    name: "Bash Probe",
    status: "active",
    source: "custom",
    description: "Deterministic test tool",
    binary: "bash",
    executorType: "bash",
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    capabilities: ["passive"],
    category: "utility",
    riskTier: "passive",
    notes: null,
    sandboxProfile: "read-only-parser",
    privilegeProfile: "read-only-network",
    timeoutMs: 1000,
    inputSchema: {
      type: "object",
      properties: {
        baseUrl: { type: "string" },
        target: { type: "string" }
      },
      required: ["baseUrl"]
    },
    outputSchema: {
      type: "object",
      properties: {
        output: { type: "string" }
      },
      required: ["output"]
    },
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:00:00.000Z",
    ...overrides
  };
}

describe("runAiTool", () => {
  it("rejects missing required inputs before executing the tool", async () => {
    await expect(runAiTool(createTool(), { target: "example.com" })).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_INPUT_MISSING"
    });
  });

  it("derives the execution target from baseUrl input", async () => {
    const tool = createTool({
      bashSource: [
        "#!/usr/bin/env bash",
        "payload=\"$(cat)\"",
        "target=\"$(printf '%s' \"$payload\" | node -e 'let input=\"\";process.stdin.on(\"data\",(chunk)=>input+=chunk);process.stdin.on(\"end\",()=>{const parsed=JSON.parse(input||\"{}\");process.stdout.write(parsed.request.target);});')\"",
        "printf '{\"output\":\"target=%s\"}\\n' \"$target\""
      ].join("\n")
    });

    const result = await runAiTool(tool, { baseUrl: "http://scanner.test:8080/path?q=1" });

    expect(result.target).toBe("scanner.test");
    expect(result.port).toBe(8080);
    expect(result.output).toBe("target=scanner.test");
    expect(result.commandPreview).toContain("target=scanner.test");
    expect(result.commandPreview).toContain("baseUrl=http://scanner.test:8080");
  });

  it("rejects tool runs that omit an execution target", async () => {
    await expect(runAiTool(createTool({
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      },
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"localhost\"}'"
    }), {})).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_TARGET_MISSING"
    });
  });

  it("rejects malformed execution URLs instead of falling back", async () => {
    await expect(runAiTool(createTool(), {
      baseUrl: "http//scanner.test"
    })).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_TARGET_INVALID"
    });
  });
});
