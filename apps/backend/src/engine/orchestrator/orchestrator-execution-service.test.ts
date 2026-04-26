import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiTool, ToolRequest } from "@synosec/contracts";
import { MemoryAiToolsRepository } from "@/modules/ai-tools/memory-ai-tools.repository.js";
import { createToolRuntime } from "@/modules/ai-tools/tool-runtime.js";
import { OrchestratorExecutionEngineService } from "./orchestrator-execution-service.js";
import { OrchestratorStream, type AttackPlanPhase } from "./orchestrator-stream.js";

const { streamTextMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn()
}));

const executeScriptedToolMock = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: streamTextMock
  };
});

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

function createService(tools: AiTool[]) {
  const repository = new MemoryAiToolsRepository(tools);
  return new OrchestratorExecutionEngineService(
    new OrchestratorStream(),
    { getStoredById: async () => null } as never,
    repository,
    createToolRuntime(repository)
  );
}

const provider = {
  id: "provider-1",
  name: "Claude",
  kind: "anthropic",
  status: "active",
  description: null,
  baseUrl: null,
  model: "sonnet",
  apiKeyConfigured: true,
  apiKey: "secret",
  createdAt: "",
  updatedAt: ""
} as const;

const recon = {
  openPorts: [{ port: 443, protocol: "tcp", service: "https", version: "nginx" }],
  technologies: ["nginx"],
  httpHeaders: {},
  serverInfo: { webServer: "nginx" },
  interestingPaths: [],
  probes: [],
  rawNmap: "",
  rawCurl: ""
};

