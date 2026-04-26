import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppContentRoutes } from "@/app/routes";

vi.mock("@/features/workflows/workflow-graph-page", () => ({
  WorkflowGraphPage: ({ workflowId }: { workflowId?: string }) => (
    <div>Workflow Graph Route: {workflowId ?? "missing"}</div>
  )
}));

vi.mock("@/app/crud-route-registry", () => ({
  crudRouteRegistry: [{
    id: "workflows",
    component: () => <div>Workflow list</div>,
    detailComponent: ({ workflowId, onNavigateToGraph }: { workflowId?: string; onNavigateToGraph?: (id: string) => void }) => (
      <button type="button" onClick={() => workflowId && onNavigateToGraph?.(workflowId)}>
        Open Graph
      </button>
    ),
    detailIdProp: "workflowId",
    detailLabelProp: "workflowNameHint",
    onNavigateToRelatedDetail: true
  }],
  legacyCrudRedirects: []
}));

describe("AppContentRoutes workflow graph route", () => {
  it("renders dedicated graph page at /workflows/:workflowId/graph", async () => {
    render(
      <MemoryRouter initialEntries={["/workflows/abc123/graph"]}>
        <AppContentRoutes authRequired={false} authenticated={true} googleClientId={null} />
      </MemoryRouter>
    );

    expect(await screen.findByText("Workflow Graph Route: abc123")).toBeInTheDocument();
  });

  it("is reachable from workflow detail action", async () => {
    render(
      <MemoryRouter initialEntries={["/workflows/abc123"]}>
        <AppContentRoutes authRequired={false} authenticated={true} googleClientId={null} />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Open Graph" }));
    expect(await screen.findByText("Workflow Graph Route: abc123")).toBeInTheDocument();
  });
});
