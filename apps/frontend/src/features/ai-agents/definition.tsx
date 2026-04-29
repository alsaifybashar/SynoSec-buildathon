import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  healthResponseSchema,
  type AiAgent,
  type AiAgentStatus,
  type AiTool,
  type CreateAiAgentBody,
  type HealthResponse,
  type ToolAccessMode
} from "@synosec/contracts";
import { aiAgentsResource } from "@/features/ai-agents/resource";
import { aiAgentTransfer } from "@/features/ai-agents/transfer";
import { aiToolsResource } from "@/features/ai-tools/resource";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailSidebarItem } from "@/shared/components/detail-page";
import type { AiAgentsQuery } from "@/shared/lib/resource-client";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export type AgentFormValues = {
  name: string;
  status: AiAgentStatus;
  description: string;
  systemPrompt: string;
  toolAccessMode: ToolAccessMode;
};

export type AiAgentDefinitionContext = {
  tools: AiTool[];
  runtimeLabel: string;
};

export const statusLabels: Record<AiAgentStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

const hiddenAgentPrompt = [
  "Workflow-owned prompts are the primary execution instructions in SynoSec.",
  "Use this agent as a tool access policy and execution profile only.",
  "Prefer concise progress, evidence-backed findings, and allowed tool usage."
].join(" ");

const toolAccessModeLabels: Record<ToolAccessMode, string> = {
  system: "System",
  system_plus_custom: "System + Custom"
};

export function createEmptyFormValues(): AgentFormValues {
  return {
    name: "",
    status: "draft",
    description: "",
    systemPrompt: hiddenAgentPrompt,
    toolAccessMode: "system"
  };
}

export function toFormValues(agent: AiAgent): AgentFormValues {
  return {
    name: agent.name,
    status: agent.status,
    description: agent.description ?? "",
    systemPrompt: agent.systemPrompt,
    toolAccessMode: agent.toolAccessMode
  };
}

export function toRequestBody(values: AgentFormValues, fallbackPrompt = hiddenAgentPrompt): CreateAiAgentBody {
  return {
    name: values.name.trim(),
    status: values.status,
    description: values.description.trim() || null,
    systemPrompt: values.systemPrompt.trim() || fallbackPrompt,
    toolAccessMode: values.toolAccessMode
  };
}

