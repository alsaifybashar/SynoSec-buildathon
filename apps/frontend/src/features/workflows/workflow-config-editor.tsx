import { Plus, Trash2 } from "lucide-react";
import type { AiTool, ExecutionKind, WorkflowStatus } from "@synosec/contracts";
import {
  createEmptyStageFormValues,
  definedFieldError,
  type WorkflowFormValues,
  type WorkflowStageFormValues
} from "@/features/workflows/workflow-form";
import { DetailField, DetailFieldGroup, DetailFormCard } from "@/shared/components/detail-page";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

export const workflowStatusLabels: Record<WorkflowStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

export const workflowExecutionKindLabels: Record<ExecutionKind, string> = {
  workflow: "Workflow"
};

const workflowFieldHints = {
  executionKind: "Choose how this workflow executes within the standard workflow engine.",
  preRunEvidenceEnabled: "Run the fixed pre-run evidence bundle before the first model turn. If enabled, any pre-run failure aborts the workflow run.",
  allowedTools: "If no tools are selected for a stage, that stage can use all eligible active workflow tools."
} as const;

function getEligibleTools(tools: AiTool[]) {
  return tools
    .filter((tool) => tool.status === "active")
    .sort((left, right) => left.name.localeCompare(right.name));
}

function updateStage(
  stages: WorkflowStageFormValues[],
  index: number,
  patch: Partial<WorkflowStageFormValues>
) {
  return stages.map((stage, currentIndex) => currentIndex === index ? { ...stage, ...patch } : stage);
}

export function WorkflowConfigEditor({
  formValues,
  errors,
  tools,
  toolLookup,
  onFieldChange
}: {
  formValues: WorkflowFormValues;
  errors: Record<string, string>;
  tools: AiTool[];
  toolLookup: Record<string, string>;
  onFieldChange: <Key extends keyof WorkflowFormValues>(field: Key, value: WorkflowFormValues[Key]) => void;
}) {
  const eligibleTools = getEligibleTools(tools);

  return (
    <DetailFormCard>
      <DetailFieldGroup title="Workflow Configuration">
        <DetailField label="Name" required hint="Operator-facing workflow name shown in the run launcher and reports." {...definedFieldError(errors["name"])}>
          <Input value={formValues.name} onChange={(event) => onFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>
        <DetailField label="Execution kind" hint={workflowFieldHints.executionKind}>
          <Select value={formValues.executionKind} onValueChange={(value) => onFieldChange("executionKind", value as ExecutionKind)}>
            <SelectTrigger aria-label="Execution kind">
              <SelectValue placeholder="Select execution kind" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(workflowExecutionKindLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Pre-run evidence bundle" hint={workflowFieldHints.preRunEvidenceEnabled}>
          <Select
            value={formValues.preRunEvidenceEnabled ? "enabled" : "disabled"}
            onValueChange={(value) => onFieldChange("preRunEvidenceEnabled", value === "enabled")}
          >
            <SelectTrigger aria-label="Pre-run evidence bundle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="disabled">Disabled by default</SelectItem>
              <SelectItem value="enabled">Enabled by default</SelectItem>
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Description" hint="Optional internal summary of what this workflow is intended to do." className="md:col-span-2">
          <Textarea value={formValues.description} onChange={(event) => onFieldChange("description", event.target.value)} aria-label="Description" rows={4} />
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Stages">
        <div className="md:col-span-2 space-y-4">
          {formValues.stages.map((stage, index) => {
            const effectiveToolIds = stage.allowedToolIds.length > 0 ? stage.allowedToolIds : eligibleTools.map((tool) => tool.id);
            return (
              <section key={stage.id ?? `${stage.label}-${index}`} className="space-y-4 rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Stage {index + 1}</p>
                    <p className="text-sm text-muted-foreground">This stage owns its prompt, objective, and capability grants.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onFieldChange("stages", formValues.stages.filter((_, currentIndex) => currentIndex !== index))}
                    disabled={formValues.stages.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>

                <DetailField label="Label" required {...definedFieldError(errors[`stages.${index}.label`])}>
                  <Input
                    value={stage.label}
                    onChange={(event) => onFieldChange("stages", updateStage(formValues.stages, index, { label: event.target.value }))}
                    aria-label={`Stage ${index + 1} label`}
                  />
                </DetailField>

                <DetailField label="Objective" required {...definedFieldError(errors[`stages.${index}.objective`])}>
                  <Textarea
                    value={stage.objective}
                    onChange={(event) => onFieldChange("stages", updateStage(formValues.stages, index, { objective: event.target.value }))}
                    aria-label={`Stage ${index + 1} objective`}
                    rows={3}
                  />
                </DetailField>

                <DetailField label="System prompt" required {...definedFieldError(errors[`stages.${index}.systemPrompt`])}>
                  <Textarea
                    value={stage.systemPrompt}
                    onChange={(event) => onFieldChange("stages", updateStage(formValues.stages, index, { systemPrompt: event.target.value }))}
                    aria-label={`Stage ${index + 1} system prompt`}
                    rows={10}
                  />
                </DetailField>

                <DetailField label="Allowed tools" hint={workflowFieldHints.allowedTools}>
                  <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-sm text-foreground">
                      {stage.allowedToolIds.length > 0
                        ? `${stage.allowedToolIds.length} stage-selected tool${stage.allowedToolIds.length === 1 ? "" : "s"}`
                        : "No explicit tool restriction. This stage can use all eligible active workflow tools."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {eligibleTools.map((tool) => {
                        const active = stage.allowedToolIds.length === 0 || stage.allowedToolIds.includes(tool.id);
                        const restricted = stage.allowedToolIds.length > 0;
                        return (
                          <Button
                            key={tool.id}
                            type="button"
                            variant={active ? "default" : "outline"}
                            className="h-auto min-h-8 px-3 py-2 text-[0.7rem]"
                            onClick={() => onFieldChange(
                              "stages",
                              updateStage(formValues.stages, index, {
                                allowedToolIds: restricted && active
                                  ? stage.allowedToolIds.filter((id) => id !== tool.id)
                                  : [...new Set([...stage.allowedToolIds, tool.id])]
                              })
                            )}
                          >
                            {tool.name}
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Effective tools: {effectiveToolIds.map((toolId) => toolLookup[toolId] ?? toolId).join(", ")}
                    </p>
                  </div>
                </DetailField>
              </section>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={() => onFieldChange("stages", [...formValues.stages, createEmptyStageFormValues(formValues.stages.length)])}
          >
            <Plus className="h-4 w-4" />
            Add Stage
          </Button>
        </div>
      </DetailFieldGroup>
    </DetailFormCard>
  );
}
