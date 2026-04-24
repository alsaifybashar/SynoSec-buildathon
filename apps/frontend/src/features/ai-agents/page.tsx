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
import { aiProvidersResource } from "@/features/ai-providers/resource";
import { aiToolsResource } from "@/features/ai-tools/resource";
import { aiAgentTransfer } from "@/features/ai-agents/transfer";
import { useCrudPage } from "@/shared/crud/use-crud-page";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/shared/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

type AgentFormValues = {
  name: string;
  status: AiAgentStatus;
  description: string;
  providerId: string;
  systemPrompt: string;
  modelOverride: string;
  toolIds: string[];
};

const statusLabels: Record<AiAgentStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived"
};

function createEmptyFormValues(defaultProviderId = ""): AgentFormValues {
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

function toFormValues(agent: AiAgent): AgentFormValues {
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

function toRequestBody(values: AgentFormValues): CreateAiAgentBody {
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

function validateForm(values: AgentFormValues) {
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

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

export function AiAgentsPage({
  agentId,
  agentNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  agentId?: string;
  agentNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);

  useEffect(() => {
    let active = true;

    Promise.all([
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

  const defaultProviderId = providers[0]?.id ?? "";

  const crud = useCrudPage({
    recordLabel: "AI Agent",
    titleLabel: "AI agent",
    recordId: agentId,
    route: apiRoutes.aiAgents,
    resource: aiAgentsResource,
    transfer: aiAgentTransfer,
    createEmptyFormValues: () => createEmptyFormValues(defaultProviderId),
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
    onNavigateToList,
    onNavigateToDetail,
    getItemLabel: (agent) => agent.name
  });

  useEffect(() => {
    if (!agentId && !crud.formValues.providerId && defaultProviderId) {
      crud.handleFieldChange("providerId", defaultProviderId);
    }
  }, [agentId, crud.formValues.providerId, crud.handleFieldChange, defaultProviderId]);

  const providerLookup = useMemo(() => Object.fromEntries(providers.map((provider) => [provider.id, provider.name])), [providers]);

  const columns = useMemo<ListPageColumn<AiAgent>[]>(() => [
    { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { id: "providerId", header: "Provider", cell: (row) => <span className="text-muted-foreground">{providerLookup[row.providerId] ?? "Unknown"}</span> },
    { id: "status", header: "Status", cell: (row) => <span className="text-muted-foreground">{statusLabels[row.status]}</span> },
    { id: "toolIds", header: "Tools", cell: (row) => <span className="text-muted-foreground">{row.toolIds.length}</span> }
  ], [providerLookup]);

  const filters = useMemo<ListPageFilter[]>(() => [
    {
      id: "status",
      label: "Filter by agent status",
      placeholder: "Filter by status",
      allLabel: "All statuses",
      options: Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
    }
  ], []);

  function toggleTool(toolId: string, checked: boolean) {
    crud.setFormValues((current) => ({
      ...current,
      toolIds: checked
        ? Array.from(new Set([...current.toolIds, toolId]))
        : current.toolIds.filter((currentToolId) => currentToolId !== toolId)
    }));
  }

  if (!agentId) {
    return (
      <ListPage
        title="AI Agents"
        recordLabel="AI Agent"
        columns={columns}
        query={crud.list.query}
        dataState={crud.list.dataState}
        items={crud.list.items}
        meta={crud.list.meta}
        filters={filters}
        emptyMessage="No AI agents have been configured yet."
        onSearchChange={crud.list.setSearch}
        onFilterChange={crud.list.setFilter}
        onSortChange={crud.list.setSort}
        onPageChange={crud.list.setPage}
        onPageSizeChange={crud.list.setPageSize}
        onRetry={crud.list.refetch}
        onAddRecord={onNavigateToCreate}
        onRowClick={(row) => onNavigateToDetail(row.id, row.name)}
        onImportJson={crud.importJson}
        getRowLabel={(row) => row.name}
        onExportRowJson={crud.exportRowJson}
        onDeleteRow={crud.deleteRow}
      />
    );
  }

  if (!crud.isCreateMode && crud.detail.state !== "loaded") {
    return (
      <DetailLoadingState
        title={agentNameHint ?? "AI agent detail"}
        breadcrumbs={["Start", "AI Agents", agentNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message="Loading AI agent..."
      />
    );
  }

  return (
    <DetailPage
      title={crud.isCreateMode ? "New AI agent" : crud.item?.name ?? "AI agent detail"}
      breadcrumbs={["Start", "AI Agents", crud.isCreateMode ? "New" : crud.item?.name ?? "Detail"]}
      isDirty={crud.isDirty}
      isSaving={crud.saving}
      onBack={onNavigateToList}
      onSave={() => {
        void crud.save();
      }}
      onDismiss={crud.resetForm}
      onExportJson={!crud.isCreateMode ? crud.exportCurrent : undefined}
      sidebar={crud.item ? (
        <>
          <DetailSidebarItem label="Status">{statusLabels[crud.item.status]}</DetailSidebarItem>
          <DetailSidebarItem label="Provider">{providerLookup[crud.item.providerId] ?? "Unknown"}</DetailSidebarItem>
          <DetailSidebarItem label="Tools">{crud.item.toolIds.length}</DetailSidebarItem>
          <DetailSidebarItem label="Updated">{formatTimestamp(crud.item.updatedAt)}</DetailSidebarItem>
        </>
      ) : undefined}
    >
      <DetailFieldGroup title="Agent Configuration" className="bg-card/70">
        <DetailField label="Name" required {...definedString(crud.errors.name)}>
          <Input value={crud.formValues.name} onChange={(event) => crud.handleFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>
        <DetailField label="Status" required>
          <Select value={crud.formValues.status} onValueChange={(value) => crud.handleFieldChange("status", value as AiAgentStatus)}>
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
        <DetailField label="Provider" required {...definedString(crud.errors.providerId)}>
          <Select value={crud.formValues.providerId} onValueChange={(value) => crud.handleFieldChange("providerId", value)}>
            <SelectTrigger aria-label="Provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((providerItem) => (
                <SelectItem key={providerItem.id} value={providerItem.id}>{providerItem.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Model override">
          <Input value={crud.formValues.modelOverride} onChange={(event) => crud.handleFieldChange("modelOverride", event.target.value)} aria-label="Model override" />
        </DetailField>
        <DetailField label="Description" className="md:col-span-2">
          <Input value={crud.formValues.description} onChange={(event) => crud.handleFieldChange("description", event.target.value)} aria-label="Description" />
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Runtime Prompt" className="bg-card/70">
        <DetailField label="System prompt" required className="md:col-span-2" {...definedString(crud.errors.systemPrompt)}>
          <Textarea value={crud.formValues.systemPrompt} onChange={(event) => crud.handleFieldChange("systemPrompt", event.target.value)} aria-label="System prompt" rows={10} />
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Tools" className="bg-card/70">
        <DetailField label="Available tools" className="md:col-span-2">
          <div className="grid gap-2 md:grid-cols-2">
            {tools.map((tool) => (
              <label key={tool.id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={crud.formValues.toolIds.includes(tool.id)}
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
    </DetailPage>
  );
}