export function validateForm(values: AgentFormValues) {
  const errors: Partial<Record<keyof AgentFormValues, string>> = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  return errors;
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

function sortToolsByName(left: AiTool, right: AiTool) {
  return left.name.localeCompare(right.name);
}

function resolveVisibleTools(toolAccessMode: ToolAccessMode, tools: AiTool[]) {
  return tools.filter((tool) => {
    if (tool.status !== "active") {
      return false;
    }

    if (toolAccessMode === "system") {
      return tool.source === "system" && tool.accessProfile === "standard";
    }

    return tool.accessProfile === "standard" || tool.accessProfile === "shell";
  }).sort(sortToolsByName);
}

function useAiAgentDefinitionContext(): AiAgentDefinitionContext {
  const [tools, setTools] = useState<AiTool[]>([]);
  const [runtimeLabel, setRuntimeLabel] = useState("Loading runtime...");

  useEffect(() => {
    let active = true;

    void Promise.all([
      aiToolsResource.list({ ...aiToolsResource.defaultQuery, pageSize: 100 }),
      fetch(apiRoutes.health, { credentials: "include" }).then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load active runtime.");
        }

        return healthResponseSchema.parse(await response.json() as HealthResponse);
      })
    ])
      .then(([toolResult, health]) => {
        if (!active) {
          return;
        }

        setTools(toolResult.items);
        setRuntimeLabel(health.runtime.label);
      })
      .catch((error) => {
        toast.error("Failed to load agent dependencies", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({
      tools,
      runtimeLabel
    }),
    [runtimeLabel, tools]
  );
}

export const aiAgentsDefinition: CrudFeatureDefinition<
  AiAgent,
  AgentFormValues,
  CreateAiAgentBody,
  AiAgentsQuery,
  AiAgentDefinitionContext
> = {
  recordLabel: "AI Agent",
  titleLabel: "AI agent",
  route: apiRoutes.aiAgents,
  resource: aiAgentsResource,
  transfer: aiAgentTransfer,
  useContext: useAiAgentDefinitionContext,
  useSetup: () => {},
  createEmptyFormValues: () => createEmptyFormValues(),
  toFormValues,
  parseRequestBody: (formValues) => {
    const errors = validateForm(formValues);
    if (Object.keys(errors).length > 0) {
      return { errors };
    }

    return {
      body: toRequestBody(formValues),
      errors: {}
    };
  },
  getItemLabel: (agent) => agent.name,
  list: {
    title: "AI Agents",
    emptyMessage: "No AI agents have been configured yet.",
    columns: (context) => [
      { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
      { id: "runtime", header: "Provider", cell: () => <span className="text-muted-foreground">{context.runtimeLabel}</span> },
      { id: "toolAccessMode", header: "Tool access", cell: (row) => <span className="text-muted-foreground">{toolAccessModeLabels[row.toolAccessMode]}</span> }
    ],
    filters: () => []
  },
  detail: {
    loadingTitle: "AI agent detail",
    loadingMessage: "Loading AI agent...",
    createTitle: "New AI agent",
    renderSidebar: ({ item, context }) => (
      <>
        <DetailSidebarItem label="Status" hint="Lifecycle state of the agent definition in SynoSec.">{statusLabels[item.status]}</DetailSidebarItem>
        <DetailSidebarItem label="Runtime" hint="All workflow execution uses the backend's currently configured runtime.">{context.runtimeLabel}</DetailSidebarItem>
        <DetailSidebarItem label="Tool access mode" hint="Controls whether the agent sees only system registry entries or system plus custom entries.">
          {toolAccessModeLabels[item.toolAccessMode]}
        </DetailSidebarItem>
        <DetailSidebarItem label="Visible registry entries" hint="Count of currently active registry entries reachable under this access mode.">
          {resolveVisibleTools(item.toolAccessMode, context.tools).length}
        </DetailSidebarItem>
        <DetailSidebarItem label="Updated">{formatTimestamp(item.updatedAt)}</DetailSidebarItem>
      </>
    ),
    renderContent: ({ formValues, errors, context, handleFieldChange }) => {
      const visibleTools = resolveVisibleTools(formValues.toolAccessMode, context.tools);
      const visibleSystemTools = visibleTools.filter((tool) => tool.source === "system");
      const visibleCustomTools = visibleTools.filter((tool) => tool.source === "custom");
      const shellTools = visibleTools.filter((tool) => tool.accessProfile === "shell");
      return (
        <>
          <DetailFieldGroup title="Agent Overview" className="bg-card/70">
            <DetailField label="Name" required hint="Operator-facing agent name shown when wiring workflows." {...definedString(errors["name"] as string | undefined)}>
              <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
            </DetailField>
            <DetailField label="Runtime" hint="Workflow execution uses the backend's active provider and model for every agent.">
              <Input value={context.runtimeLabel} aria-label="Runtime" readOnly />
            </DetailField>
            <DetailField label="Description" hint="Optional summary of the agent's role or specialization." className="md:col-span-2">
              <Input value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" />
            </DetailField>
            <DetailField label="Tool policy" hint="Workflow prompts now live on workflows. This page focuses on registry visibility and execution profile." className="md:col-span-2">
              <div className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                The agent prompt remains stored for compatibility, but it is no longer edited here.
              </div>
            </DetailField>
          </DetailFieldGroup>

          <DetailFieldGroup title="Tool Access" className="bg-card/70">
            <DetailField label="Tool access mode" hint="`System` exposes only standard system registry entries. `System + Custom` also exposes custom entries and shell-profile tools." className="md:col-span-2">
              <Select value={formValues.toolAccessMode} onValueChange={(value) => handleFieldChange("toolAccessMode", value as ToolAccessMode)}>
                <SelectTrigger aria-label="Tool access mode">
                  <SelectValue placeholder="Select tool access mode" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(toolAccessModeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DetailField>
            <DetailField label="Visible registry summary" hint="Counts are computed from the current Tool Registry and this agent mode." className="md:col-span-2">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{visibleTools.length} visible registry entr{visibleTools.length === 1 ? "y" : "ies"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {visibleSystemTools.length} system, {visibleCustomTools.length} custom, {shellTools.length} shell-profile.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Current mode</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formValues.toolAccessMode === "system"
                      ? "Workflows linked to this agent inherit standard system registry entries only unless stage allowlists narrow the surface further."
                      : "Workflows linked to this agent inherit both system and custom registry entries, including shell-profile tools, unless stage allowlists narrow the surface further."}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Visible entries</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    {visibleTools.length > 0
                      ? visibleTools.map((tool) => `${tool.name} (${tool.source}${tool.accessProfile === "shell" ? ", shell" : ""})`).join(", ")
                      : "No active registry entries match this mode."}
                  </p>
                </div>
              </div>
            </DetailField>
          </DetailFieldGroup>
        </>
      );
    }
  }
};
