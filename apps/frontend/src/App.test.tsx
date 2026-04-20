import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiAgent, AiProvider, AiTool, Application, Runtime } from "@synosec/contracts";
import App from "@/App";

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
        adapter: "httpx_probe",
        binary: "httpx",
        category: "web",
        riskTier: "passive",
        notes: null,
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
        adapter: "external_tool",
        binary: null,
        category: "utility",
        riskTier: "passive",
        notes: "Wraps an MCP bridge",
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

    window.history.replaceState({}, "", "/");

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

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

    fireEvent.click(screen.getAllByRole("button", { name: "AI Providers" })[0]!);
    expect(await screen.findByRole("heading", { name: "AI Providers" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "AI Agents" })[0]!);
    expect(await screen.findByRole("heading", { name: "AI Agents" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "AI Tools" })[0]!);
    expect(await screen.findByRole("heading", { name: "AI Tools" })).toBeInTheDocument();

    expect(screen.queryByText("Templates")).not.toBeInTheDocument();
  });

  it("opens AI provider detail pages through the url-backed list flow", async () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: "AI Providers" })[0]!);
    fireEvent.click((await screen.findAllByText("Primary Anthropic"))[0]!);

    expect(await screen.findByRole("heading", { name: "Primary Anthropic" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/ai-providers/2ef12df8-fdf6-4ef0-89ce-01d34b4f3af7");
    expect(screen.getByPlaceholderText("Configured; leave blank to keep current value")).toBeInTheDocument();
  });

});
