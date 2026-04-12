import { useCallback, useState } from "react";
import { AppWindow, LayoutDashboard, Network, Workflow } from "lucide-react";
import { toast } from "sonner";
import { apiRoutes, type BriefResponse } from "@synosec/contracts";
import { ListPage, type ListPageColumn, type ListPageFilter } from "./components/list-page";
import { Button } from "./components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuText,
  SidebarProvider
} from "./components/ui/sidebar";
import { Toaster } from "./components/ui/toaster";
import { Display, Lead } from "./components/ui/typography";
import { cn } from "./lib/utils";

type NavigationItem = {
  id: "dashboard" | "runtimes" | "applications" | "workflows";
  label: string;
  icon: typeof LayoutDashboard;
};

type RuntimeRecord = {
  id: string;
  name: string;
  language: string;
  status: "healthy" | "degraded" | "retired";
  region: string;
};

type ApplicationRecord = {
  id: string;
  name: string;
  owner: string;
  tier: "critical" | "standard" | "internal";
  runtime: string;
};

type WorkflowRecord = {
  id: string;
  name: string;
  trigger: "manual" | "schedule" | "webhook";
  state: "active" | "paused" | "draft";
  runs: number;
};

const navigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "runtimes", label: "Runtimes", icon: Network },
  { id: "applications", label: "Applications", icon: AppWindow },
  { id: "workflows", label: "Workflows", icon: Workflow }
];

const runtimeRecords: RuntimeRecord[] = [
  { id: "rt-001", name: "Node Runtime 20", language: "Node.js", status: "healthy", region: "eu-north-1" },
  { id: "rt-002", name: "Python Worker", language: "Python", status: "degraded", region: "eu-west-1" },
  { id: "rt-003", name: "Go Scanner", language: "Go", status: "retired", region: "us-east-1" }
];

const applicationRecords: ApplicationRecord[] = [
  { id: "app-001", name: "Operator Portal", owner: "Platform", tier: "critical", runtime: "Node Runtime 20" },
  { id: "app-002", name: "Queue Reconciler", owner: "Security", tier: "standard", runtime: "Go Scanner" },
  { id: "app-003", name: "Report Builder", owner: "Ops", tier: "internal", runtime: "Python Worker" }
];

const workflowRecords: WorkflowRecord[] = [
  { id: "wf-001", name: "Nightly inventory sync", trigger: "schedule", state: "active", runs: 37 },
  { id: "wf-002", name: "Manual validation", trigger: "manual", state: "draft", runs: 3 },
  { id: "wf-003", name: "Inbound webhook triage", trigger: "webhook", state: "paused", runs: 12 }
];

const runtimeColumns: ListPageColumn<RuntimeRecord>[] = [
  { id: "name", header: "Name", cell: (row) => row.name, sortValue: (row) => row.name, searchValue: (row) => `${row.name} ${row.language}` },
  { id: "language", header: "Language", cell: (row) => row.language, sortValue: (row) => row.language },
  { id: "status", header: "Status", cell: (row) => row.status, sortValue: (row) => row.status },
  { id: "region", header: "Region", cell: (row) => row.region, sortValue: (row) => row.region, className: "text-right" }
];

const applicationColumns: ListPageColumn<ApplicationRecord>[] = [
  { id: "name", header: "Name", cell: (row) => row.name, sortValue: (row) => row.name, searchValue: (row) => `${row.name} ${row.owner}` },
  { id: "owner", header: "Owner", cell: (row) => row.owner, sortValue: (row) => row.owner },
  { id: "tier", header: "Tier", cell: (row) => row.tier, sortValue: (row) => row.tier },
  { id: "runtime", header: "Runtime", cell: (row) => row.runtime, sortValue: (row) => row.runtime }
];

const workflowColumns: ListPageColumn<WorkflowRecord>[] = [
  { id: "name", header: "Name", cell: (row) => row.name, sortValue: (row) => row.name, searchValue: (row) => `${row.name} ${row.trigger}` },
  { id: "trigger", header: "Trigger", cell: (row) => row.trigger, sortValue: (row) => row.trigger },
  { id: "state", header: "State", cell: (row) => row.state, sortValue: (row) => row.state },
  { id: "runs", header: "Runs", cell: (row) => row.runs, sortValue: (row) => row.runs, className: "text-right" }
];

