import { useEffect, useState } from "react";
import {
  apiRoutes,
  type ExecutionReportDetail,
  type ExecutionReportGraph,
  type ListExecutionReportsResponse,
  type WorkflowLaunch,
  type WorkflowRunFindingsResponse
} from "@synosec/contracts";
import { ExecutionReportGraphMap } from "@/features/execution-reports/execution-report-graph";
import { ApiError, fetchJson } from "@/shared/lib/api";
import { buildExecutionGraphFromWorkflowFindings, selectLatestWorkflowLaunchRun } from "@/features/workflows/workflow-graph";

type WorkflowGraphLoadState =
  | { state: "loading" }
  | { state: "empty"; message: string }
  | { state: "error"; message: string }
  | { state: "loaded"; source: "report" | "findings"; graph: ExecutionReportGraph };

export function WorkflowGraphPage({ workflowId }: { workflowId?: string }) {
  const [loadState, setLoadState] = useState<WorkflowGraphLoadState>({ state: "loading" });

  useEffect(() => {
    if (!workflowId) {
      setLoadState({ state: "error", message: "Workflow id is required to load the graph view." });
      return;
    }

    let active = true;

    const load = async () => {
      setLoadState({ state: "loading" });
      try {
        const launch = await fetchJson<WorkflowLaunch>(`${apiRoutes.workflows}/${workflowId}/launches/latest`);
        const latestRun = selectLatestWorkflowLaunchRun(launch);

        if (!latestRun) {
          if (active) {
            setLoadState({ state: "empty", message: "The latest workflow launch has no runs yet." });
          }
          return;
        }

        const reportList = await fetchJson<ListExecutionReportsResponse>(
          `${apiRoutes.executionReports}?page=1&pageSize=100&executionKind=workflow&archived=include&sortBy=generatedAt&sortDirection=desc`
        );
        const reportSummaries = reportList["reports"] ?? [];
        const matchingReport = reportSummaries.find((report) => report.executionId === latestRun.runId) ?? null;

        if (matchingReport) {
          const report = await fetchJson<ExecutionReportDetail>(`${apiRoutes.executionReports}/${matchingReport.id}`);
          if (active) {
            setLoadState({
              state: "loaded",
              source: "report",
              graph: report.graph
            });
          }
          return;
        }

        const findingsResponse = await fetchJson<WorkflowRunFindingsResponse>(
          apiRoutes.workflowRunFindings.replace(":id", latestRun.runId)
        );
        if (active) {
          setLoadState({
            state: "loaded",
            source: "findings",
            graph: buildExecutionGraphFromWorkflowFindings(findingsResponse.findings)
          });
        }
      } catch (error) {
        if (!active) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setLoadState({ state: "empty", message: "No workflow launch exists yet for this workflow." });
          return;
        }

        setLoadState({
          state: "error",
          message: error instanceof Error ? error.message : "Unable to load workflow graph."
        });
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [workflowId]);

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold text-foreground">Workflow Graph</h1>
        {loadState.state === "loaded" ? (
          <span className="rounded-full border border-border/70 bg-background px-2 py-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
            {loadState.source === "report" ? "Source: report graph" : "Source: run findings"}
          </span>
        ) : null}
      </header>

      {loadState.state === "loading" ? (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          Loading latest workflow graph…
        </div>
      ) : null}

      {loadState.state === "empty" ? (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          {loadState.message}
        </div>
      ) : null}

      {loadState.state === "error" ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-6 text-sm text-destructive">
          Failed to load workflow graph: {loadState.message}
        </div>
      ) : null}

      {loadState.state === "loaded" ? (
        <ExecutionReportGraphMap graph={loadState.graph} />
      ) : null}
    </section>
  );
}
