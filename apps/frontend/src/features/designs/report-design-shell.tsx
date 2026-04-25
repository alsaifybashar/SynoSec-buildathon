import type { ComponentType } from "react";
import { Archive, ArrowLeft, Download, Trash2 } from "lucide-react";
import type { ExecutionReportDetail, ExecutionReportFinding, ExecutionReportGraph } from "@synosec/contracts";
import { DetailFieldGroup, DetailPage, DetailSidebarItem } from "@/shared/components/detail-page";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { mockReportDetail } from "@/features/designs/report-mock-detail";

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

function FindingsSection({ findings }: { findings: ExecutionReportFinding[] }) {
  return (
    <DetailFieldGroup title="Findings" className="bg-card/70">
      <div className="col-span-full space-y-3">
        <SectionTitleWithHint
          title="Persisted findings"
          hint="These are the structured issues saved to the report, not every intermediate observation the tools produced."
        />
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
          hint="This shows the tool invocations and output previews the backend kept for the report."
        />
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

export type GraphComponentProps = { graph: ExecutionReportGraph };

export function ReportDesignShell({
  designLabel,
  graphHint,
  GraphComponent
}: {
  designLabel: string;
  graphHint: string;
  GraphComponent: ComponentType<GraphComponentProps>;
}) {
  const report = mockReportDetail;
  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", designLabel]}
      subtitle={report.executionId}
      timestamp={new Date(report.updatedAt).toLocaleString()}
      isDirty={false}
      onBack={() => undefined}
      onSave={() => undefined}
      onDismiss={() => undefined}
      onExportJson={() => undefined}
      actions={(
        <div className="flex flex-wrap items-center gap-2 px-0 py-0">
          <Button type="button" variant="outline" className="h-8 text-[0.72rem]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="button" variant="outline" className="h-8 text-[0.72rem]">
            <Archive className="h-4 w-4" />
            Archive
          </Button>
          <Button type="button" variant="destructive" className="h-8 text-[0.72rem]">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="ml-auto">
            <Button type="button" variant="outline" className="h-8 text-[0.72rem]">
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>
      )}
      sidebar={(
        <>
          <DetailSidebarItem label="Design">{designLabel}</DetailSidebarItem>
          <DetailSidebarItem label="Execution kind">{report.executionKind}</DetailSidebarItem>
          <DetailSidebarItem label="Status">{report.status}</DetailSidebarItem>
          <DetailSidebarItem label="Target">{report.targetLabel}</DetailSidebarItem>
          <DetailSidebarItem label="Findings">{report.findingsCount}</DetailSidebarItem>
          <DetailSidebarItem label="Highest severity">{report.highestSeverity ?? "none"}</DetailSidebarItem>
          <DetailSidebarItem label="Archived">Active</DetailSidebarItem>
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

      <DetailFieldGroup title="Execution Graph" className="bg-card/70">
        <div className="col-span-full space-y-4">
          <SectionTitleWithHint title="Graph structure" hint={graphHint} />
          <GraphComponent graph={report.graph} />
        </div>
      </DetailFieldGroup>

      <FindingsSection findings={report.findings} />
      <ToolActivitySection report={report} />
    </DetailPage>
  );
}
