import { useEffect, useMemo, useState } from "react";
import {
  AppWindow,
  ClipboardList,
  Palette,
  FileText,
  LayoutDashboard,
  List,
  Network,
  Shield,
  Workflow
} from "lucide-react";
import { toast } from "sonner";
import { apiRoutes, type BriefResponse, type DfsNode, type Scan } from "@synosec/contracts";
import { ApplicationsPage } from "./components/applications-page";
import { AuditLog } from "./components/AuditLog";
import { DfsGraph } from "./components/DfsGraph";
import { FindingsPanel } from "./components/FindingsPanel";
import { ReportView } from "./components/ReportView";
import { RuntimesPage } from "./components/runtimes-page";
import { ScanConfig } from "./components/ScanConfig";
import { ScanStatus } from "./components/ScanStatus";
import { WorkflowsPage } from "./components/workflows-page";
import { DetailField, DetailPage } from "./components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "./components/list-page";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuText,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from "./components/ui/sidebar";
import { Skeleton } from "./components/ui/skeleton";
import { Toaster } from "./components/ui/toaster";
import { Display, Lead } from "./components/ui/typography";
import { useScan } from "./hooks/useScan";
import { useScanWebSocket } from "./hooks/useScanWebSocket";
import { fetchJson } from "./lib/api";
import { cn } from "./lib/utils";

type NavigationId = "dashboard" | "runtimes" | "applications" | "workflows" | "scans";
type ScanView = "config" | "history" | "graph" | "findings" | "report" | "audit";

type NavigationItem = {
  id: NavigationId;
  label: string;
  icon: typeof LayoutDashboard;
};

type AppRoute = {
  section: NavigationId;
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

type ThemeId = "light" | "dark" | "synosec" | "amber";

type StaticDetailFieldConfig<TValues> = {
  key: keyof TValues;
  label: string;
  required?: boolean;
  hint?: string;
  type?: "text" | "number";
  options?: Array<{ label: string; value: string }>;
};

type ScanPageProps = {
  activeScanId: string | null;
  onScanSelected: (scanId: string) => void;
};

const navigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "runtimes", label: "Runtimes", icon: Network },
  { id: "applications", label: "Applications", icon: AppWindow },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "scans", label: "Scans", icon: Shield }
];

const navigationPaths: Record<NavigationId, string> = {
  dashboard: "/",
  runtimes: "/runtimes",
  applications: "/applications",
  workflows: "/workflows",
  scans: "/scans"
};

const scanTabs: Array<{ id: ScanView; label: string; icon: typeof LayoutDashboard; requiresScan?: boolean }> = [
  { id: "config", label: "New Scan", icon: Shield },
  { id: "history", label: "History", icon: List },
  { id: "graph", label: "Graph", icon: Network, requiresScan: true },
  { id: "findings", label: "Findings", icon: Shield, requiresScan: true },
  { id: "report", label: "Report", icon: FileText, requiresScan: true },
  { id: "audit", label: "Audit Log", icon: ClipboardList, requiresScan: true }
];

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

const runtimeStatusBadge: Record<RuntimeRecord["status"], string> = {
  healthy: "bg-primary/10 text-primary",
  degraded: "bg-secondary text-secondary-foreground",
  retired: "bg-muted text-muted-foreground"
};

