import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecutionReportDetail, ExecutionReportSummary } from "@synosec/contracts";
import { ExecutionReportsPage } from "@/features/execution-reports/page";

const { fetchJsonMock } = vi.hoisted(() => ({
  fetchJsonMock: vi.fn()
}));

const reportSummary: ExecutionReportSummary = {
  id: "report-1",
  executionId: "run-1",
  executionKind: "workflow",
  sourceDefinitionId: "workflow-1",
  status: "completed",
  title: "Workflow execution report",
  targetLabel: "https://target.local",
  sourceLabel: "Workflow Alpha",
  findingsCount: 2,
  highestSeverity: "high",
  generatedAt: "2026-04-25T12:00:00.000Z",
  updatedAt: "2026-04-25T12:05:00.000Z",
  archivedAt: null
};

const report: ExecutionReportDetail = {
  ...reportSummary,
  executiveSummary: "The workflow confirmed one evidence-backed finding.",
  attackPathExecutiveSummary: "1 attack path derived. Top path reaches https://target.local/admin/pivot with qualified status and high severity.",
  attackPaths: {
    venues: [
      {
        id: "venue-1",
        label: "Admin surface",
        venueType: "web_surface",
        targetLabel: "https://target.local/admin",
        summary: "The reachable admin surface exposes the initial foothold.",
        findingIds: ["finding-1"]
      },
      {
        id: "venue-2",
        label: "Privileged pivot",
        venueType: "web_surface",
        targetLabel: "https://target.local/admin/pivot",
        summary: "Credential reuse extends the foothold into a higher-privilege path.",
        findingIds: ["finding-2"]
      }
    ],
    vectors: [
      {
        id: "vector-1",
        label: "Admin exposure enables credential reuse validation.",
        sourceVenueId: "venue-1",
        destinationVenueId: "venue-2",
        summary: "The initial admin exposure provided the entrypoint that the follow-on credential test used.",
        preconditions: [],
        impact: "Credential reuse immediately expands the exposed surface into a privileged pivot.",
        kind: "derived_from",
        status: "qualified",
        confidence: "medium",
        findingIds: ["finding-1", "finding-2"],
        supportingFindingIds: ["finding-1", "finding-2"],
        suspectedFindingIds: [],
        blockedFindingIds: [],
        validation: {
          evidenceLevel: "single_source_findings",
          summary: "The attack vector is backed by concrete evidence on both findings, but still lacks end-to-end chain replay.",
          observedTransition: "The initial admin exposure provided the entrypoint that the follow-on credential test used.",
          evidenceRefs: [
            { findingId: "finding-1", sourceTool: "httpx", quote: "GET /admin returned 200", toolRunRef: "tool-run-1" },
            { findingId: "finding-2", sourceTool: "hydra", quote: "credential reuse succeeded for admin:testpass", toolRunRef: "tool-run-2" }
          ],
          blockedReason: null
        }
      }
    ],
    paths: [
      {
        id: "path-1",
        title: "Admin surface to privileged pivot",
        summary: "The exposed admin route and credential reuse combine into a practical escalation path.",
        reachedAssetOrOutcome: "https://target.local/admin/pivot",
        pathSeverity: "high",
        pathConfidence: "medium",
        status: "qualified",
        venueIds: ["venue-1", "venue-2"],
        vectorIds: ["vector-1"],
        findingIds: ["finding-1", "finding-2"],
        supportingFindingIds: ["finding-1", "finding-2"],
        suspectedFindingIds: [],
        blockedFindingIds: [],
        pathLinks: [
          {
            id: "path-link-1",
            sourceFindingId: "finding-1",
            targetFindingId: "finding-2",
            kind: "derived_from",
            summary: "The initial admin exposure provided the entrypoint that the follow-on credential test used.",
            status: "qualified",
            supportingFindingIds: ["finding-1", "finding-2"],
            suspectedFindingIds: [],
            blockedFindingIds: [],
            validation: {
              evidenceLevel: "single_source_findings",
              summary: "The attack vector is backed by concrete evidence on both findings, but still lacks end-to-end chain replay.",
              observedTransition: "The initial admin exposure provided the entrypoint that the follow-on credential test used.",
              evidenceRefs: [
                { findingId: "finding-1", sourceTool: "httpx", quote: "GET /admin returned 200", toolRunRef: "tool-run-1" },
                { findingId: "finding-2", sourceTool: "hydra", quote: "credential reuse succeeded for admin:testpass", toolRunRef: "tool-run-2" }
              ],
              blockedReason: null
            }
          }
        ]
      }
    ]
  },
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
      },
      {
        id: "finding-2",
        kind: "finding",
        findingId: "finding-2",
        title: "Privilege pivot confirmed",
        summary: "The workflow model linked the exposed admin surface to credential reuse.",
        severity: "high",
        confidence: 0.96,
        targetLabel: "https://target.local/admin/pivot",
        createdAt: "2026-04-25T12:04:00.000Z"
      }
    ],
    edges: [
      {
        id: "edge-1",
        kind: "supports",
        source: "evidence-1",
        target: "finding-1",
        createdAt: "2026-04-25T12:03:30.000Z"
      },
      {
        id: "edge-2",
        kind: "derived_from",
        source: "finding-1",
        target: "finding-2",
        createdAt: "2026-04-25T12:04:30.000Z"
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
      validationStatus: "single_source",
      explanationSummary: "An authenticated admin route returned a direct 200 response from the target without a gateway challenge.",
      confidenceReason: "The finding is backed by a direct probe response tied to a persisted tool run.",
      targetLabel: "https://target.local/admin",
      reproduction: null,
      evidence: [{ sourceTool: "httpx", quote: "GET /admin returned 200", toolRunRef: "tool-run-1" }],
      sourceToolIds: ["httpx"],
      sourceToolRunIds: ["tool-run-1"],
      createdAt: "2026-04-25T12:03:00.000Z"
    },
    {
      id: "finding-2",
      executionId: "run-1",
      executionKind: "workflow",
      source: "workflow-finding",
      severity: "high",
      title: "Privilege pivot confirmed",
      type: "credential_reuse",
      summary: "The workflow model linked the exposed admin surface to credential reuse.",
      recommendation: "Rotate privileged credentials and gate the admin surface.",
      confidence: 0.96,
      validationStatus: "cross_validated",
      explanationSummary: "The model reported a second finding because separate evidence showed the same credentials crossed into a higher-privilege admin path.",
      confidenceReason: "A persisted tool run confirmed credential reuse immediately after the admin surface exposure was validated.",
      targetLabel: "https://target.local/admin/pivot",
      reproduction: null,
      evidence: [{ sourceTool: "hydra", quote: "credential reuse succeeded for admin:testpass", toolRunRef: "tool-run-2" }],
      sourceToolIds: ["hydra"],
      sourceToolRunIds: ["tool-run-2"],
      createdAt: "2026-04-25T12:04:00.000Z"
    }
  ],
  toolActivity: [
    {
      id: "tool-run-1",
      executionId: "run-1",
      executionKind: "workflow",
      phase: "validation",
      toolId: "tool-httpx",
      toolName: "httpx",
      command: "httpx https://target.local/admin",
      status: "completed",
      outputPreview: "GET /admin returned 200",
      exitCode: 0,
      startedAt: "2026-04-25T12:02:00.000Z",
      completedAt: "2026-04-25T12:02:05.000Z"
    },
    {
      id: "tool-run-2",
      executionId: "run-1",
      executionKind: "workflow",
      phase: "validation",
      toolId: "tool-hydra",
      toolName: "hydra",
      command: "hydra -l admin -p testpass https://target.local/admin",
      status: "completed",
      outputPreview: "credential reuse succeeded for admin:testpass",
      exitCode: 0,
      startedAt: "2026-04-25T12:04:00.000Z",
      completedAt: "2026-04-25T12:04:05.000Z"
    }
  ],
  coverageOverview: {},
  sourceSummary: {
    executionKind: "workflow",
    runId: "run-1",
    workflowId: "workflow-1",
    stopReason: null,
    totalFindings: 2,
    topFindingIds: ["finding-2"]
  },
  raw: {}
};

