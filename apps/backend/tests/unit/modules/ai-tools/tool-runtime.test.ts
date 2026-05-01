import { describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { MemoryAiToolsRepository } from "@/modules/ai-tools/memory-ai-tools.repository.js";
import { createToolRuntime } from "@/modules/ai-tools/tool-runtime.js";

function createTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    id: "tool-1",
    name: "Nuclei",
    status: "active",
    source: "custom",
    description: "Template-driven web probe",
    executorType: "bash",
    builtinActionKey: null,
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    capabilities: ["web-recon"],
    category: "web",
    riskTier: "passive",
    timeoutMs: 30000,
    inputSchema: { type: "object", properties: { baseUrl: { type: "string" } } },
    outputSchema: { type: "object", properties: { output: { type: "string" } } },
    createdAt: "2026-04-25T00:00:00.000Z",
    updatedAt: "2026-04-25T00:00:00.000Z",
    ...overrides
  };
}

describe("ToolRuntime", () => {
  it("compiles a tool request from a resolved tool id", async () => {
    const tool = createTool();
    const runtime = createToolRuntime(new MemoryAiToolsRepository([tool]));

    const request = await runtime.compile(tool.id, {
      target: "example.com",
      layer: "L7",
      justification: "Direct test run.",
      toolInput: {
        baseUrl: "https://example.com/app"
      }
    });

    expect(request.toolId).toBe(tool.id);
    expect(request.target).toBe("example.com");
    expect(request.parameters["commandPreview"]).toBe("Nuclei target=example.com baseUrl=https://example.com/app");
  });

  it("returns all exact name matches for orchestrator resolution", async () => {
    const runtime = createToolRuntime(new MemoryAiToolsRepository([
      createTool({ id: "tool-1", name: "Nuclei" }),
      createTool({ id: "tool-2", name: "nuclei" })
    ]));

    const matches = await runtime.resolveByName("Nuclei");

    expect(matches).toHaveLength(2);
    expect(matches.map((entry) => entry.tool.id)).toEqual(["tool-1", "tool-2"]);
  });

  it("resolves native tools and rejects bash compilation for them", async () => {
    const runtime = createToolRuntime(new MemoryAiToolsRepository([]));
    const resolved = await runtime.get("native-auth-login-probe");
    const compatibilityResolved = await runtime.get("native-auth-flow-probe");
    const artifactResolved = await runtime.get("native-auth-artifact-validation");

    expect(resolved?.runtime).toMatchObject({
      executorType: "native-ts"
    });
    expect(compatibilityResolved?.runtime).toMatchObject({
      executorType: "native-ts"
    });
    expect(artifactResolved?.runtime).toMatchObject({
      executorType: "native-ts"
    });
    await expect(runtime.compile("native-auth-login-probe", {
      target: "example.com",
      layer: "L7",
      justification: "Direct test run.",
      toolInput: {
        targetUrl: "https://example.com",
        targetKind: "app-base"
      }
    })).rejects.toMatchObject({
      status: 400,
      code: "AI_TOOL_NATIVE_NOT_COMPILABLE"
    });
  });
});
