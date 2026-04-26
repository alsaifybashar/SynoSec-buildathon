import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiAgent,
  type AiAgentStatus,
  type AiProvider,
  type AiTool,
  type CreateAiAgentBody
} from "@synosec/contracts";
import { aiAgentsResource } from "@/features/ai-agents/resource";
import { aiAgentTransfer } from "@/features/ai-agents/transfer";
import { aiProvidersResource } from "@/features/ai-providers/resource";
import { aiToolsResource } from "@/features/ai-tools/resource";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailSidebarItem } from "@/shared/components/detail-page";
import type { AiAgentsQuery } from "@/shared/lib/resource-client";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

export type AgentFormValues = {
  name: string;
  status: AiAgentStatus;
  description: string;
  providerId: string;
  systemPrompt: string;
  modelOverride: string;
  toolIds: string[];
};

export type AiAgentDefinitionContext = {
  providers: AiProvider[];
  tools: AiTool[];
  providerLookup: Record<string, string>;
  defaultProviderId: string;
};

export const statusLabels: Record<AiAgentStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

export function createEmptyFormValues(defaultProviderId = ""): AgentFormValues {
  return {
    name: "",
    status: "draft",
    description: "",
    providerId: defaultProviderId,
    systemPrompt: "",
    modelOverride: "",
    toolIds: []
  };
}

export function toFormValues(agent: AiAgent): AgentFormValues {
  return {
    name: agent.name,
    status: agent.status,
    description: agent.description ?? "",
    providerId: agent.providerId,
    systemPrompt: agent.systemPrompt,
    modelOverride: agent.modelOverride ?? "",
    toolIds: [...agent.toolIds]
  };
}

export function toRequestBody(values: AgentFormValues): CreateAiAgentBody {
  return {
    name: values.name.trim(),
    status: values.status,
    description: values.description.trim() || null,
    providerId: values.providerId,
    systemPrompt: values.systemPrompt.trim(),
    modelOverride: values.modelOverride.trim() || null,
    toolIds: values.toolIds
  };
}

export function validateForm(values: AgentFormValues) {
  const errors: Partial<Record<keyof AgentFormValues, string>> = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }
  if (!values.providerId) {
    errors.providerId = "Provider is required.";
  }
  if (!values.systemPrompt.trim()) {
    errors.systemPrompt = "System prompt is required.";
  }

  return errors;
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

function useAiAgentDefinitionContext(): AiAgentDefinitionContext {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);

  useEffect(() => {
    let active = true;

    void Promise.all([
      aiProvidersResource.list({ ...aiProvidersResource.defaultQuery, pageSize: 100 }),
      aiToolsResource.list({ ...aiToolsResource.defaultQuery, pageSize: 100 })
    ])
      .then(([providerResult, toolResult]) => {
        if (!active) {
          return;
        }

        setProviders(providerResult.items);
        setTools(toolResult.items);
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

  const providerLookup = useMemo(
    () => Object.fromEntries(providers.map((provider) => [provider.id, provider.name])),
    [providers]
  );

  return useMemo(
    () => ({
      providers,
      tools,
      providerLookup,
      defaultProviderId: providers[0]?.id ?? ""
    }),
    [providerLookup, providers, tools]
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
  useSetup: ({ recordId, context, formValues, handleFieldChange }) => {
    useEffect(() => {
      if (!recordId && !formValues.providerId && context.defaultProviderId) {
        handleFieldChange("providerId", context.defaultProviderId);
      }
    }, [context.defaultProviderId, formValues.providerId, handleFieldChange, recordId]);
  },
  createEmptyFormValues: (context) => createEmptyFormValues(context.defaultProviderId),
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
      { id: "providerId", header: "Provider", cell: (row) => <span className="text-muted-foreground">{context.providerLookup[row.providerId] ?? "Unknown"}</span> },
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
        <DetailSidebarItem label="Provider" hint="The model provider this agent uses by default for workflow execution.">{context.providerLookup[item.providerId] ?? "Unknown"}</DetailSidebarItem>
        <DetailSidebarItem label="Tools" hint="Count of agent-managed AI tools currently granted to this agent.">{item.toolIds.length}</DetailSidebarItem>
        <DetailSidebarItem label="Updated">{formatTimestamp(item.updatedAt)}</DetailSidebarItem>
      </>
    ),
    renderContent: ({ formValues, errors, context, handleFieldChange, setFormValues }) => {
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
          <DetailFieldGroup title="Agent Configuration" className="bg-card/70">
            <DetailField label="Name" required hint="Operator-facing agent name shown when wiring workflows." {...definedString(errors["name"] as string | undefined)}>
              <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
            </DetailField>
            <DetailField label="Provider" required hint="Base provider used for model execution unless the workflow routes elsewhere." {...definedString(errors["providerId"] as string | undefined)}>
              <Select value={formValues.providerId} onValueChange={(value) => handleFieldChange("providerId", value)}>
                <SelectTrigger aria-label="Provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {context.providers.map((providerItem) => (
                    <SelectItem key={providerItem.id} value={providerItem.id}>{providerItem.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DetailField>
            <DetailField label="Model override" hint="Optional model identifier that overrides the provider default for this agent only.">
              <Input value={formValues.modelOverride} onChange={(event) => handleFieldChange("modelOverride", event.target.value)} aria-label="Model override" />
            </DetailField>
            <DetailField label="Description" hint="Optional summary of the agent's role or specialization." className="md:col-span-2">
              <Input value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" />
            </DetailField>
          </DetailFieldGroup>

          <DetailFieldGroup title="Runtime Prompt" className="bg-card/70">
            <DetailField label="System prompt" required hint="Standing instructions always sent with runs that use this agent." className="md:col-span-2" {...definedString(errors["systemPrompt"] as string | undefined)}>
              <Textarea value={formValues.systemPrompt} onChange={(event) => handleFieldChange("systemPrompt", event.target.value)} aria-label="System prompt" rows={10} />
            </DetailField>
          </DetailFieldGroup>

          <DetailFieldGroup title="Tools" className="bg-card/70">
            <DetailField label="Available tools" hint="These tool grants define which AI tools the agent may call during workflow execution." className="md:col-span-2">
              <div className="grid gap-2 md:grid-cols-2">
                {context.tools.map((tool) => (
                  <label key={tool.id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formValues.toolIds.includes(tool.id)}
                      onChange={(event) => toggleTool(tool.id, event.target.checked)}
                      aria-label={`Tool ${tool.name}`}
                    />
                    <span className="space-y-0.5">
                      <span className="block font-medium text-foreground">{tool.name}</span>
                      <span className="block text-xs text-muted-foreground">{tool.source} · {tool.category} · {tool.status}</span>
                    </span>
                  </label>
                ))}
              </div>
            </DetailField>
          </DetailFieldGroup>
        </>
      );
    }
  }
};