const resourceListState = {
  query: { page: 1, pageSize: 25, q: "", sortBy: "generatedAt", sortDirection: "desc" },
  dataState: { state: "loaded", data: { items: [reportSummary], page: 1, pageSize: 25, total: 1, totalPages: 1 } },
  items: [reportSummary],
  meta: { items: [reportSummary], page: 1, pageSize: 25, total: 1, totalPages: 1 },
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
  fetchJson: fetchJsonMock
}));

describe("ExecutionReportsPage", () => {
  const createObjectURLMock = vi.fn<(blob: Blob) => string>();
  const revokeObjectURLMock = vi.fn<(url: string) => void>();
  const OriginalBlob = Blob;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let createdLink: HTMLAnchorElement | null;

  beforeEach(() => {
    createdLink = null;
    fetchJsonMock.mockReset();
    createObjectURLMock.mockReset();
    revokeObjectURLMock.mockReset();
    createObjectURLMock.mockReturnValue("blob:test-export");

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectURLMock
    });

    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock
    });

    vi.stubGlobal("Blob", class MockBlob {
      readonly parts: BlobPart[];
      readonly type: string;

      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        this.parts = parts;
        this.type = options?.type ?? "";
      }
    });

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName.toLowerCase() === "a") {
        createdLink = element as HTMLAnchorElement;
      }
      return element;
    }) as typeof document.createElement);
  });

  afterEach(() => {
    clickSpy.mockRestore();
    vi.stubGlobal("Blob", OriginalBlob);
    vi.restoreAllMocks();
  });

  it("renders the executive summary below the graph-driven attack-path and findings sections", () => {
    render(
      <ExecutionReportsPage
        reportId="report-1"
        onNavigateToList={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    const attackPathGraph = screen.getByRole("img", { name: "Attack path graph" });
    const findingsGraph = screen.getByRole("img", { name: "Finding traceability graph" });
    const executiveSummaryHeading = screen.getByText("Executive Summary");

    expect(screen.getAllByText("Admin surface to privileged pivot").length).toBeGreaterThan(0);
    expect(attackPathGraph.compareDocumentPosition(executiveSummaryHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(findingsGraph.compareDocumentPosition(executiveSummaryHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Ordered findings")).toBeInTheDocument();
    expect(screen.getByText("single source findings")).toBeInTheDocument();
    expect(screen.getByText("Verification")).toBeInTheDocument();
  });

  it("renders explainability markers for findings metadata and tool activity sections", async () => {
    render(
      <ExecutionReportsPage
        reportId="report-1"
        onNavigateToList={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    expect(screen.getByRole("img", { name: "Finding traceability graph" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show guidance for Findings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show guidance for Persisted tool activity" })).toBeInTheDocument();
    fireEvent.focus(screen.getByRole("button", { name: "Show guidance for Findings" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Count of persisted structured findings attached to this report.");
  });

  it("defaults the findings inspector to the top-ranked attack path and exposes tool trace references", () => {
    render(
      <ExecutionReportsPage
        reportId="report-1"
        onNavigateToList={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    expect(screen.getAllByText("Admin surface exposed").length).toBeGreaterThan(0);
    expect(screen.getByText("An authenticated admin route returned a direct 200 response from the target without a gateway challenge.")).toBeInTheDocument();
    expect(screen.getAllByText("tool:tool-run").length).toBeGreaterThan(0);
    expect(screen.getByText(/httpx https:\/\/target.local\/admin/)).toBeInTheDocument();
  });

  it("lets attack and finding detail panes grow naturally instead of pinning them to viewport height", () => {
    const { container } = render(
      <ExecutionReportsPage
        reportId="report-1"
        onNavigateToList={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    expect(container.innerHTML).not.toContain("h-[calc(100vh-14rem)]");
  });

  it("exports the list row by fetching canonical report detail", async () => {
    fetchJsonMock.mockResolvedValue(report);

    render(
      <ExecutionReportsPage
        onNavigateToList={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Download report-1 as JSON" })[0]!);
    });

    expect(fetchJsonMock).toHaveBeenCalledWith("/api/execution-reports/report-1");
    expect(createdLink?.download).toBe("report-1.json");
    const blob = createObjectURLMock.mock.calls[0]?.[0] as { parts: BlobPart[]; type: string } | undefined;
    expect(blob?.type).toBe("application/json;charset=utf-8");
    expect(String(blob?.parts[0] ?? "")).toContain("\"executiveSummary\": \"The workflow confirmed one evidence-backed finding.\"");
  });

  it("exports the detail page by fetching canonical report detail", async () => {
    fetchJsonMock.mockResolvedValue(report);

    render(
      <ExecutionReportsPage
        reportId="report-1"
        onNavigateToList={vi.fn()}
        onNavigateToDetail={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
    });

    expect(fetchJsonMock).toHaveBeenCalledWith("/api/execution-reports/report-1");
    const blob = createObjectURLMock.mock.calls[0]?.[0] as { parts: BlobPart[]; type: string } | undefined;
    expect(String(blob?.parts[0] ?? "")).toContain("\"graph\": {");
    expect(String(blob?.parts[0] ?? "")).toContain("\"findings\": [");
  });
});
