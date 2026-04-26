import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ExecutionReportDetail,
  ExecutionReportSummary,
  ListExecutionReportsResponse,
  WorkflowLaunch,
  WorkflowRunFindingsResponse
} from "@synosec/contracts";
import { WorkflowGraphPage } from "@/features/workflows/workflow-graph-page";
import { ApiError } from "@/shared/lib/api";

const { fetchJsonMock } = vi.hoisted(() => ({
  fetchJsonMock: vi.fn()
}));

vi.mock("@/shared/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/api")>();
  return {
    ...actual,
    fetchJson: fetchJsonMock
  };
});

function createLaunch(runId: string): WorkflowLaunch {
  return {
    id: "70000000-0000-4000-8000-000000000001",
    workflowId: "70000000-0000-4000-8000-000000000002",
    status: "completed",
    startedAt: "2026-04-25T09:00:00.000Z",
    completedAt: "2026-04-25T09:20:00.000Z",
    runs: [{
      targetId: "70000000-0000-4000-8000-000000000101",
      runId,
      status: "completed",
      startedAt: "2026-04-25T09:01:00.000Z",
      completedAt: "2026-04-25T09:10:00.000Z",
      errorMessage: null
    }]
  };
}

const reportSummary: ExecutionReportSummary = {
  id: "report-1",
  executionId: "run-1",
  executionKind: "workflow",
  sourceDefinitionId: "70000000-0000-4000-8000-000000000002",
  status: "completed",
  title: "Run 1 report",
  targetLabel: "https://target.local",
  sourceLabel: "Workflow demo",
  findingsCount: 1,
  highestSeverity: "high",
  generatedAt: "2026-04-25T09:11:00.000Z",
  updatedAt: "2026-04-25T09:11:10.000Z",
  archivedAt: null
};

const reportDetail: ExecutionReportDetail = {
  ...reportSummary,
  executiveSummary: "summary",
  attackPathExecutiveSummary: "attack summary",
  attackPaths: { venues: [], vectors: [], paths: [] },
  graph: {
    nodes: [{
      id: "finding-1",
      kind: "finding",
      findingId: "finding-1",
      title: "Admin surface exposed",
      summary: "summary",
      severity: "high",
      confidence: 0.9,
      targetLabel: "https://target.local/admin",
      createdAt: "2026-04-25T09:10:00.000Z"
    }],
    edges: []
  },
  findings: [],
  toolActivity: [],
  coverageOverview: {},
  sourceSummary: {
    executionKind: "workflow",
    runId: "run-1",
    workflowId: "70000000-0000-4000-8000-000000000002",
    stopReason: null,
    totalFindings: 1,
    topFindingIds: ["finding-1"]
  },
  raw: {}
};

describe("WorkflowGraphPage", () => {
  beforeEach(() => {
    fetchJsonMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses report graph when matching report exists for latest run", async () => {
    const reportList: ListExecutionReportsResponse = {
      reports: [reportSummary],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1
    };
    fetchJsonMock
      .mockResolvedValueOnce(createLaunch("run-1"))
      .mockResolvedValueOnce(reportList)
      .mockResolvedValueOnce(reportDetail);

    render(<WorkflowGraphPage workflowId="70000000-0000-4000-8000-000000000002" />);

    await waitFor(() => {
      expect(screen.getByText("Source: report graph")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Execution report graph")).toBeInTheDocument();
    expect(fetchJsonMock).toHaveBeenCalledTimes(3);
  });

  it("falls back to findings graph when report is missing for latest run", async () => {
    const reportList: ListExecutionReportsResponse = {
      reports: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0
    };
    const findingsResponse: WorkflowRunFindingsResponse = {
      runId: "run-2",
      findings: [{
        id: "80000000-0000-4000-8000-000000000001",
        workflowRunId: "run-2",
        workflowStageId: "80000000-0000-4000-8000-000000000010",
        type: "service_exposure",
        title: "Exposed admin",
        severity: "high",
        confidence: 0.9,
        target: { host: "target.local", path: "/admin" },
        evidence: [{
          sourceTool: "httpx",
          quote: "GET /admin returned 200",
          toolRunRef: "tool-run-1"
        }],
        impact: "impact",
        recommendation: "recommend",
        validationStatus: "single_source",
        derivedFromFindingIds: [],
        relatedFindingIds: [],
        enablesFindingIds: [],
        tags: [],
        createdAt: "2026-04-25T09:10:00.000Z"
      }]
    };

    fetchJsonMock
      .mockResolvedValueOnce(createLaunch("run-2"))
      .mockResolvedValueOnce(reportList)
      .mockResolvedValueOnce(findingsResponse);

    render(<WorkflowGraphPage workflowId="70000000-0000-4000-8000-000000000002" />);

    await waitFor(() => {
      expect(screen.getByText("Source: run findings")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Execution report graph")).toBeInTheDocument();
  });

  it("shows explicit empty state when no launch exists", async () => {
    fetchJsonMock.mockRejectedValueOnce(new ApiError("Workflow launch not found.", 404));

    render(<WorkflowGraphPage workflowId="70000000-0000-4000-8000-000000000002" />);

    await waitFor(() => {
      expect(screen.getByText("No workflow launch exists yet for this workflow.")).toBeInTheDocument();
    });
  });

  it("shows explicit error state on request failure", async () => {
    fetchJsonMock.mockRejectedValueOnce(new ApiError("Backend unavailable.", 500));

    render(<WorkflowGraphPage workflowId="70000000-0000-4000-8000-000000000002" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load workflow graph: Backend unavailable.")).toBeInTheDocument();
    });
  });
});
