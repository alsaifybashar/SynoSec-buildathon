import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              headline: "Manual backend fetch completed.",
              actions: ["Enumerate targets", "Queue depth-first traversal"],
              generatedAt: "2026-04-12T12:00:00.000Z"
            })
          )
        )
      )
    );
  });

  it("renders the minimal dashboard shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Call backend" })).toBeInTheDocument();
    expect(screen.getByText("Runtimes")).toBeInTheDocument();
    expect(screen.getByText("Applications")).toBeInTheDocument();
    expect(screen.getByText("Workflows")).toBeInTheDocument();
  });

  it("calls the backend from the dashboard button", async () => {
    const fetchSpy = vi.mocked(fetch);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Call backend" }));

    expect(fetchSpy).toHaveBeenCalledWith("/api/brief");
    expect(await screen.findByText("Backend connected")).toBeInTheDocument();
  });

  it("shows a coming soon toast for placeholder navigation", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Runtimes"));

    expect(await screen.findByText("Coming soon")).toBeInTheDocument();
    expect(await screen.findByText("Runtimes is coming soon.")).toBeInTheDocument();
  });
});
