import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  localAttackPathTargetDefaults,
  localDemoTargetDefaults,
  localFullStackTargetDefaults,
  type Target
} from "@synosec/contracts";
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

const seededTarget: Target = {
  id: "target-2",
  name: "Local Vulnerable Target",
  baseUrl: localDemoTargetDefaults.hostUrl,
  environment: "development",
  status: "active",
  lastScannedAt: null,
  createdAt: "2026-04-20T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const attackPathTarget: Target = {
  id: "target-3",
  name: "Local Attack Path Target",
  baseUrl: localAttackPathTargetDefaults.hostUrl,
  environment: "development",
  status: "active",
  lastScannedAt: null,
  createdAt: "2026-04-20T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const fullStackTarget: Target = {
  id: "target-4",
  name: "Local Full Stack Target",
  baseUrl: localFullStackTargetDefaults.hostUrl,
  environment: "development",
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
        targets: [seededTarget, attackPathTarget, fullStackTarget, target],
        page: 1,
        pageSize: 25,
        total: 4,
        totalPages: 1
      }));
    }

    if (url === `/api/targets/${target.id}`) {
      return new Response(JSON.stringify(target));
    }

    if (url === `/api/targets/${seededTarget.id}`) {
      return new Response(JSON.stringify(seededTarget));
    }

    if (url === `/api/targets/${attackPathTarget.id}`) {
      return new Response(JSON.stringify(attackPathTarget));
    }

    if (url === `/api/targets/${fullStackTarget.id}`) {
      return new Response(JSON.stringify(fullStackTarget));
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

  it("shows seeded vulnerability guidance on hover for the local lab target", async () => {
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

    fireEvent.focus((await screen.findAllByRole("button", { name: "Show lab target vulnerabilities" }))[0]);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("SQL injection simulation on /login");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Sensitive data exposure on /api/users");
  });

  it("shows attack-path guidance for the chained local lab target", async () => {
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

    fireEvent.focus((await screen.findAllByRole("button", { name: "Show lab target vulnerabilities" }))[1]);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Support case detail IDOR leaks one-time release approval tokens");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Weak magic-link issuance creates release-manager sessions");
  });

  it("shows full-stack guidance for the local lab target", async () => {
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

    fireEvent.focus((await screen.findAllByRole("button", { name: "Show lab target vulnerabilities" }))[2]);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Invoice detail IDOR leaks treasury approval codes");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Recovery token exchange creates finance-manager sessions");
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
