import { describe, expect, it } from "vitest";
import { executeScriptedTool } from "./script-executor.js";

function createContext(overrides: Partial<{
  bashSource: string;
  timeoutMs: number;
  tool: string;
}> = {}) {
  const tool = overrides.tool ?? "Test Tool";

  return {
    scanId: "scan-1",
    tacticId: "tactic-1",
    toolRun: {
      id: "tool-run-1",
      scanId: "scan-1",
      tacticId: "tactic-1",
      agentId: "agent-1",
      toolId: "tool-1",
      tool,
      executorType: "bash" as const,
      capabilities: ["passive"],
      target: "example.com",
      status: "running" as const,
      riskTier: "passive" as const,
      justification: "Test execution",
      commandPreview: tool,
      dispatchMode: "local" as const,
      startedAt: "2026-04-21T00:00:00.000Z"
    },
    request: {
      toolId: "tool-1",
      tool,
      executorType: "bash" as const,
      capabilities: ["passive"],
      target: "example.com",
      layer: "L7" as const,
      riskTier: "passive" as const,
      justification: "Test execution",
      sandboxProfile: "read-only-parser" as const,
      privilegeProfile: "read-only-network" as const,
      parameters: {
        bashSource: overrides.bashSource ?? "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
        commandPreview: tool,
        toolInput: { target: "example.com" },
        ...(overrides.timeoutMs === undefined ? {} : { timeoutMs: overrides.timeoutMs })
      }
    }
  };
}

describe("executeScriptedTool", () => {
  it("parses structured JSON output and appends stderr", async () => {
    const result = await executeScriptedTool(createContext({
      bashSource: [
        "#!/usr/bin/env bash",
        "printf 'warning on stderr\\n' >&2",
        "printf '%s\\n' '{\"output\":\"stdout body\",\"observations\":[{\"key\":\"obs-1\",\"title\":\"Observation\",\"summary\":\"Found something\",\"severity\":\"low\",\"confidence\":0.8,\"evidence\":\"line 1\",\"technique\":\"test-technique\"}],\"commandPreview\":\"custom preview\"}'"
      ].join("\n")
    }));

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe("stdout body\nwarning on stderr");
    expect(result.commandPreview).toBe("custom preview");
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      id: "tool-run-1-obs-1",
      toolRunId: "tool-run-1",
      tool: "Test Tool",
      target: "example.com",
      key: "obs-1",
      title: "Observation"
    });
  });

  it("rejects invalid JSON envelopes", async () => {
    await expect(executeScriptedTool(createContext({
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' 'not json'"
    }))).rejects.toMatchObject({
      status: 500,
      code: "AI_TOOL_INVALID_RESULT_JSON"
    });
  });

  it("returns a timeout result when the script exceeds the configured timeout", async () => {
    const result = await executeScriptedTool(createContext({
      bashSource: "#!/usr/bin/env bash\nsleep 0.2",
      timeoutMs: 50
    }));

    expect(result.exitCode).toBe(124);
    expect(result.statusReason).toBe("Bash tool timed out after 50ms.");
    expect(result.observations).toEqual([]);
  });
});
