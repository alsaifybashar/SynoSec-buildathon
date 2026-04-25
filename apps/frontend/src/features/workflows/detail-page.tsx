import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Pencil, Workflow as WorkflowIcon } from "lucide-react";
import { toast } from "sonner";
import { apiRoutes, type AiAgent, type UpdateAiAgentBody, type UpdateWorkflowBody, type Workflow } from "@synosec/contracts";
import { workflowsResource } from "@/features/workflows/resource";
import { workflowTransfer } from "@/features/workflows/transfer";
import { useWorkflowDefinitionContext } from "@/features/workflows/context";
import { PromptEditModal, type PromptEditDraft } from "@/features/workflows/prompt-edit-modal";
import { WorkflowConstraintConfirmation } from "@/features/workflows/workflow-constraint-confirmation";
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
  const [showConstraintConfirmation, setShowConstraintConfirmation] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [promptDraft, setPromptDraft] = useState<PromptEditDraft>({ objective: "", systemPrompt: "" });
  const [promptSavePending, setPromptSavePending] = useState(false);
  const [promptSaveError, setPromptSaveError] = useState<string | null>(null);
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [workflowOverride, setWorkflowOverride] = useState<Workflow | null>(null);
  const [agentOverride, setAgentOverride] = useState<AiAgent | null>(null);
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
    currentRun,
    runPending,
    persistedTranscript,
    latestRunError,
    transcriptError,
    streamError,
    startRun
  } = useWorkflowRunState({
    workflow,
    targets: context.targets
  });

  const workflowAgent = workflow
    ? (agentOverride?.id === workflow.agentId ? agentOverride : context.agentLookup[workflow.agentId] ?? null)
    : null;
  const workflowTarget = workflow
    ? context.targets.find((item) => item.id === workflow.targetId) ?? null
    : null;
  const workflowConstraints = (workflowTarget?.constraintBindings ?? [])
    .filter((binding): binding is typeof binding & { constraint: NonNullable<typeof binding.constraint> } => Boolean(binding.constraint));
  const approvedToolCount = workflow
    ? (workflow.allowedToolIds.length > 0 ? workflow.allowedToolIds.length : workflowAgent?.toolIds.length ?? 0)
    : 0;
  const visibleToolNames = useMemo(() => {
    if (!workflow) {
      return [];
    }

    const visibleToolIds = workflow.allowedToolIds.length > 0 ? workflow.allowedToolIds : workflowAgent?.toolIds ?? [];
    return visibleToolIds.map((toolId) => context.toolLookup[toolId] ?? toolId);
  }, [context.toolLookup, workflow, workflowAgent?.toolIds]);

  function handlePromptDraftChange<Key extends keyof PromptEditDraft>(field: Key, value: PromptEditDraft[Key]) {
    setPromptDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  function openPromptEditor() {
    if (!workflow || !workflowAgent) {
      return;
    }

    setPromptDraft({
      objective: workflow.objective,
      systemPrompt: workflowAgent.systemPrompt
    });
    setPromptSaveError(null);
    setShowPromptEditor(true);
  }

  async function persistPromptEdits(runAfterSave: boolean) {
    if (!workflow || !workflowAgent) {
      return;
    }

    const nextObjective = promptDraft.objective.trim();
    const nextSystemPrompt = promptDraft.systemPrompt.trim();

    if (!nextObjective) {
      setPromptSaveError("Workflow objective is required.");
      return;
    }
    if (!nextSystemPrompt) {
      setPromptSaveError("Agent system prompt is required.");
      return;
    }

    const workflowChanged = nextObjective !== workflow.objective;
    const agentChanged = nextSystemPrompt !== workflowAgent.systemPrompt;

    if (!workflowChanged && !agentChanged) {
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
    let savedAgent = workflowAgent;
    let workflowSaved = false;
    let agentSaved = false;

    try {
      if (workflowChanged) {
        savedWorkflow = await fetchJson<typeof workflow>(`${apiRoutes.workflows}/${workflow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objective: nextObjective } satisfies UpdateWorkflowBody)
        });
        workflowSaved = true;
        setWorkflowOverride(savedWorkflow);
      }

      if (agentChanged) {
        savedAgent = await fetchJson<AiAgent>(`${apiRoutes.aiAgents}/${workflowAgent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemPrompt: nextSystemPrompt } satisfies UpdateAiAgentBody)
        });
        agentSaved = true;
        setAgentOverride(savedAgent);
      }

      setDetailReloadToken((value) => value + 1);
      setShowPromptEditor(false);
      toast.success(runAfterSave ? "Prompts saved. Starting workflow run." : "Prompts saved");
      if (runAfterSave) {
        await startRun();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save prompt edits.";
      const partialMessage =
        workflowSaved && !agentSaved
          ? `Workflow prompt saved, but the linked agent update failed: ${message}`
          : agentSaved && !workflowSaved
            ? `Linked agent prompt saved, but the workflow update failed: ${message}`
            : message;
      setPromptSaveError(partialMessage);
      toast.error("Failed to save prompt edits", {
        description: partialMessage
      });
      setWorkflowOverride(savedWorkflow);
      setAgentOverride(savedAgent);
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
    if (workflowConstraints.length > 0) {
      setShowConstraintConfirmation(true);
      return;
    }

    await startRun();
  }

  async function handleConfirmedStartRun() {
    await startRun();
    setShowConstraintConfirmation(false);
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
            <Button type="button" variant="outline" onClick={openPromptEditor} disabled={!workflowAgent}>
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
        <WorkflowTraceSection
          workflow={loadedWorkflow}
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
      <WorkflowConstraintConfirmation
        open={showConstraintConfirmation}
        constraints={workflowConstraints}
        pending={runPending}
        onCancel={() => setShowConstraintConfirmation(false)}
        onConfirm={() => void handleConfirmedStartRun()}
      />
      <PromptEditModal
        open={showPromptEditor}
        workflow={workflow}
        agent={workflowAgent}
        target={workflowTarget}
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
