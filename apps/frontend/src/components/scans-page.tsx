import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  type AuditEntry,
  type DfsNode,
  type Finding,
  type Observation,
  type OsiLayer,
  type Report,
  type Scan,
  type ScanStatus,
  type Severity,
  type ToolRun
} from "@synosec/contracts";
import { toast } from "sonner";
import { ScanConfig } from "./ScanConfig";
import { ExecutionPanel } from "./ExecutionPanel";
import { GraceChainsPanel } from "./GraceChainsPanel";
import { DetailField, DetailFieldGroup, DetailPage, DetailSidebarItem } from "./detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "./list-page";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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

function sentenceCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match, index) => (index === 0 ? match.toUpperCase() : match.toLowerCase()));
}

function adapterLabel(adapter: ToolRun["adapter"]) {
  switch (adapter) {
    case "service_scan":
      return "Service discovery";
    case "network_scan":
      return "Host discovery";
    case "http_probe":
      return "HTTP checks";
    case "web_fingerprint":
      return "Technology fingerprint";
    case "content_discovery":
      return "Content discovery";
    case "tls_audit":
      return "TLS review";
    case "session_audit":
      return "Session review";
    case "db_injection_check":
      return "Database injection check";
    case "nikto_scan":
      return "Nikto web scan";
    case "nuclei_scan":
      return "Nuclei template scan";
    case "vuln_check":
      return "Vulnerability checks";
    default:
      return sentenceCase(adapter);
  }
}

function toolRunOutcomeLabel(status: ToolRun["status"]) {
  switch (status) {
    case "completed":
      return "passed";
    case "denied":
      return "skipped";
    case "failed":
      return "failed";
    case "running":
      return "running";
    case "pending":
      return "pending";
    default:
      return status;
  }
}

function describeToolRun(toolRun: ToolRun) {
  const target = `${toolRun.target}${toolRun.port ? `:${toolRun.port}` : ""}`;

  switch (toolRun.adapter) {
    case "service_scan":
      return `Checked exposed services on ${target}.`;
    case "network_scan":
      return `Checked whether ${target} responds on the network.`;
    case "http_probe":
      return `Checked HTTP responses and basic application routes on ${target}.`;
    case "web_fingerprint":
      return `Checked what web stack is exposed on ${target}.`;
    case "content_discovery":
      return `Checked for common content and administrative paths on ${target}.`;
    case "tls_audit":
      return `Checked TLS and certificate behavior on ${target}.`;
    case "session_audit":
      return `Checked remote session exposure on ${target}.`;
    case "db_injection_check":
      return `Checked for database injection risk on ${target}.`;
    case "nikto_scan":
      return `Ran Nikto web vulnerability scanner against ${target}.`;
    case "nuclei_scan":
      return `Ran Nuclei template-based scanner against ${target}.`;
    case "vuln_check":
      return `Checked for XSS, SQLi, CORS issues, and PII exposure on ${target}.`;
    default:
      return `Checked ${target} with ${toolRun.tool}.`;
  }
}

function summarizeScanOutcome(scan: Scan, findings: Finding[], toolRuns: ToolRun[]) {
  const failedRuns = toolRuns.filter((toolRun) => toolRun.status === "failed").length;
  const skippedRuns = toolRuns.filter((toolRun) => toolRun.status === "denied").length;
  const highestSeverity = ["critical", "high", "medium", "low", "info"].find((severity) =>
    findings.some((finding) => finding.severity === severity)
  );

  if (scan.status === "failed") {
    return "The scan stopped early because a required tool execution failed.";
  }

  if (findings.length === 0 && toolRuns.length === 0) {
    return "No checks have completed yet.";
  }

  const severityText = highestSeverity ? ` Highest observed severity: ${highestSeverity}.` : "";
  const skippedText = skippedRuns > 0 ? ` ${skippedRuns} checks were skipped by policy.` : "";
  const failedText = failedRuns > 0 ? ` ${failedRuns} checks failed during execution.` : "";

  return `Completed ${toolRuns.length} checks and produced ${findings.length} findings.${severityText}${skippedText}${failedText}`;
}

