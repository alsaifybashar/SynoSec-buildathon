import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Target } from "@synosec/contracts";
import { TargetsPage } from "@/features/targets/page";

const target: Target = {
  id: "target-1",
  name: "Operator Portal",
  baseUrl: "https://portal.example.test",
  environment: "staging",
  status: "active",
  lastScannedAt: null,
  createdAt: "2026-04-20T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

function createFetchMock() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.startsWith("/api/targets?")) {
      return new Response(JSON.stringify({
        targets: [target],
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1
      }));
    }

    if (url === `/api/targets/${target.id}`) {
      return new Response(JSON.stringify(target));
    }

    throw new Error(`Unhandled request: ${url}`);
  });
}

describe("TargetsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the list through the controller port", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    render(
      <MemoryRouter initialEntries={["/targets"]}>
        <TargetsPage
          onNavigateToList={() => {}}
          onNavigateToCreate={() => {}}
          onNavigateToDetail={() => {}}
        />
      </MemoryRouter>
    );

    expect((await screen.findAllByText("Operator Portal")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("https://portal.example.test").length).toBeGreaterThan(0);
  });

  it("renders detail state through the controller port", async () => {
    vi.stubGlobal("fetch", createFetchMock());

    render(
      <MemoryRouter initialEntries={["/targets/target-1"]}>
        <TargetsPage
          targetId={target.id}
          targetNameHint={target.name}
          onNavigateToList={() => {}}
          onNavigateToCreate={() => {}}
          onNavigateToDetail={() => {}}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Operator Portal");
    });
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
