import { useEffect, useMemo, useState } from "react";
import { AppWindow, LayoutDashboard, Network, Workflow } from "lucide-react";
import { toast } from "sonner";
import { apiRoutes, type BriefResponse } from "@synosec/contracts";
import { ApplicationsPage } from "./components/applications-page";
import { DetailField, DetailPage } from "./components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "./components/list-page";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
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
import { fetchJson } from "./lib/api";
import { cn } from "./lib/utils";

type NavigationItem = {
  id: "dashboard" | "runtimes" | "applications" | "workflows";
  label: string;
  icon: typeof LayoutDashboard;
};

type AppRoute = {
  section: NavigationItem["id"];
  detailId: string | undefined;
};

type RuntimeRecord = {
  id: string;
  name: string;
  language: string;
  status: "healthy" | "degraded" | "retired";
  region: string;
};

type WorkflowRecord = {
  id: string;
  name: string;
  trigger: "manual" | "schedule" | "webhook";
  state: "active" | "paused" | "draft";
  runs: number;
};

type StaticDetailFieldConfig<TValues> = {
  key: keyof TValues;
  label: string;
  required?: boolean;
  hint?: string;
  type?: "text" | "number";
  options?: Array<{ label: string; value: string }>;
};

const navigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "runtimes", label: "Runtimes", icon: Network },
  { id: "applications", label: "Applications", icon: AppWindow },
  { id: "workflows", label: "Workflows", icon: Workflow }
];

const navigationPaths: Record<NavigationItem["id"], string> = {
  dashboard: "/",
  runtimes: "/runtimes",
  applications: "/applications",
  workflows: "/workflows"
};

const runtimeRecords: RuntimeRecord[] = [
  { id: "rt-001", name: "Node Runtime 20", language: "Node.js", status: "healthy", region: "eu-north-1" },
  { id: "rt-002", name: "Python Worker", language: "Python", status: "degraded", region: "eu-west-1" },
  { id: "rt-003", name: "Go Scanner", language: "Go", status: "retired", region: "us-east-1" }
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

const runtimeFieldConfig: StaticDetailFieldConfig<RuntimeRecord>[] = [
  { key: "name", label: "Name", required: true },
  { key: "language", label: "Language", required: true },
  {
    key: "status",
    label: "Status",
    required: true,
    hint: "Status reflects whether the runtime is healthy, degraded, or retired.",
    options: [
      { label: "Healthy", value: "healthy" },
      { label: "Degraded", value: "degraded" },
      { label: "Retired", value: "retired" }
    ]
  },
  { key: "region", label: "Region", required: true, hint: "Use the region or hosting site where this runtime is deployed." }
];

const workflowFieldConfig: StaticDetailFieldConfig<WorkflowRecord>[] = [
  { key: "name", label: "Name", required: true },
  {
    key: "trigger",
    label: "Trigger",
    required: true,
    hint: "Trigger describes how the workflow starts.",
    options: [
      { label: "Manual", value: "manual" },
      { label: "Schedule", value: "schedule" },
      { label: "Webhook", value: "webhook" }
    ]
  },
  {
    key: "state",
    label: "State",
    required: true,
    hint: "State reflects whether the workflow is active, paused, or still a draft.",
    options: [
      { label: "Active", value: "active" },
      { label: "Paused", value: "paused" },
      { label: "Draft", value: "draft" }
    ]
  },
  { key: "runs", label: "Runs", required: true, type: "number", hint: "Keep the total run count aligned with the latest execution history." }
];

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function getRouteFromPath(pathname: string): AppRoute {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { section: "dashboard", detailId: undefined };
  }

  const section = segments[0] as NavigationItem["id"];
  if (!(section in navigationPaths)) {
    return { section: "dashboard", detailId: undefined };
  }

  return {
    section,
    detailId: segments[1]
  };
}

function createStaticFormValues<TRecord extends Record<string, string | number>>(record: TRecord) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, String(value)])
  ) as Record<keyof TRecord, string>;
}