function summarizeLayerChecks(nodes: DfsNode[], toolRunsByNodeId: Map<string, ToolRun[]>) {
  const runs = nodes.flatMap((node) => toolRunsByNodeId.get(node.id) ?? []);
  const passed = runs.filter((toolRun) => toolRun.status === "completed").length;
  const failed = runs.filter((toolRun) => toolRun.status === "failed").length;
  const skipped = runs.filter((toolRun) => toolRun.status === "denied").length;
  const running = runs.filter((toolRun) => toolRun.status === "running" || toolRun.status === "pending").length;

  if (runs.length === 0) {
    return "No checks ran in this layer.";
  }

  const parts = [];
  if (passed > 0) parts.push(`${passed} passed`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (skipped > 0) parts.push(`${skipped} skipped`);
  if (running > 0) parts.push(`${running} running`);
  return parts.join(" · ");
}

function summarizeNodeOutcome(node: DfsNode, toolRuns: ToolRun[], findings: Finding[]) {
  const failedRuns = toolRuns.filter((toolRun) => toolRun.status === "failed").length;
  const skippedRuns = toolRuns.filter((toolRun) => toolRun.status === "denied").length;

  if (failedRuns > 0) {
    return `This node has ${failedRuns} failed check${failedRuns === 1 ? "" : "s"} and needs review.`;
  }

  if (findings.length > 0) {
    return `This node produced ${findings.length} finding${findings.length === 1 ? "" : "s"} from ${toolRuns.length} completed or attempted checks.`;
  }

  if (skippedRuns > 0 && toolRuns.length === skippedRuns) {
    return "All checks for this node were skipped by policy.";
  }

  if (toolRuns.length === 0) {
    return "No checks were run for this node.";
  }

  return `Checks completed for this node without generating findings.`;
}

function summarizeAuditEntry(entry: AuditEntry) {
  const details = entry.details;

  switch (entry.action) {
    case "scan-started":
      return "Scan started with the requested scope and execution policy.";
    case "tool-run-authorized":
      return `${adapterLabel(String(details["adapter"] ?? "") as ToolRun["adapter"])} was allowed to run.`;
    case "tool-run-denied":
      return `${adapterLabel(String(details["adapter"] ?? "") as ToolRun["adapter"])} was skipped. ${String(details["reason"] ?? "")}`.trim();
    case "tool-run-failed":
      return `${adapterLabel(String(details["adapter"] ?? "") as ToolRun["adapter"])} failed. ${String(details["error"] ?? "")}`.trim();
    case "scan-failed-broker-execution":
      return `The scan stopped because ${String(details["adapter"] ?? "a tool")} failed.`;
    case "round-complete":
      return String(details["summary"] ?? "A scan round completed.");
    default:
      return sentenceCase(entry.action);
  }
}

function summarizeReportOutcome(report: Report) {
  if (report.totalFindings === 0) {
    return "The scan completed without any evidence-backed findings.";
  }

  const highestSeverity = (["critical", "high", "medium", "low", "info"] as Severity[]).find(
    (severity) => report.findingsBySeverity[severity] > 0
  );

  return `The scan produced ${report.totalFindings} evidence-backed findings. The highest observed severity was ${highestSeverity ?? "info"}.`;
}

function reportPriorityHeading(report: Report) {
  if (report.findingsBySeverity.critical > 0 || report.findingsBySeverity.high > 0) {
    return "Address externally exposed high-risk issues first.";
  }
  if (report.findingsBySeverity.medium > 0) {
    return "Address the reachable medium-risk issues next.";
  }
  if (report.totalFindings > 0) {
    return "The remaining issues are mostly hardening and exposure findings.";
  }
  return "No remediation priorities were identified from this scan.";
}

function severitySummaryText(report: Report, severity: Severity) {
  const count = report.findingsBySeverity[severity];
  if (count === 0) {
    return null;
  }

  switch (severity) {
    case "critical":
      return `${count} critical finding${count === 1 ? "" : "s"} need immediate action.`;
    case "high":
      return `${count} high-severity finding${count === 1 ? "" : "s"} should be addressed quickly.`;
    case "medium":
      return `${count} medium-severity finding${count === 1 ? "" : "s"} need follow-up review.`;
    case "low":
      return `${count} low-severity finding${count === 1 ? "" : "s"} indicate hardening gaps.`;
    case "info":
      return `${count} informational finding${count === 1 ? "" : "s"} provide context for follow-on review.`;
    default:
      return null;
  }
}

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
    <span className="rounded-md border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
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
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-2.5 py-2 text-left transition hover:border-primary/30 hover:bg-accent"
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-foreground">{link.label}</span>
        {link.meta ? <span className="block truncate text-[10px] text-muted-foreground">{link.meta}</span> : null}
      </span>
      <ShortcutHint shortcut={link.shortcut} />
    </button>
  );
}