const runtimeFilter: ListPageFilter<RuntimeRecord> = {
  label: "Filter runtimes by status",
  placeholder: "Filter by status",
  allLabel: "All statuses",
  options: [
    { label: "Healthy", value: "healthy" },
    { label: "Degraded", value: "degraded" },
    { label: "Retired", value: "retired" }
  ],
  getValue: (row) => row.status
};

const applicationFilter: ListPageFilter<ApplicationRecord> = {
  label: "Filter applications by tier",
  placeholder: "Filter by tier",
  allLabel: "All tiers",
  options: [
    { label: "Critical", value: "critical" },
    { label: "Standard", value: "standard" },
    { label: "Internal", value: "internal" }
  ],
  getValue: (row) => row.tier
};

const workflowFilter: ListPageFilter<WorkflowRecord> = {
  label: "Filter workflows by trigger",
  placeholder: "Filter by trigger",
  allLabel: "All triggers",
  options: [
    { label: "Manual", value: "manual" },
    { label: "Schedule", value: "schedule" },
    { label: "Webhook", value: "webhook" }
  ],
  getValue: (row) => row.trigger
};

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Fall back to the HTTP status message when the backend does not return JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export default function App() {
  const [activeItem, setActiveItem] = useState<NavigationItem["id"]>("dashboard");
  const [loadingBrief, setLoadingBrief] = useState(false);

  const loadRuntimes = useCallback(() => delay(runtimeRecords), []);
  const loadApplications = useCallback(() => delay(applicationRecords), []);
  const loadWorkflows = useCallback(() => delay(workflowRecords), []);

  async function handleBackendButtonClick() {
    setLoadingBrief(true);

    try {
      const brief = await fetchJson<BriefResponse>(apiRoutes.brief);
      toast.success("Backend connected", {
        description: brief.headline
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Backend request failed", {
        description: message
      });
    } finally {
      setLoadingBrief(false);
    }
  }

  function renderPage() {
    if (activeItem === "dashboard") {
      return (
        <div className="w-full max-w-2xl text-center">
          <Display className="max-w-none">Dashboard</Display>
          <Lead className="mx-auto mt-4">
            Minimal SPA shell with shared list pages for records, filters, sorting, searching, loading states, and recovery.
          </Lead>

          <div className="mt-10 flex justify-center">
            <Button onClick={() => void handleBackendButtonClick()} disabled={loadingBrief} size="lg">
              {loadingBrief ? "Connecting..." : "Call backend"}
            </Button>
          </div>
        </div>
      );
    }

    if (activeItem === "runtimes") {
      return (
        <ListPage
          title="Runtimes"
          recordLabel="Runtime"
          columns={runtimeColumns}
          loadData={loadRuntimes}
          filter={runtimeFilter}
          emptyMessage="No runtimes matched the current search and filter."
        />
      );
    }

    if (activeItem === "applications") {
      return (
        <ListPage
          title="Applications"
          recordLabel="Application"
          columns={applicationColumns}
          loadData={loadApplications}
          filter={applicationFilter}
          emptyMessage="No applications matched the current search and filter."
        />
      );
    }

    return (
      <ListPage
        title="Workflows"
        recordLabel="Workflow"
        columns={workflowColumns}
        loadData={loadWorkflows}
        filter={workflowFilter}
        emptyMessage="No workflows matched the current search and filter."
      />
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background xl:flex">
        <Sidebar className="border-border bg-card">
          <div className="flex h-full flex-col">
            <div className="relative px-4 py-6 text-center">
              <p className="font-['Space_Grotesk'] text-[1.75rem] font-bold tracking-[-0.04em] text-foreground">SynoSec</p>
              <div className="absolute inset-x-0 bottom-0 border-b border-border" aria-hidden="true" />
            </div>

            <SidebarContent className="flex-1 px-2 py-4">
              <SidebarGroup>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeItem;

                    return (
                      <SidebarMenuItem
                        key={item.id}
                        className={cn("rounded-lg border border-transparent", isActive && "border-border bg-accent text-accent-foreground")}
                        onClick={() => setActiveItem(item.id)}
                      >
                        <Icon className="h-4 w-4" />
                        <SidebarMenuText>{item.label}</SidebarMenuText>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </div>
        </Sidebar>

        <main className={cn("flex-1", activeItem === "dashboard" ? "flex items-center justify-center p-6 md:p-10" : "p-0")}>{renderPage()}</main>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}
