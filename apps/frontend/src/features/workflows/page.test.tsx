import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkflowStageSystemPrompt,
  defaultWorkflowTaskPromptTemplate,
  type AiAgent,
  type AiTool,
  type Target,
  type Workflow,
  type WorkflowLaunch,
  type WorkflowRun,
  type WorkflowRunEvaluationResponse
} from "@synosec/contracts";
import { WorkflowDetailPage } from "@/features/workflows/detail-page";
import { WorkflowsPage } from "@/features/workflows/page";

const target: Target = {
  id: "target-1",
  name: "Local Vulnerable Target",
  baseUrl: "http://127.0.0.1:3000",
  environment: "development",
  status: "active",
  lastScannedAt: null,
  constraintBindings: [
    {
      constraintId: "seed-constraint-cloudflare-v1",
      createdAt: "2026-04-21T00:00:00.000Z",
      constraint: {
        id: "seed-constraint-cloudflare-v1",
        name: "Cloudflare Owned Asset Policy",
        kind: "provider_policy",
        provider: "cloudflare",
        version: 1,
        description: "Review the Cloudflare scans and penetration-testing policy before running this workflow.",
        bypassForLocalTargets: false,
        denyProviderOwnedTargets: true,
        requireVerifiedOwnership: true,
        allowActiveExploit: false,
        requireRateLimitSupport: true,
        rateLimitRps: 5,
        requireHostAllowlistSupport: true,
        requirePathExclusionSupport: true,
        documentationUrls: ["https://developers.cloudflare.com/fundamentals/reference/scans-penetration/"],
        excludedPaths: ["/cdn-cgi/"],
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z"
      }
    }
  ],
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
  description: "Local workflow runner",
  systemPrompt: "Coordinate the next best step.",
  toolIds: [tool.id],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const workflow: Workflow = {
  id: "workflow-1",
  name: "Evidence Workflow",
  status: "active",
  executionKind: "workflow",
  description: "Stage timeline test",
  agentId: agent.id,
  objective: "Complete the Initial Recon stage using allowed tools and structured reporting.",
  stageSystemPrompt: defaultWorkflowStageSystemPrompt,
  taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
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
      stageSystemPrompt: defaultWorkflowStageSystemPrompt,
      taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
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
  workflowLaunchId: "launch-1",
  targetId: target.id,
  status: "running",
  currentStepIndex: 1,
  startedAt: "2026-04-21T00:00:00.000Z",
  completedAt: null,
  tokenUsage: { inputTokens: 21, outputTokens: 9, totalTokens: 30 },
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
      type: "model_decision",
      status: "completed",
      title: "Local Orchestrator selected tools",
      summary: "Selected HTTP Recon.",
      detail: "HTTP recon is the highest-signal first step.",
      payload: {
        selectedToolIds: [tool.id],
        selectedToolNames: [tool.name],
        reasoning: "HTTP recon is the highest-signal first step."
      },
      createdAt: "2026-04-21T00:00:02.000Z"
    },
    {
      id: "event-3",
      workflowRunId: "run-1",
      workflowId: workflow.id,
      workflowStageId: "stage-1",
      stepIndex: 0,
      ord: 2,
      type: "tool_result",
      status: "completed",
      title: "HTTP Recon returned completed",
      summary: "200 OK",
      detail: "200 OK\nServer: demo",
      payload: {
        toolId: tool.id,
        toolName: tool.name,
        outputPreview: "200 OK",
        output: {
          id: "tool-run-1",
          summary: "200 OK"
        },
        observations: [],
        totalObservations: 0,
        truncated: false
      },
      createdAt: "2026-04-21T00:00:03.000Z"
    }
  ]
};

const launch: WorkflowLaunch = {
  id: "launch-1",
  workflowId: workflow.id,
  status: "running",
  startedAt: run.startedAt,
  completedAt: null,
  runs: [{
    targetId: target.id,
    runId: run.id,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    errorMessage: null
  }]
};

