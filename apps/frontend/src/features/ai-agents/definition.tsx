import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  healthResponseSchema,
  type AiAgent,
  type AiAgentStatus,
  type AiTool,
  type CreateAiAgentBody,
  type HealthResponse
} from "@synosec/contracts";
import { aiAgentsResource } from "@/features/ai-agents/resource";
import { aiAgentTransfer } from "@/features/ai-agents/transfer";
import { aiToolsResource } from "@/features/ai-tools/resource";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailSidebarItem } from "@/shared/components/detail-page";
import type { AiAgentsQuery } from "@/shared/lib/resource-client";
import { Input } from "@/shared/ui/input";

export type AgentFormValues = {
  name: string;
  status: AiAgentStatus;
  description: string;
  systemPrompt: string;
  toolIds: string[];
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
  "Use this agent as a tool grant and execution profile only.",
  "Prefer concise progress, evidence-backed findings, and allowed tool usage."
].join(" ");

const categoryLabels: Record<AiTool["category"], string> = {
  topology: "Topology Tools",
  auth: "Auth Tools",
  network: "Network Tools",
  web: "Web Tools",
  content: "Content Tools",
  dns: "DNS Tools",
  subdomain: "Subdomain Tools",
  password: "Password Tools",
  cloud: "Cloud Tools",
  kubernetes: "Kubernetes Tools",
  windows: "Windows Tools",
  forensics: "Forensics Tools",
  reversing: "Reversing Tools",
  exploitation: "Exploitation Tools",
  utility: "Utility Tools"
};

type ToolGroup = {
  id: string;
  title: string;
  description?: string | null;
  tools: AiTool[];
};

export function createEmptyFormValues(): AgentFormValues {
  return {
    name: "",
    status: "draft",
    description: "",
    systemPrompt: hiddenAgentPrompt,
    toolIds: []
  };
}

export function toFormValues(agent: AiAgent): AgentFormValues {
  return {
    name: agent.name,
    status: agent.status,
    description: agent.description ?? "",
    systemPrompt: agent.systemPrompt,
    toolIds: [...agent.toolIds]
  };
}

