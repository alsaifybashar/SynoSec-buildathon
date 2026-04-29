import { useState } from "react";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  apiRoutes,
  type ExecutionReportDetail,
  type ExecutionReportSummary,
  type ExecutionReportStatus
} from "@synosec/contracts";
import { toast } from "sonner";
import { AttackPathsSection } from "@/features/attack-paths/attack-paths-section";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { useResourceList } from "@/shared/hooks/use-resource-list";
import { DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/shared/components/detail-page";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
import { Button } from "@/shared/ui/button";
import { ExecutionReportFindingsView } from "@/features/execution-reports/findings-table-view";
import { MARKDOWN_COMPONENTS_COMPACT } from "@/features/execution-reports/markdown-components";
import { executionReportsResource } from "@/features/execution-reports/resource";
import { fetchJson } from "@/shared/lib/api";

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const statusOptions: ExecutionReportStatus[] = ["pending", "running", "completed", "failed", "aborted"];

const statusBadgeStyles: Record<ExecutionReportStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  running: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  failed: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  aborted: "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300"
};

function StatusBadge({ status }: { status: ExecutionReportStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] ${statusBadgeStyles[status]}`}
    >
      {status}
    </span>
  );
}

function SectionTitleWithHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-center gap-2">
      <span>{title}</span>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center text-muted-foreground transition hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
              aria-label={`Show guidance for ${title}`}
            >
              ?
            </button>
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function scrollToToolActivity(toolRunRef: string) {
  document.getElementById(`tool-activity-${toolRunRef}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function ToolActivitySection({ report }: { report: ExecutionReportDetail }) {
  return (
    <DetailFieldGroup title="Tool Activity" className="bg-card/70">
      <div className="col-span-full space-y-3">
        <SectionTitleWithHint
          title="Persisted tool activity"
          hint="This shows the tool invocations and output previews the backend kept for the report. It is not guaranteed to include every raw log line."
        />
        {report.toolActivity.length === 0 ? <p className="text-sm text-muted-foreground">No persisted tool activity is available for this execution.</p> : null}
        {report.toolActivity.map((activity) => (
          <div id={`tool-activity-${activity.id}`} key={activity.id} className="rounded-xl border border-border bg-background/50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">{activity.status}</span>
              <span>{activity.phase}</span>
              <span>{activity.toolName}</span>
            </div>
            <p className="mt-3 font-mono text-xs text-foreground">{activity.command}</p>
            {activity.outputPreview ? <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{activity.outputPreview}</pre> : null}
          </div>
        ))}
      </div>
    </DetailFieldGroup>
  );
}

export function ExecutionReportsPage({
  reportId,
  onNavigateToList,
  onNavigateToDetail
}: {
  reportId?: string;
  onNavigateToList: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  const list = useResourceList(executionReportsResource);
  const [mutating, setMutating] = useState(false);
  const detail = useResourceDetail(executionReportsResource, reportId ?? null);

  async function exportReportJson(id: string) {
    const report = await fetchJson<ExecutionReportDetail>(`${apiRoutes.executionReports}/${id}`);
    downloadJson(`${report.id}.json`, report);
  }

  async function handleDetailExport(id: string) {
    try {
      await exportReportJson(id);
    } catch (error) {
      toast.error("Execution report export failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

async function deleteReport(id: string) {
    setMutating(true);
    try {
      await fetchJson<void>(`${apiRoutes.executionReports}/${id}`, { method: "DELETE" });
      toast.success("Execution report deleted");
      list.refetch();
      onNavigateToList();
    } finally {
      setMutating(false);
    }
  }

  if (!reportId) {
    const columns: ListPageColumn<ExecutionReportSummary>[] = [
      { id: "title", header: "Report", sortable: true, cell: (row) => row.title },
      { id: "executionKind", header: "Workflow type", sortable: true, cell: (row) => row.executionKind },
      { id: "status", header: "Status", sortable: true, cell: (row) => <StatusBadge status={row.status} /> },
      { id: "targetLabel", header: "Target", sortable: false, cell: (row) => row.targetLabel },
      { id: "findingsCount", header: "Findings", sortable: true, cell: (row) => row.findingsCount },
      { id: "highestSeverity", header: "Highest", sortable: true, cell: (row) => row.highestSeverity ?? "none" },
      { id: "generatedAt", header: "Generated", sortable: true, cell: (row) => new Date(row.generatedAt).toLocaleString() }
    ];
    const filters: ListPageFilter[] = [
      {
        id: "executionKind",
        label: "Execution kind",
        placeholder: "Filter kind",
        allLabel: "All kinds",
        options: [
          { label: "Workflow", value: "workflow" }
        ]
      },
      {
        id: "status",
        label: "Status",
        placeholder: "Filter status",
        allLabel: "All statuses",
        options: statusOptions.map((status) => ({ label: status, value: status }))
      },
    ];

    return (
      <ListPage
        title="Reports"
        recordLabel="Report"
        columns={columns}
        query={list.query}
        dataState={list.dataState}
        items={list.items}
        meta={list.meta}
        filters={filters}
        emptyMessage="No execution reports match the current filters."
        onSearchChange={list.setSearch}
        onFilterChange={list.setFilter}
        onSortChange={list.setSort}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRetry={list.refetch}
        onRowClick={(row) => onNavigateToDetail(row.id, row.title)}
        onExportRowJson={(row) => exportReportJson(row.id)}
        onDeleteRow={async (row) => {
          await fetchJson<void>(`${apiRoutes.executionReports}/${row.id}`, { method: "DELETE" });
          list.refetch();
        }}
        canDeleteRow={() => true}
      />
    );
  }

  if (detail.state !== "loaded") {
    return (
      <DetailLoadingState
        title="Execution report"
        breadcrumbs={["Start", "Reports", "Loading"]}
        onBack={onNavigateToList}
        message="Loading execution report..."
      />
    );
  }

  const report = detail.item;
  const isArchived = report.archivedAt !== null;
  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Reports", report.title]}
      isDirty={false}
      onBack={onNavigateToList}
      onSave={() => undefined}
      onDismiss={() => undefined}
      onExportJson={() => {
        void handleDetailExport(report.id);
      }}
      actions={(
        <div className="flex w-full flex-wrap items-center justify-between gap-2 px-0 py-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onNavigateToList} className="h-9 text-sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void deleteReport(report.id);
              }}
              disabled={mutating}
              className="h-9 text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleDetailExport(report.id);
              }}
              className="h-9 text-sm"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>
      )}
      sidebar={(
        <>
          <DetailSidebarItem label="Execution kind" hint="The execution mode recorded for the workflow run that generated this report.">{report.executionKind}</DetailSidebarItem>
          <DetailSidebarItem label="Status" hint="Terminal or in-flight state recorded for the report lifecycle.">{report.status}</DetailSidebarItem>
          <DetailSidebarItem label="Target" hint="Human-readable label of the target asset or scope this report is about.">{report.targetLabel}</DetailSidebarItem>
          <DetailSidebarItem label="Findings" hint="Count of persisted structured findings attached to this report.">{report.findingsCount}</DetailSidebarItem>
          <DetailSidebarItem label="Highest severity" hint="Worst severity among persisted findings.">{report.highestSeverity ?? "none"}</DetailSidebarItem>
          <DetailSidebarItem label="Archived" hint="Archive status only affects list visibility and retention workflow; it does not rewrite report contents.">{isArchived ? new Date(report.archivedAt as string).toLocaleString() : "Active"}</DetailSidebarItem>
        </>
      )}
    >
      <AttackPathsSection
        attackPaths={report.attackPaths}
        findingTitles={new Map(report.findings.map((finding) => [finding.id, finding.title]))}
        findingSeverities={new Map(report.findings.map((finding) => [finding.id, finding.severity]))}
        summary={report.attackPathExecutiveSummary}
        emptyMessage="No linked attack paths were derived for this report. Standalone findings remain available below."
      />
      <DetailFieldGroup title="Findings" className="bg-card/70">
        <div className="col-span-full">
          <ExecutionReportFindingsView report={report} onJumpToToolActivity={scrollToToolActivity} />
        </div>
      </DetailFieldGroup>
      <DetailFieldGroup title="Executive Summary" className="bg-card/70">
        <div className="col-span-full space-y-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS_COMPACT}>
            {report.executiveSummary}
          </ReactMarkdown>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 px-2 py-1">{report.sourceLabel}</span>
            <span className="rounded-full border border-border/70 px-2 py-1">{report.targetLabel}</span>
          </div>
        </div>
      </DetailFieldGroup>
      <ToolActivitySection report={report} />
    </DetailPage>
  );
}
