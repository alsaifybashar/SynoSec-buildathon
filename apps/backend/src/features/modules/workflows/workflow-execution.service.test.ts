import { describe, expect, it, vi } from "vitest";
import type {
  AiAgent,
  AiProvider,
  AiTool,
  Application,
  Runtime,
  Scan,
  ToolRequest,
  ToolRun,
  Workflow,
  WorkflowStageExecutionContract
} from "@synosec/contracts";
import { deriveWorkflowRunExecutionContract } from "@synosec/contracts";
import type { ApplicationsRepository } from "../applications/applications.repository.js";
import type { RuntimesRepository } from "../runtimes/runtimes.repository.js";
import { MemoryAiProvidersRepository } from "../ai-providers/memory-ai-providers.repository.js";
import { MemoryAiToolsRepository } from "../ai-tools/memory-ai-tools.repository.js";
import { MemoryAiAgentsRepository } from "../ai-agents/memory-ai-agents.repository.js";
import { MemoryWorkflowsRepository } from "./memory-workflows.repository.js";
import { WorkflowExecutionService } from "./workflow-execution.service.js";
import { WorkflowRunStream } from "./workflow-run-stream.js";

const application: Application = {
  id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
  name: "Local Vulnerable Target",
  baseUrl: "http://127.0.0.1:3000",
  environment: "development",
  status: "active",
  lastScannedAt: null,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const runtime: Runtime = {
  id: "6fd90dd7-6f27-47d0-ab24-6328bb2f3624",
  name: "Local Runtime",
  serviceType: "api",
  provider: "docker",
  environment: "development",
  region: "local-docker",
  status: "healthy",
  applicationId: application.id,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const provider: AiProvider & { apiKey: string | null } = {
  id: "6fb18f09-f230-49df-b0ab-4f1bcedd230c",
  name: "Local",
  kind: "local",
  status: "active",
  description: "Local workflow provider",
  baseUrl: "http://127.0.0.1:11434",
  model: "qwen3:1.7b",
  apiKeyConfigured: false,
  apiKey: null,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const tool: AiTool = {
  id: "seed-http-recon",
  name: "HTTP Recon",
  status: "active",
  source: "custom",
  description: "HTTP reconnaissance",
  binary: "httpx",
  scriptPath: "scripts/tools/http-recon.sh",
  scriptVersion: "v1",
  scriptSource: "#!/usr/bin/env bash\nprintf 'ok'",
  capabilities: ["web-recon", "passive"],
  category: "web",
  riskTier: "passive",
  notes: null,
  executionMode: "sandboxed",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  defaultArgs: ["-silent", "-u", "{baseUrl}"],
  timeoutMs: 30000,
  inputSchema: { type: "object", properties: {} },
  outputSchema: { type: "object", properties: {} },
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const agent: AiAgent = {
  id: "fa1a0bfa-6b02-4948-8e1c-155f6b9a4ae7",
  name: "Local Orchestrator",
  status: "active",
  description: "Local orchestration agent",
  providerId: provider.id,
  systemPrompt: "Coordinate the next best recon step.",
  modelOverride: null,
  toolIds: [tool.id],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const workflow: Workflow = {
  id: "2a3761a0-c424-4634-83ad-5145fbd2697c",
  name: "Two Stage Workflow",
  status: "active",
  description: "Deterministic stage execution test",
  applicationId: application.id,
  runtimeId: runtime.id,
  stages: [
    {
      id: "ca089560-77ef-4b36-97f0-1d4d83cd3e2e",
      label: "Initial Recon",
      agentId: agent.id,
      ord: 0
    },
    {
      id: "812c90fe-b664-4c19-8cbf-38bc2d729301",
      label: "Validation",
      agentId: agent.id,
      ord: 1
    }
  ],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const applicationsRepository: ApplicationsRepository = {
  list: async () => ({ items: [application], page: 1, pageSize: 25, total: 1, totalPages: 1 }),
  getById: async (id) => (id === application.id ? application : null),
  create: async () => {
    throw new Error("Not used in workflow execution tests.");
  },
  update: async () => null,
  remove: async () => false
};

const runtimesRepository: RuntimesRepository = {
  list: async () => ({ items: [runtime], page: 1, pageSize: 25, total: 1, totalPages: 1 }),
  getById: async (id) => (id === runtime.id ? runtime : null),
  create: async () => {
    throw new Error("Not used in workflow execution tests.");
  },
  update: async () => null,
  remove: async () => false
};

function createToolRequest(): ToolRequest {
  return {
    toolId: tool.id,
    tool: tool.name,
    scriptPath: tool.scriptPath ?? undefined,
    capabilities: tool.capabilities,
    target: "127.0.0.1",
    layer: "L7",
    riskTier: tool.riskTier,
    justification: "Deterministic workflow execution test",
    parameters: {
      target: "127.0.0.1",
      timeoutMs: tool.timeoutMs ?? 30000,
      scriptSource: tool.scriptSource ?? "",
      scriptArgs: ["-silent", "-u", application.baseUrl ?? "http://127.0.0.1:3000"]
    }
  };
}

function createToolRun(status: ToolRun["status"], statusReason?: string): ToolRun {
  const startedAt = "2026-04-21T00:00:00.000Z";
  return {
    id: `tool-run-${status}`,
    scanId: "scan-1",
    tacticId: workflow.stages[0]?.id ?? "",
    agentId: agent.id,
    toolId: tool.id,
    tool: tool.name,
    scriptPath: tool.scriptPath ?? undefined,
    capabilities: tool.capabilities,
    target: "127.0.0.1",
    status,
    riskTier: tool.riskTier,
    justification: "Deterministic workflow execution test",
    commandPreview: "httpx -silent -u http://127.0.0.1:3000",
    dispatchMode: "local",
    startedAt,
    ...(status === "completed" || status === "failed" ? { completedAt: "2026-04-21T00:00:01.000Z" } : {}),
    ...(statusReason ? { statusReason } : {}),
    ...(status === "completed" ? { output: "200 OK", exitCode: 0 } : { output: statusReason ?? "failed", exitCode: 1 })
  };
}

function createService(executedResult: {
  toolRun: ToolRun;
  outputPreview: string;
  fullOutput: string;
  observationSummaries?: string[];
  findingSummaries?: string[];
  timedOut?: boolean;
}) {
  const providersRepository = new MemoryAiProvidersRepository([{ ...provider }]);
  const toolsRepository = new MemoryAiToolsRepository([{ ...tool }]);
  const agentsRepository = new MemoryAiAgentsRepository(providersRepository, toolsRepository, [{ ...agent }]);
  const workflowsRepository = new MemoryWorkflowsRepository(
    applicationsRepository,
    runtimesRepository,
    agentsRepository,
    [{ ...workflow, stages: workflow.stages.map((stage) => ({ ...stage })) }]
  );
  const service = new WorkflowExecutionService(
    workflowsRepository,
    applicationsRepository,
    runtimesRepository,
    agentsRepository,
    providersRepository,
    toolsRepository,
    new WorkflowRunStream()
  );

  Object.defineProperty(service, "evaluator", {
    value: {
      evaluate: vi.fn(async () => ({
        rawContent: JSON.stringify({ selectedToolIds: [tool.id], reason: "HTTP recon is the highest-signal first step." }),
        parsed: {
          selectedToolIds: [tool.id],
          reason: "HTTP recon is the highest-signal first step."
        }
      }))
    }
  });

  Object.defineProperty(service, "ensureWorkflowScan", {
    value: vi.fn(async () =>
      ({
        id: "scan-1",
        scope: {
          targets: ["127.0.0.1"],
          exclusions: [],
          layers: ["L4", "L7"],
          maxDepth: 3,
          maxDurationMinutes: 15,
          rateLimitRps: 5,
          allowActiveExploits: true,
          graceEnabled: true,
          graceRoundInterval: 3,
          cyberRangeMode: "live"
        },
        status: "running",
        currentRound: 0,
        tacticsTotal: 1,
        tacticsComplete: 0,
        createdAt: "2026-04-21T00:00:00.000Z"
      }) satisfies Scan
    )
  });

  Object.defineProperty(service, "executeToolForWorkflow", {
    value: vi.fn(async () => ({
      mode: "executed",
      toolRequest: createToolRequest(),
      toolRun: executedResult.toolRun,
      observationSummaries: executedResult.observationSummaries ?? [],
      findingSummaries: executedResult.findingSummaries ?? [],
      outputPreview: executedResult.outputPreview,
      fullOutput: executedResult.fullOutput,
      durationMs: 100,
      configuredTimeoutMs: tool.timeoutMs,
      timedOut: executedResult.timedOut ?? false
    }))
  });

  return {
    service,
    workflowsRepository
  };
}

describe("WorkflowExecutionService", () => {
  it("completes a successful multi-stage run with deterministic stage contracts", async () => {
    const { service, workflowsRepository } = createService({
      toolRun: createToolRun("completed"),
      outputPreview: "200 OK",
      fullOutput: "200 OK",
      observationSummaries: ["Homepage reachable"],
      findingSummaries: ["Initial recon complete"]
    });

    const started = await service.startRun(workflow.id);
    const firstStep = await service.stepRun(started.id);
    const secondStep = await service.stepRun(started.id);
    const persisted = await workflowsRepository.getRunById(started.id);
    const latest = await workflowsRepository.getLatestRunByWorkflowId(workflow.id);
    const secondStageAgentInput = secondStep.events.find(
      (event) => event.stepIndex === 1 && event.type === "agent_input"
    );
    const successfulToolResult = secondStep.events.find(
      (event) => event.stepIndex === 1 && event.type === "tool_result"
    );

    expect(firstStep.status).toBe("running");
    expect(firstStep.currentStepIndex).toBe(1);
    expect(secondStep.status).toBe("completed");
    expect(secondStep.currentStepIndex).toBe(2);
    expect(secondStep.completedAt).not.toBeNull();
    expect(secondStep.trace).toHaveLength(2);
    expect(secondStep.events.filter((event) => event.type === "stage_started")).toHaveLength(2);
    expect(secondStep.events.filter((event) => event.type === "stage_completed")).toHaveLength(2);

    expect(persisted?.status).toBe("completed");
    expect(persisted?.completedAt).toBe(secondStep.completedAt);
    expect(latest?.id).toBe(started.id);
    expect(secondStageAgentInput?.summary).toBe("Received Validation context for Local Vulnerable Target at http://127.0.0.1:3000/.");
    expect(secondStageAgentInput?.payload).toMatchObject({
      stageLabel: "Validation",
      targetUrl: "http://127.0.0.1:3000/",
      targetHost: "127.0.0.1",
      targetPort: 3000,
      runtime: {
        id: runtime.id,
        name: runtime.name,
        provider: runtime.provider,
        region: runtime.region
      },
      allowedToolIds: [tool.id]
    });
    expect(successfulToolResult?.status).toBe("completed");
    expect(successfulToolResult?.payload).toMatchObject({
      toolId: tool.id,
      toolName: tool.name,
      outputPreview: "200 OK",
      fullOutput: "200 OK",
      observationSummaries: ["Homepage reachable"],
      findingSummaries: ["Initial recon complete"],
      configuredTimeoutMs: tool.timeoutMs,
      timedOut: false
    });

    const contract = deriveWorkflowRunExecutionContract(secondStep, workflow.stages);
    expect(contract.completionState).toBe("completed");
    expect(contract.isFinalized).toBe(true);
    expect(contract.stages.map((stage: WorkflowStageExecutionContract) => stage.state)).toEqual(["completed", "completed"]);
    expect(contract.stages.every((stage: WorkflowStageExecutionContract) => stage.terminalEventType === "stage_completed")).toBe(true);
  });

  it("fails the current stage without corrupting later stage lifecycle state", async () => {
    const { service, workflowsRepository } = createService({
      toolRun: createToolRun("failed", "HTTP recon crashed"),
      outputPreview: "HTTP recon crashed",
      fullOutput: "HTTP recon crashed"
    });

    const started = await service.startRun(workflow.id);
    const failed = await service.stepRun(started.id);
    const persisted = await workflowsRepository.getRunById(started.id);
    const failedToolResult = failed.events.find((event) => event.type === "tool_result");
    const failedStageBoundary = failed.events.find((event) => event.type === "stage_failed");

    expect(failed.status).toBe("failed");
    expect(failed.currentStepIndex).toBe(0);
    expect(failed.completedAt).not.toBeNull();
    expect(failed.trace).toHaveLength(1);
    expect(failed.events.filter((event) => event.type === "stage_failed")).toHaveLength(1);
    expect(failed.events.filter((event) => event.type === "stage_started")).toHaveLength(1);
    expect(failed.events.some((event) => event.workflowStageId === workflow.stages[1]?.id)).toBe(false);

    expect(persisted?.status).toBe("failed");
    expect(persisted?.currentStepIndex).toBe(0);
    expect(failedToolResult?.status).toBe("failed");
    expect(failedToolResult?.detail).toBe("HTTP recon crashed");
    expect(failedToolResult?.payload).toMatchObject({
      toolId: tool.id,
      toolName: tool.name,
      outputPreview: "HTTP recon crashed",
      fullOutput: "HTTP recon crashed",
      observationSummaries: [],
      findingSummaries: [],
      configuredTimeoutMs: tool.timeoutMs,
      timedOut: false
    });
    expect(failedStageBoundary?.summary).toBe("Initial Recon failed because HTTP Recon did not complete successfully.");
    expect(failedStageBoundary?.payload).toMatchObject({
      stageLabel: "Initial Recon",
      selectedToolIds: [tool.id],
      failedToolRunId: "tool-run-failed",
      degraded: false
    });

    const contract = deriveWorkflowRunExecutionContract(failed, workflow.stages);
    expect(contract.completionState).toBe("failed");
    expect(contract.isFinalized).toBe(true);
    expect(contract.stages.map((stage: WorkflowStageExecutionContract) => stage.state)).toEqual(["failed", "pending"]);
    expect(contract.stages[0]?.terminalEventType).toBe("stage_failed");
    expect(contract.stages[1]?.hasStarted).toBe(false);
  });
});