function SectionCard({
  id,
  title,
  children
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-6 overflow-hidden">
      <CardHeader className="border-b border-border/70 px-4 py-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">{children}</CardContent>
    </Card>
  );
}

function toolRunStatusVariant(status: ToolRun["status"]): "outline" | "success" | "warning" | "destructive" {
  if (status === "completed") return "success";
  if (status === "failed") return "destructive";
  if (status === "denied") return "warning";
  return "outline";
}

function CompactDetail({
  label,
  value
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function AuditTimeline({ entries, isLoading }: { entries: AuditEntry[]; isLoading: boolean }) {
  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading audit trail...</p>;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No audit entries available yet.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <details key={entry.id} className="border-b border-border/60 py-2 last:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", entry.scopeValid ? "bg-success" : "bg-warning")} />
              <span className="text-xs font-medium text-foreground">{sentenceCase(entry.actor)}</span>
              <Badge variant="outline">{sentenceCase(entry.action)}</Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">{formatTimestamp(entry.timestamp)}</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{summarizeAuditEntry(entry)}</p>
          {Object.keys(entry.details).length > 0 ? (
            <>
              <summary className="mt-2 cursor-pointer list-none text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Technical details
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-background/80 p-2 font-mono text-[11px] leading-5 text-muted-foreground">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </>
          ) : null}
        </details>
      ))}
    </div>
  );
}

