import { useState } from "react";
import { Archive, ArrowLeft, Download, Trash2 } from "lucide-react";
import {
  apiRoutes,
  type ExecutionReportDetail,
  type ExecutionReportFinding,
  type ExecutionReportSummary,
  type ExecutionReportStatus
} from "@synosec/contracts";
import { toast } from "sonner";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { useResourceList } from "@/shared/hooks/use-resource-list";
import { DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/shared/components/detail-page";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
import { Button } from "@/shared/ui/button";
import { ExecutionReportGraphMap } from "@/features/execution-reports/execution-report-graph";
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

function GraphSection({ report }: { report: ExecutionReportDetail }) {
  return (
    <DetailFieldGroup title="Execution Graph" className="bg-card/70">
      <div className="col-span-full space-y-4">
        <SectionTitleWithHint
          title="Graph structure"
          hint="Nodes capture persisted evidence or findings. Edges explain how one node supports or relates to another."
        />
        <ExecutionReportGraphMap graph={report.graph} />
      </div>
    </DetailFieldGroup>
  );
}

function scrollToToolActivity(toolRunRef: string) {
  document.getElementById(`tool-activity-${toolRunRef}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function relationshipLabel(kind: "derived" | "related" | "enables") {
  switch (kind) {
    case "derived":
      return "Derived from";
    case "related":
      return "Related to";
    case "enables":
      return "Enables";
  }
}

function FindingRelationshipRail({
  title,
  explanation,
  findingIds,
  findingLookup
}: {
  title: string;
  explanation: string | null | undefined;
  findingIds: string[];
  findingLookup: Map<string, ExecutionReportFinding>;
}) {
  if (findingIds.length === 0 && !explanation) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-3">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      {explanation ? <p className="text-sm leading-6 text-foreground/85">{explanation}</p> : null}
      {findingIds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {findingIds.map((findingId) => {
            const related = findingLookup.get(findingId);
            return (
              <span key={findingId} className="rounded-full border border-border/70 px-2 py-1 text-[0.72rem] text-muted-foreground">
                {related ? related.title : findingId}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FindingsSection({ report }: { report: ExecutionReportDetail }) {
  const findingLookup = new Map(report.findings.map((finding) => [finding.id, finding]));

  return (
    <DetailFieldGroup title="Findings" className="bg-card/70">
      <div className="col-span-full space-y-3">
        <SectionTitleWithHint
          title="Persisted findings"
          hint="These are the structured issues saved to the report, not every intermediate observation the tools produced."
        />
        {report.findings.length === 0 ? <p className="text-sm text-muted-foreground">No structured findings were reported for this execution.</p> : null}
        {report.findings.map((finding) => (
          <details key={finding.id} className="rounded-xl border border-border bg-background/50 px-4 py-4" open>
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">{finding.severity}</span>
                <span>{finding.type}</span>
                <span>{finding.targetLabel}</span>
                {finding.validationStatus ? (
                  <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">{finding.validationStatus.replaceAll("_", " ")}</span>
                ) : null}
                {finding.confidence !== null ? (
                  <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">
                    conf {finding.confidence.toFixed(2)}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{finding.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{finding.summary}</p>
            </summary>

            <div className="mt-4 space-y-4 border-t border-border/70 pt-4">
              {finding.explanationSummary ? (
                <div className="space-y-2">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Why this finding exists</p>
                  <p className="text-sm leading-6 text-foreground/85">{finding.explanationSummary}</p>
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Evidence</p>
                <div className="space-y-3">
                  {finding.evidence.map((evidence, index) => (
                    <div key={`${finding.id}:evidence:${index}`} className="rounded-lg border border-border/70 bg-background/40 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-[0.72rem] text-muted-foreground">
                        <span className="rounded-full border border-border/70 px-2 py-1">{evidence.sourceTool}</span>
                        {evidence.toolRunRef ? (
                          <button
                            type="button"
                            className="rounded-full border border-border/70 px-2 py-1 transition hover:border-foreground/40 hover:text-foreground"
                            onClick={() => scrollToToolActivity(evidence.toolRunRef as string)}
                          >
                            tool:{evidence.toolRunRef}
                          </button>
                        ) : null}
                        {evidence.observationRef ? <span className="rounded-full border border-border/70 px-2 py-1">obs:{evidence.observationRef}</span> : null}
                        {evidence.artifactRef ? <span className="rounded-full border border-border/70 px-2 py-1">artifact:{evidence.artifactRef}</span> : null}
                      </div>
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{evidence.quote}</pre>
                    </div>
                  ))}
                </div>
              </div>

              {finding.derivedFromFindingIds.length > 0
                || finding.relatedFindingIds.length > 0
                || finding.enablesFindingIds.length > 0
                || finding.relationshipExplanations
                || finding.chain ? (
                <div className="space-y-3">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Relationships</p>
                  <FindingRelationshipRail
                    title={relationshipLabel("derived")}
                    explanation={finding.relationshipExplanations?.derivedFrom}
                    findingIds={finding.derivedFromFindingIds}
                    findingLookup={findingLookup}
                  />
                  <FindingRelationshipRail
                    title={relationshipLabel("related")}
                    explanation={finding.relationshipExplanations?.relatedTo}
                    findingIds={finding.relatedFindingIds}
                    findingLookup={findingLookup}
                  />
                  <FindingRelationshipRail
                    title={relationshipLabel("enables")}
                    explanation={finding.relationshipExplanations?.enables}
                    findingIds={finding.enablesFindingIds}
                    findingLookup={findingLookup}
                  />
                  {finding.chain ? (
                    <div className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-3">
                      <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Attack path</p>
                      <p className="text-sm font-semibold text-foreground">{finding.chain.title}</p>
                      <p className="text-sm leading-6 text-muted-foreground">{finding.chain.summary}</p>
                      {finding.relationshipExplanations?.chainRole ? (
                        <span className="inline-flex rounded-full border border-border/70 px-2 py-1 text-[0.72rem] text-muted-foreground">
                          role: {finding.relationshipExplanations.chainRole}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {finding.validationStatus || finding.confidenceReason || finding.reproduction ? (
                <div className="space-y-3">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Verification</p>
                  <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-[0.72rem] text-muted-foreground">
                      {finding.validationStatus ? (
                        <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">
                          {finding.validationStatus.replaceAll("_", " ")}
                        </span>
                      ) : null}
                      {finding.confidence !== null ? (
                        <span className="rounded-full border border-border/70 px-2 py-1 font-mono uppercase tracking-[0.16em]">
                          conf {finding.confidence.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                    {finding.confidenceReason ? <p className="mt-3 text-sm leading-6 text-foreground/85">{finding.confidenceReason}</p> : null}
                    {finding.reproduction ? (
                      <div className="mt-3 space-y-2">
                        {finding.reproduction.commandPreview ? (
                          <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{finding.reproduction.commandPreview}</pre>
                        ) : null}
                        <ol className="space-y-2 text-sm text-muted-foreground">
                          {finding.reproduction.steps.map((step, index) => (
                            <li key={`${finding.id}:step:${index}`}>{index + 1}. {step}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {finding.recommendation ? (
                <div className="space-y-2">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Recommendation</p>
                  <p className="text-sm leading-6 text-foreground/85">{finding.recommendation}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
                {finding.sourceToolIds.map((toolId) => (
                  <span key={toolId} className="rounded-full border border-border/70 px-2 py-1">{toolId}</span>
                ))}
              </div>
            </div>
          </details>
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
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [mutating, setMutating] = useState(false);
  const detail = useResourceDetail(executionReportsResource, reportId ?? null, detailReloadToken);

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
      subtitle={report.executionId}
      timestamp={new Date(report.updatedAt).toLocaleString()}
      isDirty={false}
      onBack={onNavigateToList}
      onSave={() => undefined}
      onDismiss={() => undefined}
      onExportJson={() => {
        void handleDetailExport(report.id);
      }}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleDetailExport(report.id);
              }}
              className="h-8 text-[0.72rem]"
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
      <FindingsSection report={report} />
      <ToolActivitySection report={report} />
    </DetailPage>
  );
}
