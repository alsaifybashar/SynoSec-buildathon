import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiAgent, AiProvider, AiTool, Application, AuthSessionResponse, Runtime, Workflow } from "@synosec/contracts";
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
  let applications: Application[];
  let runtimes: Runtime[];
  let providers: AiProvider[];
  let agents: AiAgent[];
  let tools: AiTool[];
  let workflows: Workflow[];
  let authSession: AuthSessionResponse;
  let authSessionFailureCount: number;

  beforeEach(() => {
    applications = [
      {
        id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
        name: "Operator Portal",
        baseUrl: "https://portal.synosec.local",
        environment: "production",
        status: "active",
        lastScannedAt: "2026-04-12T12:00:00.000Z",
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      }
    ];

    runtimes = [
      {
        id: "rt-00111111-1111-4111-8111-111111111111",
        name: "Node Runtime 20",
        serviceType: "api",
        provider: "docker",
        environment: "production",
        region: "eu-north-1",
        status: "healthy",
        applicationId: applications[0]?.id ?? null,
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      }
    ];

    providers = [
      {
        id: "2ef12df8-fdf6-4ef0-89ce-01d34b4f3af7",
        name: "Primary Anthropic",
        kind: "anthropic",
        status: "active",
        description: "Default cloud provider",
        baseUrl: null,
        model: "claude-sonnet-4-5",
        apiKeyConfigured: true,
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
        providerId: providers[0]?.id ?? "",
        systemPrompt: "Enumerate the target and summarize the result.",
        modelOverride: null,
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
        description: "Seeded workflow for the local target",
        applicationId: applications[0]?.id ?? "",
        runtimeId: runtimes[0]?.id ?? null,
        agentId: agents[0]?.id ?? "",
        objective: "Complete the Initial Recon stage using allowed tools and structured reporting.",
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
    authSession = {
      authEnabled: false,
      authenticated: false,
      csrfToken: null,
      googleClientId: null,
      user: null
    };
    authSessionFailureCount = 0;

    window.history.replaceState({}, "", "/");

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

      if ((url === "/api/applications" || url.startsWith("/api/applications?")) && method === "GET") {
        return new Response(JSON.stringify(createPaginatedPayload("applications", applications)));
      }
      if (url.startsWith("/api/applications/") && method === "GET") {
        return new Response(JSON.stringify(applications[0]));
      }
      if ((url === "/api/runtimes" || url.startsWith("/api/runtimes?")) && method === "GET") {
        return new Response(JSON.stringify(createPaginatedPayload("runtimes", runtimes)));
      }
      if (url.startsWith("/api/runtimes/") && method === "GET") {
        return new Response(JSON.stringify(runtimes[0]));
      }
      if ((url === "/api/ai-providers" || url.startsWith("/api/ai-providers?")) && method === "GET") {
        return new Response(JSON.stringify(createPaginatedPayload("providers", providers)));
      }
      if (url.startsWith("/api/ai-providers/") && method === "GET") {
        const id = url.split("/").pop() ?? "";
        const provider = providers.find((candidate) => candidate.id === id);
        return provider
          ? new Response(JSON.stringify(provider))
          : new Response(JSON.stringify({ message: "AI provider not found." }), { status: 404 });
      }
      if (url === "/api/ai-providers" && method === "POST") {
        const body = JSON.parse(String(init?.body)) as Omit<AiProvider, "id" | "createdAt" | "updatedAt" | "apiKeyConfigured"> & { apiKey?: string };
        const created: AiProvider = {
          id: "cb2a6a1d-36ad-49eb-b8dd-a4474b88f393",
          name: body.name,
          kind: body.kind,
          status: body.status,
          description: body.description ?? null,
          baseUrl: body.baseUrl ?? null,
          model: body.model,
          apiKeyConfigured: Boolean(body.apiKey),
          createdAt: "2026-04-12T13:00:00.000Z",
          updatedAt: "2026-04-12T13:00:00.000Z"
        };
        providers = [...providers, created];
        return new Response(JSON.stringify(created), { status: 201 });
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
      if (url.startsWith("/api/workflows/") && method === "GET") {
        const id = url.split("/").pop() ?? "";
        const workflow = workflows.find((candidate) => candidate.id === id);
        return workflow
          ? new Response(JSON.stringify(workflow))
          : new Response(JSON.stringify({ message: "Workflow not found." }), { status: 404 });
      }
      throw new Error(`Unhandled fetch: ${method} ${url}`);
    }));
  });

  it("routes the root path to applications", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Applications" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/applications");
  });

  it("shows the new AI builder navigation surfaces", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "Applications" });
    fireEvent.click(screen.getAllByRole("button", { name: "AI Providers" })[0]!);
    expect(await screen.findByRole("heading", { name: "AI Providers" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "AI Agents" })[0]!);
    expect(await screen.findByRole("heading", { name: "AI Agents" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "AI Tools" })[0]!);
    expect(await screen.findByRole("heading", { name: "AI Tools" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Workflows" })[0]!);
    expect(await screen.findByRole("heading", { name: "Workflows" })).toBeInTheDocument();

    expect(screen.queryByText("Templates")).not.toBeInTheDocument();
  });

  it("opens AI provider detail pages through the url-backed list flow", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "Applications" });
    fireEvent.click(screen.getAllByRole("button", { name: "AI Providers" })[0]!);
    fireEvent.click((await screen.findAllByText("Primary Anthropic"))[0]!);

    expect(await screen.findByRole("heading", { name: "Primary Anthropic" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/ai-providers/2ef12df8-fdf6-4ef0-89ce-01d34b4f3af7");
    expect(await screen.findByPlaceholderText("Configured; leave blank to keep current value")).toBeInTheDocument();
  });

  it("redirects protected routes to login when auth is enabled and no session exists", async () => {
    authSession = {
      authEnabled: true,
      authenticated: false,
      csrfToken: null,
      googleClientId: "google-client-id",
      user: null
    };
    window.history.replaceState({}, "", "/ai-providers");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Sign in to SynoSec" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toContain("redirectTo=%2Fai-providers");
  });

  it("retries session bootstrap before loading the app", async () => {
    authSessionFailureCount = 2;

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Applications" })).toBeInTheDocument();
  });

  it("shows a recoverable bootstrap error after repeated session failures", async () => {
    authSessionFailureCount = 99;

    render(<App />);

    expect(await screen.findByText("Session check failed")).toBeInTheDocument();

    authSessionFailureCount = 0;
    fireEvent.click(screen.getByRole("button", { name: "Retry session check" }));

    expect(await screen.findByRole("heading", { name: "Applications" })).toBeInTheDocument();
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

    fireEvent.click((await screen.findAllByRole("button", { name: "Sign out" }))[0]!);

    expect(await screen.findByRole("heading", { name: "Sign in to SynoSec" })).toBeInTheDocument();
  });

});
