import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExecutionReportDetail } from "@synosec/contracts";
import { ExecutionReportsPage } from "@/features/execution-reports/page";

const report: ExecutionReportDetail = {
  id: "report-1",
  executionId: "run-1",
  executionKind: "workflow",
  sourceDefinitionId: "workflow-1",
  status: "completed",
  title: "Workflow execution report",
  targetLabel: "https://target.local",
  sourceLabel: "Workflow Alpha",
  findingsCount: 1,
  highestSeverity: "high",
  generatedAt: "2026-04-25T12:00:00.000Z",
  updatedAt: "2026-04-25T12:05:00.000Z",
  archivedAt: null,
  executiveSummary: "The workflow confirmed one evidence-backed finding.",
  graph: {
    nodes: [
      {
        id: "evidence-1",
        kind: "evidence",
        title: "Admin response",
        summary: "Passive HTTP probe confirmed a reachable admin surface.",
        sourceTool: "httpx",
        quote: "GET /admin returned 200",
        severity: "high",
        refs: [{ toolRunRef: "tool-run-1" }],
        createdAt: "2026-04-25T12:02:00.000Z"
      },
      {
        id: "finding-1",
        kind: "finding",
        findingId: "finding-1",
        title: "Admin surface exposed",
        summary: "The admin route is reachable without a protective gateway.",
        severity: "high",
        confidence: 0.91,
        targetLabel: "https://target.local/admin",
        createdAt: "2026-04-25T12:03:00.000Z"
      }
    ],
    edges: [
      {
        id: "edge-1",
        kind: "supports",
        source: "evidence-1",
        target: "finding-1",
        createdAt: "2026-04-25T12:03:30.000Z"
      }
    ]
  },
  findings: [
    {
      id: "finding-1",
      executionId: "run-1",
      executionKind: "workflow",
      source: "workflow-finding",
      severity: "high",
      title: "Admin surface exposed",
      type: "service_exposure",
      summary: "The admin route is reachable without a protective gateway.",
      recommendation: "Restrict the admin route.",
      confidence: 0.91,
      targetLabel: "https://target.local/admin",
      evidence: [{ sourceTool: "httpx", quote: "GET /admin returned 200", toolRunRef: "tool-run-1" }],
      sourceToolIds: ["httpx"],
      sourceToolRunIds: ["tool-run-1"],
      createdAt: "2026-04-25T12:03:00.000Z"
    }
  ],
  toolActivity: [],
  coverageOverview: {},
  sourceSummary: {
    executionKind: "workflow",
    runId: "run-1",
    workflowId: "workflow-1",
    stopReason: null,
    totalFindings: 1,
    topFindingIds: ["finding-1"]
  },
  raw: {}
};

const resourceListState = {
  query: { page: 1, pageSize: 25, q: "", sortBy: "generatedAt", sortDirection: "desc" },
  dataState: { state: "loaded", data: { items: [report], page: 1, pageSize: 25, total: 1, totalPages: 1 } },
  items: [report],
  meta: { items: [report], page: 1, pageSize: 25, total: 1, totalPages: 1 },
  setSearch: vi.fn(),
  setFilter: vi.fn(),
  setSort: vi.fn(),
  setPage: vi.fn(),
  setPageSize: vi.fn(),
  refetch: vi.fn()
};

vi.mock("@/shared/hooks/use-resource-list", () => ({
  useResourceList: () => resourceListState
}));

vi.mock("@/shared/hooks/use-resource-detail", () => ({
  useResourceDetail: () => ({
    state: "loaded" as const,
    item: report
  })
}));

vi.mock("@/shared/lib/api", () => ({
  fetchJson: vi.fn()
}));

describe("ExecutionReportsPage", () => {
  it("renders the execution graph before supporting findings and activity sections", () => {
    render(
      <ExecutionReportsPage
        reportId="report-1"
        onNavigateToList={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    expect(screen.getByText("Execution Graph")).toBeInTheDocument();
    expect(screen.getByText("2 nodes")).toBeInTheDocument();
    expect(screen.getByText("1 edges")).toBeInTheDocument();
    expect(screen.getByText("Admin response")).toBeInTheDocument();
    expect(screen.getAllByText("Admin surface exposed").length).toBeGreaterThan(0);
    expect(screen.getByText("tool:tool-run-1")).toBeInTheDocument();
    expect(screen.getAllByText("supports").length).toBeGreaterThan(0);
  });

  it("renders explainability markers for report sections", async () => {
    render(
      <ExecutionReportsPage
        reportId="report-1"
        onNavigateToList={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    fireEvent.focus(screen.getByRole("button", { name: "Show guidance for Graph structure" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Nodes capture persisted evidence or findings.");
    expect(screen.getByRole("button", { name: "Show guidance for Persisted findings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show guidance for Persisted tool activity" })).toBeInTheDocument();
  });
});
