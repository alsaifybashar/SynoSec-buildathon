import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiTool, ToolRequest } from "@synosec/contracts";
import { MemoryAiToolsRepository } from "@/modules/ai-tools/memory-ai-tools.repository.js";
import { OrchestratorExecutionEngineService } from "./orchestrator-execution-service.js";
import { OrchestratorStream, type AttackPlanPhase } from "./orchestrator-stream.js";

const executeScriptedToolMock = vi.fn();

vi.mock("@/engine/tools/script-executor.js", () => ({
  executeScriptedTool: (...args: unknown[]) => executeScriptedToolMock(...args)
}));

function createTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    id: "tool-1",
    name: "Nuclei",
    status: "active",
    source: "custom",
    description: "Template-driven web probe",
    binary: "nuclei",
    executorType: "bash",
    builtinActionKey: null,
    bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
    capabilities: ["web-recon"],
    category: "web",
    riskTier: "passive",
    notes: null,
    sandboxProfile: "network-recon",
    privilegeProfile: "read-only-network",
    timeoutMs: 30000,
    inputSchema: { type: "object", properties: { baseUrl: { type: "string" } } },
    outputSchema: { type: "object", properties: { output: { type: "string" } } },
    createdAt: "2026-04-25T00:00:00.000Z",
    updatedAt: "2026-04-25T00:00:00.000Z",
    ...overrides
  };
}

function createService(tools: AiTool[]) {
  return new OrchestratorExecutionEngineService(
    new OrchestratorStream(),
    { getStoredById: async () => null } as never,
    new MemoryAiToolsRepository(tools)
  );
}

describe("OrchestratorExecutionEngineService", () => {
  beforeEach(() => {
    executeScriptedToolMock.mockReset();
  });

  it("builds planner tool lists from custom bash ai tools", async () => {
    const service = createService([
      createTool({ id: "tool-1", name: "Nuclei" }),
      createTool({
        id: "builtin-deep-analysis",
        name: "Deep Analysis",
        source: "system",
        executorType: "builtin",
        builtinActionKey: "deep_analysis",
        bashSource: null,
        binary: null
      })
    ]);
    const privateService = service as any;
    const callStructuredDecisionModel = vi.spyOn(privateService, "callStructuredDecisionModel").mockResolvedValue({
      reasoningSummary: "Pick the web probe.",
      data: {
        phases: [],
        overallRisk: "medium",
        summary: "ok"
      }
    });

    await privateService.createPlan(
      "https://example.com/app",
      {
        openPorts: [],
        technologies: ["nginx"],
        httpHeaders: {},
        serverInfo: {},
        interestingPaths: [],
        rawNmap: "",
        rawCurl: ""
      },
      await privateService.listOrchestratorRunnableTools(),
      { id: "provider-1", name: "Claude", kind: "anthropic", status: "active", description: null, baseUrl: null, model: "sonnet", apiKeyConfigured: true, apiKey: "secret", createdAt: "", updatedAt: "" },
      "sonnet",
      vi.fn()
    );

    const prompt = callStructuredDecisionModel.mock.calls[0]?.[2];
    expect(prompt).toContain("Available tools");
    expect(prompt).toContain("Nuclei");
    expect(prompt).not.toContain("Deep Analysis");
  });

  it("fails loudly when a planned tool name does not resolve uniquely", async () => {
    const service = createService([
      createTool({ id: "tool-1", name: "Nuclei" }),
      createTool({ id: "tool-2", name: "nuclei" })
    ]);

    await expect((service as any).resolvePlannedTools({
      id: "phase-1",
      name: "Web App Scanning",
      priority: "high",
      rationale: "HTTP service found",
      targetService: "https",
      tools: ["Nuclei"],
      status: "pending"
    } satisfies AttackPlanPhase)).rejects.toMatchObject({
      status: 500,
      code: "ORCHESTRATOR_TOOL_NAME_AMBIGUOUS"
    });
  });

  it("executes planned tools through the shared ai tool compiler and script executor", async () => {
    executeScriptedToolMock.mockImplementation(async ({ request }: { request: ToolRequest }) => ({
      observations: [],
      output: JSON.stringify(request.parameters["toolInput"]),
      exitCode: 0,
      commandPreview: String(request.parameters["commandPreview"])
    }));
    const service = createService([createTool({ id: "tool-1", name: "Nuclei" })]);

    const attempts = await (service as any).executeSuggestedTools("https://example.com/app", {
      id: "phase-1",
      name: "Web App Scanning",
      priority: "high",
      rationale: "HTTP service found",
      targetService: "https",
      tools: ["Nuclei"],
      status: "pending"
    } satisfies AttackPlanPhase, "run-1");

    expect(executeScriptedToolMock).toHaveBeenCalledTimes(1);
    const request = executeScriptedToolMock.mock.calls[0]?.[0]?.request as ToolRequest;
    expect(request.toolId).toBe("tool-1");
    expect(request.tool).toBe("Nuclei");
    expect(request.parameters["toolInput"]).toMatchObject({
      baseUrl: "https://example.com/app",
      target: "example.com",
      url: "https://example.com/app"
    });
    expect(attempts[0]).toMatchObject({
      toolName: "Nuclei",
      exitCode: 0
    });
  });

  it("fails loudly when shared tool execution fails", async () => {
    executeScriptedToolMock.mockRejectedValue(new Error("tool crashed"));
    const service = createService([createTool({ id: "tool-1", name: "Nuclei" })]);

    await expect((service as any).executeSuggestedTools("https://example.com/app", {
      id: "phase-1",
      name: "Web App Scanning",
      priority: "high",
      rationale: "HTTP service found",
      targetService: "https",
      tools: ["Nuclei"],
      status: "pending"
    } satisfies AttackPlanPhase, "run-1")).rejects.toMatchObject({
      status: 500,
      code: "ORCHESTRATOR_TOOL_EXECUTION_FAILED"
    });
  });
});
