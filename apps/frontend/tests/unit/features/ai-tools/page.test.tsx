import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { AiToolsPage } from "@/features/ai-tools/page";

const capabilityTool: AiTool = {
  id: "builtin-http-surface-assessment",
  name: "HTTP Surface Assessment",
  kind: "semantic-family",
  status: "active",
  source: "system",
  accessProfile: "standard",
  description: "Capability-facing HTTP assessment surface.",
  executorType: "builtin",
  builtinActionKey: "http_surface_assessment",
  bashSource: null,
  capabilities: ["semantic-family"],
  category: "web",
  riskTier: "passive",
  timeoutMs: 30000,
  coveredToolIds: ["seed-httpx", "seed-http-recon"],
  candidateToolIds: ["seed-httpx"],
  inputSchema: { type: "object", properties: { baseUrl: { type: "string" } } },
  outputSchema: { type: "object", properties: { id: { type: "string" }, summary: { type: "string" } }, required: ["id", "summary"] },
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z",
  runtimeStateSummary: {
    cataloged: true,
    installed: true,
    executable: true,
    granted: true
  }
};

const builtinActionTool: AiTool = {
  ...capabilityTool,
  id: "builtin-report-system-graph-batch",
  name: "Report System Graph Batch",
  kind: "builtin-action",
  builtinActionKey: "report_system_graph_batch",
  coveredToolIds: [],
  candidateToolIds: []
};

const resourceListState = {
  query: { page: 1, pageSize: 25, q: "", sortBy: "name", sortDirection: "asc" },
  dataState: { state: "loaded" as const, data: { items: [capabilityTool], page: 1, pageSize: 25, total: 1, totalPages: 1 } },
  items: [capabilityTool],
  meta: { items: [capabilityTool], page: 1, pageSize: 25, total: 1, totalPages: 1 },
  setSearch: vi.fn(),
  setFilter: vi.fn(),
  setSort: vi.fn(),
  setPage: vi.fn(),
  setPageSize: vi.fn(),
  refetch: vi.fn()
};

const resourceDetailState = {
  state: "loaded" as const,
  item: capabilityTool
};

vi.mock("@/shared/hooks/use-resource-list", () => ({
  useResourceList: () => resourceListState
}));

vi.mock("@/shared/hooks/use-resource-detail", () => ({
  useResourceDetail: () => resourceDetailState
}));

describe("AiToolsPage", () => {
  beforeEach(() => {
    resourceDetailState.item = capabilityTool;
  });

  it("renders capability tools as read-only without exposing a run console", () => {
    render(
      <AiToolsPage
        toolId="builtin-http-surface-assessment"
        onNavigateToList={vi.fn()}
        onNavigateToCreate={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("HTTP Surface Assessment")).toBeDisabled();
    expect(screen.getByDisplayValue("Capability Tool")).toBeDisabled();
    expect(screen.getByDisplayValue("Workflow-facing capability tool")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Run Tool" })).not.toBeInTheDocument();
    expect(screen.getByText("Built-in tools do not expose a runnable shell test console here.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("seed-httpx")).toBeDisabled();
    expect(screen.getByDisplayValue("seed-httpx, seed-http-recon")).toBeDisabled();
  });

  it("shows builtin action guidance for workflow control tools", () => {
    resourceDetailState.item = builtinActionTool;

    render(
      <AiToolsPage
        toolId="builtin-report-system-graph-batch"
        onNavigateToList={vi.fn()}
        onNavigateToCreate={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    expect(screen.getByText("Built-in action")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Report System Graph Batch")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Run Tool" })).not.toBeInTheDocument();
    expect(screen.getByText("Built-in tools do not expose a runnable shell test console here.")).toBeInTheDocument();
  });

  it("hides registry creation actions from the list page", () => {
    render(
      <AiToolsPage
        onNavigateToList={vi.fn()}
        onNavigateToCreate={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Add AI Tool" })).not.toBeInTheDocument();
  });
});