const workflowEvaluation: WorkflowRunEvaluationResponse = {
  status: "available",
  runId: run.id,
  targetPack: "vulnerable-app",
  score: 84,
  label: "84 / 100",
  summary: "Matched most documented expectations.",
  subscores: [{ key: "run-status", label: "Run status", score: 20, maxScore: 20 }],
  explanation: ["Run completed successfully."],
  matchedExpectations: [{ key: "admin", label: "Admin path", met: true, evidence: ["/admin"] }],
  unmetExpectations: []
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

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.startsWith("/api/targets?")) {
      return new Response(JSON.stringify(paginatedResponse("targets", [target])));
    }
    if (url.startsWith("/api/ai-agents?")) {
      return new Response(JSON.stringify(paginatedResponse("agents", [agent])));
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
    if (url === `/api/ai-agents/${agent.id}` && (!init?.method || init.method === "GET")) {
      return new Response(JSON.stringify(agent));
    }
    if (url === `/api/workflows/${workflow.id}/launches/latest`) {
      return new Response(JSON.stringify(launch));
    }
    if (url === `/api/workflows/${workflow.id}/runs` && init?.method === "POST") {
      return new Response(JSON.stringify(launch));
    }
    if (url === `/api/workflow-runs/${run.id}`) {
      return new Response(JSON.stringify(run));
    }
    if (url === `/api/workflow-runs/${run.id}/evaluation`) {
      return new Response(JSON.stringify(workflowEvaluation));
    }
    if (url === "/api/workflows" && init?.method === "POST") {
      return new Response(JSON.stringify({
        ...workflow,
        id: "workflow-created",
        name: "New Workflow"
      }));
    }
    if (url === `/api/workflows/${workflow.id}` && init?.method === "PATCH") {
      return new Response(JSON.stringify({
        ...workflow,
        ...JSON.parse(String(init.body))
      }));
    }
    if (url === `/api/ai-agents/${agent.id}` && init?.method === "PATCH") {
      return new Response(JSON.stringify({
        ...agent,
        ...JSON.parse(String(init.body))
      }));
    }

    throw new Error(`Unhandled fetch: ${url}`);
  });
}

function renderWorkflowDetailPage({
  onNavigateToEdit = () => {},
  onNavigateToAgent = () => {}
}: {
  onNavigateToEdit?: (id: string, label?: string) => void;
  onNavigateToAgent?: (id: string) => void;
} = {}) {
  return render(
    <MemoryRouter>
      <WorkflowDetailPage
        workflowId={workflow.id}
        onNavigateToList={() => {}}
        onNavigateToEdit={onNavigateToEdit}
        onNavigateToAgent={onNavigateToAgent}
      />
    </MemoryRouter>
  );
}

function renderWorkflowConfigPage({
  workflowId = "new",
  onNavigateToDetail = () => {}
}: {
  workflowId?: string;
  onNavigateToDetail?: (id: string, label?: string) => void;
} = {}) {
  return render(
    <MemoryRouter>
      <WorkflowsPage
        workflowId={workflowId}
        onNavigateToList={() => {}}
        onNavigateToCreate={() => {}}
        onNavigateToDetail={onNavigateToDetail}
      />
    </MemoryRouter>
  );
}

