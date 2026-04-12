import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("renders the dashboard shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Call backend" })).toBeInTheDocument();
    expect(screen.getByText("Runtimes")).toBeInTheDocument();
  });

  it("calls the backend from the dashboard button", async () => {
    const fetchSpy = vi.mocked(fetch);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Call backend" }));

    expect(fetchSpy).toHaveBeenCalledWith("/api/brief");
    expect(await screen.findByText("Backend connected")).toBeInTheDocument();
  });

  it("renders the generic runtimes list page", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Runtimes"));

    expect(await screen.findByRole("heading", { name: "Runtimes" })).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Runtime" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search runtimes...")).toBeInTheDocument();
    expect(await screen.findByText("Node Runtime 20")).toBeInTheDocument();
  });

  it("filters the generic list page", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Applications"));

    expect(await screen.findByText("Operator Portal")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search applications..."), {
      target: { value: "Queue" }
    });

    await waitFor(() => {
      expect(screen.getByText("Queue Reconciler")).toBeInTheDocument();
    });
    expect(screen.queryByText("Operator Portal")).not.toBeInTheDocument();
  });

  it("shows placeholder toasts for add and row click actions", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Workflows"));
    expect(await screen.findByText("Nightly inventory sync")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Workflow" }));
    expect(await screen.findByText("Add workflow is coming soon.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Nightly inventory sync"));
    expect(await screen.findByText("Workflow detail is coming soon.")).toBeInTheDocument();
  });
});
