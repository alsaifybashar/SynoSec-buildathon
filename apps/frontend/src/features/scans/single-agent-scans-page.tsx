import { useEffect, useMemo, useState } from "react";
import { Radar, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiAgent,
  type AiTool,
  type Application,
  type AuditEntry,
  type OsiLayer,
  type Runtime,
  type ScanLayerCoverage,
  type SecurityVulnerability,
  type SingleAgentScanCoverageResponse,
  type SingleAgentScanReport,
  type SingleAgentScanTraceResponse,
  type SingleAgentScanVulnerabilitiesResponse,
  type Workflow,
  type WorkflowRun,
  type WorkflowRunStreamMessage
} from "@synosec/contracts";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/components/detail-page";
import { ListPage, type ListPageColumn } from "@/components/list-page";
import { fetchJson } from "@/lib/api";
import { useResourceDetail } from "@/hooks/useResourceDetail";
import { useResourceList } from "@/hooks/useResourceList";
import { aiAgentsResource, aiToolsResource, applicationsResource, runtimesResource, workflowsResource } from "@/lib/resources";
import { Button } from "@/shared/ui/button";

type ViewMode = "report" | "config";
type RunStreamState = "idle" | "connecting" | "connected" | "disconnected";

const layerLabels: Record<OsiLayer, string> = {
  L1: "Physical",
  L2: "Data Link",
  L3: "Network",
  L4: "Transport",
  L5: "Session",
  L6: "Presentation",
  L7: "Application"
};

const workflowStatusLabels: Record<Workflow["status"], string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

const runStatusLabels: Record<WorkflowRun["status"], string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed"
};

const coverageTone: Record<ScanLayerCoverage["coverageStatus"], string> = {
  covered: "text-emerald-700",
  partially_covered: "text-amber-700",
  not_covered: "text-muted-foreground"
};

const singleAgentLayers: OsiLayer[] = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];

