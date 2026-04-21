import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, RefreshCcw, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiAgent,
  type AiProvider,
  type AiTool,
  type Application,
  type Runtime,
  type Workflow,
  type WorkflowRun,
  type WorkflowRunStreamMessage,
  type WorkflowStatus
} from "@synosec/contracts";
import { fetchJson } from "@/lib/api";
import { useResourceDetail } from "@/hooks/useResourceDetail";
import { useResourceList } from "@/hooks/useResourceList";
import { aiAgentsResource, aiProvidersResource, aiToolsResource, applicationsResource, runtimesResource, workflowsResource } from "@/lib/resources";
import { exportResourceRecords, importResourceRecords, workflowTransfer } from "@/lib/resource-transfer";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/components/list-page";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import {
  createEmptyFormValues,
  createStage,
  definedFieldError,
  toWorkflowFormValues,
  toWorkflowRequestBody,
  type WorkflowFormStage,
  type WorkflowFormValues,
  validateWorkflowForm
} from "@/features/workflows/workflow-form";
import { WorkflowTraceSection } from "@/features/workflows/workflow-trace-section";
import { formatTimestamp, type RunAction, type RunStreamState } from "@/features/workflows/workflow-trace";

const statusLabels: Record<WorkflowStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

async function fetchLatestWorkflowRun(workflowId: string) {
  return fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflowId}/runs/latest`);
}

function isDirtyForm(formValues: WorkflowFormValues, initialValues: WorkflowFormValues) {
  return JSON.stringify(formValues) !== JSON.stringify(initialValues);
}

function WorkflowEditModal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">Workflow Edit</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
          </div>
          <Button type="button" variant="outline" onClick={onClose} className="h-9 text-[0.75rem]">
            Close
          </Button>
        </div>
        <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function WorkflowConfigEditor({
  formValues,
  errors,
  applications,
  agents,
  agentLookup,
  toolLookup,
  filteredRuntimes,
  onFieldChange,
  onStageChange,
  onMoveStage,
  onRemoveStage,
  onAddStage
}: {
  formValues: WorkflowFormValues;
  errors: Record<string, string>;
  applications: Application[];
  agents: AiAgent[];
  agentLookup: Record<string, AiAgent>;
  toolLookup: Record<string, string>;
  filteredRuntimes: Runtime[];
  onFieldChange: <Key extends keyof WorkflowFormValues>(field: Key, value: WorkflowFormValues[Key]) => void;
  onStageChange: (index: number, nextStage: WorkflowFormStage) => void;
  onMoveStage: (index: number, direction: -1 | 1) => void;
  onRemoveStage: (index: number) => void;
  onAddStage: () => void;
}) {
  return (
    <>
      <DetailFieldGroup title="Workflow Configuration" className="bg-card/70">
        <DetailField label="Name" required {...definedFieldError(errors["name"])}>
          <Input value={formValues.name} onChange={(event) => onFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>
        <DetailField label="Status" required>
          <Select value={formValues.status} onValueChange={(value) => onFieldChange("status", value as WorkflowStatus)}>
            <SelectTrigger aria-label="Status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Application" required {...definedFieldError(errors["applicationId"])}>
          <Select value={formValues.applicationId} onValueChange={(value) => onFieldChange("applicationId", value)}>
            <SelectTrigger aria-label="Application">
              <SelectValue placeholder="Select application" />
            </SelectTrigger>
            <SelectContent>
              {applications.map((application) => (
                <SelectItem key={application.id} value={application.id}>{application.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Runtime">
          <Select value={formValues.runtimeId || "__none__"} onValueChange={(value) => onFieldChange("runtimeId", value === "__none__" ? "" : value)}>
            <SelectTrigger aria-label="Runtime">
              <SelectValue placeholder="Select runtime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No runtime</SelectItem>
              {filteredRuntimes.map((runtime) => (
                <SelectItem key={runtime.id} value={runtime.id}>{runtime.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Description" className="md:col-span-2">
          <Textarea value={formValues.description} onChange={(event) => onFieldChange("description", event.target.value)} aria-label="Description" rows={4} />
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Stages" className="bg-card/70">
        <div className="space-y-3 md:col-span-2">
          {formValues.stages.map((stage, index) => {
            const agent = agentLookup[stage.agentId];
            const inheritedTools = agent?.toolIds.map((toolId) => toolLookup[toolId] ?? toolId).join(", ") ?? "No tools assigned";

            return (
              <div key={stage.id} className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Stage {index + 1}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onMoveStage(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onMoveStage(index, 1)} disabled={index === formValues.stages.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onRemoveStage(index)} disabled={formValues.stages.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <DetailField label="Stage label" required {...definedFieldError(errors[`stage-${index}-label`])}>
                    <Input
                      value={stage.label}
                      onChange={(event) => onStageChange(index, { ...stage, label: event.target.value })}
                      aria-label={`Stage ${index + 1} label`}
                    />
                  </DetailField>
                  <DetailField label="Agent" required {...definedFieldError(errors[`stage-${index}-agentId`])}>
                    <Select value={stage.agentId} onValueChange={(value) => onStageChange(index, { ...stage, agentId: value })}>
                      <SelectTrigger aria-label={`Stage ${index + 1} agent`}>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agentOption) => (
                          <SelectItem key={agentOption.id} value={agentOption.id}>{agentOption.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DetailField>
                </div>

                <div className="space-y-1">
                  <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">Inherited tools</p>
                  <p className="text-sm text-foreground">{inheritedTools}</p>
                </div>
              </div>
            );
          })}

          {errors["stages"] ? <p className="text-xs text-destructive">{errors["stages"]}</p> : null}

          <Button type="button" variant="outline" onClick={onAddStage}>
            Add Stage
          </Button>
        </div>
      </DetailFieldGroup>
    </>
  );
}

export function WorkflowsPage({
  workflowId,
  workflowNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  workflowId?: string;
  workflowNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [formValues, setFormValues] = useState<WorkflowFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<WorkflowFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);
  const [runPending, setRunPending] = useState(false);
  const [runAction, setRunAction] = useState<RunAction>(null);
  const [runStreamState, setRunStreamState] = useState<RunStreamState>("idle");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const isCreateMode = workflowId === "new";
  const workflowList = useResourceList(workflowsResource);
  const workflowDetail = useResourceDetail(workflowsResource, workflowId && workflowId !== "new" ? workflowId : null);

  useEffect(() => {
    let active = true;

    Promise.all([
      applicationsResource.list({ ...applicationsResource.defaultQuery, pageSize: 100 }),
      runtimesResource.list({ ...runtimesResource.defaultQuery, pageSize: 100 }),
      aiAgentsResource.list({ ...aiAgentsResource.defaultQuery, pageSize: 100 }),
      aiProvidersResource.list({ ...aiProvidersResource.defaultQuery, pageSize: 100 }),
      aiToolsResource.list({ ...aiToolsResource.defaultQuery, pageSize: 100 })
    ])
      .then(([applicationsResult, runtimesResult, agentsResult, providersResult, toolsResult]) => {
        if (!active) {
          return;
        }

        setApplications(applicationsResult.items);
        setRuntimes(runtimesResult.items);
        setAgents(agentsResult.items);
        setProviders(providersResult.items);
        setTools(toolsResult.items);

        setFormValues((current) => {
          const defaultApplicationId = current.applicationId || applicationsResult.items[0]?.id || "";
          const defaultAgentId = current.stages[0]?.agentId || agentsResult.items[0]?.id || "";

          return {
            ...current,
            applicationId: defaultApplicationId,
            stages: current.stages.length
              ? current.stages.map((stage) => ({ ...stage, agentId: stage.agentId || defaultAgentId }))
              : [createStage(defaultAgentId)]
          };
        });
      })
      .catch((error) => {
        toast.error("Failed to load workflow dependencies", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!workflowId) {
      return;
    }

    if (workflowId === "new") {
      const nextValues = createEmptyFormValues(applications[0]?.id ?? "", "", agents[0]?.id ?? "");
      setWorkflow(null);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      setCurrentRun(null);
      setRunAction(null);
      setRunStreamState("idle");
      setEditModalOpen(false);
      setErrors({});
      return;
    }

    if (workflowDetail.state === "error") {
      toast.error("Workflow not found", { description: workflowDetail.message });
      onNavigateToList();
      return;
    }

    if (workflowDetail.state !== "loaded") {
      const nextValues = createEmptyFormValues(applications[0]?.id ?? "", "", agents[0]?.id ?? "");
      setWorkflow(null);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      setCurrentRun(null);
      setRunAction(null);
      setRunStreamState("idle");
      setEditModalOpen(false);
      setErrors({});
      return;
    }

    const nextValues = toWorkflowFormValues(workflowDetail.item);
    setWorkflow(workflowDetail.item);
    setFormValues(nextValues);
    setInitialValues(nextValues);
    setRunAction(null);
    setRunStreamState("idle");
    setEditModalOpen(false);
    setErrors({});
  }, [workflowDetail, workflowId, onNavigateToList, applications, agents]);

  useEffect(() => {
    if (!workflow || isCreateMode) {
      setCurrentRun(null);
      return;
    }

    let active = true;

    fetchLatestWorkflowRun(workflow.id)
      .then((run) => {
        if (active) {
          setCurrentRun(run);
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
  }, [workflow, isCreateMode]);

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

  const applicationLookup = useMemo(() => Object.fromEntries(applications.map((item) => [item.id, item.name])), [applications]);
  const agentLookup = useMemo(() => Object.fromEntries(agents.map((item) => [item.id, item])), [agents]);
  const toolLookup = useMemo(() => Object.fromEntries(tools.map((item) => [item.id, item.name])), [tools]);
  const providerLookup = useMemo(() => Object.fromEntries(providers.map((item) => [item.id, item])), [providers]);
  const filteredRuntimes = useMemo(
    () => runtimes.filter((runtime) => !formValues.applicationId || runtime.applicationId === formValues.applicationId),
    [formValues.applicationId, runtimes]
  );

  const columns = useMemo<ListPageColumn<Workflow>[]>(() => [
    { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { id: "applicationId", header: "Target", cell: (row) => <span className="text-muted-foreground">{applicationLookup[row.applicationId] ?? "Unknown"}</span> },
    { id: "status", header: "Status", cell: (row) => <span className="text-muted-foreground">{statusLabels[row.status]}</span> },
    { id: "stages", header: "Stages", cell: (row) => <span className="text-muted-foreground">{row.stages.length}</span> }
  ], [applicationLookup]);

  const filters = useMemo<ListPageFilter[]>(() => [
    {
      id: "status",
      label: "Filter by workflow status",
      placeholder: "Filter by status",
      allLabel: "All statuses",
      options: Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
    }
  ], []);

  const isDirty = isDirtyForm(formValues, initialValues);

  function handleFieldChange<Key extends keyof WorkflowFormValues>(field: Key, value: WorkflowFormValues[Key]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[String(field)];
      return next;
    });
  }

  function handleStageChange(index: number, nextStage: WorkflowFormStage) {
    setFormValues((current) => ({
      ...current,
      stages: current.stages.map((stage, stageIndex) => stageIndex === index ? nextStage : stage)
    }));
  }

  function moveStage(index: number, direction: -1 | 1) {
    setFormValues((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.stages.length) {
        return current;
      }

      const stages = current.stages.slice();
      const [stage] = stages.splice(index, 1);
      if (!stage) {
        return current;
      }

      stages.splice(nextIndex, 0, stage);
      return { ...current, stages };
    });
  }

  function addStage() {
    setFormValues((current) => ({
      ...current,
      stages: [...current.stages, createStage(agents[0]?.id ?? "")]
    }));
  }

  function removeStage(index: number) {
    setFormValues((current) => ({
      ...current,
      stages: current.stages.filter((_, stageIndex) => stageIndex !== index)
    }));
  }

  async function handleSave() {
    const nextErrors = validateWorkflowForm(formValues);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Validation failed", { description: "Fix the highlighted workflow fields before saving." });
      return false;
    }

    setSaving(true);

    try {
      const body = JSON.stringify(toWorkflowRequestBody(formValues));

      if (isCreateMode || !workflow) {
        const created = await fetchJson<Workflow>(apiRoutes.workflows, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        toast.success("Workflow created");
        workflowList.refetch();
        onNavigateToDetail(created.id, created.name);
        return true;
      }

      const updated = await fetchJson<Workflow>(`${apiRoutes.workflows}/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body
      });

      const nextValues = toWorkflowFormValues(updated);
      setWorkflow(updated);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      workflowList.refetch();
      toast.success("Workflow updated");
      return true;
    } catch (error) {
      toast.error("Workflow request failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleStartRun() {
    if (!workflow) {
      return;
    }

    setRunPending(true);
    setRunAction("starting");
    try {
      const run = await fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflow.id}/runs`, { method: "POST" });
      setCurrentRun(run);
      toast.success("Workflow run started");
    } catch (error) {
      toast.error("Failed to start workflow run", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRunPending(false);
      setRunAction(null);
    }
  }

  async function handleNextStep() {
    if (!currentRun) {
      return;
    }

    setRunPending(true);
    setRunAction("stepping");
    try {
      const run = await fetchJson<WorkflowRun>(`${apiRoutes.workflowRuns}/${currentRun.id}/step`, { method: "POST" });
      setCurrentRun(run);
      toast.success(run.status === "completed" ? "Workflow run completed" : "Workflow step completed");
    } catch (error) {
      toast.error("Failed to advance workflow run", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRunPending(false);
      setRunAction(null);
    }
  }

  async function handleReloadRun() {
    setCurrentRun(null);
    setRunStreamState("idle");
    setRunAction(null);
    setRunPending(false);
    toast.success("Workflow run reset");
  }

  function handleExportJson() {
    if (!workflow) {
      return;
    }

    exportResourceRecords(workflowTransfer, [workflow], `workflow-${workflow.name}`);
  }

  async function handleImportJson(file: File) {
    try {
      const created = await importResourceRecords(workflowTransfer, file);
      toast.success(created.length === 1 ? "Workflow imported" : `${created.length} workflows imported`);
      workflowList.refetch();
    } catch (error) {
      toast.error("Workflow import failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  if (!workflowId) {
    return (
      <ListPage
        title="Workflows"
        recordLabel="Workflow"
        columns={columns}
        query={workflowList.query}
        dataState={workflowList.dataState}
        items={workflowList.items}
        meta={workflowList.meta}
        filters={filters}
        emptyMessage="No workflows have been configured yet."
        onSearchChange={workflowList.setSearch}
        onFilterChange={workflowList.setFilter}
        onSortChange={workflowList.setSort}
        onPageChange={workflowList.setPage}
        onPageSizeChange={workflowList.setPageSize}
        onRetry={workflowList.refetch}
        onAddRecord={onNavigateToCreate}
        onRowClick={(row) => onNavigateToDetail(row.id, row.name)}
        onImportJson={handleImportJson}
      />
    );
  }

  if (!isCreateMode && workflowDetail.state !== "loaded") {
    return (
      <DetailLoadingState
        title={workflowNameHint ?? "Workflow detail"}
        breadcrumbs={["Start", "Workflows", workflowNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message="Loading workflow..."
      />
    );
  }

  const workflowAgent = workflow?.stages[0] ? agentLookup[workflow.stages[0].agentId] : null;
  const workflowProvider = workflowAgent ? providerLookup[workflowAgent.providerId] : null;
  const effectiveModel = workflowAgent?.modelOverride ?? workflowProvider?.model ?? "Unknown model";
  const approvedToolCount = workflow?.stages[0]
    ? (workflow.stages[0].allowedToolIds.length > 0 ? workflow.stages[0].allowedToolIds.length : workflowAgent?.toolIds.length ?? 0)
    : 0;
  const runSummaryDescription = workflow?.stages[0]?.objective ?? "Run the configured workflow against the selected target with the approved tools.";
  const visibleToolIds = workflow?.stages[0]
    ? (workflow.stages[0].allowedToolIds.length > 0 ? workflow.stages[0].allowedToolIds : workflowAgent?.toolIds ?? [])
    : [];
  const visibleToolNames = visibleToolIds.map((toolId: string) => toolLookup[toolId] ?? toolId);

  return (
    <>
      <DetailPage
      title={isCreateMode ? "New workflow" : workflow?.name ?? "Workflow detail"}
      breadcrumbs={["Start", "Workflows", isCreateMode ? "New" : workflow?.name ?? "Detail"]}
      isDirty={isDirty}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={() => {
        void handleSave();
      }}
      onDismiss={() => {
        setFormValues(initialValues);
        setErrors({});
      }}
      actions={(
        <>
          <Button type="button" variant="outline" onClick={onNavigateToList} className="h-9 text-[0.75rem]">
            Back
          </Button>
          {!isCreateMode ? (
            <Button type="button" variant="outline" onClick={handleExportJson} className="h-9 text-[0.75rem]">
              Export JSON
            </Button>
          ) : null}
          <div aria-hidden className="mx-1 hidden h-6 w-px bg-border/70 md:block" />
          {isCreateMode ? (
            <>
              <Button type="button" onClick={() => void handleSave()} disabled={!isDirty || saving} className="h-9 text-[0.75rem]">
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setFormValues(initialValues);
                setErrors({});
              }} disabled={!isDirty || saving} className="h-9 text-[0.75rem]">
                Dismiss
              </Button>
            </>
          ) : (
            <>
              <Button type="button" onClick={handleStartRun} disabled={!workflow || runPending}>
                <WorkflowIcon className="h-4 w-4" />
                Start Run
              </Button>
              <Button type="button" variant="outline" onClick={handleReloadRun} disabled={!workflow || runPending}>
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(true)} disabled={!workflow}>
                <Pencil className="h-4 w-4" />
                Edit Workflow
              </Button>
            </>
          )}
        </>
      )}
      sidebar={workflow ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
          <DetailSidebarItem label="Status">{statusLabels[workflow.status]}</DetailSidebarItem>
          <DetailSidebarItem label="Target">{applicationLookup[workflow.applicationId] ?? "Unknown"}</DetailSidebarItem>
          <DetailSidebarItem label="Stages">{workflow.stages.length}</DetailSidebarItem>
          <DetailSidebarItem label="Current Run">
            {currentRun ? `${currentRun.status} · ${currentRun.trace.length} traced` : "No active run"}
          </DetailSidebarItem>
          <DetailSidebarItem label="Updated">{formatTimestamp(workflow.updatedAt)}</DetailSidebarItem>
        </div>
      ) : undefined}
      relatedContent={!isCreateMode ? (
        <WorkflowTraceSection
          workflow={workflow}
          applications={applications}
          runtimes={runtimes}
          agents={agents}
          tools={tools}
          run={currentRun}
          running={runPending || currentRun?.status === "running"}
          summaryCard={{
            toolCount: approvedToolCount,
            toolNames: visibleToolNames
          }}
        />
      ) : null}
    >
      {isCreateMode ? (
        <WorkflowConfigEditor
          formValues={formValues}
          errors={errors}
          applications={applications}
          agents={agents}
          agentLookup={agentLookup}
          toolLookup={toolLookup}
          filteredRuntimes={filteredRuntimes}
          onFieldChange={handleFieldChange}
          onStageChange={handleStageChange}
          onMoveStage={moveStage}
          onRemoveStage={removeStage}
          onAddStage={addStage}
        />
      ) : (
        <DetailFieldGroup title="Run Snapshot" className="bg-card/70">
          <div className="space-y-3 md:col-span-2">
            <p className="text-sm leading-6 text-foreground">{runSummaryDescription}</p>
            <div className="flex flex-wrap gap-2">
              {[
                `stream · ${runStreamState}`,
                `model · ${effectiveModel}`,
                `target · ${workflow ? (applicationLookup[workflow.applicationId] ?? "Unknown application") : "Unknown application"}`,
                `runtime · ${workflow?.runtimeId ? (runtimes.find((item) => item.id === workflow.runtimeId)?.name ?? "Unknown runtime") : "No runtime"}`,
                `${approvedToolCount} tools`
              ].map((label) => (
                <span key={label} className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-foreground/85">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </DetailFieldGroup>
      )}
      </DetailPage>
      {!isCreateMode && workflow ? (
        <WorkflowEditModal
          open={editModalOpen}
          title={workflow.name}
          onClose={() => {
            setEditModalOpen(false);
            setFormValues(initialValues);
            setErrors({});
          }}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormValues(initialValues);
                  setErrors({});
                  setEditModalOpen(false);
                }}
                disabled={!isDirty || saving}
              >
                Dismiss
              </Button>
              <Button
                type="button"
                onClick={() => void handleSave().then((saved) => {
                  if (saved) {
                    setEditModalOpen(false);
                  }
                })}
                disabled={!isDirty || saving}
              >
                Save
              </Button>
            </div>
            <WorkflowConfigEditor
              formValues={formValues}
              errors={errors}
              applications={applications}
              agents={agents}
              agentLookup={agentLookup}
              toolLookup={toolLookup}
              filteredRuntimes={filteredRuntimes}
              onFieldChange={handleFieldChange}
              onStageChange={handleStageChange}
              onMoveStage={moveStage}
              onRemoveStage={removeStage}
              onAddStage={addStage}
            />
          </div>
        </WorkflowEditModal>
      ) : null}
    </>
  );
}
