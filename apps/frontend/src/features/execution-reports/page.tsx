import { useState } from "react";
import { Archive, ArrowLeft, Download, Trash2 } from "lucide-react";
import { apiRoutes, type ExecutionReportDetail, type ExecutionReportFinding, type ExecutionReportStatus } from "@synosec/contracts";
import { toast } from "sonner";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { useResourceList } from "@/shared/hooks/use-resource-list";
import { DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/shared/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
import { Button } from "@/shared/ui/button";
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

function FindingsSection({ findings }: { findings: ExecutionReportFinding[] }) {
  return (
    <DetailFieldGroup title="Findings" className="bg-card/70">
      <div className="col-span-full space-y-3">
        {findings.length === 0 ? <p className="text-sm text-muted-foreground">No structured findings were reported for this execution.</p> : null}
        {findings.map((finding) => (
          <div key={finding.id} className="rounded-xl border border-border bg-background/50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">{finding.severity}</span>
              <span>{finding.type}</span>
              <span>{finding.targetLabel}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{finding.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{finding.summary}</p>
            {finding.recommendation ? <p className="mt-3 text-sm leading-6 text-foreground/85">{finding.recommendation}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
              {finding.sourceToolIds.map((toolId) => (
                <span key={toolId} className="rounded-full border border-border/70 px-2 py-1">{toolId}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DetailFieldGroup>
  );
}

function ToolActivitySection({ report }: { report: ExecutionReportDetail }) {
  return (
    <DetailFieldGroup title="Tool Activity" className="bg-card/70">
      <div className="col-span-full space-y-3">
        {report.toolActivity.length === 0 ? <p className="text-sm text-muted-foreground">No persisted tool activity is available for this execution.</p> : null}
        {report.toolActivity.map((activity) => (
          <div key={activity.id} className="rounded-xl border border-border bg-background/50 px-4 py-4">
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
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [mutating, setMutating] = useState(false);
  const detail = useResourceDetail(executionReportsResource, reportId ?? null, detailReloadToken);

  async function archiveReport(id: string) {
    setMutating(true);
    try {
      await fetchJson<ExecutionReportDetail>(apiRoutes.executionReportArchive.replace(":id", id), { method: "POST" });
      toast.success("Execution report archived");
      list.refetch();
      setDetailReloadToken((current) => current + 1);
    } finally {
      setMutating(false);
    }
  }

  async function unarchiveReport(id: string) {
    setMutating(true);
    try {
      await fetchJson<ExecutionReportDetail>(apiRoutes.executionReportUnarchive.replace(":id", id), { method: "POST" });
      toast.success("Execution report restored");
      list.refetch();
      setDetailReloadToken((current) => current + 1);
    } finally {
      setMutating(false);
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
    const columns: ListPageColumn<ExecutionReportDetail>[] = [
      { id: "title", header: "Report", sortable: true, cell: (row) => row.title },
      { id: "executionKind", header: "Kind", sortable: true, cell: (row) => row.executionKind },
      { id: "status", header: "Status", sortable: true, cell: (row) => row.status },
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
          { label: "Single-agent", value: "single-agent" },
          { label: "Workflow", value: "workflow" },
          { label: "Attack-map", value: "attack-map" }
        ]
      },
      {
        id: "status",
        label: "Status",
        placeholder: "Filter status",
        allLabel: "All statuses",
        options: statusOptions.map((status) => ({ label: status, value: status }))
      },
      {
        id: "archived",
        label: "Report state",
        placeholder: "Filter reports",
        allLabel: "Active only",
        options: [
          { label: "All reports", value: "include" },
          { label: "Archived only", value: "only" }
        ]
      }
    ];

    return (
      <ListPage
        title="Execution Reports"
        recordLabel="Execution report"
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
        onExportRowJson={(row) => downloadJson(`${row.id}.json`, row)}
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
        breadcrumbs={["Start", "Execution Reports", "Loading"]}
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
      breadcrumbs={["Start", "Execution Reports", report.title]}
      subtitle={report.executionId}
      timestamp={new Date(report.updatedAt).toLocaleString()}
      isDirty={false}
      onBack={onNavigateToList}
      onSave={() => undefined}
      onDismiss={() => undefined}
      onExportJson={() => downloadJson(`${report.id}.json`, report)}
      actions={(
        <div className="flex flex-wrap items-center gap-2 px-0 py-0">
          <Button type="button" variant="outline" onClick={onNavigateToList} className="h-8 text-[0.72rem]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void (isArchived ? unarchiveReport(report.id) : archiveReport(report.id));
            }}
            disabled={mutating}
            className="h-8 text-[0.72rem]"
          >
            <Archive className="h-4 w-4" />
            {isArchived ? "Unarchive" : "Archive"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              void deleteReport(report.id);
            }}
            disabled={mutating}
            className="h-8 text-[0.72rem]"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="ml-auto">
            <Button type="button" variant="outline" onClick={() => downloadJson(`${report.id}.json`, report)} className="h-8 text-[0.72rem]">
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>
      )}
      sidebar={(
        <>
          <DetailSidebarItem label="Execution kind">{report.executionKind}</DetailSidebarItem>
          <DetailSidebarItem label="Status">{report.status}</DetailSidebarItem>
          <DetailSidebarItem label="Target">{report.targetLabel}</DetailSidebarItem>
          <DetailSidebarItem label="Findings">{report.findingsCount}</DetailSidebarItem>
          <DetailSidebarItem label="Highest severity">{report.highestSeverity ?? "none"}</DetailSidebarItem>
          <DetailSidebarItem label="Archived">{isArchived ? new Date(report.archivedAt as string).toLocaleString() : "Active"}</DetailSidebarItem>
        </>
      )}
    >
      <DetailFieldGroup title="Summary" className="bg-card/70">
        <div className="col-span-full space-y-3 rounded-xl border border-border bg-background/50 px-4 py-4">
          <p className="text-sm leading-6 text-foreground">{report.executiveSummary}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 px-2 py-1">{report.sourceLabel}</span>
            <span className="rounded-full border border-border/70 px-2 py-1">{report.targetLabel}</span>
          </div>
        </div>
      </DetailFieldGroup>
      <FindingsSection findings={report.findings} />
      <ToolActivitySection report={report} />
    </DetailPage>
  );
}