function formatTimestamp(value: string | undefined | null) {
  if (!value) {
    return "Unknown";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function matchesSingleAgentWorkflow(workflow: Workflow) {
  return workflow.name.includes("Single-Agent");
}

async function fetchLatestWorkflowRun(workflowId: string) {
  return fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflowId}/runs/latest`);
}

function VulnerabilityList({ vulnerabilities }: { vulnerabilities: SecurityVulnerability[] }) {
  if (vulnerabilities.length === 0) {
    return <p className="text-sm text-muted-foreground">No structured vulnerabilities were recorded for this run.</p>;
  }

  return (
    <div className="space-y-3 lg:col-span-2">
      {vulnerabilities.map((vulnerability) => (
        <div key={vulnerability.id} className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{vulnerability.title}</p>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
              {vulnerability.severity} · {vulnerability.primaryLayer}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{vulnerability.description}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">Impact</p>
              <p className="text-sm text-foreground">{vulnerability.impact}</p>
            </div>
            <div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">Recommendation</p>
              <p className="text-sm text-foreground">{vulnerability.recommendation}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">Evidence</p>
            <ul className="mt-2 space-y-2 text-sm text-foreground">
              {vulnerability.evidence.map((item, index) => (
                <li key={`${vulnerability.id}-evidence-${index}`}>{item.sourceTool}: {item.quote}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

function CoverageGrid({ coverage }: { coverage: ScanLayerCoverage[] }) {
  return (
    <div className="grid gap-3 lg:col-span-2 md:grid-cols-2 xl:grid-cols-3">
      {coverage.map((item) => (
        <div key={item.layer} className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{item.layer} · {layerLabels[item.layer]}</p>
            <span className={`font-mono text-[0.625rem] uppercase tracking-[0.18em] ${coverageTone[item.coverageStatus]}`}>
              {item.coverageStatus.replaceAll("_", " ")}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{item.confidenceSummary}</p>
          {item.gaps.length > 0 ? <p className="mt-3 text-xs text-muted-foreground">Gaps: {item.gaps.join("; ")}</p> : null}
          {item.vulnerabilityIds.length > 0 ? <p className="mt-2 text-xs text-foreground">Vulnerabilities: {item.vulnerabilityIds.length}</p> : null}
        </div>
      ))}
    </div>
  );
}

function AuditTracePanel({ entries }: { entries: AuditEntry[] }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card/70 p-4">
      <div>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.25em] text-muted-foreground">Evidence Trace</p>
        <p className="text-sm text-foreground">Append-only audit records and evidence events for the current workflow run.</p>
      </div>
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit entries recorded yet.</p>
        ) : (
          entries.slice().reverse().map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border/80 bg-background/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{entry.action}</p>
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{entry.actor}</p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-foreground">{JSON.stringify(entry.details, null, 2)}</pre>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function WorkflowConfigPanel({
  workflow,
  applicationName,
  runtimeName,
  agent,
  toolLookup
}: {
  workflow: Workflow;
  applicationName: string;
  runtimeName: string;
  agent: AiAgent | undefined;
  toolLookup: Record<string, string>;
}) {
  const stage = workflow.stages[0];
  const allowedToolIds = stage?.allowedToolIds.length ? stage.allowedToolIds : agent?.toolIds ?? [];

  return (
    <>
      <DetailFieldGroup title="Preconfigured Workflow" className="bg-card/70">
        <DetailField label="Workflow">
          <p className="text-sm text-foreground">{workflow.name}</p>
        </DetailField>
        <DetailField label="Application">
          <p className="text-sm text-foreground">{applicationName}</p>
        </DetailField>
        <DetailField label="Runtime">
          <p className="text-sm text-foreground">{runtimeName}</p>
        </DetailField>
        <DetailField label="Agent">
          <p className="text-sm text-foreground">{agent?.name ?? "Unknown agent"}</p>
        </DetailField>
        <DetailField label="Task" className="lg:col-span-2">
          <p className="text-sm text-foreground">{stage?.objective ?? "No single-agent objective is configured."}</p>
        </DetailField>
        <DetailField label="OSI Layers" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {singleAgentLayers.map((layer) => (
              <span key={layer} className="rounded-full border border-border px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-foreground">
                {layer} · {layerLabels[layer]}
              </span>
            ))}
          </div>
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Agent Contract" className="bg-card/70">
        <DetailField label="System Prompt" className="lg:col-span-2">
          <pre className="whitespace-pre-wrap text-sm text-foreground">{agent?.systemPrompt ?? "No system prompt available."}</pre>
        </DetailField>
        <DetailField label="Approved Tools" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {allowedToolIds.map((toolId) => (
              <span key={toolId} className="rounded-full border border-border px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-foreground">
                {toolLookup[toolId] ?? toolId}
              </span>
            ))}
          </div>
        </DetailField>
      </DetailFieldGroup>
    </>
  );
}

export function SingleAgentScansPage({
  scanId,
  scanNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  scanId?: string;
  scanNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  void onNavigateToCreate;

  const [applications, setApplications] = useState<Application[]>([]);
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<SecurityVulnerability[]>([]);
  const [coverage, setCoverage] = useState<ScanLayerCoverage[]>([]);
  const [traceEntries, setTraceEntries] = useState<AuditEntry[]>([]);
  const [report, setReport] = useState<SingleAgentScanReport | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("report");
  const [runPending, setRunPending] = useState(false);
  const [runStreamState, setRunStreamState] = useState<RunStreamState>("idle");

  const workflowList = useResourceList(workflowsResource);
  const workflowDetail = useResourceDetail(workflowsResource, scanId ?? null);

  useEffect(() => {
    let active = true;

    Promise.all([
      applicationsResource.list({ ...applicationsResource.defaultQuery, pageSize: 100 }),
      runtimesResource.list({ ...runtimesResource.defaultQuery, pageSize: 100 }),
      aiAgentsResource.list({ ...aiAgentsResource.defaultQuery, pageSize: 100 }),
      aiToolsResource.list({ ...aiToolsResource.defaultQuery, pageSize: 100 })
    ])
      .then(([applicationResult, runtimeResult, agentResult, toolResult]) => {
        if (!active) {
          return;
        }
        setApplications(applicationResult.items);
        setRuntimes(runtimeResult.items);
        setAgents(agentResult.items);
        setTools(toolResult.items);
      })
      .catch((error) => {
        toast.error("Failed to load single-agent workflow dependencies", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCurrentRun(null);
    setVulnerabilities([]);
    setCoverage([]);
    setTraceEntries([]);
    setReport(null);
    setRunStreamState("idle");
  }, [scanId]);

  useEffect(() => {
    if (!scanId || workflowDetail.state !== "loaded") {
      return;
    }

    let active = true;
    fetchLatestWorkflowRun(scanId)
      .then((run) => {
        if (active) {
          setCurrentRun(run);
          setViewMode("report");
        }
      })
      .catch(() => {
        if (active) {
          setCurrentRun(null);
        }
      });

    return () => {
      active = false;
    };
  }, [scanId, workflowDetail.state]);

  useEffect(() => {
    if (!currentRun) {
      return;
    }

    let active = true;
    void loadArtifacts(currentRun.id).catch((error) => {
      if (!active) {
        return;
      }

      toast.error("Failed to load workflow run artifacts", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    });
    return () => {
      active = false;
      void active;
    };
  }, [currentRun?.id]);

  useEffect(() => {
    if (!currentRun || currentRun.status !== "running") {
      setRunStreamState("idle");
      return;
    }

    const eventSource = new EventSource(`${apiRoutes.workflowRuns}/${currentRun.id}/events`);
    setRunStreamState("connecting");

    eventSource.onopen = () => {
      setRunStreamState("connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WorkflowRunStreamMessage;
        setCurrentRun(payload.run);
        void loadArtifacts(payload.run.id).catch((error) => {
          toast.error("Failed to refresh workflow run artifacts", {
            description: error instanceof Error ? error.message : "Unknown error"
          });
        });
      } catch {
        setRunStreamState("disconnected");
      }
    };

    eventSource.onerror = () => {
      setRunStreamState("disconnected");
    };

    return () => {
      eventSource.close();
    };
  }, [currentRun?.id, currentRun?.status]);

  const singleAgentWorkflows = workflowList.items.filter(matchesSingleAgentWorkflow);
  const applicationLookup = useMemo(() => Object.fromEntries(applications.map((item) => [item.id, item.name])), [applications]);
  const runtimeLookup = useMemo(() => Object.fromEntries(runtimes.map((item) => [item.id, item.name])), [runtimes]);
  const agentLookup = useMemo(() => Object.fromEntries(agents.map((item) => [item.id, item])), [agents]);
  const toolLookup = useMemo(() => Object.fromEntries(tools.map((item) => [item.id, item.name])), [tools]);

  const columns = useMemo<ListPageColumn<Workflow>[]>(() => [
    { id: "name", header: "Workflow", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { id: "applicationId", header: "Target", cell: (row) => <span className="text-muted-foreground">{applicationLookup[row.applicationId] ?? "Unknown"}</span> },
    { id: "status", header: "Status", cell: (row) => <span className="text-muted-foreground">{workflowStatusLabels[row.status]}</span> },
    { id: "stages", header: "Stages", cell: (row) => <span className="text-muted-foreground">{row.stages.length}</span> }
  ], [applicationLookup]);

  async function loadArtifacts(runId: string) {
    const [vulnerabilityResponse, coverageResponse, traceResponse, reportResponse] = await Promise.all([
      fetchJson<SingleAgentScanVulnerabilitiesResponse>(`${apiRoutes.workflowRuns}/${runId}/vulnerabilities`),
      fetchJson<SingleAgentScanCoverageResponse>(`${apiRoutes.workflowRuns}/${runId}/coverage`),
      fetchJson<SingleAgentScanTraceResponse>(`${apiRoutes.workflowRuns}/${runId}/trace`),
      fetchJson<SingleAgentScanReport>(`${apiRoutes.workflowRuns}/${runId}/report`)
    ]);

    setVulnerabilities(vulnerabilityResponse.vulnerabilities);
    setCoverage(coverageResponse.layers);
    setTraceEntries(traceResponse.entries);
    setReport(reportResponse);
  }

  async function handleStartRun(workflow: Workflow) {
    setRunPending(true);
    setVulnerabilities([]);
    setCoverage([]);
    setTraceEntries([]);
    setReport(null);

    try {
      const run = await fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflow.id}/runs`, { method: "POST" });
      setCurrentRun(run);
      setViewMode("report");
      toast.success("OSI single-agent run started");
    } catch (error) {
      toast.error("Failed to start single-agent workflow run", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRunPending(false);
    }
  }

  async function handleReloadRun(workflowId: string) {
    setRunPending(true);
    try {
      const run = await fetchLatestWorkflowRun(workflowId);
      setCurrentRun(run);
      await loadArtifacts(run.id);
      toast.success("Single-agent workflow run reloaded");
    } catch (error) {
      toast.error("No persisted workflow run found", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRunPending(false);
    }
  }

  if (!scanId) {
    return (
      <ListPage
        title="Single-Agent Runs"
        recordLabel="Workflow"
        columns={columns}
        query={workflowList.query}
        dataState={workflowList.dataState}
        items={singleAgentWorkflows}
        meta={{ ...workflowList.meta, items: singleAgentWorkflows, total: singleAgentWorkflows.length }}
        emptyMessage="No single-agent workflows have been seeded yet."
        onSearchChange={workflowList.setSearch}
        onFilterChange={workflowList.setFilter}
        onSortChange={workflowList.setSort}
        onPageChange={workflowList.setPage}
        onPageSizeChange={workflowList.setPageSize}
        onRetry={workflowList.refetch}
        onRowClick={(row) => onNavigateToDetail(row.id, row.name)}
      />
    );
  }

  if (workflowDetail.state !== "loaded") {
    return (
      <DetailLoadingState
        title={scanNameHint ?? "Single-agent workflow"}
        breadcrumbs={["Start", "Single-Agent Runs", scanNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message="Loading single-agent workflow..."
      />
    );
  }

  const workflow = workflowDetail.item;
  const stage = workflow.stages[0];
  const agent = stage ? agentLookup[stage.agentId] : undefined;
  const applicationName = applicationLookup[workflow.applicationId] ?? "Unknown application";
  const runtimeName = workflow.runtimeId ? (runtimeLookup[workflow.runtimeId] ?? "Unknown runtime") : "No runtime";

  return (
    <DetailPage
      title={workflow.name}
      breadcrumbs={["Start", "Single-Agent Runs", workflow.name]}
      isDirty={false}
      isSaving={runPending}
      onBack={onNavigateToList}
      onSave={() => {}}
      onDismiss={() => {}}
      actions={(
        <>
          <Button type="button" variant="outline" onClick={onNavigateToList} className="h-9 text-[0.75rem]">
            Back
          </Button>
          <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
            <Button type="button" variant={viewMode === "report" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("report")}>
              Report
            </Button>
            <Button type="button" variant={viewMode === "config" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("config")}>
              Config
            </Button>
          </div>
          <div aria-hidden className="mx-1 hidden h-6 w-px bg-border/70 md:block" />
          <Button type="button" onClick={() => void handleStartRun(workflow)} disabled={runPending || currentRun?.status === "running"}>
            <Radar className="h-4 w-4" />
            Start Run
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleReloadRun(workflow.id)} disabled={runPending}>
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        </>
      )}
      subtitle={currentRun ? `Latest run ${currentRun.id.slice(0, 8)}` : workflow.id}
      timestamp={formatTimestamp(currentRun?.completedAt ?? currentRun?.startedAt ?? workflow.updatedAt)}
      sidebar={(
        <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
          <DetailSidebarItem label="Workflow Status">{workflowStatusLabels[workflow.status]}</DetailSidebarItem>
          <DetailSidebarItem label="Run Status">{currentRun ? runStatusLabels[currentRun.status] : "No run recorded"}</DetailSidebarItem>
          <DetailSidebarItem label="Stream">{runStreamState}</DetailSidebarItem>
          <DetailSidebarItem label="Application">{applicationName}</DetailSidebarItem>
          <DetailSidebarItem label="Agent">{agent?.name ?? "Unknown"}</DetailSidebarItem>
          <DetailSidebarItem label="Vulnerabilities">{vulnerabilities.length}</DetailSidebarItem>
        </div>
      )}
      relatedContent={<AuditTracePanel entries={traceEntries} />}
    >
      {viewMode === "config" ? (
        <WorkflowConfigPanel
          workflow={workflow}
          applicationName={applicationName}
          runtimeName={runtimeName}
          agent={agent}
          toolLookup={toolLookup}
        />
      ) : (
        <>
          <DetailFieldGroup title="Run Summary" className="bg-card/70">
            <DetailField label="Executive Summary" className="lg:col-span-2">
              <p className="text-sm text-foreground">{report?.executiveSummary ?? "No report available for the latest run."}</p>
            </DetailField>
            <DetailField label="Total vulnerabilities">
              <p className="text-sm text-foreground">{report?.totalVulnerabilities ?? 0}</p>
            </DetailField>
            <DetailField label="Run State">
              <p className="text-sm text-foreground">{currentRun ? runStatusLabels[currentRun.status] : "No run recorded"}</p>
            </DetailField>
          </DetailFieldGroup>

          <DetailFieldGroup title="Vulnerabilities" className="bg-card/70">
            <VulnerabilityList vulnerabilities={vulnerabilities} />
          </DetailFieldGroup>

          <DetailFieldGroup title="Layer Coverage" className="bg-card/70">
            <CoverageGrid coverage={coverage} />
          </DetailFieldGroup>
        </>
      )}
    </DetailPage>
  );
}
