import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;

        if (url.includes("/api/health")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                status: "ok",
                service: "synosec-backend",
                timestamp: "2026-04-12T12:00:00.000Z"
              })
            )
          );
        }

        if (url.includes("/api/brief")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                headline: "Manual backend fetch completed.",
                actions: ["Enumerate targets", "Queue depth-first traversal"],
                generatedAt: "2026-04-12T12:00:00.000Z"
              })
            )
          );
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              scanMode: "depth-first",
              targetCount: 1,
              findings: [
                {
                  id: "finding-1",
                  target: "localhost",
                  severity: "low",
                  summary: "Test finding"
                }
              ]
            })
          )
        );
      })
    );
  });

  it("renders contract-backed data from the api", async () => {
    render(<App />);

    expect(await screen.findByText("Status: ok")).toBeInTheDocument();
    expect(await screen.findByText("Targets queued: 1")).toBeInTheDocument();
    expect(await screen.findByText(/Test finding/)).toBeInTheDocument();
  });

  it("fetches a brief when the button is clicked", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Fetch backend brief" }));

    expect(await screen.findByText("Manual backend fetch completed.")).toBeInTheDocument();
    expect(await screen.findByText("Queue depth-first traversal")).toBeInTheDocument();
  });
});