const runtimeColumns: ListPageColumn<RuntimeRecord>[] = [
  { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span>, sortValue: (row) => row.name, searchValue: (row) => `${row.name} ${row.language}` },
  { id: "language", header: "Language", cell: (row) => <span className="text-muted-foreground">{row.language}</span>, sortValue: (row) => row.language },
  { id: "status", header: "Status", cell: (row) => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${runtimeStatusBadge[row.status]}`}>{row.status}</span>, sortValue: (row) => row.status },
  { id: "region", header: "Region", cell: (row) => <span className="text-muted-foreground">{row.region}</span>, sortValue: (row) => row.region, className: "text-right" }
];

const workflowStateBadge: Record<WorkflowRecord["state"], string> = {
  active: "bg-primary/10 text-primary",
  paused: "bg-secondary text-secondary-foreground",
  draft: "bg-muted text-muted-foreground"
};

const workflowTriggerBadge: Record<WorkflowRecord["trigger"], string> = {
  manual: "bg-primary/10 text-primary",
  schedule: "bg-secondary text-secondary-foreground",
  webhook: "bg-muted text-muted-foreground"
};

const workflowColumns: ListPageColumn<WorkflowRecord>[] = [
  { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span>, sortValue: (row) => row.name, searchValue: (row) => `${row.name} ${row.trigger}` },
  { id: "trigger", header: "Trigger", cell: (row) => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${workflowTriggerBadge[row.trigger]}`}>{row.trigger}</span>, sortValue: (row) => row.trigger },
  { id: "state", header: "State", cell: (row) => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${workflowStateBadge[row.state]}`}>{row.state}</span>, sortValue: (row) => row.state },
  { id: "runs", header: "Runs", cell: (row) => <span className="tabular-nums text-muted-foreground">{row.runs}</span>, sortValue: (row) => row.runs, className: "text-right" }
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

const themeStorageKey = "synosec-theme";

const themes: Array<{ id: ThemeId; label: string }> = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "synosec", label: "SynoSec" },
  { id: "amber", label: "Amber Grid" }
];

function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

function getInitialTheme(): ThemeId {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return storedTheme && isThemeId(storedTheme) ? storedTheme : "light";
}

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

  const section = segments[0] as NavigationId;
  if (!(section in navigationPaths)) {
    return { section: "dashboard", detailId: undefined };
  }

  return {
    section,
    detailId: segments[1]
  };
}

function createStaticFormValues<TRecord extends Record<string, string | number>>(record: TRecord) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, String(value)])) as Record<keyof TRecord, string>;
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

  const isDirty = useMemo(() => JSON.stringify(formValues) !== JSON.stringify(initialValues), [formValues, initialValues]);

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
              <SelectTrigger aria-label={field.label} className="w-fit min-w-[10rem] max-w-[12rem]">
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

async function fetchScans(): Promise<Scan[]> {
  const response = await fetch(apiRoutes.scanList);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<Scan[]>;
}

async function abortScan(id: string): Promise<void> {
  const response = await fetch(`/api/scan/${id}/abort`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

function ScanHistoryList({ onSelect }: { onSelect: (id: string) => void }) {
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchScans()
      .then(setScans)
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, []);

  const statusColors: Record<Scan["status"], string> = {
    pending: "text-muted-foreground",
    running: "text-emerald-400",
    complete: "text-emerald-500",
    aborted: "text-amber-400",
    failed: "text-rose-400"
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!scans || scans.length === 0) {
    return <p className="text-sm text-muted-foreground">No scans found. Start a new scan from the configuration tab.</p>;
  }

  return (
    <div className="space-y-3">
      {scans.map((scan) => (
        <button
          key={scan.id}
          type="button"
          onClick={() => onSelect(scan.id)}
          className="w-full rounded-2xl border border-border bg-card/75 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-accent/50"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-muted-foreground">{scan.id}</span>
            <span className={cn("text-xs font-semibold uppercase tracking-[0.18em]", statusColors[scan.status])}>
              {scan.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{scan.scope.targets.slice(0, 2).join(", ")}{scan.scope.targets.length > 2 ? ` +${scan.scope.targets.length - 2}` : ""}</span>
            <span>Round {scan.currentRound}</span>
            <span>{scan.nodesComplete}/{scan.nodesTotal} nodes</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function ScansPage({ activeScanId, onScanSelected }: ScanPageProps) {
  const [activeView, setActiveView] = useState<ScanView>(activeScanId ? "graph" : "config");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [roundSummary, setRoundSummary] = useState("");
  const { lastEvent, isConnected } = useScanWebSocket(true);
  const { scan, findings, graph, report, isLoading, refetch } = useScan(activeScanId, lastEvent);

  useEffect(() => {
    setActiveView(activeScanId ? "graph" : "config");
    setSelectedNodeId(null);
    setRoundSummary("");
  }, [activeScanId]);

  useEffect(() => {
    if (!lastEvent) {
      return;
    }

    if (lastEvent.type === "round_complete") {
      setRoundSummary(lastEvent.summary);
      toast.info(`Round ${lastEvent.round} complete`, {
        description: lastEvent.summary.slice(0, 80)
      });
      return;
    }

    if (lastEvent.type === "scan_status") {
      if (lastEvent.scan.status === "complete") {
        toast.success("Scan complete", { description: "Report is ready" });
        refetch();
      } else if (lastEvent.scan.status === "failed") {
        toast.error("Scan failed");
      } else if (lastEvent.scan.status === "aborted") {
        toast("Scan aborted");
      }
      return;
    }

    if (lastEvent.type === "finding_added" && (lastEvent.finding.severity === "high" || lastEvent.finding.severity === "critical")) {
      toast.warning(`${lastEvent.finding.severity.toUpperCase()} finding`, {
        description: lastEvent.finding.title
      });
    }
  }, [lastEvent, refetch]);

  function handleScanStarted(scanId: string) {
    onScanSelected(scanId);
    setActiveView("graph");
    setSelectedNodeId(null);
    setRoundSummary("");
  }

  function handleNodeClick(node: DfsNode) {
    setSelectedNodeId(node.id);
    setActiveView("findings");
  }

  async function handleAbort() {
    if (!activeScanId) {
      return;
    }

    try {
      await abortScan(activeScanId);
      toast("Abort requested");
    } catch (error) {
      toast.error("Failed to abort", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  function navigateScanView(view: ScanView) {
    if (view !== "config" && view !== "history" && !activeScanId) {
      toast("No scan selected", {
        description: "Start or load a scan first."
      });
      return;
    }

    setActiveView(view);
  }

  function renderScanContent() {
    if (activeView === "config") {
      return (
        <div className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <ScanConfig onScanStarted={handleScanStarted} />
        </div>
      );
    }

    if (activeView === "history") {
      return (
        <div className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <ScanHistoryList onSelect={handleScanStarted} />
        </div>
      );
    }

    if (activeView === "graph") {
      if (!graph || isLoading) {
        return (
          <div className="flex min-h-[32rem] items-center justify-center rounded-[2rem] border border-border bg-card/80 p-6 text-muted-foreground">
            Loading scan graph...
          </div>
        );
      }

      return (
        <div className="h-[42rem] overflow-hidden rounded-[2rem] border border-border bg-slate-950">
          <DfsGraph graph={graph} findings={findings} onNodeClick={handleNodeClick} />
        </div>
      );
    }

    if (activeView === "findings") {
      return (
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card/80">
          <FindingsPanel findings={findings} selectedNodeId={selectedNodeId} />
        </div>
      );
    }

    if (activeView === "report") {
      if (!report) {
        return (
          <div className="flex min-h-[22rem] items-center justify-center rounded-[2rem] border border-border bg-card/80 p-6 text-muted-foreground">
            {scan?.status === "complete" ? "Generating report..." : "Report becomes available when the scan completes."}
          </div>
        );
      }

      return (
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card/80">
          <ReportView report={report} />
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card/80">
        <AuditLog scanId={activeScanId} />
      </div>
    );
  }

  return (
    <div className="scan-console min-h-full space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-border bg-card/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Scan Console</p>
            <Display className="mt-2 max-w-none text-left text-4xl">Autonomous DFS Scanning</Display>
            <Lead className="mt-3 max-w-3xl">
              Launch a scan, inspect the graph traversal, review findings, and keep the existing admin workspace intact.
            </Lead>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-full", isConnected ? "bg-emerald-500" : "bg-amber-500")} />
            {isConnected ? "Realtime connected" : "Realtime reconnecting"}
          </div>
        </div>

        {scan ? <ScanStatus scan={scan} onAbort={() => void handleAbort()} roundSummary={roundSummary} /> : null}

        <div className="flex flex-wrap gap-2">
          {scanTabs.map((tab) => {
            const Icon = tab.icon;
            const disabled = tab.requiresScan && !activeScanId;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigateScanView(tab.id)}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                  activeView === tab.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-accent",
                  disabled && "cursor-not-allowed opacity-40"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {renderScanContent()}
    </div>
  );
}

function ThemeSwitcher({ value, onValueChange }: { value: ThemeId; onValueChange: (theme: ThemeId) => void }) {
  const { collapsed } = useSidebar();

  if (collapsed) {
    return (
      <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as ThemeId)}>
        <SelectTrigger aria-label="Select theme" className="h-10 w-10 rounded-xl border-border bg-background/80 px-0">
          <span className="flex w-full items-center justify-center">
            <Palette className="h-4 w-4" />
          </span>
        </SelectTrigger>
        <SelectContent align="end">
          {themes.map((theme) => (
            <SelectItem key={theme.id} value={theme.id}>
              {theme.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-3">
      <SidebarGroupLabel>Theme</SidebarGroupLabel>
      <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as ThemeId)}>
        <SelectTrigger aria-label="Select theme" className="h-11 rounded-xl border-border bg-background/80">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent align="end">
          {themes.map((theme) => (
            <SelectItem key={theme.id} value={theme.id}>
              {theme.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath(window.location.pathname));
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(route.section === "scans" ? route.detailId ?? null : null);
  const [theme, setTheme] = useState<ThemeId>(() => getInitialTheme());

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

  useEffect(() => {
    if (route.section === "scans") {
      setActiveScanId(route.detailId ?? null);
    }
  }, [route.detailId, route.section]);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  async function handleBackendButtonClick() {
    setLoadingBrief(true);

    try {
      const payload = await fetchJson<BriefResponse>(apiRoutes.brief);
      toast.success("Backend connected", {
        description: payload.headline
      });
    } catch (error) {
      toast.error("Backend request failed", {
        description: error instanceof Error ? error.message : "Unknown error"
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

  function navigateToScan(scanId: string | null) {
    if (scanId) {
      navigateToPath(`/scans/${scanId}`);
      return;
    }

    navigateToPath("/scans");
  }

  function renderPage() {
    if (route.section === "dashboard") {
      return (
        <div className="w-full max-w-2xl text-center">
          <Display className="max-w-none">Dashboard</Display>
          <Lead className="mx-auto mt-4">
            Minimal SPA shell with shared list and detail pages for records, filters, sorting, searching, loading states, recovery, and a dedicated scanning workspace.
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
      return (
        <RuntimesPage
          {...(route.detailId ? { runtimeId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths.runtimes)}
          onNavigateToCreate={() => navigateToPath("/runtimes/new")}
          onNavigateToDetail={(id) => navigateToPath(`/runtimes/${id}`)}
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

    if (route.section === "scans") {
      return <ScansPage activeScanId={activeScanId} onScanSelected={navigateToScan} />;
    }

    return (
      <WorkflowsPage
        {...(route.detailId ? { workflowId: route.detailId } : {})}
        onNavigateToList={() => navigateToPath(navigationPaths.workflows)}
        onNavigateToCreate={() => navigateToPath("/workflows/new")}
        onNavigateToDetail={(id) => navigateToPath(`/workflows/${id}`)}
      />
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen text-foreground" style={{ backgroundImage: "var(--app-shell-background)" }}>
        <Sidebar className="border-r border-border/80 bg-card/70">
          <div className="flex h-full flex-col px-4 py-6">
            <div className="relative px-2 py-2 text-center">
              <p className="font-['Space_Grotesk'] text-[1.75rem] font-bold tracking-[-0.04em] text-foreground">SynoSec</p>
              <div className="absolute inset-x-0 bottom-0 border-b border-border" aria-hidden="true" />
            </div>

            <SidebarContent className="mt-6 flex-1">
              <SidebarGroup>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === route.section;

                    return (
                      <SidebarMenuItem
                        key={item.id}
                        className={cn("rounded-xl border border-transparent", isActive && "border-border bg-accent text-accent-foreground")}
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

            <div className="mt-6 space-y-4 border-t border-border pt-4">
              <ThemeSwitcher value={theme} onValueChange={setTheme} />
              <div className="flex justify-center">
                <SidebarTrigger />
              </div>
            </div>
          </div>
        </Sidebar>

        <main className={cn("flex-1", route.section === "dashboard" ? "flex items-center justify-center p-6 md:p-10" : "p-0")}>
          {renderPage()}
        </main>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}