function ReportSection({ report }: { report: Report | null }) {
  if (!report) {
    return <p className="text-xs text-muted-foreground">Report becomes available when the scan completes.</p>;
  }

  const severitySummaries = (["critical", "high", "medium", "low", "info"] as Severity[])
    .map((severity) => ({ severity, summary: severitySummaryText(report, severity) }))
    .filter((entry): entry is { severity: Severity; summary: string } => entry.summary !== null);

  return (
    <div className="space-y-4 text-xs">
      <div className="rounded-lg border border-border/60 bg-background/40 p-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Summary</p>
        <p className="mt-2 text-sm leading-6 text-foreground">{summarizeReportOutcome(report)}</p>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{reportPriorityHeading(report)}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">Generated {formatTimestamp(report.generatedAt)}</p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">What We Found</p>
        <div className="space-y-2">
          {severitySummaries.length > 0 ? severitySummaries.map(({ severity, summary }) => (
            <div key={severity} className="flex flex-wrap items-center gap-2 border-b border-border/60 py-2 last:border-b-0">
              <Badge variant={severityBadgeVariant[severity]}>{severity}</Badge>
              <span className="text-[11px] text-muted-foreground">{summary}</span>
            </div>
          )) : (
            <p className="text-[11px] text-muted-foreground">No findings were included in the final report.</p>
          )}
        </div>
      </div>

      {report.topRisks.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">What Matters Most</p>
          {report.topRisks.map((risk, index) => (
            <details key={`${risk.title}-${index}`} className="border-b border-border/60 py-2 last:border-b-0">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={severityBadgeVariant[risk.severity]}>{risk.severity}</Badge>
                  <h5 className="text-xs font-medium text-foreground">{risk.title}</h5>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{risk.nodeTarget}</p>
              </summary>
              <div className="mt-2 rounded-md border border-border/60 bg-background/50 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">What to fix next</p>
                <p className="mt-2 leading-5 text-foreground">{risk.recommendation}</p>
              </div>
            </details>
          ))}
        </div>
      ) : null}

      {report.attackPaths.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Potential Paths</p>
          {report.attackPaths.map((path, index) => (
            <details key={`${path.description}-${index}`} className="border-b border-border/60 py-2 last:border-b-0">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">Path {index + 1}</span>
                  <Badge variant={path.risk >= 0.6 ? "warning" : "outline"}>{riskPercent(path.risk)} risk</Badge>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{path.description}</p>
              </summary>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                {path.nodeIds.map((nodeId, nodeIndex) => (
                  <span key={nodeId} className="flex items-center gap-1.5">
                    <span className="rounded-full bg-background px-2.5 py-1 font-mono text-foreground">{nodeId}</span>
                    {nodeIndex < path.nodeIds.length - 1 ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : null}
                  </span>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ObservationList({ observations }: { observations: Observation[] }) {
  if (observations.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No observations derived from this command.</p>;
  }

  return (
    <div className="space-y-2">
      {observations.map((observation) => (
        <div key={observation.id} className="border-b border-border/60 py-2 last:border-b-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={severityBadgeVariant[observation.severity]}>{observation.severity}</Badge>
            <span className="text-[11px] font-medium text-foreground">{observation.title}</span>
            <span className="text-[11px] text-muted-foreground">{Math.round(observation.confidence * 100)}%</span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{observation.summary}</p>
        </div>
      ))}
    </div>
  );
}

function NodeFindingList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No findings derived for this node yet.</p>;
  }

  return (
    <div className="space-y-2">
      {findings.map((finding) => (
        <details key={finding.id} className="border-b border-border/60 py-2 last:border-b-0">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityBadgeVariant[finding.severity]}>{finding.severity}</Badge>
              <span className="text-[11px] font-medium text-foreground">{finding.title}</span>
              <span className="text-[11px] text-muted-foreground">{Math.round(finding.confidence * 100)}%</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{finding.description}</p>
          </summary>
          <div className="mt-2 space-y-2">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted/30 p-2 font-mono text-[10px] leading-5 text-muted-foreground">
                {finding.evidence}
              </pre>
            </div>
            {finding.reproduceCommand ? (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Exact tool call</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-background p-2 font-mono text-[10px] leading-5 text-foreground">
                  {finding.reproduceCommand}
                </pre>
              </div>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}

function ToolRunList({
  toolRuns,
  observationsByRunId
}: {
  toolRuns: ToolRun[];
  observationsByRunId: Map<string, Observation[]>;
}) {
  if (toolRuns.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No tool runs were queued for this node.</p>;
  }

  return (
    <div className="space-y-2">
      {toolRuns.map((toolRun) => {
        const runObservations = observationsByRunId.get(toolRun.id) ?? [];
        return (
          <details key={toolRun.id} className="border-b border-border/60 py-2 last:border-b-0">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={toolRunStatusVariant(toolRun.status)}>{toolRunOutcomeLabel(toolRun.status)}</Badge>
                    <span className="text-[11px] font-medium text-foreground">{adapterLabel(toolRun.adapter)}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{describeToolRun(toolRun)}</p>
                  {toolRun.statusReason ? (
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{toolRun.statusReason}</p>
                  ) : null}
                </div>
                <span className="text-[10px] text-muted-foreground">{formatTimestamp(toolRun.completedAt ?? toolRun.startedAt)}</span>
              </div>
            </summary>

            <div className="mt-2 space-y-3">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Results</p>
                <ObservationList observations={runObservations} />
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Exact tool call</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-background p-2 font-mono text-[10px] leading-5 text-foreground">
                  {toolRun.commandPreview}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Raw result</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/30 p-2 font-mono text-[10px] leading-5 text-muted-foreground">
                  {toolRun.output ?? "No output captured."}
                </pre>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}

function LayerEvidenceSection({
  layer,
  nodes,
  toolRunsByNodeId,
  observationsByRunId,
  findingsByNodeId
}: {
  layer: OsiLayer;
  nodes: DfsNode[];
  toolRunsByNodeId: Map<string, ToolRun[]>;
  observationsByRunId: Map<string, Observation[]>;
  findingsByNodeId: Map<string, Finding[]>;
}) {
  if (nodes.length === 0) {
    return <p className="text-xs text-muted-foreground">No nodes discovered for this layer.</p>;
  }

  return (
    <div className="space-y-3">
      {nodes.map((node) => {
        const nodeToolRuns = toolRunsByNodeId.get(node.id) ?? [];
        const nodeFindings = findingsByNodeId.get(node.id) ?? [];

        return (
          <article key={node.id} className="border-b border-border/60 py-3 last:border-b-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-foreground">{node.target}</span>
                  <Badge variant={node.status === "complete" ? "success" : "outline"}>{node.status}</Badge>
                  {node.service ? <span className="text-[11px] text-muted-foreground">{node.service}</span> : null}
                  {node.port ? <span className="text-[11px] text-muted-foreground">:{node.port}</span> : null}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span>{layerLabels[layer]}</span>
                  <span>depth {node.depth}</span>
                  <span>risk {riskPercent(node.riskScore)}</span>
                  <span>{nodeToolRuns.length} runs</span>
                  <span>{nodeFindings.length} findings</span>
                </div>
                <p className="text-[11px] leading-5 text-muted-foreground">{summarizeNodeOutcome(node, nodeToolRuns, nodeFindings)}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
                <ToolRunList toolRuns={nodeToolRuns} observationsByRunId={observationsByRunId} />
              </div>
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Findings</p>
                <NodeFindingList findings={nodeFindings} />
              </div>
            </div>
          </article>
        );
      })}
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
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const reportedFailedToolRunsRef = useRef(new Set<string>());
  const { lastEvent, isConnected } = useScanWebSocket(scanId !== "new");
  const { scan, findings, graph, report, chains, prioritizedTargets, toolRuns, observations, isLoading, refetch } = useScan(scanId && scanId !== "new" ? scanId : null, lastEvent);
  const isCreateMode = scanId === "new";
  const auditRefreshRound = lastEvent?.type === "round_complete" ? lastEvent.round : 0;

  useEffect(() => {
    setRoundSummary("");
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
        toast.error("Scan failed", { description: "A brokered tool execution failed. Inspect the layer evidence for the exact tool run." });
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
      return;
    }

    if (lastEvent.type === "tool_run_completed" && lastEvent.toolRun.scanId === scanId && lastEvent.toolRun.status === "failed") {
      reportedFailedToolRunsRef.current.add(lastEvent.toolRun.id);
      toast.error("Tool execution failed", {
        description: `${lastEvent.toolRun.adapter}: ${lastEvent.toolRun.statusReason ?? "Unknown broker error"}`
      });
    }
  }, [lastEvent, refetch, scanId]);

  useEffect(() => {
    for (const toolRun of toolRuns) {
      if (toolRun.status !== "failed") {
        continue;
      }
      if (reportedFailedToolRunsRef.current.has(toolRun.id)) {
        continue;
      }
      reportedFailedToolRunsRef.current.add(toolRun.id);
      toast.error("Tool execution failed", {
        description: `${toolRun.adapter}: ${toolRun.statusReason ?? "Unknown tool error"}`
      });
    }
  }, [toolRuns]);

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
  const toolRunsByNodeId = useMemo(() => {
    const grouped = new Map<string, ToolRun[]>();
    for (const toolRun of toolRuns) {
      const existing = grouped.get(toolRun.nodeId) ?? [];
      existing.push(toolRun);
      grouped.set(toolRun.nodeId, existing);
    }
    for (const [nodeId, groupedRuns] of grouped) {
      grouped.set(nodeId, [...groupedRuns].sort((left, right) => right.startedAt.localeCompare(left.startedAt)));
    }
    return grouped;
  }, [toolRuns]);
  const observationsByRunId = useMemo(() => {
    const grouped = new Map<string, Observation[]>();
    for (const observation of observations) {
      const existing = grouped.get(observation.toolRunId) ?? [];
      existing.push(observation);
      grouped.set(observation.toolRunId, existing);
    }
    return grouped;
  }, [observations]);
  const findingsByNodeId = useMemo(() => {
    const grouped = new Map<string, Finding[]>();
    for (const finding of findings) {
      const existing = grouped.get(finding.nodeId) ?? [];
      existing.push(finding);
      grouped.set(finding.nodeId, existing);
    }
    return grouped;
  }, [findings]);

  const layers = useMemo(() => {
    return scan?.scope.layers.map((layer) => ({
      layer,
      nodes: nodes
        .filter((node) => node.layer === layer)
        .sort((left, right) => right.riskScore - left.riskScore)
    })) ?? [];
  }, [nodes, scan?.scope.layers]);

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
      { id: "execution", label: "Execution", shortcut: "e", meta: `${toolRuns.length} runs` },
      { id: "grace-chains", label: "GRACE Chains", shortcut: "g", meta: chains.length > 0 ? `${chains.length} chains` : "Pending" },
      { id: "audit", label: "Audit", shortcut: "a", meta: `${auditEntries.length} events` },
      { id: "report", label: "Report", shortcut: "r", meta: report ? `${report.totalFindings} findings` : "Pending" }
    ];
  }, [auditEntries.length, chains.length, layers, report, scan?.scope.targets.length, toolRuns.length]);

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
          <div className="space-y-3 lg:sticky lg:top-6">
          <div className="rounded-lg border border-border/70 bg-background/50 p-3">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-foreground">Jump To</p>
            </div>
            <div className="mt-3 space-y-1.5">
              {quickLinks.map((link) => (
                <QuickLinkButton key={link.id} link={link} />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <SectionCard id="overview" title="Overview">
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Summary</p>
              <p className="mt-2 text-sm leading-6 text-foreground">{summarizeScanOutcome(scan, findings, toolRuns)}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <CompactDetail label="Status" value={<Badge variant={scanStatusBadgeVariant[scan.status]}>{scan.status}</Badge>} />
              <CompactDetail label="Progress" value={`${scan.nodesComplete}/${scan.nodesTotal} nodes · ${summarizeProgress(scan)}`} />
              <CompactDetail label="Round" value={String(scan.currentRound)} />
              <CompactDetail label="Evidence" value={`${toolRuns.length} runs · ${observations.length} observations · ${findings.length} findings`} />
              <CompactDetail
                label="Targets"
                value={
                  <div className="space-y-1">
                    {scan.scope.targets.map((target) => (
                      <div key={target} className="font-mono text-[11px] text-foreground">{target}</div>
                    ))}
                  </div>
                }
              />
              <CompactDetail label="Layers" value={scan.scope.layers.join(", ")} />
              <CompactDetail label="Execution" value={`depth ${scan.scope.maxDepth} · ${scan.scope.maxDurationMinutes} min · ${scan.scope.rateLimitRps} rps`} />
              <CompactDetail label="Exploit policy" value={scan.scope.allowActiveExploits ? "active checks allowed" : "active checks disabled"} />
            </div>

            {roundSummary ? (
              <div className="border-t border-border/60 pt-3">
                <p className="text-xs leading-6 text-foreground">{roundSummary}</p>
              </div>
            ) : null}

            <div className="border-t border-border/60 pt-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Checks Reviewed</p>
              <div className="space-y-2">
                {layers.map((entry) => (
                  <div key={entry.layer} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 last:border-b-0">
                    <div>
                      <p className="text-xs font-medium text-foreground">{entry.layer} {layerLabels[entry.layer]}</p>
                      <p className="text-[11px] text-muted-foreground">{summarizeLayerChecks(entry.nodes, toolRunsByNodeId)}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{entry.nodes.length} node{entry.nodes.length === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {layers.map((entry) => (
          <SectionCard key={entry.layer} id={`layer-${entry.layer}`} title={`${entry.layer} ${layerLabels[entry.layer]}`}>
            <LayerEvidenceSection
              layer={entry.layer}
              nodes={entry.nodes}
              toolRunsByNodeId={toolRunsByNodeId}
              observationsByRunId={observationsByRunId}
              findingsByNodeId={findingsByNodeId}
            />
          </SectionCard>
        ))}

        <SectionCard id="execution" title="Execution">
          <ExecutionPanel toolRuns={toolRuns} observations={observations} />
        </SectionCard>

        <SectionCard id="grace-chains" title="GRACE Chains">
          <GraceChainsPanel
            chains={chains}
            findings={findings}
            selectedChainId={selectedChainId}
            prioritizedTargets={prioritizedTargets}
            onSelectChain={setSelectedChainId}
          />
        </SectionCard>

        <SectionCard id="audit" title="Audit">
          <AuditTimeline entries={auditEntries} isLoading={auditLoading} />
        </SectionCard>

        <SectionCard id="report" title="Report">
          <ReportSection report={report} />
        </SectionCard>
      </div>
    </DetailPage>
  );
}
