import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Pencil, Workflow as WorkflowIcon } from "lucide-react";
import { toast } from "sonner";
import { apiRoutes, type AiAgent, type UpdateWorkflowBody, type Workflow } from "@synosec/contracts";
import { workflowsResource } from "@/features/workflows/resource";
import { workflowTransfer } from "@/features/workflows/transfer";
import { useWorkflowDefinitionContext } from "@/features/workflows/context";
import { PromptEditModal, type PromptEditDraft } from "@/features/workflows/prompt-edit-modal";
import { useWorkflowRunState } from "@/features/workflows/use-workflow-run-state";
import { WorkflowTraceSection } from "@/features/workflows/workflow-trace-section";
import { DetailLoadingState, DetailPage } from "@/shared/components/detail-page";
import { fetchJson } from "@/shared/lib/api";
import { exportResourceRecords } from "@/shared/lib/resource-transfer";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { Button } from "@/shared/ui/button";

export function WorkflowDetailPage({
  workflowId,
  workflowNameHint,
  onNavigateToList,
  onNavigateToEdit,
  onNavigateToAgent
}: {
  workflowId?: string;
  workflowNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToEdit?: (id: string, label?: string) => void;
  onNavigateToAgent?: (id: string) => void;
}) {
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [promptDraft, setPromptDraft] = useState<PromptEditDraft>({
    systemPrompt: ""
  });
  const [promptSavePending, setPromptSavePending] = useState(false);
  const [promptSaveError, setPromptSaveError] = useState<string | null>(null);
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [workflowOverride, setWorkflowOverride] = useState<Workflow | null>(null);
  const [agentOverride, setAgentOverride] = useState<AiAgent | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const context = useWorkflowDefinitionContext();
  const workflowDetail = useResourceDetail(workflowsResource, workflowId ?? null, detailReloadToken);

  useEffect(() => {
    if (workflowDetail.state === "error") {
      toast.error("Workflow not found", { description: workflowDetail.message });
      onNavigateToList();
    }
  }, [onNavigateToList, workflowDetail]);

  useEffect(() => {
    if (workflowDetail.state !== "loaded") {
      return;
    }

    setWorkflowOverride((current) => current?.id === workflowDetail.item.id ? current : workflowDetail.item);
  }, [workflowDetail]);

  const workflow = workflowDetail.state === "loaded" ? (workflowOverride ?? workflowDetail.item) : null;
  const effectiveAgents = useMemo(
    () => agentOverride
      ? context.agents.map((item) => (item.id === agentOverride.id ? agentOverride : item))
      : context.agents,
    [agentOverride, context.agents]
  );
  const {
    currentLaunch,
    currentRun,
    runPending,
    persistedTranscript,
    latestRunError,
    transcriptError,
    streamError,
    startRun
  } = useWorkflowRunState({
    workflow,
    targets: context.targets,
    selectedTargetId
  });

  const workflowAgent = workflow
    ? (agentOverride?.id === workflow.agentId ? agentOverride : context.agentLookup[workflow.agentId] ?? null)
    : null;
  const workflowProvidedToolIds = workflow?.allowedToolIds ?? [];
  const inheritedAgentToolIds = workflowAgent?.toolIds ?? [];
  const targetTabs = useMemo(() => context.targets.map((target) => ({
    target,
    summary: currentLaunch?.runs.find((item) => item.targetId === target.id) ?? null,
    runnable: Boolean(target.baseUrl?.trim())
  })), [context.targets, currentLaunch]);
  const activeTarget = targetTabs.find((item) => item.target.id === selectedTargetId)?.target ?? null;
  const approvedToolCount = workflow
    ? (workflowProvidedToolIds.length > 0 ? workflowProvidedToolIds.length : inheritedAgentToolIds.length)
    : 0;
  const visibleToolNames = useMemo(() => {
    if (!workflow) {
      return [];
    }

    const visibleToolIds = workflowProvidedToolIds.length > 0 ? workflowProvidedToolIds : inheritedAgentToolIds;
    return visibleToolIds.map((toolId) => context.toolLookup[toolId] ?? toolId);
  }, [context.toolLookup, inheritedAgentToolIds, workflow, workflowProvidedToolIds]);

  useEffect(() => {
    if (targetTabs.length === 0) {
      setSelectedTargetId(null);
      return;
    }

    if (selectedTargetId && targetTabs.some((item) => item.target.id === selectedTargetId)) {
      return;
    }

    const preferred = targetTabs.find((item) => item.summary?.status === "running")
      ?? targetTabs.find((item) => item.summary?.status === "failed")
      ?? targetTabs.find((item) => item.summary?.status === "completed")
      ?? targetTabs.find((item) => item.runnable)
      ?? targetTabs[0];
    setSelectedTargetId(preferred?.target.id ?? null);
  }, [selectedTargetId, targetTabs]);

  function handlePromptDraftChange<Key extends keyof PromptEditDraft>(field: Key, value: PromptEditDraft[Key]) {
    setPromptDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  function openPromptEditor() {
    if (!workflow) {
      return;
    }

    setPromptDraft({
      systemPrompt: workflow.stageSystemPrompt
    });
    setPromptSaveError(null);
    setShowPromptEditor(true);
  }

  async function persistPromptEdits(runAfterSave: boolean) {
    if (!workflow) {
      return;
    }

    const nextSystemPrompt = promptDraft.systemPrompt.trim();
    if (!nextSystemPrompt) {
      setPromptSaveError("Workflow system prompt is required.");
      return;
    }

    const workflowChanged =
      nextSystemPrompt !== workflow.stageSystemPrompt;

    if (!workflowChanged) {
      setShowPromptEditor(false);
      setPromptSaveError(null);
      if (runAfterSave) {
        await startRun();
      }
      return;
    }

    setPromptSavePending(true);
    setPromptSaveError(null);

    let savedWorkflow = workflow;
    let workflowSaved = false;

    try {
      if (workflowChanged) {
        savedWorkflow = await fetchJson<typeof workflow>(`${apiRoutes.workflows}/${workflow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageSystemPrompt: nextSystemPrompt
          } satisfies UpdateWorkflowBody)
        });
        workflowSaved = true;
        setWorkflowOverride(savedWorkflow);
      }

      setDetailReloadToken((value) => value + 1);
      setShowPromptEditor(false);
      toast.success(runAfterSave ? "Prompts saved. Starting workflow run." : "Prompts saved");
      if (runAfterSave) {
        await startRun();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save prompt edits.";
      const partialMessage = workflowSaved ? `Workflow prompt saved, but follow-up actions failed: ${message}` : message;
      setPromptSaveError(partialMessage);
      toast.error("Failed to save prompt edits", {
        description: partialMessage
      });
      setWorkflowOverride(savedWorkflow);
    } finally {
      setPromptSavePending(false);
    }
  }

  function handleExportJson() {
    if (!workflow) {
      return;
    }

    exportResourceRecords(workflowTransfer, [workflow], `workflow-${workflow.name}`);
  }

  if (workflowDetail.state !== "loaded") {
    return (
      <DetailLoadingState
        title={workflowNameHint ?? "Workflow detail"}
        breadcrumbs={["Start", "Workflows", workflowNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message="Loading workflow..."
      />
    );
  }

  const loadedWorkflow = workflow ?? workflowDetail.item;

  async function handleStartRun() {
    await startRun();
  }

  return (
    <>
      <DetailPage
        title={loadedWorkflow.name}
        breadcrumbs={["Start", "Workflows", loadedWorkflow.name]}
        isDirty={false}
        onBack={onNavigateToList}
        onSave={() => {}}
        onDismiss={() => {}}
        actions={(
          <>
            <Button type="button" onClick={() => void handleStartRun()} disabled={runPending}>
              <WorkflowIcon className="h-4 w-4" />
              Start Run
            </Button>
            <Button type="button" variant="outline" onClick={openPromptEditor}>
              <Pencil className="h-4 w-4" />
              Edit Prompts
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowFullDetails((value) => !value)}>
              {showFullDetails ? "Hide Full Details" : "Show Full Details"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onNavigateToEdit?.(loadedWorkflow.id, loadedWorkflow.name)} disabled={!onNavigateToEdit}>
              <Pencil className="h-4 w-4" />
              Edit Workflow
            </Button>
            <Button type="button" variant="outline" onClick={() => workflowAgent && onNavigateToAgent?.(workflowAgent.id)} disabled={!workflowAgent || !onNavigateToAgent}>
              <ExternalLink className="h-4 w-4" />
              Edit Agent
            </Button>
            <div className="ml-auto">
              <Button type="button" variant="outline" onClick={handleExportJson} className="h-9 text-[0.75rem]">
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </>
        )}
        sidebar={null}
        relatedContent={null}
      >
        <div className="mb-4 space-y-3 rounded-xl border border-border bg-background/40 px-4 py-3">
          <div>
            <span className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Every agent receives these for this workflow
            </span>
            <p className="mt-1 text-sm text-foreground">
              {workflowProvidedToolIds.length > 0
                ? `${workflowProvidedToolIds.length} workflow-provided tool${workflowProvidedToolIds.length === 1 ? "" : "s"}`
                : "No workflow-level surface selected. This workflow inherits the linked agent grants."}
            </p>
            {workflowProvidedToolIds.length > 0 ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {workflowProvidedToolIds.map((toolId) => context.toolLookup[toolId] ?? toolId).join(", ")}
              </p>
            ) : null}
          </div>
          <div>
            <span className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Linked agent persisted grants
            </span>
            <p className="mt-1 text-sm text-foreground">
              {inheritedAgentToolIds.length} persisted grant{inheritedAgentToolIds.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {inheritedAgentToolIds.length > 0
                ? inheritedAgentToolIds.map((toolId) => context.toolLookup[toolId] ?? toolId).join(", ")
                : "None"}
            </p>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Targets
          </span>
          <div className="inline-flex flex-wrap rounded-full border border-border bg-muted/40 p-1">
            {targetTabs.map(({ target }) => {
              const active = target.id === selectedTargetId;
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setSelectedTargetId(target.id)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {target.name}
                </button>
              );
            })}
          </div>
        </div>
        {activeTarget && !activeTarget.baseUrl ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700">
            This target is not runnable because it does not have a base URL configured.
          </div>
        ) : null}
        <WorkflowTraceSection
          workflow={loadedWorkflow}
          activeTarget={activeTarget}
          targets={context.targets}
          agents={effectiveAgents}
          tools={context.tools}
          run={currentRun}
          running={runPending || currentRun?.status === "running"}
          transcript={persistedTranscript}
          summaryCard={{
            toolCount: approvedToolCount,
            toolNames: visibleToolNames
          }}
          showFullDetails={showFullDetails}
          latestRunError={latestRunError}
          transcriptError={transcriptError}
          streamError={streamError}
        />
      </DetailPage>
      <PromptEditModal
        open={showPromptEditor}
        workflow={workflow}
        agent={workflowAgent}
        target={activeTarget}
        draft={promptDraft}
        saving={promptSavePending}
        error={promptSaveError}
        onDraftChange={handlePromptDraftChange}
        onClose={() => {
          if (promptSavePending) {
            return;
          }
          setShowPromptEditor(false);
          setPromptSaveError(null);
        }}
        onSave={() => void persistPromptEdits(false)}
        onSaveAndRun={() => void persistPromptEdits(true)}
      />
    </>
  );
}
