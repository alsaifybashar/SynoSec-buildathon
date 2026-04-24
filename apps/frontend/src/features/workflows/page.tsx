import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Download, ExternalLink, Pencil, Undo2, Workflow as WorkflowIcon } from "lucide-react";
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
  type WorkflowRunTranscriptResponse,
  type WorkflowRunStreamMessage,
  type WorkflowStatus
} from "@synosec/contracts";
import { aiAgentsResource } from "@/features/ai-agents/resource";
import { aiProvidersResource } from "@/features/ai-providers/resource";
import { aiToolsResource } from "@/features/ai-tools/resource";
import { applicationsResource } from "@/features/applications/resource";
import { runtimesResource } from "@/features/runtimes/resource";
import { workflowTransfer } from "@/features/workflows/transfer";
import { workflowsResource } from "@/features/workflows/resource";
import { fetchJson } from "@/shared/lib/api";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { useResourceList } from "@/shared/hooks/use-resource-list";
import { exportResourceRecords, importResourceRecords } from "@/shared/lib/resource-transfer";
import { DetailActionFade, DetailField, DetailFieldGroup, DetailLoadingState, DetailPage } from "@/shared/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import {
  createEmptyFormValues,
  definedFieldError,
  toWorkflowFormValues,
  toWorkflowRequestBody,
  type WorkflowFormValues,
  validateWorkflowForm
} from "@/features/workflows/workflow-form";
import { WorkflowTraceSection } from "@/features/workflows/workflow-trace-section";
import { type RunStreamState, type TranscriptProjection } from "@/features/workflows/workflow-trace";

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
  onFieldChange
}: {
  formValues: WorkflowFormValues;
  errors: Record<string, string>;
  applications: Application[];
  agents: AiAgent[];
  agentLookup: Record<string, AiAgent>;
  toolLookup: Record<string, string>;
  filteredRuntimes: Runtime[];
  onFieldChange: <Key extends keyof WorkflowFormValues>(field: Key, value: WorkflowFormValues[Key]) => void;
}) {
  const selectedAgent = agentLookup[formValues.agentId];
  const inheritedToolIds = selectedAgent?.toolIds ?? [];
  const effectiveToolIds = formValues.allowedToolIds.length > 0 ? formValues.allowedToolIds : inheritedToolIds;
  const workflowActions = [
    "Complete run",
    "Fail run"
  ];

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

      <DetailFieldGroup title="Execution Contract" className="bg-card/70">
        <DetailField label="Agent" required {...definedFieldError(errors["agentId"])}>
          <Select value={formValues.agentId} onValueChange={(value) => onFieldChange("agentId", value)}>
            <SelectTrigger aria-label="Agent">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agentOption) => (
                <SelectItem key={agentOption.id} value={agentOption.id}>{agentOption.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Objective" required className="md:col-span-2" {...definedFieldError(errors["objective"])}>
          <Textarea value={formValues.objective} onChange={(event) => onFieldChange("objective", event.target.value)} aria-label="Objective" rows={4} />
        </DetailField>
        <DetailField label="Agent prompt" className="md:col-span-2">
          <div className="space-y-2 rounded-xl border border-border bg-background/40 p-4">
            <p className="text-sm leading-6 text-foreground">{selectedAgent?.systemPrompt ?? "Select an agent to inspect its prompt."}</p>
            <p className="text-xs text-muted-foreground">
              Prompt and base tool grants are owned by the linked agent and edited from the AI Agents page.
            </p>
          </div>
        </DetailField>
        <DetailField label="Allowed tools" className="md:col-span-2">
          <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
            <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-xs font-medium text-foreground">
                {formValues.allowedToolIds.length === 0
                  ? "Mode: inherit all agent tools"
                  : `Mode: restricted to ${formValues.allowedToolIds.length} selected tool${formValues.allowedToolIds.length === 1 ? "" : "s"}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click a tool to allow it for this workflow. If none are selected, the workflow uses every granted tool on the agent, including visible built-in reporting actions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {inheritedToolIds.length > 0 ? inheritedToolIds.map((toolId) => {
                const restricted = formValues.allowedToolIds.length > 0;
                const active = restricted ? formValues.allowedToolIds.includes(toolId) : true;
                return (
                  <Button
                    key={toolId}
                    type="button"
                    variant={active ? "default" : "outline"}
                    className="h-auto min-h-8 px-3 py-2 text-[0.7rem]"
                    onClick={() => onFieldChange(
                      "allowedToolIds",
                      restricted && active
                        ? formValues.allowedToolIds.filter((id) => id !== toolId)
                        : [...new Set([...formValues.allowedToolIds, toolId])]
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {active ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-current/40" />}
                      <span>{toolLookup[toolId] ?? toolId}</span>
                      <span className="rounded-full border border-current/20 px-1.5 py-0.5 text-[0.58rem] uppercase tracking-[0.14em]">
                        {active ? "Allowed" : "Not allowed"}
                      </span>
                    </span>
                  </Button>
                );
              }) : <p className="text-sm text-muted-foreground">No tools are assigned to this agent.</p>}
            </div>
            <p className="text-sm text-foreground">
              Effective tools for this workflow: {effectiveToolIds.length > 0 ? effectiveToolIds.map((toolId) => toolLookup[toolId] ?? toolId).join(", ") : "None"}
            </p>
            <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-xs font-medium text-foreground">Built-in workflow actions</p>
              <p className="mt-1 text-xs text-muted-foreground">
                These lifecycle actions are always provided by the workflow engine and are not agent-managed AI tools.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {workflowActions.map((action) => (
                  <span key={action} className="inline-flex items-center rounded-full border border-border/70 bg-card px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-foreground/85">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </DetailField>
      </DetailFieldGroup>
    </>
  );
}

export function WorkflowsPage({
  workflowId,
  workflowNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail,
  onNavigateToAgent
}: {
  workflowId?: string;
  workflowNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
  onNavigateToAgent?: (id: string) => void;
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
  const [liveModelOutput, setLiveModelOutput] = useState<{
    runId: string;
    source: "local" | "hosted";
    text: string;
    final: boolean;
    createdAt: string;
  } | null>(null);
  const [runPending, setRunPending] = useState(false);
  const [, setRunStreamState] = useState<RunStreamState>("idle");
  const [persistedTranscript, setPersistedTranscript] = useState<TranscriptProjection | null>(null);
  const [latestRunError, setLatestRunError] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
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
          const defaultAgentId = current.agentId || agentsResult.items[0]?.id || "";

          return {
            ...current,
            applicationId: defaultApplicationId,
            agentId: defaultAgentId
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
      setLiveModelOutput(null);
      setPersistedTranscript(null);
      setRunStreamState("idle");
      setLatestRunError(null);
      setTranscriptError(null);
      setStreamError(null);
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
      setLiveModelOutput(null);
      setPersistedTranscript(null);
      setRunStreamState("idle");
      setLatestRunError(null);
      setTranscriptError(null);
      setStreamError(null);
      setEditModalOpen(false);
      setErrors({});
      return;
    }

    const nextValues = toWorkflowFormValues(workflowDetail.item);
    setWorkflow(workflowDetail.item);
    setFormValues(nextValues);
    setInitialValues(nextValues);
    setRunStreamState("idle");
    setLatestRunError(null);
    setTranscriptError(null);
    setStreamError(null);
    setEditModalOpen(false);
    setErrors({});
  }, [workflowDetail, workflowId, onNavigateToList, applications, agents]);

  useEffect(() => {
    if (!workflow || isCreateMode) {
      setCurrentRun(null);
      setLiveModelOutput(null);
      setLatestRunError(null);
      return;
    }

    let active = true;

    fetchLatestWorkflowRun(workflow.id)
      .then((run) => {
        if (active) {
          setCurrentRun(run);
          setLatestRunError(null);
        }
      })
      .catch((error) => {
        if (active) {
          setCurrentRun(null);
          if (typeof error === "object" && error !== null && "status" in error && error.status === 404) {
            setLatestRunError(null);
            return;
          }
          const message = error instanceof Error ? error.message : "Unable to load the latest workflow run right now.";
          setLatestRunError(message);
          toast.error("Failed to load latest workflow run", {
            description: message
          });
        }
      });

    return () => {
      active = false;
    };
  }, [workflow, isCreateMode]);

  useEffect(() => {
    if (!currentRun || currentRun.status !== "running") {
      setRunStreamState("idle");
      setStreamError(null);
      return;
    }

    const eventSource = new EventSource(`${apiRoutes.workflowRuns}/${currentRun.id}/events`);
    setRunStreamState("connecting");

    eventSource.onopen = () => {
      setRunStreamState("connected");
      setStreamError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WorkflowRunStreamMessage;
        setCurrentRun(payload.run);
        setStreamError(null);
      } catch {
        setRunStreamState("disconnected");
        setStreamError("Received an invalid workflow stream event.");
      }
    };

    eventSource.onerror = () => {
      setRunStreamState("disconnected");
      setStreamError("Live workflow stream disconnected. Reload the page or start a fresh run if updates stop.");
    };

    return () => {
      eventSource.close();
    };
  }, [currentRun?.id, currentRun?.status]);

  useEffect(() => {
    if (!currentRun) {
      setLiveModelOutput(null);
      setPersistedTranscript(null);
      setTranscriptError(null);
      return;
    }

    setLiveModelOutput((existing) => existing?.runId === currentRun.id ? existing : null);
  }, [currentRun?.id]);

  useEffect(() => {
    if (!currentRun || currentRun.status === "running") {
      setPersistedTranscript(null);
      setTranscriptError(null);
      return;
    }

    let active = true;
    fetchJson<WorkflowRunTranscriptResponse>(`${apiRoutes.workflowRuns}/${currentRun.id}/transcript`)
      .then((payload) => {
        if (active) {
          setPersistedTranscript(payload.transcript);
          setTranscriptError(null);
        }
      })
      .catch((error) => {
        if (active) {
          setPersistedTranscript(null);
          const message = error instanceof Error ? error.message : "Unable to load the finalized workflow transcript right now.";
          setTranscriptError(message);
          toast.error("Failed to load workflow transcript", {
            description: message
          });
        }
      });

    return () => {
      active = false;
    };
  }, [currentRun?.id, currentRun?.status]);

  const applicationLookup = useMemo(() => Object.fromEntries(applications.map((item) => [item.id, item.name])), [applications]);
  const agentLookup = useMemo(() => Object.fromEntries(agents.map((item) => [item.id, item])), [agents]);
  const toolLookup = useMemo(() => Object.fromEntries(tools.map((item) => [item.id, item.name])), [tools]);
  const filteredRuntimes = useMemo(
    () => runtimes.filter((runtime) => !formValues.applicationId || runtime.applicationId === formValues.applicationId),
    [formValues.applicationId, runtimes]
  );

  const columns = useMemo<ListPageColumn<Workflow>[]>(() => [
    { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { id: "applicationId", header: "Target", cell: (row) => <span className="text-muted-foreground">{applicationLookup[row.applicationId] ?? "Unknown"}</span> },
    { id: "status", header: "Status", cell: (row) => <span className="text-muted-foreground">{statusLabels[row.status]}</span> },
    {
      id: "agentId",
      header: "Agent",
      cell: (row) => <span className="text-muted-foreground">{agentLookup[row.agentId]?.name ?? "Unknown"}</span>
    }
  ], [applicationLookup, agentLookup]);

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
    setLatestRunError(null);
    setTranscriptError(null);
    setStreamError(null);
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
    }
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

  function handleListExportJson(selected: Workflow) {
    exportResourceRecords(workflowTransfer, [selected], `workflow-${selected.name}`);
  }

  async function handleDeleteWorkflow(selected: Workflow) {
    await fetchJson<void>(`${apiRoutes.workflows}/${selected.id}`, {
      method: "DELETE"
    });
    workflowList.refetch();
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
        getRowLabel={(row) => row.name}
        onExportRowJson={handleListExportJson}
        onDeleteRow={handleDeleteWorkflow}
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

  const workflowAgentId = workflow?.agentId ?? "";
  const workflowAllowedToolIds = workflow?.allowedToolIds ?? [];
  const workflowAgent = workflowAgentId ? agentLookup[workflowAgentId] : null;
  const approvedToolCount = workflow
    ? (workflowAllowedToolIds.length > 0 ? workflowAllowedToolIds.length : workflowAgent?.toolIds.length ?? 0)
    : 0;
  const visibleToolIds = workflow
    ? (workflowAllowedToolIds.length > 0 ? workflowAllowedToolIds : workflowAgent?.toolIds ?? [])
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
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {isCreateMode ? (
              <DetailActionFade show={isDirty} className="flex items-center gap-2">
                <>
                  <div aria-hidden className="mx-1 hidden h-6 w-px bg-border/70 md:block" />
                  <Button type="button" onClick={() => void handleSave()} disabled={saving} className="h-9 text-[0.75rem]">
                    <Check className="h-4 w-4" />
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setFormValues(initialValues);
                    setErrors({});
                  }} disabled={saving} className="h-9 text-[0.75rem]">
                    <Undo2 className="h-4 w-4" />
                    Dismiss
                  </Button>
                </>
              </DetailActionFade>
            ) : (
              <>
                <div aria-hidden className="mx-1 hidden h-6 w-px bg-border/70 md:block" />
                <Button type="button" onClick={handleStartRun} disabled={!workflow || runPending}>
                  <WorkflowIcon className="h-4 w-4" />
                  Start Run
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(true)} disabled={!workflow}>
                  <Pencil className="h-4 w-4" />
                  Edit Workflow
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  if (workflowAgentId && onNavigateToAgent) {
                    onNavigateToAgent(workflowAgentId);
                  }
                }} disabled={!workflow || !workflowAgentId || !onNavigateToAgent}>
                  <ExternalLink className="h-4 w-4" />
                  Edit Agent
                </Button>
              </>
            )}
            {!isCreateMode ? (
              <div className="ml-auto">
                <Button type="button" variant="outline" onClick={handleExportJson} className="h-9 text-[0.75rem]">
                  <Download className="h-4 w-4" />
                  Export JSON
                </Button>
              </div>
            ) : null}
          </>
        )}
        sidebar={isCreateMode ? undefined : null}
      relatedContent={null}
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
        />
      ) : (
        <WorkflowTraceSection
          workflow={workflow}
          applications={applications}
          runtimes={runtimes}
          agents={agents}
          tools={tools}
          run={currentRun}
          running={runPending || currentRun?.status === "running"}
          liveModelOutput={liveModelOutput && currentRun && liveModelOutput.runId === currentRun.id ? liveModelOutput : null}
          transcript={persistedTranscript}
          summaryCard={{
            toolCount: approvedToolCount,
            toolNames: visibleToolNames
          }}
          latestRunError={latestRunError}
          transcriptError={transcriptError}
          streamError={streamError}
        />
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
            />
          </div>
        </WorkflowEditModal>
      ) : null}
    </>
  );
}
