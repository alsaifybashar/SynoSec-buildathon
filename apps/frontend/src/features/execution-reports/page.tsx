import { useState } from "react";
import { Archive, ArrowLeft, Download, Trash2 } from "lucide-react";
import {
  apiRoutes,
  type ExecutionReportDetail,
  type ExecutionReportFinding,
  type ExecutionReportGraphEdge,
  type ExecutionReportGraphNode,
  type ExecutionReportStatus
} from "@synosec/contracts";
import { toast } from "sonner";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { useResourceList } from "@/shared/hooks/use-resource-list";
import { DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/shared/components/detail-page";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
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

function GraphNodeCard({
  node,
  inbound,
  outbound
}: {
  node: ExecutionReportGraphNode;
  inbound: ExecutionReportGraphEdge[];
  outbound: ExecutionReportGraphEdge[];
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">{node.kind}</span>
        {"severity" in node ? <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">{node.severity}</span> : null}
        {"sourceTool" in node ? <span>{node.sourceTool}</span> : null}
        {"targetLabel" in node ? <span>{node.targetLabel}</span> : null}
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{node.title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{node.summary}</p>
      {"quote" in node ? <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{node.quote}</pre> : null}
      {"refs" in node ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
          {node.refs.flatMap((ref, index) => [
            ref.traceEventId ? <span key={`${index}:trace`} className="rounded-full border border-border/70 px-2 py-1">trace:{ref.traceEventId.slice(0, 8)}</span> : null,
            ref.toolRunRef ? <span key={`${index}:tool`} className="rounded-full border border-border/70 px-2 py-1">tool:{ref.toolRunRef}</span> : null,
            ref.observationRef ? <span key={`${index}:obs`} className="rounded-full border border-border/70 px-2 py-1">obs:{ref.observationRef}</span> : null,
            ref.artifactRef ? <span key={`${index}:artifact`} className="rounded-full border border-border/70 px-2 py-1">artifact:{ref.artifactRef}</span> : null,
            ref.externalUrl ? <span key={`${index}:url`} className="rounded-full border border-border/70 px-2 py-1">{ref.externalUrl}</span> : null
          ])}
        </div>
      ) : null}
      {"findingIds" in node ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
          {node.findingIds.map((findingId) => (
            <span key={findingId} className="rounded-full border border-border/70 px-2 py-1">{findingId}</span>
          ))}
        </div>
      ) : null}
      {inbound.length > 0 || outbound.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Inbound</p>
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              {inbound.map((edge) => (
                <div key={edge.id} className="rounded-lg border border-border/70 px-3 py-2">
                  <span className="font-mono">{edge.kind}</span>
                  <span className="ml-2">{edge.source}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Outbound</p>
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              {outbound.map((edge) => (
                <div key={edge.id} className="rounded-lg border border-border/70 px-3 py-2">
                  <span className="font-mono">{edge.kind}</span>
                  <span className="ml-2">{edge.target}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GraphSection({ report }: { report: ExecutionReportDetail }) {
  const inboundByNode = new Map<string, ExecutionReportGraphEdge[]>();
  const outboundByNode = new Map<string, ExecutionReportGraphEdge[]>();

  for (const edge of report.graph.edges) {
    inboundByNode.set(edge.target, [...(inboundByNode.get(edge.target) ?? []), edge]);
    outboundByNode.set(edge.source, [...(outboundByNode.get(edge.source) ?? []), edge]);
  }

  return (
    <DetailFieldGroup title="Execution Graph" className="bg-card/70">
      <div className="col-span-full space-y-4">
        <SectionTitleWithHint
          title="Graph structure"
          hint="Nodes capture persisted evidence or findings. Edges explain how one node supports or relates to another."
        />
        <div className="rounded-xl border border-border bg-background/50 px-4 py-4">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 px-2 py-1">{report.graph.nodes.length} nodes</span>
            <span className="rounded-full border border-border/70 px-2 py-1">{report.graph.edges.length} edges</span>
          </div>
        </div>
        {report.graph.nodes.length === 0 ? <p className="text-sm text-muted-foreground">No execution graph was persisted for this report.</p> : null}
        {report.graph.nodes.map((node) => (
          <GraphNodeCard
            key={node.id}
            node={node}
            inbound={inboundByNode.get(node.id) ?? []}
            outbound={outboundByNode.get(node.id) ?? []}
          />
        ))}
      </div>
    </DetailFieldGroup>
  );
}

function FindingsSection({ findings }: { findings: ExecutionReportFinding[] }) {
  return (
    <DetailFieldGroup title="Findings" className="bg-card/70">
      <div className="col-span-full space-y-3">
        <SectionTitleWithHint
          title="Persisted findings"
          hint="These are the structured issues saved to the report, not every intermediate observation the tools produced."
        />
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
        <SectionTitleWithHint
          title="Persisted tool activity"
          hint="This shows the tool invocations and output previews the backend kept for the report. It is not guaranteed to include every raw log line."
        />
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
          <DetailSidebarItem label="Execution kind" hint="Whether this report came from a workflow run or an attack-map style execution.">{report.executionKind}</DetailSidebarItem>
          <DetailSidebarItem label="Status" hint="Terminal or in-flight state recorded for the report lifecycle.">{report.status}</DetailSidebarItem>
          <DetailSidebarItem label="Target" hint="Human-readable label of the target asset or scope this report is about.">{report.targetLabel}</DetailSidebarItem>
          <DetailSidebarItem label="Findings" hint="Count of persisted structured findings attached to this report.">{report.findingsCount}</DetailSidebarItem>
          <DetailSidebarItem label="Highest severity" hint="Worst severity among persisted findings.">{report.highestSeverity ?? "none"}</DetailSidebarItem>
          <DetailSidebarItem label="Archived" hint="Archive status only affects list visibility and retention workflow; it does not rewrite report contents.">{isArchived ? new Date(report.archivedAt as string).toLocaleString() : "Active"}</DetailSidebarItem>
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
      <GraphSection report={report} />
      <FindingsSection findings={report.findings} />
      <ToolActivitySection report={report} />
    </DetailPage>
  );
}