function StaticDetailPage<TRecord extends { id: string } & Record<string, string | number>>({
  sectionTitle,
  recordLabel,
  record,
  fieldConfig,
  onBack
}: {
  sectionTitle: string;
  recordLabel: string;
  record: TRecord;
  fieldConfig: StaticDetailFieldConfig<TRecord>[];
  onBack: () => void;
}) {
  const [formValues, setFormValues] = useState(() => createStaticFormValues(record));
  const [initialValues, setInitialValues] = useState(() => createStaticFormValues(record));
  const [errors, setErrors] = useState<Partial<Record<keyof TRecord, string>>>({});

  useEffect(() => {
    const nextValues = createStaticFormValues(record);
    setFormValues(nextValues);
    setInitialValues(nextValues);
    setErrors({});
  }, [record]);

  const isDirty = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(initialValues),
    [formValues, initialValues]
  );

  function handleFieldChange<Key extends keyof TRecord>(key: Key, value: string) {
    setFormValues((current) => ({
      ...current,
      [key]: value
    }));

    if (errors[key]) {
      setErrors((current) => ({
        ...current,
        [key]: undefined
      }));
    }
  }

  function handleDismiss() {
    setFormValues(initialValues);
    setErrors({});
  }

  function handleSave() {
    const nextErrors: Partial<Record<keyof TRecord, string>> = {};

    fieldConfig.forEach((field) => {
      if (field.required && !String(formValues[field.key]).trim()) {
        nextErrors[field.key] = `${field.label} is required.`;
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Validation failed", {
        description: "Fix the highlighted fields before saving."
      });
      return;
    }

    toast("Coming soon", {
      description: `${recordLabel} persistence is coming soon.`
    });
    setInitialValues(formValues);
  }

  return (
    <DetailPage
      title={String(formValues["name"] ?? record.id)}
      breadcrumbs={["Start", sectionTitle, String(formValues["name"] ?? record.id)]}
      isDirty={isDirty}
      onBack={onBack}
      onSave={handleSave}
      onDismiss={handleDismiss}
    >
      {fieldConfig.map((field) => (
        <DetailField
          key={String(field.key)}
          label={field.label}
          {...(field.required ? { required: true } : {})}
          {...(field.hint ? { hint: field.hint } : {})}
          {...(errors[field.key] ? { error: errors[field.key] } : {})}
        >
          {field.options ? (
            <Select value={formValues[field.key]} onValueChange={(value) => handleFieldChange(field.key, value)}>
              <SelectTrigger aria-label={field.label} className="ml-auto w-fit min-w-[11rem] max-w-full">
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={field.type ?? "text"}
              aria-label={field.label}
              value={formValues[field.key]}
              onChange={(event) => handleFieldChange(field.key, event.target.value)}
            />
          )}
        </DetailField>
      ))}
    </DetailPage>
  );
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath(window.location.pathname));
  const [loadingBrief, setLoadingBrief] = useState(false);

  useEffect(() => {
    const syncFromLocation = () => {
      setRoute(getRouteFromPath(window.location.pathname));
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);

    return () => {
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, []);

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

  function navigateToPath(path: string) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }

    setRoute(getRouteFromPath(path));
  }

  function renderPage() {
    if (route.section === "dashboard") {
      return (
        <div className="w-full max-w-2xl text-center">
          <Display className="max-w-none">Dashboard</Display>
          <Lead className="mx-auto mt-4">
            Minimal SPA shell with shared list and detail pages for records, filters, sorting, searching, loading states, and recovery.
          </Lead>

          <div className="mt-10 flex justify-center">
            <Button onClick={() => void handleBackendButtonClick()} disabled={loadingBrief} size="lg">
              {loadingBrief ? "Connecting..." : "Call backend"}
            </Button>
          </div>
        </div>
      );
    }

    if (route.section === "runtimes") {
      if (route.detailId) {
        const runtime = runtimeRecords.find((candidate) => candidate.id === route.detailId) ?? runtimeRecords[0];

        if (!runtime) {
          return null;
        }

        return (
          <StaticDetailPage
            sectionTitle="Runtimes"
            recordLabel="Runtime"
            record={runtime}
            fieldConfig={runtimeFieldConfig}
            onBack={() => navigateToPath(navigationPaths.runtimes)}
          />
        );
      }

      return (
        <ListPage
          title="Runtimes"
          recordLabel="Runtime"
          columns={runtimeColumns}
          loadData={() => delay(runtimeRecords)}
          filter={runtimeFilter}
          emptyMessage="No runtimes matched the current search and filter."
          onAddRecord={() => navigateToPath("/runtimes/new")}
          onRowClick={(row) => navigateToPath(`/runtimes/${row.id}`)}
        />
      );
    }

    if (route.section === "applications") {
      return (
        <ApplicationsPage
          {...(route.detailId ? { applicationId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths.applications)}
          onNavigateToCreate={() => navigateToPath("/applications/new")}
          onNavigateToDetail={(id) => navigateToPath(`/applications/${id}`)}
        />
      );
    }

    if (route.detailId) {
      const workflow = workflowRecords.find((candidate) => candidate.id === route.detailId) ?? workflowRecords[0];

      if (!workflow) {
        return null;
      }

      return (
        <StaticDetailPage
          sectionTitle="Workflows"
          recordLabel="Workflow"
          record={workflow}
          fieldConfig={workflowFieldConfig}
          onBack={() => navigateToPath(navigationPaths.workflows)}
        />
      );
    }

    return (
      <ListPage
        title="Workflows"
        recordLabel="Workflow"
        columns={workflowColumns}
        loadData={() => delay(workflowRecords)}
        filter={workflowFilter}
        emptyMessage="No workflows matched the current search and filter."
        onAddRecord={() => navigateToPath("/workflows/new")}
        onRowClick={(row) => navigateToPath(`/workflows/${row.id}`)}
      />
    );
  }

  const activeItem = route.section;

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
                        onClick={() => navigateToPath(navigationPaths[item.id])}
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

        <main className={cn("flex-1", route.section === "dashboard" ? "flex items-center justify-center p-6 md:p-10" : "p-0")}>{renderPage()}</main>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}
