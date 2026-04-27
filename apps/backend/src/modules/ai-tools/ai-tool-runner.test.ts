import { describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { runAiTool } from "./ai-tool-runner.js";
import { MemoryAiToolsRepository } from "./memory-ai-tools.repository.js";
import { createToolRuntime } from "./tool-runtime.js";

function createTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    id: "tool-1",
    name: "Bash Probe",
    status: "active",
    source: "custom",
    description: "Deterministic test tool",
    executorType: "bash",
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    capabilities: ["passive"],
    category: "utility",
    riskTier: "passive",
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

function createRuntime(tool: AiTool) {
  return createToolRuntime(new MemoryAiToolsRepository([tool]));
}

describe("runAiTool", () => {
  it("rejects missing required inputs before executing the tool", async () => {
    const tool = createTool();
    await expect(runAiTool(createRuntime(tool), tool.id, { target: "example.com" })).rejects.toMatchObject({
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

    const result = await runAiTool(createRuntime(tool), tool.id, { baseUrl: "http://scanner.test:8080/path?q=1" });

    expect(result.target).toBe("scanner.test");
    expect(result.port).toBe(8080);
    expect(result.output).toBe("target=scanner.test");
    expect(result.commandPreview).toContain("target=scanner.test");
    expect(result.commandPreview).toContain("baseUrl=http://scanner.test:8080/path?q=1");
  });

  it("derives the execution target from a URL-shaped target while preserving the exact path in tool input", async () => {
    const tool = createTool({
      bashSource: [
        "#!/usr/bin/env bash",
        "payload=\"$(cat)\"",
        "printf '%s' \"$payload\" | node -e 'let input=\"\";process.stdin.on(\"data\",(chunk)=>input+=chunk);process.stdin.on(\"end\",()=>{const parsed=JSON.parse(input||\"{}\");const toolInput=parsed.request.parameters.toolInput;process.stdout.write(JSON.stringify({output:JSON.stringify({target:parsed.request.target,baseUrl:toolInput.baseUrl,url:toolInput.url})}));});'"
      ].join("\n")
    });

    const result = await runAiTool(createRuntime(tool), tool.id, {
      target: "http://scanner.test:8080/search?q=1"
    });

    expect(result.target).toBe("scanner.test");
    expect(result.port).toBe(8080);
    expect(result.output).toBe(JSON.stringify({
      target: "scanner.test",
      baseUrl: "http://scanner.test:8080/search?q=1"
    }));
    expect(result.commandPreview).toContain("baseUrl=http://scanner.test:8080/search?q=1");
  });

  it("rejects tool runs that omit an execution target", async () => {
    const tool = createTool({
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      },
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"localhost\"}'"
    });

    await expect(runAiTool(createRuntime(tool), tool.id, {})).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_TARGET_MISSING"
    });
  });

  it("rejects malformed execution URLs instead of falling back", async () => {
    const tool = createTool();
    await expect(runAiTool(createRuntime(tool), tool.id, {
      baseUrl: "http//scanner.test"
    })).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_TARGET_INVALID"
    });
  });

  it("rejects builtin tools in the direct tool runner", async () => {
    const tool = createTool({
      id: "builtin-report-finding",
      name: "Report Finding",
      source: "system",
      executorType: "builtin",
      builtinActionKey: "report_finding",
      bashSource: null
    });

    await expect(runAiTool(createRuntime(tool), tool.id, {})).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_BUILTIN_NOT_RUNNABLE"
    });
  });

  it("returns only compact public observations with truncation metadata", async () => {
    const tool = createTool({
      bashSource: [
        "#!/usr/bin/env bash",
        "printf '%s\\n' '{\"output\":\"scan complete\",\"observations\":[",
        "{\"key\":\"admin\",\"title\":\"Admin panel exposed\",\"summary\":\"/admin returned HTTP 200.\",\"severity\":\"medium\",\"confidence\":0.92,\"evidence\":\"GET /admin => 200\",\"technique\":\"HTTP probe\"},",
        "{\"key\":\"miss-1\",\"title\":\"Candidate path missing\",\"summary\":\"/backup returned HTTP 404.\",\"severity\":\"info\",\"confidence\":0.5,\"evidence\":\"GET /backup => 404\",\"technique\":\"Content discovery\"},",
        "{\"key\":\"miss-2\",\"title\":\"Candidate path missing\",\"summary\":\"/old returned HTTP 404.\",\"severity\":\"info\",\"confidence\":0.5,\"evidence\":\"GET /old => 404\",\"technique\":\"Content discovery\"}",
        "]}'"
      ].join("\n")
    });

    const result = await runAiTool(createRuntime(tool), tool.id, { baseUrl: "http://scanner.test" });

    expect(result.totalObservations).toBe(3);
    expect(result.truncated).toBe(true);
    expect(result.observations).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        key: "admin",
        title: "Admin panel exposed",
        summary: "/admin returned HTTP 200."
      }),
      expect.objectContaining({
        key: "aggregate:http-404",
        summary: "2 candidates returned HTTP 404; individual low-signal negatives were compacted."
      })
    ]);
    expect(result.observations[0]).not.toHaveProperty("evidence");
    expect(result.observations[0]).not.toHaveProperty("technique");
  });
});
