import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, RefreshCw, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { apiRoutes, type Scan, type ScanStatus } from "@synosec/contracts";
import { AuditLog } from "./AuditLog";
import { DfsGraph } from "./DfsGraph";
import { FindingsPanel } from "./FindingsPanel";
import { ReportView } from "./ReportView";
import { ScanConfig } from "./ScanConfig";
import { ScanStatus as ScanStatusPanel } from "./ScanStatus";
import { DetailField, DetailFieldGroup, DetailPage, DetailSidebarItem } from "./detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "./list-page";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useScan } from "../hooks/useScan";
import { useScanWebSocket } from "../hooks/useScanWebSocket";
import { fetchJson } from "../lib/api";

const scanStatusBadgeVariant: Record<ScanStatus, "outline" | "success" | "warning" | "destructive"> = {
  pending: "outline",
  running: "success",
  complete: "success",
  aborted: "warning",
  failed: "destructive"
};

function formatTimestamp(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function summarizeTargets(targets: string[]) {
  if (targets.length === 0) return "No targets";
  if (targets.length === 1) return targets[0] ?? "No targets";
  return `${targets[0]} +${targets.length - 1}`;
}

function summarizeProgress(scan: Scan) {
  if (scan.nodesTotal === 0) {
    return "0%";
  }

  return `${Math.round((scan.nodesComplete / scan.nodesTotal) * 100)}%`;
}

async function fetchScans(): Promise<Scan[]> {
  return fetchJson<Scan[]>(apiRoutes.scanList);
}

async function abortScan(scanId: string): Promise<void> {
  await fetchJson<void>(`/api/scan/${scanId}/abort`, { method: "POST" });
}

function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export function ScansPage({
  scanId,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  scanId?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string) => void;
}) {
  const [roundSummary, setRoundSummary] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { lastEvent, isConnected } = useScanWebSocket(scanId !== "new");
  const { scan, findings, graph, report, isLoading, refetch } = useScan(scanId && scanId !== "new" ? scanId : null, lastEvent);
  const isCreateMode = scanId === "new";

  useEffect(() => {
    setRoundSummary("");
    setSelectedNodeId(null);
  }, [scanId]);

  useEffect(() => {
    if (!lastEvent || !scanId || scanId === "new") {
      return;
    }

    if (lastEvent.type === "round_complete") {
      setRoundSummary(lastEvent.summary);
      toast.info(`Round ${lastEvent.round} complete`, {
        description: lastEvent.summary.slice(0, 96)
      });
      return;
    }

    if (lastEvent.type === "scan_status" && lastEvent.scan.id === scanId) {
      if (lastEvent.scan.status === "complete") {
        toast.success("Scan complete", { description: "Report is ready." });
        refetch();
      } else if (lastEvent.scan.status === "failed") {
        toast.error("Scan failed");
      } else if (lastEvent.scan.status === "aborted") {
        toast("Scan aborted");
      }
      return;
    }

    if (lastEvent.type === "finding_added" && lastEvent.finding.scanId === scanId) {
      if (lastEvent.finding.severity === "high" || lastEvent.finding.severity === "critical") {
        toast.warning(`${lastEvent.finding.severity.toUpperCase()} finding`, {
          description: lastEvent.finding.title
        });
      }
    }
  }, [lastEvent, refetch, scanId]);

  const scanColumns = useMemo<ListPageColumn<Scan>[]>(() => [
    {
      id: "targets",
      header: "Targets",
      cell: (row) => (
        <div className="space-y-1">
          <div className="font-medium text-foreground">{summarizeTargets(row.scope.targets)}</div>
          <div className="font-mono text-xs text-muted-foreground">{row.id}</div>
        </div>
      ),
      sortValue: (row) => row.scope.targets[0] ?? row.id,
      searchValue: (row) => `${row.id} ${row.scope.targets.join(" ")} ${row.scope.layers.join(" ")}`
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <Badge variant={scanStatusBadgeVariant[row.status]}>{row.status}</Badge>,
      sortValue: (row) => row.status
    },
    {
      id: "coverage",
      header: "Coverage",
      cell: (row) => (
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>{row.scope.layers.join(", ")}</div>
          <div className="text-xs">{row.scope.maxDepth} depth</div>
        </div>
      ),
      sortValue: (row) => row.scope.layers.join(",")
    },
    {
      id: "progress",
      header: "Progress",
      cell: (row) => (
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>{row.nodesComplete}/{row.nodesTotal} nodes</div>
          <div className="text-xs">Round {row.currentRound} · {summarizeProgress(row)}</div>
        </div>
      ),
      sortValue: (row) => row.nodesTotal === 0 ? 0 : row.nodesComplete / row.nodesTotal
    },
    {
      id: "createdAt",
      header: "Started",
      cell: (row) => <span className="text-muted-foreground">{formatTimestamp(row.createdAt)}</span>,
      sortValue: (row) => row.createdAt
    }
  ], []);

  const scanFilter = useMemo<ListPageFilter<Scan>>(() => ({
    label: "Filter scans by status",
    placeholder: "Filter by status",
    allLabel: "All statuses",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Running", value: "running" },
      { label: "Complete", value: "complete" },
      { label: "Aborted", value: "aborted" },
      { label: "Failed", value: "failed" }
    ],
    getValue: (row) => row.status
  }), []);

  const findingsBySeverity = useMemo(() => {
    return findings.reduce<Record<string, number>>((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
      return acc;
    }, {});
  }, [findings]);

  const selectedNodeLabel = useMemo(() => {
    if (!selectedNodeId || !graph) {
      return null;
    }

    return graph.nodes.find((node) => node.id === selectedNodeId)?.target ?? selectedNodeId;
  }, [graph, selectedNodeId]);

  const handleAbort = useCallback(async () => {
    if (!scanId || scanId === "new") {
      return;
    }

    try {
      await abortScan(scanId);
      toast("Abort requested");
    } catch (error) {
      toast.error("Failed to abort scan", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, [scanId]);

  if (!scanId) {
    return (
      <ListPage
        title="Scans"
        recordLabel="Scan"
        columns={scanColumns}
        loadData={fetchScans}
        filter={scanFilter}
        emptyMessage="No scans matched the current search and filter."
        onAddRecord={onNavigateToCreate}
        onRowClick={(selected) => onNavigateToDetail(selected.id)}
      />
    );
  }

  if (isCreateMode) {
    return (
      <DetailPage
        title="New scan"
        breadcrumbs={["Start", "Scans", "New"]}
        isDirty={false}
        onBack={onNavigateToList}
        onSave={() => undefined}
        onDismiss={() => undefined}
        actions={
          <Button type="button" variant="outline" onClick={onNavigateToList}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
        sidebar={
          <>
            <DetailSidebarItem label="Mode">Depth-first autonomous scan</DetailSidebarItem>
            <DetailSidebarItem label="Launch paths">Manual configuration or demo seed</DetailSidebarItem>
            <DetailSidebarItem label="Outputs">Graph, findings, report, and audit trail</DetailSidebarItem>
          </>
        }
      >
        <DetailFieldGroup title="Scope definition">
          <DetailField label="Scanner">
            <p className="text-sm text-muted-foreground">
              Configure target scope, layer coverage, and execution controls, then launch directly from this detail view.
            </p>
          </DetailField>
          <DetailField label="Workflow">
            <p className="text-sm text-muted-foreground">
              Newly started scans open as detail pages so the graph, findings, report, and audit stay on one route.
            </p>
          </DetailField>
        </DetailFieldGroup>

        <div className="-mx-1 rounded-2xl border border-border/70 bg-muted/20 p-4">
          <ScanConfig onScanStarted={onNavigateToDetail} />
        </div>
      </DetailPage>
    );
  }

  if (!scan) {
    return (
      <DetailPage
        title="Scan detail"
        breadcrumbs={["Start", "Scans", scanId]}
        isDirty={false}
        onBack={onNavigateToList}
        onSave={() => undefined}
        onDismiss={() => undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onNavigateToList}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isLoading}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading scan detail..." : "Scan detail is unavailable."}
        </p>
      </DetailPage>
    );
  }

  return (
    <DetailPage
      title={`Scan ${scan.id.slice(0, 8)}`}
      breadcrumbs={["Start", "Scans", scan.id]}
      isDirty={false}
      onBack={onNavigateToList}
      onSave={() => undefined}
      onDismiss={() => undefined}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onNavigateToList}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {scan.status === "running" ? (
            <Button type="button" variant="outline" onClick={() => void handleAbort()}>
              <StopCircle className="h-4 w-4" />
              Abort
            </Button>
          ) : null}
        </div>
      }
      sidebar={
        <>
          <DetailSidebarItem label="Status">
            <Badge variant={scanStatusBadgeVariant[scan.status]}>{scan.status}</Badge>
          </DetailSidebarItem>
          <DetailSidebarItem label="Realtime">{isConnected ? "Connected" : "Reconnecting"}</DetailSidebarItem>
          <DetailSidebarItem label="Started">{formatTimestamp(scan.createdAt)}</DetailSidebarItem>
          <DetailSidebarItem label="Completed">{formatTimestamp(scan.completedAt)}</DetailSidebarItem>
          <DetailSidebarItem label="Targets">{scan.scope.targets.length}</DetailSidebarItem>
          <DetailSidebarItem label="Layers">{scan.scope.layers.join(", ")}</DetailSidebarItem>
          <DetailSidebarItem label="Depth / RPS">{scan.scope.maxDepth} / {scan.scope.rateLimitRps}</DetailSidebarItem>
          <DetailSidebarItem label="Findings">
            {findings.length} total
            {(findingsBySeverity.critical ?? 0) > 0 ? ` · ${findingsBySeverity.critical} critical` : ""}
            {(findingsBySeverity.high ?? 0) > 0 ? ` · ${findingsBySeverity.high} high` : ""}
          </DetailSidebarItem>
        </>
      }
    >
      <div className="space-y-6">
        <ScanStatusPanel scan={scan} onAbort={() => void handleAbort()} roundSummary={roundSummary} />

        <DetailFieldGroup title="Scope">
          <DetailField label="Targets">
            <div className="space-y-1 text-sm text-muted-foreground">
              {scan.scope.targets.map((target) => (
                <div key={target} className="font-mono text-xs text-foreground">{target}</div>
              ))}
            </div>
          </DetailField>
          <DetailField label="Exclusions">
            <p className="text-sm text-muted-foreground">
              {scan.scope.exclusions.length > 0 ? scan.scope.exclusions.join(", ") : "No explicit exclusions"}
            </p>
          </DetailField>
          <DetailField label="Execution">
            <p className="text-sm text-muted-foreground">
              {scan.scope.layers.join(", ")} layers, depth {scan.scope.maxDepth}, limit {scan.scope.maxDurationMinutes} minutes
            </p>
          </DetailField>
          <DetailField label="Active exploits">
            <p className="text-sm text-muted-foreground">{scan.scope.allowActiveExploits ? "Allowed" : "Disabled"}</p>
          </DetailField>
        </DetailFieldGroup>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <SectionCard
            title="Traversal graph"
            description="The DFS graph remains embedded in the detail page so the scan structure is visible without changing views."
          >
            <div className="h-[30rem] overflow-hidden bg-slate-950">
              {graph ? (
                <DfsGraph
                  graph={graph}
                  findings={findings}
                  onNodeClick={(node) => setSelectedNodeId(node.id)}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-sm text-slate-400">
                  {isLoading ? "Loading graph..." : "Graph data is not available yet."}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Findings"
            description={selectedNodeLabel ? `Filtered to ${selectedNodeLabel}. Select another graph node to pivot.` : "High-signal findings stay beside the traversal graph."}
          >
            <div className="h-[30rem] overflow-hidden bg-slate-950">
              <FindingsPanel findings={findings} selectedNodeId={selectedNodeId} />
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Audit trail"
          description="Execution events and scope decisions are preserved inline with the selected scan."
        >
          <div className="h-[24rem] overflow-hidden bg-slate-950">
            <AuditLog scanId={scan.id} />
          </div>
        </SectionCard>

        <SectionCard
          title="Report"
          description="The generated assessment appears here when the scan completes."
        >
          {report ? (
            <div className="bg-slate-950">
              <ReportView report={report} />
            </div>
          ) : (
            <div className="px-6 py-10 text-sm text-muted-foreground">
              {scan.status === "complete" ? "Generating report..." : "Report becomes available when the scan completes."}
            </div>
          )}
        </SectionCard>
      </div>
    </DetailPage>
  );
}