describe("WorkflowDetailPage", () => {
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

  it("renders the workflow detail layout and routes edit through navigation", async () => {
    const onNavigateToEdit = vi.fn();
    const onNavigateToAgent = vi.fn();
    vi.stubGlobal("fetch", createFetchMock());

    renderWorkflowDetailPage({ onNavigateToEdit, onNavigateToAgent });

    expect(await screen.findByRole("button", { name: "Start Run" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Show Full Details" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Show guidance for Evaluation" })).toBeInTheDocument();
    expect(await screen.findByText("84 / 100")).toBeInTheDocument();
    expect(screen.queryByText("Every agent receives these for this workflow")).not.toBeInTheDocument();
    expect(screen.queryByText("Linked agent persisted grants")).not.toBeInTheDocument();
    expect(await screen.findByText("0k in · 0k out · 0k total")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show Full Details" }));
    expect(await screen.findByRole("button", { name: "Hide Full Details" })).toBeInTheDocument();
    expect(screen.getByText(/"summary": "200 OK"/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Workflow" }));
    expect(onNavigateToEdit).toHaveBeenCalledWith(workflow.id, workflow.name);
  });

  it("starts a workflow run from the detail page without constraint confirmation", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWorkflowDetailPage();
    fireEvent.click(await screen.findByRole("button", { name: "Start Run" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([input, init]) => String(input) === `/api/workflows/${workflow.id}/runs` && init?.method === "POST");
      expect(postCall).toBeDefined();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([input, init]) => String(input) === `/api/workflows/${workflow.id}/runs` && init?.method === "POST");
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({ targetId: target.id });
  });

  it("keeps the existing SSE workflow channel active for running runs", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    renderWorkflowDetailPage();

    await waitFor(() => {
      expect(eventSourceInstances).toHaveLength(1);
    });

    expect(eventSourceInstances[0]?.onmessage).toBeTypeOf("function");
  });

  it("saves the workflow prompt from the modal before starting a run", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWorkflowDetailPage();

    fireEvent.click(await screen.findByRole("button", { name: "Edit Prompts" }));

    expect(await screen.findByRole("dialog", { name: "Edit Prompts" })).toBeInTheDocument();
    expect(screen.getByText("Workflow context")).toBeInTheDocument();
    expect(screen.getByText("Target context")).toBeInTheDocument();
    expect(screen.getByText("Workflow execution contract")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Runtime target context:/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Operator URL: http:\/\/127.0.0.1:3000/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Run evidence tools first, submit evidence-backed resources, findings, and relationships with report_system_graph_batch/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Workflow system prompt"), {
      target: { value: "Drive the workflow decisively and report evidence-backed findings." }
    });
    fireEvent.change(screen.getByLabelText("Workflow execution contract"), {
      target: { value: "Workflow execution contract:\nCall complete_run last and include only `summary`." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save and Run" }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.find(([input, init]) => String(input) === `/api/workflows/${workflow.id}` && init?.method === "PATCH")).toBeDefined();
      expect(fetchMock.mock.calls.find(([input, init]) => String(input) === `/api/workflows/${workflow.id}/runs` && init?.method === "POST")).toBeDefined();
    });

    const workflowPatchCall = fetchMock.mock.calls.find(([input, init]) => String(input) === `/api/workflows/${workflow.id}` && init?.method === "PATCH");

    expect(JSON.parse(String(workflowPatchCall?.[1]?.body))).toEqual({
      stageSystemPrompt: "Drive the workflow decisively and report evidence-backed findings.\n\nWorkflow execution contract:\nCall complete_run last and include only `summary`."
    });
  });
});

describe("WorkflowsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a workflow from the config page", async () => {
    const fetchMock = createFetchMock();
    const onNavigateToDetail = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWorkflowConfigPage({ onNavigateToDetail });

    expect(await screen.findByText("Workflow Configuration")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Workflow" } });
    fireEvent.change(screen.getByLabelText("System prompt"), { target: { value: "Map the target using the configured workflow." } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]!);

    const postCall = fetchMock.mock.calls.find(([input, init]) => String(input) === "/api/workflows" && init?.method === "POST");
    await waitFor(() => {
      expect(postCall).toBeDefined();
    });
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      name: "New Workflow",
      executionKind: "workflow"
    });
    expect(onNavigateToDetail).toHaveBeenCalledWith("workflow-created", "New Workflow");
  });

  it("renders helper triggers for guided workflow fields", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    renderWorkflowConfigPage();

    expect(await screen.findByText("Workflow Configuration")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show guidance for Execution kind" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show guidance for Agent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show guidance for System prompt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show guidance for Linked agent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show guidance for Allowed tools" })).toBeInTheDocument();
  });

  it("updates an existing workflow from the config edit page", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWorkflowConfigPage({ workflowId: workflow.id });

    expect(await screen.findByDisplayValue("Evidence Workflow")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Updated Workflow" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]!);

    const patchCall = fetchMock.mock.calls.find(([input, init]) => String(input) === `/api/workflows/${workflow.id}` && init?.method === "PATCH");
    await waitFor(() => {
      expect(patchCall).toBeDefined();
    });
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      name: "Updated Workflow",
      executionKind: "workflow"
    });
  });
});