describe("OrchestratorExecutionEngineService", () => {
  beforeEach(() => {
    executeScriptedToolMock.mockReset();
    streamTextMock.mockReset();
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
        bashSource: null
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
      provider,
      "sonnet",
      vi.fn()
    );

    const prompt = callStructuredDecisionModel.mock.calls[0]?.[2];
    expect(prompt).toContain("Available tools");
    expect(prompt).toContain("Nuclei");
    expect(prompt).not.toContain("Deep Analysis");
  });

  it("includes active system bash tools in the planner-visible catalog", async () => {
    const service = createService([
      createTool({ id: "tool-1", name: "WhatWeb", source: "system" }),
      createTool({
        id: "builtin-deep-analysis",
        name: "Deep Analysis",
        source: "system",
        executorType: "builtin",
        builtinActionKey: "deep_analysis",
        bashSource: null
      })
    ]);
    const privateService = service as any;

    const plannerTools = await privateService.listOrchestratorRunnableTools();

    expect(plannerTools.map((entry: { tool: { name: string } }) => entry.tool.name)).toContain("WhatWeb");
    expect(plannerTools.map((entry: { tool: { name: string } }) => entry.tool.name)).not.toContain("Deep Analysis");
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

  it("fails loudly when a scripted tool returns an invalid output payload", async () => {
    executeScriptedToolMock.mockResolvedValue({
      observations: [],
      exitCode: 0,
      commandPreview: "Nuclei"
    });
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

  it("adapts plans by skipping pending phases and adding validated new phases", async () => {
    const service = createService([createTool({ id: "tool-1", name: "Nuclei" })]);
    const privateService = service as any;
    vi.spyOn(privateService, "callStructuredDecisionModel").mockResolvedValue({
      reasoningSummary: "Skip redundant probing and add targeted validation.",
      data: {
        skipPhaseIds: ["phase-2"],
        newPhases: [{
          id: "phase-adaptive-1",
          name: "Targeted Template Validation",
          priority: "high",
          rationale: "Confirmed web exposure warrants focused validation.",
          targetService: "https",
          tools: ["Nuclei"],
          status: "pending"
        }],
        overallRisk: "high",
        updatedSummary: "Plan adapted after confirmed web findings."
      }
    });
    const emitReasoning = vi.fn();
    const completedPhase = {
      id: "phase-1",
      name: "Initial Web Probe",
      priority: "high",
      rationale: "HTTP service found",
      targetService: "https",
      tools: ["Nuclei"],
      status: "completed"
    } satisfies AttackPlanPhase;

    const adapted = await privateService.adaptAttackPlan(
      "https://example.com/app",
      {
        phases: [
          completedPhase,
          {
            id: "phase-2",
            name: "Generic Follow-up",
            priority: "medium",
            rationale: "Baseline check",
            targetService: "https",
            tools: ["Nuclei"],
            status: "pending"
          }
        ],
        overallRisk: "medium",
        summary: "Initial plan."
      },
      completedPhase,
      [{ title: "Exposed admin", severity: "high", description: "Admin path exposed.", vector: "/admin" }],
      [{ title: "Exposed admin", severity: "high", description: "Admin path exposed.", vector: "/admin" }],
      recon,
      await privateService.listOrchestratorRunnableTools(),
      provider,
      "sonnet",
      emitReasoning
    );

    expect(adapted.phases).toHaveLength(3);
    expect(adapted.phases[0]).toMatchObject({ id: "phase-1", status: "completed" });
    expect(adapted.phases[1]).toMatchObject({ id: "phase-2", status: "skipped" });
    expect(adapted.phases[2]).toMatchObject({ id: "phase-adaptive-1", status: "pending", tools: ["Nuclei"] });
    expect(adapted.overallRisk).toBe("high");
    expect(adapted.summary).toBe("Plan adapted after confirmed web findings.");
    expect(emitReasoning).toHaveBeenCalledWith("planning", "Adaptive planning reasoning · Initial Web Probe", "Skip redundant probing and add targeted validation.");
  });

  it("fails loudly when adaptive planning selects an unknown tool", async () => {
    const service = createService([createTool({ id: "tool-1", name: "Nuclei" })]);
    const privateService = service as any;
    vi.spyOn(privateService, "callStructuredDecisionModel").mockResolvedValue({
      reasoningSummary: "Add a tool that is not in the catalog.",
      data: {
        skipPhaseIds: [],
        newPhases: [{
          id: "phase-adaptive-1",
          name: "Invalid Tool Phase",
          priority: "high",
          rationale: "Bad model output",
          targetService: "https",
          tools: ["Unknown Scanner"],
          status: "pending"
        }],
        overallRisk: "high",
        updatedSummary: "Invalid."
      }
    });
    const completedPhase = {
      id: "phase-1",
      name: "Initial Web Probe",
      priority: "high",
      rationale: "HTTP service found",
      targetService: "https",
      tools: ["Nuclei"],
      status: "completed"
    } satisfies AttackPlanPhase;

    await expect(privateService.adaptAttackPlan(
      "https://example.com/app",
      { phases: [completedPhase], overallRisk: "medium", summary: "Initial plan." },
      completedPhase,
      [],
      [],
      recon,
      await privateService.listOrchestratorRunnableTools(),
      provider,
      "sonnet",
      vi.fn()
    )).rejects.toMatchObject({
      status: 500,
      code: "ORCHESTRATOR_ADAPTIVE_PLAN_INVALID_TOOL"
    });
  });

  it("streams live model output while building structured decisions", async () => {
    streamTextMock.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "reasoning", text: "Plan " };
        yield { type: "reasoning", text: "carefully" };
        yield { type: "text", text: "{\"reasoningSummary\":\"" };
        yield { type: "text", text: "Focus web first\",\"data\":{\"phases\":[],\"overallRisk\":\"medium\",\"summary\":\"ok\"}}" };
      })()
    }));

    const service = createService([createTool({ id: "tool-1", name: "Nuclei" })]);
    const privateService = service as any;
    const outputs: Array<{ text: string; reasoning: string | null; final: boolean }> = [];

    await privateService.callStructuredDecisionModel(
      provider,
      "sonnet",
      "Return a plan.",
      {
        runId: "50000000-0000-0000-0000-000000000001",
        onLiveModelOutput: (output: { text: string; reasoning: string | null; final: boolean }) => {
          outputs.push(output);
        }
      }
    );

    expect(outputs.some((output) => output.text.includes("\"reasoningSummary\""))).toBe(true);
    expect(outputs.some((output) => output.reasoning === "Plan carefully")).toBe(true);
    expect(outputs.some((output) => output.final)).toBe(true);
  });

  it("fails loudly when execution findings are incomplete", async () => {
    executeScriptedToolMock.mockResolvedValue({
      observations: [],
      output: "tool output",
      exitCode: 0,
      commandPreview: "Nuclei"
    });

    const service = createService([createTool({ id: "tool-1", name: "Nuclei" })]);
    const privateService = service as any;
    vi.spyOn(privateService, "callStructuredDecisionModel").mockResolvedValue({
      reasoningSummary: "The provider returned malformed findings.",
      data: {
        findings: [{
          title: "Exposed admin",
          severity: "high",
          vector: "/admin"
        }]
      }
    });

    await expect(privateService.executePhase(
      "https://example.com/app",
      {
        id: "phase-1",
        name: "Web App Scanning",
        priority: "high",
        rationale: "HTTP service found",
        targetService: "https",
        tools: ["Nuclei"],
        status: "pending"
      } satisfies AttackPlanPhase,
      recon,
      "run-1",
      provider,
      "sonnet",
      vi.fn(),
      async () => undefined,
      async () => undefined
    )).rejects.toMatchObject({
      status: 500,
      code: "ORCHESTRATOR_FINDINGS_INVALID"
    });
  });

  it("falls back to the final hosted text when the stream yields no text chunks", async () => {
    streamTextMock.mockImplementation(() => ({
      fullStream: (async function* () {
        yield { type: "start" };
        yield { type: "finish", finishReason: "stop" };
      })(),
      text: Promise.resolve("{\"reasoningSummary\":\"Fallback\",\"data\":{\"phases\":[],\"overallRisk\":\"medium\",\"summary\":\"ok\"}}")
    }));

    const service = createService([createTool({ id: "tool-1", name: "Nuclei" })]);
    const privateService = service as any;

    await expect(privateService.callStructuredDecisionModel(
      provider,
      "sonnet",
      "Return a plan."
    )).resolves.toMatchObject({
      reasoningSummary: "Fallback"
    });
  });
});
