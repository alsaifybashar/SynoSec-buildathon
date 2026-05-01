import { X } from "lucide-react";
import { defaultWorkflowExecutionContract, workflowExecutionContractHeading, type Workflow, type Target } from "@synosec/contracts";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

export type PromptEditDraft = {
  systemPrompt: string;
  executionContract: string;
};

function buildEngineGeneratedTargetContext(target: Target | null) {
  return [
    "Runtime target context:",
    `Target: ${target?.name ?? "Unknown target"}`,
    `Operator URL: ${target?.baseUrl?.trim() || "Unknown target URL"}`,
    `Execution URL: ${target?.executionBaseUrl?.trim() || target?.baseUrl?.trim() || "Unknown target URL"}`
  ].join("\n");
}

export function splitWorkflowPromptSections(stageSystemPrompt: string): PromptEditDraft {
  const normalizedPrompt = stageSystemPrompt.trim();
  const contractIndex = normalizedPrompt.indexOf(workflowExecutionContractHeading);
  if (contractIndex < 0) {
    return {
      systemPrompt: normalizedPrompt,
      executionContract: defaultWorkflowExecutionContract
    };
  }

  const systemPrompt = normalizedPrompt.slice(0, contractIndex).trimEnd();
  const executionContract = normalizedPrompt.slice(contractIndex).trim();
  return {
    systemPrompt,
    executionContract: executionContract || defaultWorkflowExecutionContract
  };
}

export function joinWorkflowPromptSections(draft: PromptEditDraft) {
  return [draft.systemPrompt.trim(), draft.executionContract.trim()]
    .filter((section) => section.length > 0)
    .join("\n\n");
}

export function PromptEditModal({
  open,
  workflow,
  target,
  draft,
  saving,
  error,
  onDraftChange,
  onClose,
  onSave,
  onSaveAndRun
}: {
  open: boolean;
  workflow: Workflow | null;
  target: Target | null;
  draft: PromptEditDraft;
  saving: boolean;
  error: string | null;
  onDraftChange: <Key extends keyof PromptEditDraft>(field: Key, value: PromptEditDraft[Key]) => void;
  onClose: () => void;
  onSave: () => void;
  onSaveAndRun: () => void;
}) {
  if (!open || !workflow) {
    return null;
  }

  const generatedTargetContext = buildEngineGeneratedTargetContext(target);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-prompt-modal-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
          <div>
            <h2 id="workflow-prompt-modal-title" className="text-xl text-foreground">Edit Prompts</h2>
          </div>
          <Button type="button" variant="outline" className="h-9 px-3" onClick={onClose} disabled={saving} aria-label="Close edit prompts">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={onSave} disabled={saving}>
                Save
              </Button>
              <Button type="button" onClick={onSaveAndRun} disabled={saving}>
                Save and Run
              </Button>
            </div>

            <section className="space-y-3 rounded-2xl border border-border/70 bg-card/55 p-4">
              <div className="space-y-1">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Workflow-owned</p>
                <h3 className="text-base text-foreground">Editable workflow instructions</h3>
                <p className="text-xs text-muted-foreground">
                  This editable text is the workflow-owned instruction layer. The engine appends resolved target context at execution time.
                </p>
              </div>
              <Textarea
                value={draft.systemPrompt}
                onChange={(event) => onDraftChange("systemPrompt", event.target.value)}
                aria-label="Workflow system prompt"
                rows={14}
                disabled={saving}
              />
            </section>

            <section className="space-y-3 rounded-2xl border border-border/70 bg-card/40 p-4">
              <div className="space-y-1">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Engine-generated</p>
                <h3 className="text-base text-foreground">Target context</h3>
                <p className="text-xs text-muted-foreground">
                  Source: runtime target resolution performed by the workflow engine.
                </p>
              </div>
              <Textarea
                value={generatedTargetContext}
                aria-label="Generated target context"
                rows={4}
                disabled
              />
            </section>

            <section className="space-y-3 rounded-2xl border border-border/70 bg-card/55 p-4">
              <div className="space-y-1">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Workflow-owned</p>
                <h3 className="text-base text-foreground">Workflow execution contract</h3>
                <p className="text-xs text-muted-foreground">
                  This text is saved with the workflow and can override the default execution contract for this workflow.
                </p>
              </div>
              <Textarea
                value={draft.executionContract}
                onChange={(event) => onDraftChange("executionContract", event.target.value)}
                aria-label="Workflow execution contract"
                rows={4}
                disabled={saving}
              />
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-border/70 bg-card/55 p-4">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Workflow context</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">Workflow</dt>
                  <dd className="mt-1 text-foreground">{workflow.name}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">Target</dt>
                  <dd className="mt-1 text-foreground">{target?.name ?? "Unknown target"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">Execution kind</dt>
                  <dd className="mt-1 text-foreground">{workflow.executionKind ?? "workflow"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">Editable stage</dt>
                  <dd className="mt-1 text-foreground">{workflow.stages[0]?.label ?? "Unknown stage"}</dd>
                </div>
              </dl>
            </section>

            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm leading-6 text-destructive">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
