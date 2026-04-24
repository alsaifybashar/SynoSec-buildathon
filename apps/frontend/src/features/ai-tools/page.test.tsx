import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { AiToolsPage } from "@/features/ai-tools/page";

const tool: AiTool = {
  id: "tool-1",
  name: "HTTP Headers",
  status: "active",
  source: "custom",
  description: "Fetch headers",
  binary: "curl",
  executorType: "bash",
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
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const mockFetchJson = vi.fn();
const resourceListState = {
  query: { page: 1, pageSize: 25, q: "", sortBy: "name", sortDirection: "asc" },
  dataState: { state: "loaded", data: { items: [tool], page: 1, pageSize: 25, total: 1, totalPages: 1 } },
  items: [tool],
  meta: { items: [tool], page: 1, pageSize: 25, total: 1, totalPages: 1 },
  setSearch: vi.fn(),
  setFilter: vi.fn(),
  setSort: vi.fn(),
  setPage: vi.fn(),
  setPageSize: vi.fn(),
  refetch: vi.fn()
};
const resourceDetailState = {
  state: "loaded" as const,
  item: tool
};

vi.mock("@/shared/hooks/use-resource-list", () => ({
  useResourceList: () => resourceListState
}));

vi.mock("@/shared/hooks/use-resource-detail", () => ({
  useResourceDetail: () => resourceDetailState
}));

vi.mock("@/shared/lib/api", () => ({
  fetchJson: (...args: unknown[]) => mockFetchJson(...args)
}));

describe("AiToolsPage", () => {
  it("runs a tool from the detail page and renders the parsed result", async () => {
    mockFetchJson.mockResolvedValueOnce({
      toolId: "tool-1",
      toolName: "HTTP Headers",
      toolInput: { baseUrl: "https://example.com" },
      commandPreview: "curl -sS -I -L https://example.com",
      target: "example.com",
      port: null,
      output: "HTTP/1.1 200 OK",
      statusReason: null,
      exitCode: 0,
      durationMs: 15,
      observations: []
    });

    render(
      <AiToolsPage
        toolId="tool-1"
        onNavigateToList={vi.fn()}
        onNavigateToCreate={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Run input JSON"), {
      target: { value: JSON.stringify({ baseUrl: "https://example.com" }, null, 2) }
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Tool" }));

    await waitFor(() => {
      expect(mockFetchJson).toHaveBeenCalledWith("/api/ai-tools/tool-1/run", expect.objectContaining({
        method: "POST"
      }));
    });

    expect(await screen.findByDisplayValue("curl -sS -I -L https://example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/HTTP\/1.1 200 OK/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/"exitCode": 0/)).toBeInTheDocument();
  });
});
