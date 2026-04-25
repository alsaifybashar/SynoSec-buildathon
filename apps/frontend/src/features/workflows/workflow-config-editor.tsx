import { Check } from "lucide-react";
import type { AiAgent, Application, ExecutionKind, Runtime, WorkflowStatus } from "@synosec/contracts";
import { definedFieldError, type WorkflowFormValues } from "@/features/workflows/workflow-form";
import { DetailField, DetailFieldGroup } from "@/shared/components/detail-page";
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
  workflow: "Workflow",
  "attack-map": "Attack-map"
};

export function WorkflowConfigEditor({
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
  const workflowActions = ["Complete run", "Fail run"];

  return (
    <>
      <DetailFieldGroup title="Workflow Configuration" className="bg-card/70">
        <DetailField label="Name" required {...definedFieldError(errors["name"])}>
          <Input value={formValues.name} onChange={(event) => onFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>
        <DetailField label="Execution kind">
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
