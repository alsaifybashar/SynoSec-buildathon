import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixedAiRuntimeLabel, type AiAgent, type AiTool } from "@synosec/contracts";
import { AiAgentsPage } from "@/features/ai-agents/page";

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
  timeoutMs: 30000,
  inputSchema: { type: "object", properties: {} },
  outputSchema: { type: "object", properties: {} },
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const agent: AiAgent = {
  id: "agent-1",
  name: "Recon Agent",
  status: "active",
  description: "Uses passive reconnaissance first.",
  systemPrompt: "Inspect the target first.",
  toolIds: [tool.id],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.startsWith("/api/ai-tools?")) {
      return new Response(JSON.stringify({
        tools: [tool],
        page: 1,
        pageSize: 100,
        total: 1,
        totalPages: 1
      }));
    }

    if (url.startsWith("/api/ai-agents?")) {
      return new Response(JSON.stringify({
        agents: [agent],
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1
      }));
    }

    if (url === `/api/ai-agents/${agent.id}`) {
      return new Response(JSON.stringify(agent));
    }

    throw new Error(`Unhandled request: ${url}`);
  });
}

describe("AiAgentsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the list through explicit ports and loaded context", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    render(
      <MemoryRouter initialEntries={["/ai-agents"]}>
        <AiAgentsPage
          onNavigateToList={() => {}}
          onNavigateToCreate={() => {}}
          onNavigateToDetail={() => {}}
        />
      </MemoryRouter>
    );

    expect((await screen.findAllByText("Recon Agent")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(fixedAiRuntimeLabel).length).toBeGreaterThan(0);
  });

  it("renders create detail after context loads", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    render(
      <MemoryRouter initialEntries={["/ai-agents/new"]}>
        <AiAgentsPage
          agentId="new"
          onNavigateToList={() => {}}
          onNavigateToCreate={() => {}}
          onNavigateToDetail={() => {}}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("System prompt")).toBeInTheDocument();
    });
    expect(screen.getByText("HTTP Recon")).toBeInTheDocument();
  });
});
