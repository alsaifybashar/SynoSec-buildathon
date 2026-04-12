import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  ClipboardList,
  Command,
  FileText,
  LayoutDashboard,
  List,
  Network,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import type { DfsNode, Scan } from "@synosec/contracts";
import { Skeleton } from "./components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuText,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { Toaster } from "./components/ui/toaster";
import { DfsGraph } from "./components/DfsGraph";
import { FindingsPanel } from "./components/FindingsPanel";
import { GraceChainsPanel } from "./components/GraceChainsPanel";
import { ExecutionPanel } from "./components/ExecutionPanel";
import { ReportView } from "./components/ReportView";
import { ScanConfig } from "./components/ScanConfig";
import { ScanStatus } from "./components/ScanStatus";
import { AuditLog } from "./components/AuditLog";
import { useScan } from "./hooks/useScan";
import { useScanWebSocket } from "./hooks/useScanWebSocket";
import { cn } from "./lib/utils";

type ActiveView = "config" | "graph" | "findings" | "execution" | "chains" | "report" | "history" | "audit";

type NavItem = {
  id: ActiveView;
  label: string;
  icon: typeof LayoutDashboard;
  requiresScan?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "config", label: "Dashboard", icon: LayoutDashboard },
  { id: "history", label: "Scans", icon: List },
  { id: "graph", label: "Graph", icon: Network, requiresScan: true },
  { id: "findings", label: "Findings", icon: AlertTriangle, requiresScan: true },
  { id: "execution", label: "Execution", icon: Command, requiresScan: true },
  { id: "chains", label: "GRACE", icon: BrainCircuit, requiresScan: true },
  { id: "report", label: "Report", icon: FileText, requiresScan: true },
  { id: "audit", label: "Audit Log", icon: ClipboardList, requiresScan: true },
];

async function fetchScans(): Promise<Scan[]> {
  const res = await fetch("/api/scans");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Scan[]>;
}