export function toRequestBody(values: AgentFormValues, fallbackPrompt = hiddenAgentPrompt): CreateAiAgentBody {
  return {
    name: values.name.trim(),
    status: values.status,
    description: values.description.trim() || null,
    systemPrompt: values.systemPrompt.trim() || fallbackPrompt,
    toolIds: values.toolIds
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

function isSemanticFamilyTool(tool: AiTool) {
  return tool.capabilities.includes("semantic-family");
}

function groupFamilyTools(tools: AiTool[]): ToolGroup[] {
  return tools
    .filter(isSemanticFamilyTool)
    .sort(sortToolsByName)
    .map((tool) => ({
      id: tool.id,
      title: tool.name,
      description: tool.description,
      tools: [tool]
    }));
}

function groupCategoryTools(tools: AiTool[]): ToolGroup[] {
  const grouped = new Map<AiTool["category"], AiTool[]>();

  for (const tool of tools.filter((item) => !isSemanticFamilyTool(item) && item.kind !== "builtin-action")) {
    const current = grouped.get(tool.category) ?? [];
    current.push(tool);
    grouped.set(tool.category, current);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => categoryLabels[left].localeCompare(categoryLabels[right]))
    .map(([category, categoryTools]) => ({
      id: category,
      title: categoryLabels[category],
      tools: categoryTools.sort(sortToolsByName)
    }));
}

function renderToolGroupList(
  groups: ToolGroup[],
  selectedToolIds: string[],
  toggleTool?: (toolId: string, checked: boolean) => void
) {
  return groups.length > 0 ? groups.map((group) => (
    <section key={group.id} className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
        {group.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.description}</p> : null}
      </div>
      <ul className="rounded-lg border border-border bg-background/40 px-3">
        {group.tools.map((tool) => (
          <ToolGrantCard
            key={tool.id}
            tool={tool}
            checked={selectedToolIds.includes(tool.id)}
            onToggle={toggleTool ? (checked) => toggleTool(tool.id, checked) : () => {}}
          />
        ))}
      </ul>
    </section>
  )) : null;
}

function ToolGrantCard({
  tool,
  checked,
  onToggle
}: {
  tool: AiTool;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <li className="border-b border-border/60 py-2 last:border-b-0">
      <label key={tool.id} className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={`Tool ${tool.name}`}
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{tool.name}</span>
            <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
              {tool.status}
            </span>
          </span>
          <span className="block text-xs text-muted-foreground">
            {tool.source} · {tool.category} · {tool.riskTier}
          </span>
          {tool.description ? <span className="block text-xs leading-5 text-foreground/80">{tool.description}</span> : null}
        </span>
      </label>
    </li>
  );
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
      { id: "runtime", header: "Runtime", cell: () => <span className="text-muted-foreground">{context.runtimeLabel}</span> },
      { id: "toolIds", header: "Tools", cell: (row) => <span className="text-muted-foreground">{row.toolIds.length}</span> }
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
        <DetailSidebarItem label="Automatic tools" hint="Workflow-provided built-in tools that are available without being persisted on the agent.">
          {context.tools.filter((tool) => tool.executorType === "builtin").length}
        </DetailSidebarItem>
        <DetailSidebarItem label="Persisted grants" hint="Count of agent-managed tool grants currently persisted on this agent.">{item.toolIds.length}</DetailSidebarItem>
        <DetailSidebarItem label="Updated">{formatTimestamp(item.updatedAt)}</DetailSidebarItem>
      </>
    ),
    renderContent: ({ formValues, errors, context, handleFieldChange, setFormValues }) => {
      const automaticTools = context.tools.filter((tool) => tool.executorType === "builtin");
      const automaticFamilyGroups = groupFamilyTools(automaticTools);
      const automaticCategoryGroups = groupCategoryTools(automaticTools);
      const persistedGrantedTools = context.tools.filter((tool) => formValues.toolIds.includes(tool.id));
      const persistedFamilyGroups = groupFamilyTools(persistedGrantedTools);
      const persistedCategoryGroups = groupCategoryTools(persistedGrantedTools);
      const grantableTools = context.tools.filter((tool) => tool.executorType !== "builtin");
      const familyGroups = groupFamilyTools(grantableTools);
      const categoryGroups = groupCategoryTools(grantableTools);

      function toggleTool(toolId: string, checked: boolean) {
        setFormValues((current) => ({
          ...current,
          toolIds: checked
            ? Array.from(new Set([...current.toolIds, toolId]))
            : current.toolIds.filter((currentToolId) => currentToolId !== toolId)
        }));
      }

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
            <DetailField label="Tool policy" hint="Workflow prompts now live on workflows. This page focuses on tool grants and execution profile." className="md:col-span-2">
              <div className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                The agent prompt remains stored for compatibility, but it is no longer edited here.
              </div>
            </DetailField>
          </DetailFieldGroup>

          <DetailFieldGroup title="Automatic Workflow Tools" className="bg-card/70">
            <DetailField label="Every agent receives these" hint="These built-in workflow tools come from the platform and do not need to be persisted on an agent." className="md:col-span-2">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{automaticTools.length} automatic tool{automaticTools.length === 1 ? "" : "s"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    These are part of the effective workflow tool surface even when the agent itself only persists a smaller grant set.
                  </p>
                </div>
                {renderToolGroupList([...automaticFamilyGroups, ...automaticCategoryGroups], automaticTools.map((tool) => tool.id))}
              </div>
            </DetailField>
          </DetailFieldGroup>

          <DetailFieldGroup title="Persisted Agent Grants" className="bg-card/70">
            <DetailField label="Agent-specific tool grants" hint="These grants are persisted on the agent and can be inherited by workflows that do not define their own tool surface." className="md:col-span-2">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{formValues.toolIds.length} persisted grant{formValues.toolIds.length === 1 ? "" : "s"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This is the smaller agent-managed grant set you were previously seeing by itself.
                  </p>
                </div>
                {persistedGrantedTools.length > 0
                  ? renderToolGroupList([...persistedFamilyGroups, ...persistedCategoryGroups], formValues.toolIds)
                  : <p className="text-sm text-muted-foreground">No persisted grants selected yet.</p>}
              </div>
            </DetailField>
          </DetailFieldGroup>

          <DetailFieldGroup title="Tool Access" className="bg-card/70">
            <DetailField label="Granted tools" hint="These grants define which AI tools the linked workflow agent may call during execution." className="md:col-span-2">
              <div className="rounded-xl border border-border bg-background/50 px-4 py-3">
                <p className="text-sm font-medium text-foreground">{formValues.toolIds.length} tool{formValues.toolIds.length === 1 ? "" : "s"} selected</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Capability tools are grouped first. Everything else is grouped by tool category.
                </p>
              </div>
            </DetailField>
          </DetailFieldGroup>

          <DetailFieldGroup title="Capability Tools" className="bg-card/70">
            <DetailField label="Capability tools" hint="These compact tools expose assessment intent instead of raw tool brands." className="md:col-span-2">
              <div className="space-y-4">
                {familyGroups.length > 0
                  ? renderToolGroupList(familyGroups, formValues.toolIds, toggleTool)
                  : <p className="text-sm text-muted-foreground">No capability tools are available.</p>}
              </div>
            </DetailField>
          </DetailFieldGroup>

          <DetailFieldGroup title="Category Grants" className="bg-card/70">
            <DetailField label="Remaining tool catalog" hint="Raw and specialized tools are grouped by their current category metadata." className="md:col-span-2">
              <div className="space-y-4">
                {categoryGroups.length > 0
                  ? renderToolGroupList(categoryGroups, formValues.toolIds, toggleTool)
                  : <p className="text-sm text-muted-foreground">No additional category-grouped tools are available.</p>}
              </div>
            </DetailField>
          </DetailFieldGroup>
        </>
      );
    }
  }
};
