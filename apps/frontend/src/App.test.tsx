import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkflowStageSystemPrompt,
  defaultWorkflowTaskPromptTemplate,
  fixedAiRuntimeLabel,
  type AiAgent,
  type AiTool,
  type AuthSessionResponse,
  type Target,
  type Workflow,
  type WorkflowRun
} from "@synosec/contracts";
import App from "@/app/App";

function createPaginatedPayload<T>(key: string, items: T[]) {
  return {
    [key]: items,
    page: 1,
    pageSize: 25,
    total: items.length,
    totalPages: 1
  };
}

describe("App", () => {
  let targets: Target[];
  let agents: AiAgent[];
  let tools: AiTool[];
  let workflows: Workflow[];
  let workflowRun: WorkflowRun;
  let authSession: AuthSessionResponse;
  let authSessionFailureCount: number;

  beforeEach(() => {
    targets = [
      {
        id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
        name: "Operator Portal",
        baseUrl: "https://portal.synosec.local",
        environment: "production",
        status: "active",
        lastScannedAt: "2026-04-12T12:00:00.000Z",
        deployments: [
          {
            id: "rt-00111111-1111-4111-8111-111111111111",
            name: "Node Runtime 20",
            serviceType: "api",
            provider: "docker",
            environment: "production",
            region: "eu-north-1",
            status: "healthy",
            createdAt: "2026-04-12T12:00:00.000Z",
            updatedAt: "2026-04-12T12:00:00.000Z"
          }
        ],
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      }
    ];

    tools = [
      {
        id: "httpx",
        name: "HTTPx",
        status: "active",
        source: "system",
        description: null,
        binary: "httpx",
        executorType: "bash",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
        capabilities: ["web-recon", "passive"],
        category: "web",
        riskTier: "passive",
        notes: null,
        sandboxProfile: "network-recon",
        privilegeProfile: "read-only-network",
        timeoutMs: 30000,
        inputSchema: { type: "object", properties: {} },
        outputSchema: { type: "object", properties: {} },
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      },
      {
        id: "custom-browser-tool",
        name: "Browser MCP",
        status: "active",
        source: "custom",
        description: "Internal browser automation bridge",
        binary: null,
        executorType: "bash",
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"browser bridge\"}'",
        capabilities: ["passive"],
        category: "utility",
        riskTier: "passive",
        notes: "Wraps an MCP bridge",
        sandboxProfile: "read-only-parser",
        privilegeProfile: "read-only-network",
        timeoutMs: 10000,
        inputSchema: { type: "object", properties: {} },
        outputSchema: { type: "object", properties: {} },
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      }
    ];

    agents = [
      {
        id: "67043e91-4017-47b8-ac3f-81eb19f51538",
        name: "Recon Agent",
        status: "active",
        description: "Primary recon worker",
        systemPrompt: "Enumerate the target and summarize the result.",
        toolIds: ["httpx"],
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      }
    ];

    workflows = [
      {
        id: "f5bbd721-7f5b-4336-b9f5-a8b3804cf1e1",
        name: "Local Vulnerable App Walkthrough",
        status: "active",
        executionKind: "attack-map",
        description: "Seeded workflow for the local target",
        agentId: agents[0]?.id ?? "",
        objective: "Complete the Initial Recon stage using allowed tools and structured reporting.",
        stageSystemPrompt: defaultWorkflowStageSystemPrompt,
        taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
        allowedToolIds: [],
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
            id: "80ad5033-136b-49dd-ae1f-c19136205cec",
            label: "Initial Recon",
            agentId: agents[0]?.id ?? "",
            ord: 0,
            objective: "Complete the Initial Recon stage using allowed tools and structured reporting.",
            stageSystemPrompt: defaultWorkflowStageSystemPrompt,
            taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
            allowedToolIds: [],
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
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      }
    ];
    workflowRun = {
      id: "7ecf4a8e-df5f-4945-a7e1-230ef43eac80",
      workflowId: workflows[0]!.id,
      workflowLaunchId: "launch-1",
      targetId: targets[0]!.id,
      executionKind: "attack-map",
      status: "completed",
      currentStepIndex: 0,
      startedAt: "2026-04-12T12:05:00.000Z",
      completedAt: "2026-04-12T12:06:00.000Z",
      trace: [],
      events: [
        {
          id: "evt-1",
          workflowRunId: "7ecf4a8e-df5f-4945-a7e1-230ef43eac80",
          workflowId: workflows[0]!.id,
          workflowStageId: workflows[0]!.stages[0]!.id,
          stepIndex: 0,
          ord: 0,
          type: "system_message",
          status: "completed",
          title: "Recon completed",
          summary: "Recon completed for the target.",
          detail: null,
          payload: {
            body: JSON.stringify({
              openPorts: [{ port: 443, protocol: "tcp", service: "https", version: "nginx" }],
              technologies: ["nginx", "react"],
              serverInfo: { webServer: "nginx" }
            })
          },
          createdAt: "2026-04-12T12:05:10.000Z"
        },
        {
          id: "evt-2",
          workflowRunId: "7ecf4a8e-df5f-4945-a7e1-230ef43eac80",
          workflowId: workflows[0]!.id,
          workflowStageId: workflows[0]!.stages[0]!.id,
          stepIndex: 0,
          ord: 1,
          type: "system_message",
          status: "completed",
          title: "Attack plan created",
          summary: "Attack plan created.",
          detail: null,
          payload: {
            body: JSON.stringify({
              overallRisk: "medium",
              summary: "Focus on the portal workflow path first.",
              phases: [{
                id: "phase-1",
                name: "Initial Recon",
                priority: "medium",
                rationale: "Enumerate the web surface.",
                targetService: "portal.synosec.local:443",
                tools: ["HTTPx"],
                status: "completed"
              }]
            })
          },
          createdAt: "2026-04-12T12:05:20.000Z"
        },
        {
          id: "evt-3",
          workflowRunId: "7ecf4a8e-df5f-4945-a7e1-230ef43eac80",
          workflowId: workflows[0]!.id,
          workflowStageId: workflows[0]!.stages[0]!.id,
          stepIndex: 0,
          ord: 2,
          type: "tool_call",
          status: "running",
          title: "Tool started: HTTPx",
          summary: "HTTPx started for recon.",
          detail: "httpx https://portal.synosec.local",
          payload: {
            phase: "recon",
            toolName: "HTTPx",
            toolInput: "httpx https://portal.synosec.local"
          },
          createdAt: "2026-04-12T12:05:30.000Z"
        },
        {
          id: "evt-4",
          workflowRunId: "7ecf4a8e-df5f-4945-a7e1-230ef43eac80",
          workflowId: workflows[0]!.id,
          workflowStageId: workflows[0]!.stages[0]!.id,
          stepIndex: 0,
          ord: 3,
          type: "tool_result",
          status: "completed",
          title: "Tool completed: HTTPx",
          summary: "HTTPx completed.",
          detail: "https://portal.synosec.local [200]",
          payload: {
            phase: "recon",
            toolName: "HTTPx",
            output: "https://portal.synosec.local [200]",
            exitCode: 0
          },
          createdAt: "2026-04-12T12:05:45.000Z"
        },
        {
          id: "evt-5",
          workflowRunId: "7ecf4a8e-df5f-4945-a7e1-230ef43eac80",
          workflowId: workflows[0]!.id,
          workflowStageId: workflows[0]!.stages[0]!.id,
          stepIndex: 0,
          ord: 4,
          type: "run_completed",
          status: "completed",
          title: "Attack-map workflow completed",
          summary: "Attack-map workflow completed.",
          detail: null,
          payload: {},
          createdAt: "2026-04-12T12:06:00.000Z"
        }
      ]
    };
    const workflowLaunch = {
      id: "launch-1",
      workflowId: workflows[0]!.id,
      status: "completed",
      startedAt: workflowRun.startedAt,
      completedAt: workflowRun.completedAt,
      runs: [{
        targetId: targets[0]!.id,
        runId: workflowRun.id,
        status: workflowRun.status,
        startedAt: workflowRun.startedAt,
        completedAt: workflowRun.completedAt,
        errorMessage: null
      }]
    };
    authSession = {
      authEnabled: false,
      authenticated: false,
      csrfToken: null,
      googleClientId: null,
      user: null
    };
    authSessionFailureCount = 0;

    window.history.replaceState({}, "", "/");

    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0
    });
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    Element.prototype.scrollIntoView = vi.fn();

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/auth/session" && method === "GET") {
        if (authSessionFailureCount > 0) {
          authSessionFailureCount -= 1;
          return new Response(null, { status: 503 });
        }
        return new Response(JSON.stringify(authSession));
      }
      if (url === "/api/auth/logout" && method === "POST") {
        authSession = {
          authEnabled: true,
          authenticated: false,
          csrfToken: null,
          googleClientId: null,
          user: null
        };
        return new Response(null, { status: 204 });
      }

      if ((url === "/api/targets" || url.startsWith("/api/targets?")) && method === "GET") {
        return new Response(JSON.stringify(createPaginatedPayload("targets", targets)));
      }
      if (url.startsWith("/api/targets/") && method === "GET") {
        return new Response(JSON.stringify(targets[0]));
      }
      if ((url === "/api/ai-agents" || url.startsWith("/api/ai-agents?")) && method === "GET") {
        return new Response(JSON.stringify(createPaginatedPayload("agents", agents)));
      }
      if (url.startsWith("/api/ai-agents/") && method === "GET") {
        return new Response(JSON.stringify(agents[0]));
      }
      if ((url === "/api/ai-tools" || url.startsWith("/api/ai-tools?")) && method === "GET") {
        return new Response(JSON.stringify(createPaginatedPayload("tools", tools)));
      }
      if (url.startsWith("/api/ai-tools/") && method === "GET") {
        const id = url.split("/").pop() ?? "";
        const tool = tools.find((candidate) => candidate.id === id);
        return tool
          ? new Response(JSON.stringify(tool))
          : new Response(JSON.stringify({ message: "AI tool not found." }), { status: 404 });
      }
      if ((url === "/api/workflows" || url.startsWith("/api/workflows?")) && method === "GET") {
        return new Response(JSON.stringify(createPaginatedPayload("workflows", workflows)));
      }
      if (url === `/api/workflows/${workflows[0]!.id}/launches/latest` && method === "GET") {
        return new Response(JSON.stringify(workflowLaunch));
      }
      if (url === `/api/workflows/${workflows[0]!.id}/runs` && method === "POST") {
        return new Response(JSON.stringify(workflowLaunch), { status: 201 });
      }
      if (url === `/api/workflow-runs/${workflowRun.id}` && method === "GET") {
        return new Response(JSON.stringify(workflowRun));
      }
      if (url.startsWith("/api/workflows/") && method === "GET") {
        const id = url.split("/").pop() ?? "";
        const workflow = workflows.find((candidate) => candidate.id === id);
        return workflow
          ? new Response(JSON.stringify(workflow))
          : new Response(JSON.stringify({ message: "Workflow not found." }), { status: 404 });
      }
      if (url === `/api/workflow-runs/${workflowRun.id}/findings` && method === "GET") {
        return new Response(JSON.stringify({
          runId: workflowRun.id,
          findings: [{
            id: "finding-1",
            workflowRunId: workflowRun.id,
            workflowStageId: workflows[0]!.stages[0]!.id,
            type: "other",
            title: "Administrative endpoint exposed",
            severity: "high",
            confidence: 0.82,
            target: {
              host: "portal.synosec.local",
              url: "https://portal.synosec.local/admin"
            },
            evidence: [{
              sourceTool: "HTTPx",
              quote: "https://portal.synosec.local/admin [200]"
            }],
            impact: "Administrative surface is reachable.",
            recommendation: "Restrict or authenticate the administrative route.",
            validationStatus: "single_source",
            derivedFromFindingIds: [],
            relatedFindingIds: [],
            enablesFindingIds: [],
            tags: ["attack-map"],
            createdAt: "2026-04-12T12:05:50.000Z"
          }]
        }));
      }
      throw new Error(`Unhandled fetch: ${method} ${url}`);
    }));
  });

  it("routes the root path to targets", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Targets" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/targets");
  });

  it("shows the new AI builder navigation surfaces", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "Targets" });
    fireEvent.click(screen.getAllByRole("link", { name: "AI Agents" })[0]!);
    expect(await screen.findByRole("heading", { name: "AI Agents" })).toBeInTheDocument();
    expect((await screen.findAllByText(fixedAiRuntimeLabel)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("link", { name: "AI Tools" })[0]!);
    expect(await screen.findByRole("heading", { name: "AI Tools" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("link", { name: "Workflows" })[0]!);
    expect(await screen.findByRole("heading", { name: "Workflows" })).toBeInTheDocument();

    expect(screen.queryByText("Templates")).not.toBeInTheDocument();
  });

  it("opens AI agent detail pages through the url-backed list flow", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "Targets" });
    fireEvent.click(screen.getAllByRole("link", { name: "AI Agents" })[0]!);
    fireEvent.click((await screen.findAllByText("Recon Agent"))[0]!);

    expect(await screen.findByRole("heading", { name: "Recon Agent" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/ai/agents/67043e91-4017-47b8-ac3f-81eb19f51538");
    expect(await screen.findByDisplayValue(fixedAiRuntimeLabel)).toBeInTheDocument();
  });

  it("loads the AI agent detail page without refetch loops", async () => {
    window.history.replaceState({}, "", "/ai/agents/67043e91-4017-47b8-ac3f-81eb19f51538");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Recon Agent" })).toBeInTheDocument();

    const fetchMock = vi.mocked(fetch);
    const requestedUrls = fetchMock.mock.calls.map(([input]) => String(input));

    expect(requestedUrls.filter((url) => url === "/api/ai-agents/67043e91-4017-47b8-ac3f-81eb19f51538").length).toBeLessThanOrEqual(3);
    expect(requestedUrls.filter((url) => url.startsWith("/api/ai-agents?")).length).toBeLessThanOrEqual(3);
    expect(requestedUrls.filter((url) => url.startsWith("/api/ai-tools?")).length).toBeLessThanOrEqual(2);
  });

  it("opens the AI agent create page from the list add-record action", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "Targets" });
    fireEvent.click(screen.getAllByRole("link", { name: "AI Agents" })[0]!);
    fireEvent.click(await screen.findByRole("button", { name: "Add AI Agent" }));

    expect(window.location.pathname).toBe("/ai/agents/new");
    expect(await screen.findByRole("heading", { name: "New AI agent" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
  });

  it("redirects protected routes to login when auth is enabled and no session exists", async () => {
    authSession = {
      authEnabled: true,
      authenticated: false,
      csrfToken: null,
      googleClientId: "google-client-id",
      user: null
    };
    window.history.replaceState({}, "", "/ai/agents");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Sign in to SynoSec" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toContain("redirectTo=%2Fai%2Fagents");
  });

  it("retries session bootstrap before loading the app", async () => {
    authSessionFailureCount = 2;

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Targets" })).toBeInTheDocument();
  });

  it("shows a recoverable bootstrap error after repeated session failures", async () => {
    authSessionFailureCount = 99;

    render(<App />);

    expect(await screen.findByText("Session check failed")).toBeInTheDocument();

    authSessionFailureCount = 0;
    fireEvent.click(screen.getByRole("button", { name: "Retry session check" }));

    expect(await screen.findByRole("heading", { name: "Targets" })).toBeInTheDocument();
  });

  it("shows the authenticated user and allows sign out when auth is enabled", async () => {
    authSession = {
      authEnabled: true,
      authenticated: true,
      csrfToken: "csrf-token",
      googleClientId: "google-client-id",
      user: {
        id: "d7ef9a8e-4113-46b5-b73f-2991b8d14c40",
        email: "operator@example.com",
        displayName: "Operator",
        avatarUrl: null
      }
    };

    render(<App />);

    expect((await screen.findAllByText("operator@example.com")).length).toBeGreaterThan(0);

    fireEvent.click((await screen.findAllByRole("button", { name: "Open settings" }))[0]!);
    fireEvent.click((await screen.findAllByRole("button", { name: "Sign out" }))[0]!);

    expect(await screen.findByRole("heading", { name: "Sign in to SynoSec" })).toBeInTheDocument();
  });

});
