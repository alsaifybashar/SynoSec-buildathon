import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application, Runtime, Workflow } from "@synosec/contracts";
import App from "./App";

const initialApplications: Application[] = [
  {
    id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
    name: "Operator Portal",
    baseUrl: "https://portal.synosec.local",
    environment: "production",
    status: "active",
    lastScannedAt: "2026-04-12T12:00:00.000Z",
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  },
  {
    id: "ef7b823f-5f2e-4052-8276-4eb537f74fcb",
    name: "Report Builder",
    baseUrl: null,
    environment: "staging",
    status: "investigating",
    lastScannedAt: null,
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z"
  }
];

describe("App", () => {
  let applications: Application[];
  let runtimes: Runtime[];
  let workflows: Workflow[];

  beforeEach(() => {
    applications = initialApplications.map((application) => ({ ...application }));
    runtimes = [
      {
        id: "rt-00111111-1111-4111-8111-111111111111",
        name: "Node Runtime 20",
        serviceType: "api",
        provider: "docker",
        environment: "production",
        region: "eu-north-1",
        status: "healthy",
        applicationId: applications[0]?.id ?? null,
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      },
      {
        id: "rt-00222222-2222-4222-8222-222222222222",
        name: "Python Worker",
        serviceType: "worker",
        provider: "aws",
        environment: "staging",
        region: "eu-west-1",
        status: "degraded",
        applicationId: null,
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      }
    ];
    workflows = [
      {
        id: "wf-00111111-1111-4111-8111-111111111111",
        name: "Nightly inventory sync",
        trigger: "schedule",
        status: "active",
        maxDepth: 4,
        targetMode: "application",
        applicationId: applications[0]?.id ?? null,
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      },
      {
        id: "wf-00222222-2222-4222-8222-222222222222",
        name: "Manual validation",
        trigger: "manual",
        status: "draft",
        maxDepth: 2,
        targetMode: "manual",
        applicationId: null,
        createdAt: "2026-04-12T12:00:00.000Z",
        updatedAt: "2026-04-12T12:00:00.000Z"
      }
    ];
    window.history.replaceState({}, "", "/");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/brief" && method === "GET") {
          return new Response(
            JSON.stringify({
              headline: "Manual backend fetch completed.",
              actions: ["Enumerate targets", "Queue depth-first traversal"],
              generatedAt: "2026-04-12T12:00:00.000Z"
            })
          );
        }

        if (url === "/api/applications" && method === "GET") {
          return new Response(JSON.stringify({ applications }));
        }

        if (url === "/api/applications" && method === "POST") {
          const body = JSON.parse(String(init?.body)) as {
            name: string;
            baseUrl: string | null;
            environment: Application["environment"];
            status: Application["status"];
            lastScannedAt: string | null;
          };

          const created: Application = {
            id: "c8ca5829-e965-4381-b0b5-8d7a8f5d8f24",
            name: body.name,
            baseUrl: body.baseUrl,
            environment: body.environment,
            status: body.status,
            lastScannedAt: body.lastScannedAt,
            createdAt: "2026-04-12T13:00:00.000Z",
            updatedAt: "2026-04-12T13:00:00.000Z"
          };

          applications = [...applications, created];
          return new Response(JSON.stringify(created), { status: 201 });
        }

        if (url === "/api/runtimes" && method === "GET") {
          return new Response(JSON.stringify({ runtimes }));
        }

        if (url.startsWith("/api/runtimes/") && method === "GET") {
          const id = url.split("/").pop() ?? "";
          const runtime = runtimes.find((candidate) => candidate.id === id);

          if (!runtime) {
            return new Response(JSON.stringify({ message: "Runtime not found." }), { status: 404 });
          }

          return new Response(JSON.stringify(runtime));
        }

        if (url === "/api/runtimes" && method === "POST") {
          const body = JSON.parse(String(init?.body)) as Omit<Runtime, "id" | "createdAt" | "updatedAt">;

          const created: Runtime = {
            id: "rt-00333333-3333-4333-8333-333333333333",
            ...body,
            createdAt: "2026-04-12T13:00:00.000Z",
            updatedAt: "2026-04-12T13:00:00.000Z"
          };

          runtimes = [...runtimes, created];
          return new Response(JSON.stringify(created), { status: 201 });
        }

        if (url.startsWith("/api/runtimes/") && method === "PATCH") {
          const id = url.split("/").pop() ?? "";
          const body = JSON.parse(String(init?.body)) as Partial<Runtime>;
          const existing = runtimes.find((runtime) => runtime.id === id);

          if (!existing) {
            return new Response(JSON.stringify({ message: "Runtime not found." }), { status: 404 });
          }

          const updated: Runtime = {
            ...existing,
            ...body,
            updatedAt: "2026-04-12T14:00:00.000Z"
          };

          runtimes = runtimes.map((runtime) => (runtime.id === id ? updated : runtime));
          return new Response(JSON.stringify(updated));
        }

        if (url === "/api/workflows" && method === "GET") {
          return new Response(JSON.stringify({ workflows }));
        }

        if (url.startsWith("/api/workflows/") && method === "GET") {
          const id = url.split("/").pop() ?? "";
          const workflow = workflows.find((candidate) => candidate.id === id);

          if (!workflow) {
            return new Response(JSON.stringify({ message: "Workflow not found." }), { status: 404 });
          }

          return new Response(JSON.stringify(workflow));
        }

        if (url === "/api/workflows" && method === "POST") {
          const body = JSON.parse(String(init?.body)) as Omit<Workflow, "id" | "createdAt" | "updatedAt">;

          const created: Workflow = {
            id: "wf-00333333-3333-4333-8333-333333333333",
            ...body,
            createdAt: "2026-04-12T13:00:00.000Z",
            updatedAt: "2026-04-12T13:00:00.000Z"
          };

          workflows = [...workflows, created];
          return new Response(JSON.stringify(created), { status: 201 });
        }

        if (url.startsWith("/api/applications/") && method === "PATCH") {
          const id = url.split("/").pop() ?? "";
          const body = JSON.parse(String(init?.body)) as Partial<Application>;
          const existing = applications.find((application) => application.id === id);

          if (!existing) {
            return new Response(JSON.stringify({ message: "Application not found." }), { status: 404 });
          }

          const updated: Application = {
            ...existing,
            ...body,
            updatedAt: "2026-04-12T14:00:00.000Z"
          };

          applications = applications.map((application) => (application.id === id ? updated : application));
          return new Response(JSON.stringify(updated));
        }

        throw new Error(`Unhandled fetch: ${method} ${url}`);
      })
    );
  });

  it("renders the dashboard shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Call backend" })).toBeInTheDocument();
  });

  it("calls the backend from the dashboard button", async () => {
    const fetchSpy = vi.mocked(fetch);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Call backend" }));

    expect(fetchSpy).toHaveBeenCalledWith("/api/brief", undefined);
    expect(await screen.findByText("Backend connected")).toBeInTheDocument();
  });

  it("tracks list navigation in the url", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Runtimes"));

    expect(await screen.findByRole("heading", { name: "Runtimes" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/runtimes");
  });

  it("opens runtime detail pages through the url-backed list flow", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Runtimes"));
    fireEvent.click(await screen.findByText("Node Runtime 20"));

    expect(await screen.findByRole("heading", { name: "Node Runtime 20" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/runtimes/rt-00111111-1111-4111-8111-111111111111");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeDisabled();
  });

  it("navigates to application detail and enables save after a change", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Applications"));
    fireEvent.click(await screen.findByText("Operator Portal"));

    expect(await screen.findByRole("heading", { name: "Operator Portal" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/applications/5ecf4a8e-df5f-4945-a7e1-230ef43eac80");

    const saveButton = screen.getByRole("button", { name: "Save" });
    const dismissButton = screen.getByRole("button", { name: "Dismiss" });

    expect(saveButton).toBeDisabled();
    expect(dismissButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Operator Portal v2" }
    });

    expect(saveButton).toBeEnabled();
    expect(dismissButton).toBeEnabled();
  });

  it("shows validation errors as toast and inline helper state", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Applications"));
    fireEvent.click(screen.getByRole("button", { name: "Add Application" }));

    expect(await screen.findByRole("heading", { name: "New application" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: " " }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Base URL" }), {
      target: { value: "not-a-url" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Validation failed")).toBeInTheDocument();
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(await screen.findByText("Base URL must be a valid absolute URL.")).toBeInTheDocument();
  });

  it("creates a new application from the detail page", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Applications"));
    fireEvent.click(screen.getByRole("button", { name: "Add Application" }));
    await screen.findByRole("heading", { name: "New application" });

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Queue Reconciler" }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Base URL" }), {
      target: { value: "https://queue.synosec.local" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Application created")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Queue Reconciler" })).toBeInTheDocument();
  });

  it("creates a new runtime from the detail page", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Runtimes"));
    fireEvent.click(screen.getByRole("button", { name: "Add Runtime" }));
    await screen.findByRole("heading", { name: "New runtime" });

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Gateway Proxy" }
    });
    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "us-east-1" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Runtime created")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Gateway Proxy" })).toBeInTheDocument();
  });

  it("creates a new workflow from the detail page", async () => {
    render(<App />);

    fireEvent.click(screen.getByText("Workflows"));
    fireEvent.click(screen.getByRole("button", { name: "Add Workflow" }));
    await screen.findByRole("heading", { name: "New workflow" });

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Event-driven validation" }
    });
    fireEvent.change(screen.getByLabelText("Max depth"), {
      target: { value: "5" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Workflow created")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Event-driven validation" })).toBeInTheDocument();
  });
});
