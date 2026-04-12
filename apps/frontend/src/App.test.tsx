import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify([])))));
  });

  it("renders the current navigation shell", () => {
    render(<App />);

    expect(screen.getByText("SynoSec")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scans" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GRACE" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New Scan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Scan" })).toBeInTheDocument();
  });
});
