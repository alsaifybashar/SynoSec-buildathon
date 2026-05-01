import { describe, expect, it } from "vitest";
import { executeScriptedTool } from "@/engine/tools/script-executor.js";
import { createAgentActionWrapperScript } from "@/prisma/seed-data/tools/agent-actions/create-agent-action-tool.js";

function createExecutionContext(bashSource: string) {
  return {
    scanId: "scan-1",
    tacticId: "tactic-1",
    toolRun: {
      id: "tool-run-1",
      scanId: "scan-1",
      tacticId: "tactic-1",
      agentId: "agent-1",
      tool: "HTTP Surface Assessment",
      executorType: "bash" as const,
      capabilities: ["agent-action"],
      target: "localhost",
      status: "running" as const,
      riskTier: "passive" as const,
      justification: "test",
      commandPreview: "HTTP Surface Assessment target=localhost",
      dispatchMode: "local" as const,
      startedAt: "2026-04-25T00:00:00.000Z"
    },
    request: {
      toolId: "seed-agent-http-surface-assessment",
      tool: "HTTP Surface Assessment",
      executorType: "bash" as const,
      capabilities: ["agent-action"],
      target: "localhost",
      layer: "L7" as const,
      riskTier: "passive" as const,
      justification: "test",
      sandboxProfile: "network-recon" as const,
      privilegeProfile: "read-only-network" as const,
      parameters: {
        bashSource,
        timeoutMs: 5000,
        commandPreview: "HTTP Surface Assessment target=localhost",
        toolInput: {
          target: "localhost",
          baseUrl: "http://localhost"
        }
      }
    }
  };
}

describe("createAgentActionWrapperScript", () => {
  it("returns the primary tool result when the primary succeeds", async () => {
    const bashSource = createAgentActionWrapperScript({
      actionName: "HTTP Surface Assessment",
      primary: {
        name: "Primary Probe",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"primary ok\",\"observations\":[{\"key\":\"primary\",\"title\":\"Primary\",\"summary\":\"Primary path\",\"severity\":\"info\",\"confidence\":0.9,\"evidence\":\"primary\",\"technique\":\"primary\"}]}'"
      }
    });

    const result = await executeScriptedTool(createExecutionContext(bashSource));

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe("primary ok");
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.key).toBe("primary");
  });

  it("fails loudly when the primary fails instead of running an alternate tool", async () => {
    const bashSource = createAgentActionWrapperScript({
      actionName: "HTTP Surface Assessment",
      primary: {
        name: "Primary Probe",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"primary failed\",\"statusReason\":\"primary failed\"}'\nexit 64"
      }
    });

    const result = await executeScriptedTool(createExecutionContext(bashSource));

    expect(result.exitCode).toBe(1);
    expect(result.statusReason).toBe("HTTP Surface Assessment failed while running Primary Probe.");
    expect(result.output).toContain("HTTP Surface Assessment failed while running Primary Probe.");
    expect(result.output).toContain("Primary Probe failed.");
    expect(result.output).toContain("primary failed");
  });

  it("fails loudly with primary failure context when the primary returns invalid output", async () => {
    const bashSource = createAgentActionWrapperScript({
      actionName: "HTTP Surface Assessment",
      primary: {
        name: "Primary Probe",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' 'not-json'"
      }
    });

    const result = await executeScriptedTool(createExecutionContext(bashSource));

    expect(result.exitCode).toBe(1);
    expect(result.statusReason).toBe("HTTP Surface Assessment failed while running Primary Probe.");
    expect(result.output).toContain("HTTP Surface Assessment failed while running Primary Probe.");
    expect(result.output).toContain("Primary Probe failed.");
    expect(result.output).toContain("invalid JSON");
  });
});
