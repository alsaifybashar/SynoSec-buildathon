import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Layers3,
  RefreshCw,
  ShieldAlert,
  StopCircle
} from "lucide-react";
import {
  apiRoutes,
  severityOrder,
  type AuditEntry,
  type DfsNode,
  type Finding,
  type OsiLayer,
  type Report,
  type Scan,
  type ScanStatus,
  type Severity
} from "@synosec/contracts";
import { toast } from "sonner";
import { ScanConfig } from "./ScanConfig";
import { DetailField, DetailFieldGroup, DetailPage, DetailSidebarItem } from "./detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "./list-page";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useScan } from "../hooks/useScan";
import { useScanWebSocket } from "../hooks/useScanWebSocket";
import { fetchJson } from "../lib/api";
import { cn } from "../lib/utils";

const scanStatusBadgeVariant: Record<ScanStatus, "outline" | "success" | "warning" | "destructive"> = {
  pending: "outline",
  running: "success",
  complete: "success",
  aborted: "warning",
  failed: "destructive"
};

const severityBadgeVariant: Record<Severity, "outline" | "success" | "warning" | "destructive"> = {
  info: "outline",
  low: "outline",
  medium: "warning",
  high: "warning",
  critical: "destructive"
};

const layerLabels: Record<OsiLayer, string> = {
  L2: "Data link",
  L3: "Network",
  L4: "Transport",
  L5: "Session",
  L6: "Presentation",
  L7: "Application"
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

function riskPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function findingsForNode(findings: Finding[], nodeId: string) {
  return findings.filter((finding) => finding.nodeId === nodeId);
}

function groupFindingsBySeverity(findings: Finding[]) {
  return findings.reduce<Record<Severity, Finding[]>>(
    (acc, finding) => {
      acc[finding.severity].push(finding);
      return acc;
    },
    { critical: [], high: [], medium: [], low: [], info: [] }
  );
}

async function fetchScans(): Promise<Scan[]> {
  return fetchJson<Scan[]>(apiRoutes.scanList);
}

async function abortScan(scanId: string): Promise<void> {
  await fetchJson<void>(`/api/scan/${scanId}/abort`, { method: "POST" });
}

type QuickLink = {
  id: string;
  label: string;
  shortcut: string;
  meta?: string;
};

function ShortcutHint({ shortcut }: { shortcut: string }) {
  return (
    <span className="rounded-md border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      {shortcut}
    </span>
  );
}

function QuickLinkButton({ link }: { link: QuickLink }) {
  return (
    <button
      type="button"
      aria-keyshortcuts={link.shortcut}
      onClick={() => {
        document.getElementById(link.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-left transition hover:border-primary/30 hover:bg-accent"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{link.label}</span>
        {link.meta ? <span className="block truncate text-xs text-muted-foreground">{link.meta}</span> : null}
      </span>
      <ShortcutHint shortcut={link.shortcut} />
    </button>
  );
}

function SectionCard({
  id,
  title,
  description,
  children
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-6 overflow-hidden">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "alert" }) {
  return (
    <div className={cn("rounded-2xl border p-4", tone === "alert" ? "border-warning/40 bg-warning/10" : "border-border/70 bg-muted/30")}>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function NodeTable({
  nodes,
  findings,
  selectedNodeId,
  onSelectNode
}: {
  nodes: DfsNode[];
  findings: Finding[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}) {
  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">No nodes discovered for this layer yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70">
      <table className="w-full min-w-[42rem] text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Target</th>
            <th className="px-4 py-3 text-left">Service</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Depth</th>
            <th className="px-4 py-3 text-left">Risk</th>
            <th className="px-4 py-3 text-left">Findings</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => {
            const nodeFindings = findingsForNode(findings, node.id);
            const active = selectedNodeId === node.id;

            return (
              <tr
                key={node.id}
                className={cn("border-t border-border/70 transition", active ? "bg-primary/5" : "hover:bg-muted/30")}
              >
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onSelectNode(active ? null : node.id)} className="text-left">
                    <span className="block font-medium text-foreground">{node.target}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">{node.id}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {node.service ?? (node.port ? `Port ${node.port}` : "Unknown")}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={node.status === "complete" ? "success" : "outline"}>{node.status}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{node.depth}</td>
                <td className="px-4 py-3 text-muted-foreground">{riskPercent(node.riskScore)}</td>
                <td className="px-4 py-3 text-muted-foreground">{nodeFindings.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FindingsList({
  findings,
  nodesById,
  selectedNodeId
}: {
  findings: Finding[];
  nodesById: Record<string, DfsNode>;
  selectedNodeId: string | null;
}) {
  const filteredFindings = selectedNodeId ? findings.filter((finding) => finding.nodeId === selectedNodeId) : findings;
  const grouped = groupFindingsBySeverity(
    [...filteredFindings].sort((left, right) => severityOrder[right.severity] - severityOrder[left.severity])
  );

  if (filteredFindings.length === 0) {
    return <p className="text-sm text-muted-foreground">No findings match the current selection.</p>;
  }

  return (
    <div className="space-y-6">
      {(["critical", "high", "medium", "low", "info"] as Severity[]).map((severity) => {
        const group = grouped[severity];
        if (group.length === 0) {
          return null;
        }

        return (
          <div key={severity} className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant={severityBadgeVariant[severity]}>{severity}</Badge>
              <span className="text-sm text-muted-foreground">{group.length} findings</span>
            </div>
            {group.map((finding) => {
              const node = nodesById[finding.nodeId];
              return (
                <article key={finding.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-foreground">{finding.title}</h4>
                    <Badge variant="outline">{Math.round(finding.confidence * 100)}% confidence</Badge>
                    {finding.validated ? <Badge variant="success">validated</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{finding.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-background px-2.5 py-1">{node?.layer ?? "Unknown layer"}</span>
                    <span className="rounded-full bg-background px-2.5 py-1">{node?.target ?? finding.nodeId}</span>
                    <span className="rounded-full bg-background px-2.5 py-1">{finding.technique}</span>
                  </div>
                  <details className="mt-4 rounded-xl border border-border/70 bg-background/80 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">Evidence</summary>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-muted-foreground">
                      {finding.evidence}
                    </pre>
                    {finding.reproduceCommand ? (
                      <div className="mt-3 border-t border-border/70 pt-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reproduce</p>
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-foreground">
                          {finding.reproduceCommand}
                        </pre>
                      </div>
                    ) : null}
                  </details>
                </article>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function AuditTimeline({ entries, isLoading }: { entries: AuditEntry[]; isLoading: boolean }) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading audit trail...</p>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit entries available yet.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", entry.scopeValid ? "bg-success" : "bg-warning")} />
              <span className="font-medium text-foreground">{entry.actor}</span>
              <Badge variant="outline">{entry.action}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</span>
          </div>
          {Object.keys(entry.details).length > 0 ? (
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-background/80 p-3 font-mono text-xs leading-6 text-muted-foreground">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ReportSection({ report }: { report: Report | null }) {
  if (!report) {
    return <p className="text-sm text-muted-foreground">Report becomes available when the scan completes.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm leading-7 text-muted-foreground">{report.executiveSummary}</p>
        <p className="mt-2 text-xs text-muted-foreground">Generated {formatTimestamp(report.generatedAt)}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {(["critical", "high", "medium", "low", "info"] as Severity[]).map((severity) => (
          <MetricCard
            key={severity}
            label={severity}
            value={String(report.findingsBySeverity[severity])}
            tone={severity === "critical" || severity === "high" ? "alert" : "default"}
          />
        ))}
      </div>

      {report.topRisks.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            <h4 className="text-base font-semibold text-foreground">Top Risks</h4>
          </div>
          {report.topRisks.map((risk, index) => (
            <div key={`${risk.title}-${index}`} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={severityBadgeVariant[risk.severity]}>{risk.severity}</Badge>
                <h5 className="font-medium text-foreground">{risk.title}</h5>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{risk.nodeTarget}</p>
              <p className="mt-3 text-sm leading-6 text-foreground">{risk.recommendation}</p>
            </div>
          ))}
        </div>
      ) : null}

      {report.attackPaths.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="text-base font-semibold text-foreground">Attack Paths</h4>
          </div>
          {report.attackPaths.map((path, index) => (
            <div key={`${path.description}-${index}`} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">Path {index + 1}</span>
                <Badge variant={path.risk >= 0.6 ? "warning" : "outline"}>{riskPercent(path.risk)} risk</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                {path.nodeIds.map((nodeId, nodeIndex) => (
                  <span key={nodeId} className="flex items-center gap-1.5">
                    <span className="rounded-full bg-background px-2.5 py-1 font-mono text-foreground">{nodeId}</span>
                    {nodeIndex < path.nodeIds.length - 1 ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : null}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{path.description}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
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
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const { lastEvent, isConnected } = useScanWebSocket(scanId !== "new");
  const { scan, findings, graph, report, isLoading, refetch } = useScan(scanId && scanId !== "new" ? scanId : null, lastEvent);
  const isCreateMode = scanId === "new";
  const auditRefreshRound = lastEvent?.type === "round_complete" ? lastEvent.round : 0;

  useEffect(() => {
    setRoundSummary("");
    setSelectedNodeId(null);
  }, [scanId]);

  useEffect(() => {
    if (!scanId || scanId === "new") {
      setAuditEntries([]);
      return;
    }

    let active = true;
    setAuditLoading(true);

    fetchJson<AuditEntry[]>(`/api/scan/${scanId}/audit`)
      .then((entries) => {
        if (active) {
          setAuditEntries(entries);
        }
      })
      .catch(() => {
        if (active) {
          setAuditEntries([]);
        }
      })
      .finally(() => {
        if (active) {
          setAuditLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [auditRefreshRound, scanId, scan?.status]);

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

  const nodes = useMemo(() => graph?.nodes ?? [], [graph]);
  const nodesById = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes]);

  const layers = useMemo(() => {
    return scan?.scope.layers.map((layer) => ({
      layer,
      nodes: nodes
        .filter((node) => node.layer === layer)
        .sort((left, right) => right.riskScore - left.riskScore)
    })) ?? [];
  }, [nodes, scan?.scope.layers]);

  const selectedNodeLabel = selectedNodeId ? nodesById[selectedNodeId]?.target ?? selectedNodeId : null;

  const quickLinks = useMemo<QuickLink[]>(() => {
    const layerLinks = layers.map((entry, index) => ({
      id: `layer-${entry.layer}`,
      label: `${entry.layer} ${layerLabels[entry.layer]}`,
      shortcut: String(index + 1),
      meta: `${entry.nodes.length} nodes`
    }));

    return [
      { id: "overview", label: "Overview", shortcut: "s", meta: `${scan?.scope.targets.length ?? 0} targets` },
      ...layerLinks,
      { id: "findings", label: "Findings", shortcut: "f", meta: `${findings.length} total` },
      { id: "audit", label: "Audit", shortcut: "a", meta: `${auditEntries.length} events` },
      { id: "report", label: "Report", shortcut: "r", meta: report ? `${report.totalFindings} findings` : "Pending" }
    ];
  }, [auditEntries.length, findings.length, layers, report, scan?.scope.targets.length]);

  useEffect(() => {
    if (!scanId || scanId === "new") {
      return;
    }

    const keyMap = Object.fromEntries(quickLinks.map((link) => [link.shortcut.toLowerCase(), link.id]));

    function handleKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        !target ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const destination = keyMap[event.key.toLowerCase()];
      if (!destination) {
        return;
      }

      event.preventDefault();
      document.getElementById(destination)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [quickLinks, scanId]);

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

  const handleRefresh = useCallback(() => {
    void refetch();
    if (scanId && scanId !== "new") {
      setAuditLoading(true);
      fetchJson<AuditEntry[]>(`/api/scan/${scanId}/audit`)
        .then(setAuditEntries)
        .catch(() => setAuditEntries([]))
        .finally(() => setAuditLoading(false));
    }
  }, [refetch, scanId]);

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
            <DetailSidebarItem label="Outputs">Layer inventory, findings, audit trail, and report</DetailSidebarItem>
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
              Newly started scans open as detail pages so investigation stays on one route.
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
            <Button type="button" variant="outline" onClick={handleRefresh} disabled={isLoading}>
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
          <Button type="button" variant="outline" onClick={handleRefresh} disabled={isLoading}>
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
        <div className="space-y-5 lg:sticky lg:top-6">
          <div className="space-y-4">
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
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Jump To</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Keyboard shortcuts: `s` overview, `1-6` layers, `f` findings, `a` audit, `r` report.
            </p>
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <QuickLinkButton key={link.id} link={link} />
              ))}
            </div>
            {selectedNodeLabel ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                Focused node
                <div className="mt-1 font-mono text-foreground">{selectedNodeLabel}</div>
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <SectionCard
          id="overview"
          title="Overview"
          description="Scan state, scope, and current execution summary."
        >
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard label="Progress" value={summarizeProgress(scan)} />
              <MetricCard label="Nodes" value={`${scan.nodesComplete}/${scan.nodesTotal}`} />
              <MetricCard label="Round" value={String(scan.currentRound)} />
              <MetricCard label="Findings" value={String(findings.length)} tone={(findingsBySeverity.critical ?? 0) > 0 ? "alert" : "default"} />
            </div>

            {roundSummary ? (
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Latest Round</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{roundSummary}</p>
              </div>
            ) : null}

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
          </div>
        </SectionCard>

        {layers.map((entry) => (
          <SectionCard
            key={entry.layer}
            id={`layer-${entry.layer}`}
            title={`${entry.layer} ${layerLabels[entry.layer]}`}
            description="Nodes are grouped directly by the collected layer data, with per-node findings counts."
          >
            <NodeTable
              nodes={entry.nodes}
              findings={findings}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          </SectionCard>
        ))}

        <SectionCard
          id="findings"
          title="Findings"
          description={selectedNodeLabel ? `Filtered to ${selectedNodeLabel}. Select the same node again to clear the focus.` : "Direct findings view built from the current scan payload."}
        >
          <FindingsList findings={findings} nodesById={nodesById} selectedNodeId={selectedNodeId} />
        </SectionCard>

        <SectionCard
          id="audit"
          title="Audit"
          description="Audit entries are shown inline for fast review without switching views."
        >
          <AuditTimeline entries={auditEntries} isLoading={auditLoading} />
        </SectionCard>

        <SectionCard
          id="report"
          title="Report"
          description="Report sections are rendered directly from the generated report payload."
        >
          <ReportSection report={report} />
        </SectionCard>
      </div>
    </DetailPage>
  );
}
