import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiAgent, AiProvider, AiTool, Application, Runtime, Workflow, WorkflowRun, WorkflowRunStreamMessage } from "@synosec/contracts";
import { WorkflowsPage } from "@/features/workflows/page";

const application: Application = {
  id: "app-1",
  name: "Local Vulnerable Target",
  baseUrl: "http://127.0.0.1:3000",
  environment: "development",
  status: "active",
  lastScannedAt: null,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const runtime: Runtime = {
  id: "runtime-1",
  name: "Local Runtime",
  serviceType: "api",
  provider: "docker",
  environment: "development",
  region: "local",
  status: "healthy",
  applicationId: application.id,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const tool: AiTool = {
  id: "tool-1",
  name: "HTTP Recon",
  status: "active",
  source: "custom",
  description: "HTTP reconnaissance",
  binary: "httpx",
  executorType: "bash",
  bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
  capabilities: ["web-recon"],
  category: "web",
  riskTier: "passive",
  notes: null,
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 30000,
  inputSchema: { type: "object", properties: {} },
  outputSchema: { type: "object", properties: {} },
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const agent: AiAgent = {
  id: "agent-1",
  name: "Local Orchestrator",
  status: "active",
  description: "Local workflow orchestrator",
  providerId: "provider-1",
  systemPrompt: "Coordinate the next best step.",
  modelOverride: null,
  toolIds: [tool.id],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const provider: AiProvider = {
  id: "provider-1",
  name: "Anthropic",
  kind: "anthropic",
  status: "active",
  description: "Anthropic provider",
  baseUrl: null,
  model: "claude-sonnet-4",
  apiKeyConfigured: true,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const workflow: Workflow = {
  id: "workflow-1",
  name: "Evidence Workflow",
  status: "active",
  description: "Stage timeline test",
  applicationId: application.id,
  runtimeId: runtime.id,
  agentId: agent.id,
  objective: "Complete the Initial Recon stage using allowed tools and structured reporting.",
  allowedToolIds: [tool.id],
  requiredEvidenceTypes: [],
  findingPolicy: {
    taxonomy: "typed-core-v1",
    allowedTypes: [
      "service_exposure",
      "content_discovery",
      "missing_security_header",
      "tls_weakness",
      "injection_signal",
      "auth_weakness",
      "sensitive_data_exposure",
      "misconfiguration",
      "other"
    ]
  },
  completionRule: {
    requireStageResult: true,
    requireToolCall: false,
    allowEmptyResult: true,
    minFindings: 0
  },
  resultSchemaVersion: 1,
  handoffSchema: null,
  stages: [
    {
      id: "stage-1",
      label: "Initial Recon",
      agentId: agent.id,
      ord: 0,
      objective: "Complete the Initial Recon stage using allowed tools and structured reporting.",
      allowedToolIds: [tool.id],
      requiredEvidenceTypes: [],
      findingPolicy: {
        taxonomy: "typed-core-v1",
        allowedTypes: [
          "service_exposure",
          "content_discovery",
          "missing_security_header",
          "tls_weakness",
          "injection_signal",
          "auth_weakness",
          "sensitive_data_exposure",
          "misconfiguration",
          "other"
        ]
      },
      completionRule: {
        requireStageResult: true,
        requireToolCall: false,
        allowEmptyResult: true,
        minFindings: 0
      },
      resultSchemaVersion: 1,
      handoffSchema: null
    },
    {
      id: "stage-2",
      label: "Validation",
      agentId: agent.id,
      ord: 1,
      objective: "Complete the Validation stage using allowed tools and structured reporting.",
      allowedToolIds: [tool.id],
      requiredEvidenceTypes: [],
      findingPolicy: {
        taxonomy: "typed-core-v1",
        allowedTypes: [
          "service_exposure",
          "content_discovery",
          "missing_security_header",
          "tls_weakness",
          "injection_signal",
          "auth_weakness",
          "sensitive_data_exposure",
          "misconfiguration",
          "other"
        ]
      },
      completionRule: {
        requireStageResult: true,
        requireToolCall: false,
        allowEmptyResult: true,
        minFindings: 0
      },
      resultSchemaVersion: 1,
      handoffSchema: null
    }
  ],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const run: WorkflowRun = {
  id: "run-1",
  workflowId: workflow.id,
  status: "running",
  currentStepIndex: 1,
  startedAt: "2026-04-21T00:00:00.000Z",
  completedAt: null,
  trace: [
    {
      id: "trace-1",
      workflowRunId: "run-1",
      workflowId: workflow.id,
      workflowStageId: "stage-1",
      stepIndex: 0,
      stageLabel: "Initial Recon",
      agentId: agent.id,
      agentName: agent.name,
      status: "completed",
      selectedToolIds: [tool.id],
      toolSelectionReason: "HTTP recon is the highest-signal first step.",
      targetSummary: "Local Vulnerable Target at http://127.0.0.1:3000 via Local Runtime",
      evidenceHighlights: [
        "Executed tools: HTTP Recon.",
        "Observations: 1. Findings: 1."
      ],
      outputSummary: "{\"selectedToolIds\":[\"tool-1\"]}",
      createdAt: "2026-04-21T00:00:05.000Z"
    }
  ],
  events: [
    {
      id: "event-1",
      workflowRunId: "run-1",
      workflowId: workflow.id,
      workflowStageId: "stage-1",
      stepIndex: 0,
      ord: 0,
      type: "stage_started",
      status: "running",
      title: "Initial Recon started",
      summary: "Started Initial Recon with Local Orchestrator.",
      detail: null,
      payload: {},
      createdAt: "2026-04-21T00:00:00.000Z"
    },
    {
      id: "event-2",
      workflowRunId: "run-1",
      workflowId: workflow.id,
      workflowStageId: "stage-1",
      stepIndex: 0,
      ord: 1,
      type: "agent_input",
      status: "completed",
      title: "Local Orchestrator received stage context",
      summary: "Received Initial Recon context for Local Vulnerable Target at http://127.0.0.1:3000.",
      detail: null,
      payload: {},
      createdAt: "2026-04-21T00:00:01.000Z"
    },
    {
      id: "event-3",
      workflowRunId: "run-1",
      workflowId: workflow.id,
      workflowStageId: "stage-1",
      stepIndex: 0,
      ord: 2,
      type: "model_decision",
      status: "completed",
      title: "Local Orchestrator selected tools",
      summary: "Selected HTTP Recon.",
      detail: "HTTP recon is the highest-signal first step.",
      payload: {
        selectedToolIds: [tool.id],
        selectedToolNames: [tool.name],
        reasoning: "HTTP recon is the highest-signal first step.",
        tokenUsage: {
          inputTokens: 180,
          outputTokens: 42,
          totalTokens: 222
        }
      },
      createdAt: "2026-04-21T00:00:02.000Z"
    },
    {
      id: "event-4",
      workflowRunId: "run-1",
      workflowId: workflow.id,
      workflowStageId: "stage-1",
      stepIndex: 0,
      ord: 3,
      type: "tool_call",
      status: "running",
      title: "HTTP Recon invoked",
      summary: "Calling HTTP Recon for 127.0.0.1:3000.",
      detail: "HTTP reconnaissance",
      payload: {
        toolId: tool.id,
        toolName: tool.name,
        configuredTimeoutMs: 30000
      },
      createdAt: "2026-04-21T00:00:02.500Z"
    },
    {
      id: "event-5",
      workflowRunId: "run-1",
      workflowId: workflow.id,
      workflowStageId: "stage-1",
      stepIndex: 0,
      ord: 4,
      type: "tool_result",
      status: "completed",
      title: "HTTP Recon returned completed",
      summary: "200 OK",
      detail: "200 OK\nServer: demo",
      payload: {
        toolId: tool.id,
        toolName: tool.name,
        outputPreview: "200 OK",
        fullOutput: "200 OK\nServer: demo",
        observationSummaries: ["Homepage reachable"],
        findingSummaries: ["Initial recon complete"],
        durationMs: 120,
        usage: {
          totalTokens: 18
        }
      },
      createdAt: "2026-04-21T00:00:03.000Z"
    },
    {
      id: "event-6",
      workflowRunId: "run-1",
      workflowId: workflow.id,
      workflowStageId: "stage-1",
      stepIndex: 0,
      ord: 5,
      type: "stage_completed",
      status: "completed",
      title: "Initial Recon completed",
      summary: "Initial Recon completed and is ready to hand off.",
      detail: null,
      payload: {},
      createdAt: "2026-04-21T00:00:04.000Z"
    }
  ]
};

const failedRun: WorkflowRun = {
  ...run,
  id: "run-2",
  status: "failed",
  currentStepIndex: 0,
  completedAt: "2026-04-21T00:00:04.500Z",
  trace: [
    {
      ...run.trace[0]!,
      workflowRunId: "run-2",
      status: "failed"
    }
  ],
  events: [
    ...run.events.filter((event) => event.type !== "stage_completed").map((event) => ({
      ...event,
      workflowRunId: "run-2"
    })),
    {
      id: "event-7",
      workflowRunId: "run-2",
      workflowId: workflow.id,
      workflowStageId: "stage-1",
      stepIndex: 0,
      ord: 6,
      type: "stage_failed",
      status: "failed",
      title: "Initial Recon failed",
      summary: "Initial Recon failed because HTTP Recon did not complete successfully.",
      detail: "HTTP recon crashed",
      payload: {
        stageLabel: "Initial Recon",
        selectedToolIds: [tool.id],
        failedToolRunId: "tool-run-failed",
        degraded: false
      },
      createdAt: "2026-04-21T00:00:04.000Z"
    }
  ]
};

function paginatedResponse<T>(key: string, items: T[]) {
  return {
    [key]: items,
    page: 1,
    pageSize: items.length || 1,
    total: items.length,
    totalPages: 1
  };
}

function renderWorkflowsPage() {
  return render(
    <MemoryRouter>
      <WorkflowsPage
        workflowId={workflow.id}
        onNavigateToList={() => {}}
        onNavigateToCreate={() => {}}
        onNavigateToDetail={() => {}}
      />
    </MemoryRouter>
  );
}

describe("WorkflowsPage", () => {
  let eventSourceInstances: Array<{
    onopen: (() => void) | null;
    onmessage: ((event: MessageEvent<string>) => void) | null;
    onerror: (() => void) | null;
    close: () => void;
  }>;

  beforeEach(() => {
    eventSourceInstances = [];
    vi.stubGlobal("EventSource", class {
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent<string>) => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(_url: string) {
        eventSourceInstances.push(this);
      }

      close() {}
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Duplex workflow detail layout and edit controls", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/applications?")) {
        return new Response(JSON.stringify(paginatedResponse("applications", [application])));
      }
      if (url.startsWith("/api/runtimes?")) {
        return new Response(JSON.stringify(paginatedResponse("runtimes", [runtime])));
      }
      if (url.startsWith("/api/ai-agents?")) {
        return new Response(JSON.stringify(paginatedResponse("agents", [agent])));
      }
      if (url.startsWith("/api/ai-providers?")) {
        return new Response(JSON.stringify(paginatedResponse("providers", [provider])));
      }
      if (url.startsWith("/api/ai-tools?")) {
        return new Response(JSON.stringify(paginatedResponse("tools", [tool])));
      }
      if (url.startsWith("/api/workflows?")) {
        return new Response(JSON.stringify(paginatedResponse("workflows", [workflow])));
      }
      if (url === `/api/workflows/${workflow.id}`) {
        return new Response(JSON.stringify(workflow));
      }
      if (url === `/api/workflows/${workflow.id}/runs/latest`) {
        return new Response(JSON.stringify(run));
      }

      throw new Error(`Unhandled fetch: ${url}`);
    }));

    renderWorkflowsPage();

    expect(await screen.findByRole("button", { name: "Start Run" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Show Full Details" })).toBeEnabled();
    expect(screen.queryByText("Run Snapshot")).not.toBeInTheDocument();
    expect(screen.getAllByText(/local orchestrator/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HTTP Recon/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("200 OK\nServer: demo")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show Full Details" }));
    expect(await screen.findByRole("button", { name: "Hide Full Details" })).toBeInTheDocument();
    expect(screen.getByText(/Server: demo/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Workflow" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Continue Run" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Local Vulnerable Target").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Edit Workflow" }));
    expect(await screen.findByText("Workflow Edit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Evidence Workflow")).toBeInTheDocument();
  });

  it("shows explicit failure outcome and blocked hand-off when a stage fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/applications?")) {
        return new Response(JSON.stringify(paginatedResponse("applications", [application])));
      }
      if (url.startsWith("/api/runtimes?")) {
        return new Response(JSON.stringify(paginatedResponse("runtimes", [runtime])));
      }
      if (url.startsWith("/api/ai-agents?")) {
        return new Response(JSON.stringify(paginatedResponse("agents", [agent])));
      }
      if (url.startsWith("/api/ai-providers?")) {
        return new Response(JSON.stringify(paginatedResponse("providers", [provider])));
      }
      if (url.startsWith("/api/ai-tools?")) {
        return new Response(JSON.stringify(paginatedResponse("tools", [tool])));
      }
      if (url.startsWith("/api/workflows?")) {
        return new Response(JSON.stringify(paginatedResponse("workflows", [workflow])));
      }
      if (url === `/api/workflows/${workflow.id}`) {
        return new Response(JSON.stringify(workflow));
      }
      if (url === `/api/workflows/${workflow.id}/runs/latest`) {
        return new Response(JSON.stringify(failedRun));
      }

      throw new Error(`Unhandled fetch: ${url}`);
    }));

    renderWorkflowsPage();

    expect(await screen.findByText("Initial Recon failed")).toBeInTheDocument();
    expect(screen.getAllByText(/http recon/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Continue Run" })).not.toBeInTheDocument();
  });

  it("shows the empty Duplex shell when no latest run exists yet", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/applications?")) {
        return new Response(JSON.stringify(paginatedResponse("applications", [application])));
      }
      if (url.startsWith("/api/runtimes?")) {
        return new Response(JSON.stringify(paginatedResponse("runtimes", [runtime])));
      }
      if (url.startsWith("/api/ai-agents?")) {
        return new Response(JSON.stringify(paginatedResponse("agents", [agent])));
      }
      if (url.startsWith("/api/ai-providers?")) {
        return new Response(JSON.stringify(paginatedResponse("providers", [provider])));
      }
      if (url.startsWith("/api/ai-tools?")) {
        return new Response(JSON.stringify(paginatedResponse("tools", [tool])));
      }
      if (url.startsWith("/api/workflows?")) {
        return new Response(JSON.stringify(paginatedResponse("workflows", [workflow])));
      }
      if (url === `/api/workflows/${workflow.id}`) {
        return new Response(JSON.stringify(workflow));
      }
      if (url === `/api/workflows/${workflow.id}/runs/latest`) {
        return new Response(JSON.stringify({ message: "Workflow run not found." }), { status: 404, headers: { "Content-Type": "application/json" } });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    }));

    renderWorkflowsPage();

    expect(await screen.findByText("No run yet")).toBeInTheDocument();
    expect(screen.getByText("Start the first Duplex session")).toBeInTheDocument();
    expect(screen.queryByText("Run sealed")).not.toBeInTheDocument();
  });

  it("renders live streamed workflow text from the existing SSE channel", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/applications?")) {
        return new Response(JSON.stringify(paginatedResponse("applications", [application])));
      }
      if (url.startsWith("/api/runtimes?")) {
        return new Response(JSON.stringify(paginatedResponse("runtimes", [runtime])));
      }
      if (url.startsWith("/api/ai-agents?")) {
        return new Response(JSON.stringify(paginatedResponse("agents", [agent])));
      }
      if (url.startsWith("/api/ai-providers?")) {
        return new Response(JSON.stringify(paginatedResponse("providers", [provider])));
      }
      if (url.startsWith("/api/ai-tools?")) {
        return new Response(JSON.stringify(paginatedResponse("tools", [tool])));
      }
      if (url.startsWith("/api/workflows?")) {
        return new Response(JSON.stringify(paginatedResponse("workflows", [workflow])));
      }
      if (url === `/api/workflows/${workflow.id}`) {
        return new Response(JSON.stringify(workflow));
      }
      if (url === `/api/workflows/${workflow.id}/runs/latest`) {
        return new Response(JSON.stringify(run));
      }

      throw new Error(`Unhandled fetch: ${url}`);
    }));

    renderWorkflowsPage();

    await waitFor(() => {
      expect(eventSourceInstances).toHaveLength(1);
    });

    const message: WorkflowRunStreamMessage = {
      type: "run_event",
      run,
      event: run.events[0]!,
      liveModelOutput: {
        runId: run.id,
        source: "hosted",
        text: "Live streamed assistant text",
        reasoning: "Reasoning in progress",
        final: false,
        createdAt: "2026-04-21T00:00:02.200Z"
      }
    };

    await act(async () => {
      eventSourceInstances[0]?.onmessage?.({
        data: JSON.stringify(message)
      } as MessageEvent<string>);
    });

    expect(await screen.findByText("Live streamed assistant text")).toBeInTheDocument();
    expect(screen.getByText("Reasoning in progress")).toBeInTheDocument();
  });
});
