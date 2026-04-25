import { describe, expect, it } from "vitest";
import { executeScriptedTool } from "@/engine/tools/script-executor.js";
import { createFamilyWrapperScript } from "./create-family-tool.js";

function createExecutionContext(bashSource: string) {
  return {
    scanId: "scan-1",
    tacticId: "tactic-1",
    toolRun: {
      id: "tool-run-1",
      scanId: "scan-1",
      tacticId: "tactic-1",
      agentId: "agent-1",
      tool: "Family Wrapper",
      executorType: "bash" as const,
      capabilities: ["semantic-family"],
      target: "localhost",
      status: "running" as const,
      riskTier: "passive" as const,
      justification: "test",
      commandPreview: "Family Wrapper target=localhost",
      dispatchMode: "local" as const,
      startedAt: "2026-04-25T00:00:00.000Z"
    },
    request: {
      toolId: "family-tool",
      tool: "Family Wrapper",
      executorType: "bash" as const,
      capabilities: ["semantic-family"],
      target: "localhost",
      layer: "L7" as const,
      riskTier: "passive" as const,
      justification: "test",
      sandboxProfile: "network-recon" as const,
      privilegeProfile: "read-only-network" as const,
      parameters: {
        bashSource,
        timeoutMs: 1000,
        commandPreview: "Family Wrapper target=localhost",
        toolInput: {
          target: "localhost",
          baseUrl: "http://localhost"
        }
      }
    }
  };
}

describe("createFamilyWrapperScript", () => {
  it("returns the primary tool result when the primary succeeds", async () => {
    const bashSource = createFamilyWrapperScript({
      familyName: "HTTP Surface",
      primary: {
        name: "Primary Probe",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"primary ok\",\"observations\":[{\"key\":\"primary\",\"title\":\"Primary\",\"summary\":\"Primary path\",\"severity\":\"info\",\"confidence\":0.9,\"evidence\":\"primary\",\"technique\":\"primary\"}]}'"
      },
      fallback: {
        name: "Fallback Probe",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"fallback ok\"}'"
      }
    });

    const result = await executeScriptedTool(createExecutionContext(bashSource));

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe("primary ok");
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.key).toBe("primary");
  });

  it("uses the fallback tool when the primary fails", async () => {
    const bashSource = createFamilyWrapperScript({
      familyName: "HTTP Surface",
      primary: {
        name: "Primary Probe",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"primary failed\",\"statusReason\":\"primary failed\"}'\nexit 64"
      },
      fallback: {
        name: "Fallback Probe",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"fallback ok\",\"observations\":[{\"key\":\"fallback\",\"title\":\"Fallback\",\"summary\":\"Fallback path\",\"severity\":\"info\",\"confidence\":0.8,\"evidence\":\"fallback\",\"technique\":\"fallback\"}],\"commandPreview\":\"fallback-probe\"}'"
      }
    });

    const result = await executeScriptedTool(createExecutionContext(bashSource));

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("HTTP Surface used fallback Fallback Probe.");
    expect(result.output).toContain("fallback ok");
    expect(result.commandPreview).toBe("HTTP Surface -> fallback-probe");
    expect(result.observations[0]?.key).toBe("fallback");
  });

  it("fails loudly with both failure contexts when primary and fallback fail", async () => {
    const bashSource = createFamilyWrapperScript({
      familyName: "HTTP Surface",
      primary: {
        name: "Primary Probe",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"primary failed\",\"statusReason\":\"primary failed\"}'\nexit 64"
      },
      fallback: {
        name: "Fallback Probe",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"fallback failed\",\"statusReason\":\"fallback failed\"}'\nexit 65"
      }
    });

    const result = await executeScriptedTool(createExecutionContext(bashSource));

    expect(result.exitCode).toBe(1);
    expect(result.statusReason).toBe("HTTP Surface failed after primary and fallback tool attempts.");
    expect(result.output).toContain("HTTP Surface failed after trying Primary Probe and Fallback Probe.");
    expect(result.output).toContain("Primary Probe failed.");
    expect(result.output).toContain("Fallback Probe failed.");
  });
});
