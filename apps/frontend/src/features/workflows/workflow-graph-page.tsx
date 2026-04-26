import { useEffect, useMemo, useState } from "react";
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

type GraphNodeKind = ExecutionReportGraph["nodes"][number]["kind"];
type GraphEdgeKind = ExecutionReportGraph["edges"][number]["kind"];

function summarizeGraph(graph: ExecutionReportGraph) {
  const nodeCountByKind: Record<GraphNodeKind, number> = {
    evidence: 0,
    finding: 0,
    chain: 0
  };
  const edgeCountByKind: Record<GraphEdgeKind, number> = {
    supports: 0,
    derived_from: 0,
    correlates_with: 0,
    enables: 0
  };

  for (const node of graph.nodes) {
    nodeCountByKind[node.kind] += 1;
  }
  for (const edge of graph.edges) {
    edgeCountByKind[edge.kind] += 1;
  }

  const evidenceNodes = graph.nodes.filter((node) => node.kind === "evidence");
  const findingNodes = graph.nodes.filter((node) => node.kind === "finding");
  const chainNodes = graph.nodes.filter((node) => node.kind === "chain");

  return {
    nodeCountByKind,
    edgeCountByKind,
    evidenceNodes,
    findingNodes,
    chainNodes
  };
}

export function WorkflowGraphPage({ workflowId }: { workflowId?: string }) {
  const [loadState, setLoadState] = useState<WorkflowGraphLoadState>({ state: "loading" });
  const graphSummary = useMemo(
    () => loadState.state === "loaded" ? summarizeGraph(loadState.graph) : null,
    [loadState]
  );

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
        <div className="space-y-6">
          <ExecutionReportGraphMap graph={loadState.graph} />

          <section className="rounded-xl border border-border bg-card/60 px-4 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">Inspector Models</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <article className="rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Evidence Timeline</p>
                <p className="mt-2 text-sm text-foreground/90">
                  Review tool-anchored evidence first, then inspect which findings each signal supports.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Nodes: {graphSummary?.nodeCountByKind.evidence ?? 0} evidence · {graphSummary?.edgeCountByKind.supports ?? 0} supports edges
                </p>
              </article>

              <article className="rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Finding Focus</p>
                <p className="mt-2 text-sm text-foreground/90">
                  Center findings and validate derived, correlated, and enables relationships for pivot analysis.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Nodes: {graphSummary?.nodeCountByKind.finding ?? 0} findings · {(graphSummary?.edgeCountByKind.derived_from ?? 0) + (graphSummary?.edgeCountByKind.correlates_with ?? 0) + (graphSummary?.edgeCountByKind.enables ?? 0)} relationship edges
                </p>
              </article>

              <article className="rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Chain Path</p>
                <p className="mt-2 text-sm text-foreground/90">
                  Follow chain nodes to validate multi-step progression and related finding groups.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Nodes: {graphSummary?.nodeCountByKind.chain ?? 0} chain · {graphSummary?.edgeCountByKind.enables ?? 0} enables edges
                </p>
              </article>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card/60 px-4 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">Node Modeling</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 px-2 py-1">evidence: {graphSummary?.nodeCountByKind.evidence ?? 0}</span>
              <span className="rounded-full border border-border/70 px-2 py-1">finding: {graphSummary?.nodeCountByKind.finding ?? 0}</span>
              <span className="rounded-full border border-border/70 px-2 py-1">chain: {graphSummary?.nodeCountByKind.chain ?? 0}</span>
              <span className="rounded-full border border-border/70 px-2 py-1">supports: {graphSummary?.edgeCountByKind.supports ?? 0}</span>
              <span className="rounded-full border border-border/70 px-2 py-1">derived: {graphSummary?.edgeCountByKind.derived_from ?? 0}</span>
              <span className="rounded-full border border-border/70 px-2 py-1">correlates: {graphSummary?.edgeCountByKind.correlates_with ?? 0}</span>
              <span className="rounded-full border border-border/70 px-2 py-1">enables: {graphSummary?.edgeCountByKind.enables ?? 0}</span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <article className="rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Evidence Nodes</p>
                <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
                  {(graphSummary?.evidenceNodes ?? []).slice(0, 6).map((node) => (
                    <li key={node.id} className="rounded border border-border/60 px-2 py-1">
                      {node.title}
                    </li>
                  ))}
                  {(graphSummary?.evidenceNodes.length ?? 0) === 0 ? <li className="text-muted-foreground">No evidence nodes.</li> : null}
                </ul>
              </article>

              <article className="rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Finding Nodes</p>
                <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
                  {(graphSummary?.findingNodes ?? []).slice(0, 6).map((node) => (
                    <li key={node.id} className="rounded border border-border/60 px-2 py-1">
                      {node.title}
                    </li>
                  ))}
                  {(graphSummary?.findingNodes.length ?? 0) === 0 ? <li className="text-muted-foreground">No finding nodes.</li> : null}
                </ul>
              </article>

              <article className="rounded-lg border border-border/70 bg-background/40 px-3 py-3">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Chain Nodes</p>
                <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
                  {(graphSummary?.chainNodes ?? []).slice(0, 6).map((node) => (
                    <li key={node.id} className="rounded border border-border/60 px-2 py-1">
                      {node.title}
                    </li>
                  ))}
                  {(graphSummary?.chainNodes.length ?? 0) === 0 ? <li className="text-muted-foreground">No chain nodes.</li> : null}
                </ul>
              </article>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
