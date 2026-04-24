import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Application } from "@synosec/contracts";
import { ApplicationsPage } from "@/features/applications/page";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe("ApplicationsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears the previous record while navigating between detail pages", async () => {
    const firstRequest = deferred<Response>();
    const secondRequest = deferred<Response>();
    const firstApplication: Application = {
      id: "app-1",
      name: "First application",
      baseUrl: "https://first.example.test",
      environment: "production",
      status: "active",
      lastScannedAt: "2026-04-12T12:00:00.000Z",
      createdAt: "2026-04-12T12:00:00.000Z",
      updatedAt: "2026-04-12T12:00:00.000Z"
    };
    const secondApplication: Application = {
      id: "app-2",
      name: "Second application",
      baseUrl: "https://second.example.test",
      environment: "staging",
      status: "investigating",
      lastScannedAt: "2026-04-13T12:00:00.000Z",
      createdAt: "2026-04-13T12:00:00.000Z",
      updatedAt: "2026-04-13T12:00:00.000Z"
    };

    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/applications/app-1") {
        return firstRequest.promise;
      }

      if (url === "/api/applications/app-2") {
        return secondRequest.promise;
      }

      throw new Error(`Unhandled fetch: ${url}`);
    }));

    const { rerender } = render(
      <MemoryRouter initialEntries={["/applications/app-1"]}>
        <ApplicationsPage
          applicationId="app-1"
          onNavigateToList={() => {}}
          onNavigateToCreate={() => {}}
          onNavigateToDetail={() => {}}
        />
      </MemoryRouter>
    );

    await act(async () => {
      firstRequest.resolve(new Response(JSON.stringify(firstApplication)));
    });

    expect(await screen.findByDisplayValue("First application")).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={["/applications/app-2"]}>
        <ApplicationsPage
          applicationId="app-2"
          onNavigateToList={() => {}}
          onNavigateToCreate={() => {}}
          onNavigateToDetail={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByDisplayValue("First application")).not.toBeInTheDocument();

    await act(async () => {
      secondRequest.resolve(new Response(JSON.stringify(secondApplication)));
    });

    expect(await screen.findByDisplayValue("Second application")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("First application")).not.toBeInTheDocument();
  });
});
