import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Pencil, Workflow as WorkflowIcon } from "lucide-react";
import { toast } from "sonner";
import { workflowsResource } from "@/features/workflows/resource";
import { workflowTransfer } from "@/features/workflows/transfer";
import { useWorkflowDefinitionContext } from "@/features/workflows/context";
import { WorkflowConstraintConfirmation } from "@/features/workflows/workflow-constraint-confirmation";
import { useWorkflowRunState } from "@/features/workflows/use-workflow-run-state";
import { WorkflowTraceSection } from "@/features/workflows/workflow-trace-section";
import { DetailLoadingState, DetailPage } from "@/shared/components/detail-page";
import { exportResourceRecords } from "@/shared/lib/resource-transfer";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

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
  const context = useWorkflowDefinitionContext();
  const workflowDetail = useResourceDetail(workflowsResource, workflowId ?? null);

  useEffect(() => {
    if (workflowDetail.state === "error") {
      toast.error("Workflow not found", { description: workflowDetail.message });
      onNavigateToList();
    }
  }, [onNavigateToList, workflowDetail]);

  const workflow = workflowDetail.state === "loaded" ? workflowDetail.item : null;
  const {
    currentRun,
    runPending,
    persistedTranscript,
    latestRunError,
    transcriptError,
    streamError,
    selectedTargetAssetId,
    setSelectedTargetAssetId,
    startRun
  } = useWorkflowRunState({
    workflow,
    targets: context.targets
  });

  const workflowAgent = workflow ? context.agentLookup[workflow.agentId] ?? null : null;
  const workflowTarget = workflow
    ? context.targets.find((item) => item.id === workflow.targetId) ?? null
    : null;
  const workflowTargetAssets = workflow
    ? workflowTarget?.targetAssets ?? []
    : [];
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

  const loadedWorkflow = workflowDetail.item;

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
            {workflowTargetAssets.length > 0 ? (
              <Select value={selectedTargetAssetId || "__none__"} onValueChange={(value) => setSelectedTargetAssetId(value === "__none__" ? "" : value)}>
                <SelectTrigger className="h-9 min-w-56" aria-label="Workflow target">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {workflowTargetAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button type="button" onClick={() => void handleStartRun()} disabled={runPending}>
              <WorkflowIcon className="h-4 w-4" />
              Start Run
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
          agents={context.agents}
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
    </>
  );
}