async function abortScan(id: string): Promise<void> {
  const res = await fetch(`/api/scan/${id}/abort`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

function ScanHistoryView({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchScans()
      .then(setScans)
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    running: "text-green-400",
    complete: "text-green-600",
    pending: "text-gray-400",
    aborted: "text-orange-400",
    failed: "text-red-400",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h2 className="mb-4 text-xl font-bold text-white">Scan History</h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg bg-gray-800" />
          ))}
        </div>
      ) : !scans || scans.length === 0 ? (
        <p className="text-sm text-gray-500">No scans found. Start a new scan from Dashboard.</p>
      ) : (
        <div className="space-y-2">
          {scans.map((scan) => (
            <button
              key={scan.id}
              type="button"
              onClick={() => onSelect(scan.id)}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-left hover:bg-gray-800 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-gray-400">{scan.id}</span>
                <span
                  className={`text-xs font-semibold uppercase ${STATUS_COLORS[scan.status] ?? "text-gray-400"}`}
                >
                  {scan.status}
                </span>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-gray-500">
                <span>
                  {scan.scope.targets.slice(0, 2).join(", ")}
                  {scan.scope.targets.length > 2 ? ` +${scan.scope.targets.length - 2}` : ""}
                </span>
                <span>Round {scan.currentRound}</span>
                <span>
                  {scan.nodesComplete}/{scan.nodesTotal} nodes
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("config");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [roundSummary, setRoundSummary] = useState("");

  const { lastEvent, isConnected } = useScanWebSocket();
  const { scan, findings, graph, report, chains, prioritizedTargets, toolRuns, observations, isLoading, refetch } = useScan(activeScanId, lastEvent);
  const selectedChain = chains.find((chain) => chain.id === selectedChainId) ?? null;

  // Process WS events for toast notifications and round summaries
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === "round_complete") {
      setRoundSummary(lastEvent.summary);
      toast.info(`Round ${lastEvent.round} complete`, {
        description: lastEvent.summary.slice(0, 80),
      });
    } else if (lastEvent.type === "scan_status") {
      const s = lastEvent.scan.status;
      if (s === "complete") {
        toast.success("Scan complete", { description: "Report is ready" });
        refetch();
      } else if (s === "failed") {
        toast.error("Scan failed");
      } else if (s === "aborted") {
        toast("Scan aborted");
      }
    } else if (lastEvent.type === "finding_added") {
      const { severity } = lastEvent.finding;
      if (severity === "critical" || severity === "high") {
        toast.warning(`${severity.toUpperCase()} finding`, {
          description: lastEvent.finding.title,
        });
      }
    } else if (lastEvent.type === "chain_detected") {
      toast.info("GRACE chain detected", {
        description: lastEvent.chain.title,
      });
    } else if (lastEvent.type === "grace_analysis_complete") {
      toast("GRACE analysis complete", {
        description: `${lastEvent.chainsFound} chain(s), ${lastEvent.prioritizedTargets.length} prioritized target(s)`,
      });
    }
  }, [lastEvent, refetch]);

  function handleScanStarted(id: string) {
    setActiveScanId(id);
    setSelectedNodeId(null);
    setSelectedChainId(null);
    setRoundSummary("");
    setActiveView("graph");
  }

  function handleNodeClick(node: DfsNode) {
    setSelectedNodeId(node.id);
    setActiveView("findings");
  }

  function handleChainSelect(chainId: string | null) {
    setSelectedChainId(chainId);
    if (chainId) {
      setSelectedNodeId(null);
    }
  }

  async function handleAbort() {
    if (!activeScanId) return;
    try {
      await abortScan(activeScanId);
      toast("Abort requested");
    } catch (err) {
      toast.error("Failed to abort", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function navigate(view: ActiveView) {
    if (view !== "history" && view !== "config" && !activeScanId) {
      toast("No active scan", { description: "Start or load a scan first" });
      return;
    }
    setActiveView(view);
  }

  // ─── Main content ────────────────────────────────────────────────────────────
  function renderContent() {
    switch (activeView) {
      case "config":
        return (
          <div className="flex flex-1 items-start justify-center px-6 py-10">
            <ScanConfig onScanStarted={handleScanStarted} />
          </div>
        );

      case "history":
        return (
          <div className="flex-1 overflow-y-auto">
            <ScanHistoryView
              onSelect={(id) => {
                setActiveScanId(id);
                setActiveView("graph");
              }}
            />
          </div>
        );

      case "graph":
        if (!graph || isLoading) {
          return (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-gray-500">
                <Network className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">Loading graph…</p>
              </div>
            </div>
          );
        }
        return (
          <div className="flex-1">
            <DfsGraph
              graph={graph}
              findings={findings}
              chains={chains}
              selectedChainId={selectedChainId}
              prioritizedTargets={prioritizedTargets}
              onNodeClick={handleNodeClick}
            />
          </div>
        );

      case "findings":
        return (
          <div className="flex flex-1 flex-col overflow-hidden">
            <FindingsPanel
              findings={findings}
              selectedNodeId={selectedNodeId}
              selectedChain={selectedChain}
            />
          </div>
        );

      case "execution":
        return (
          <div className="flex flex-1 flex-col overflow-hidden">
            <ExecutionPanel toolRuns={toolRuns} observations={observations} />
          </div>
        );

      case "chains":
        return (
          <div className="flex flex-1 flex-col overflow-hidden">
            <GraceChainsPanel
              chains={chains}
              findings={findings}
              selectedChainId={selectedChainId}
              prioritizedTargets={prioritizedTargets}
              onSelectChain={handleChainSelect}
            />
          </div>
        );

      case "report":
        if (!report) {
          return (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-gray-500">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">
                  {scan?.status === "complete"
                    ? "Generating report…"
                    : "Report will be available when scan completes"}
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="flex-1 overflow-y-auto">
            <ReportView report={report} />
          </div>
        );

      case "audit":
        return (
          <div className="flex flex-1 flex-col overflow-hidden">
            <AuditLog scanId={activeScanId} />
          </div>
        );
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-950 text-gray-100">
        {/* ── Sidebar ── */}
        <Sidebar className="border-r border-gray-800 bg-gray-950">
          <div className="flex h-full flex-col">
            {/* Brand */}
            <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10">
                <Shield className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide text-white">SynoSec</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">
                  AI PenTest Platform
                </p>
              </div>
              <div className="ml-auto">
                <SidebarTrigger />
              </div>
            </div>

            {/* Nav */}
            <SidebarContent className="flex-1 px-2 py-4">
              <SidebarGroup>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeView;
                    const isDisabled = item.requiresScan && !activeScanId;

                    return (
                      <SidebarMenuItem
                        key={item.id}
                        className={cn(
                          "rounded-lg border border-transparent transition-colors",
                          isActive
                            ? "border-green-500/30 bg-green-500/10 text-green-400"
                            : isDisabled
                            ? "cursor-not-allowed opacity-40"
                            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        )}
                        onClick={() => navigate(item.id)}
                      >
                        <Icon className="h-4 w-4" />
                        <SidebarMenuText>{item.label}</SidebarMenuText>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>

            {/* WS status */}
            <div className="border-t border-gray-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
                />
                <span className="text-xs text-gray-500">
                  {isConnected ? "Connected" : "Reconnecting…"}
                </span>
              </div>
            </div>
          </div>
        </Sidebar>

        {/* ── Main ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header bar (only when a scan is active) */}
          {scan && (
            <div className="border-b border-gray-800 bg-gray-950 px-6 py-3">
              <ScanStatus
                scan={scan}
                onAbort={() => void handleAbort()}
                roundSummary={roundSummary}
              />
            </div>
          )}

          {/* Content area */}
          <div className="flex flex-1 flex-col overflow-hidden">{renderContent()}</div>
        </div>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}
