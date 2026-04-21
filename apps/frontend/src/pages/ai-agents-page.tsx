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
import { fetchJson } from "@/lib/api";
import { useResourceDetail } from "@/hooks/useResourceDetail";
import { useResourceList } from "@/hooks/useResourceList";
import { aiAgentsResource, aiProvidersResource, aiToolsResource } from "@/lib/resources";
import { aiAgentTransfer, exportResourceRecords, importResourceRecords } from "@/lib/resource-transfer";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/components/list-page";
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

function createEmptyFormValues(): AgentFormValues {
  return {
    name: "",
    status: "draft",
    description: "",
    providerId: "",
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
  const [agent, setAgent] = useState<AiAgent | null>(null);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [formValues, setFormValues] = useState<AgentFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<AgentFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof AgentFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isCreateMode = agentId === "new";
  const agentList = useResourceList(aiAgentsResource);
  const agentDetail = useResourceDetail(aiAgentsResource, agentId && agentId !== "new" ? agentId : null);

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
        setFormValues((current) => current.providerId ? current : {
          ...current,
          providerId: providerResult.items[0]?.id ?? ""
        });
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

  useEffect(() => {
    if (!agentId) {
      return;
    }

    if (agentId === "new") {
      const empty = createEmptyFormValues();
      setAgent(null);
      setFormValues((current) => ({ ...empty, providerId: current.providerId }));
      setInitialValues((current) => ({ ...empty, providerId: current.providerId }));
      setErrors({});
      return;
    }

    if (agentDetail.state === "error") {
      toast.error("AI agent not found", { description: agentDetail.message });
      onNavigateToList();
      return;
    }

    if (agentDetail.state !== "loaded") {
      const empty = createEmptyFormValues();
      const defaultProviderId = providers[0]?.id ?? "";
      setAgent(null);
      setFormValues({ ...empty, providerId: defaultProviderId });
      setInitialValues({ ...empty, providerId: defaultProviderId });
      setErrors({});
      return;
    }

    const values = toFormValues(agentDetail.item);
    setAgent(agentDetail.item);
    setFormValues(values);
    setInitialValues(values);
    setErrors({});
  }, [agentDetail, agentId, onNavigateToList, providers]);

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

  const isDirty = JSON.stringify(formValues) !== JSON.stringify(initialValues);

  function handleFieldChange<Key extends keyof AgentFormValues>(field: Key, value: AgentFormValues[Key]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function toggleTool(toolId: string, checked: boolean) {
    setFormValues((current) => ({
      ...current,
      toolIds: checked
        ? Array.from(new Set([...current.toolIds, toolId]))
        : current.toolIds.filter((currentToolId) => currentToolId !== toolId)
    }));
  }

  async function handleSave() {
    const nextErrors = validateForm(formValues);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Validation failed", { description: "Fix the highlighted fields before saving." });
      return;
    }

    setSaving(true);

    try {
      const body = JSON.stringify(toRequestBody(formValues));

      if (isCreateMode || !agent) {
        const created = await fetchJson<AiAgent>(apiRoutes.aiAgents, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        toast.success("AI agent created");
        onNavigateToDetail(created.id, created.name);
        return;
      }

      const updated = await fetchJson<AiAgent>(`${apiRoutes.aiAgents}/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body
      });

      const nextValues = toFormValues(updated);
      setAgent(updated);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      toast.success("AI agent updated");
    } catch (error) {
      toast.error("AI agent request failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setSaving(false);
    }
  }

  function handleExportJson() {
    if (!agent) {
      return;
    }

    exportResourceRecords(aiAgentTransfer, [agent], `ai-agent-${agent.name}`);
  }

  async function handleImportJson(file: File) {
    try {
      const created = await importResourceRecords(aiAgentTransfer, file);
      toast.success(created.length === 1 ? "AI agent imported" : `${created.length} AI agents imported`);
      agentList.refetch();
    } catch (error) {
      toast.error("AI agent import failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  if (!agentId) {
    return (
      <ListPage
        title="AI Agents"
        recordLabel="AI Agent"
        columns={columns}
        query={agentList.query}
        dataState={agentList.dataState}
        items={agentList.items}
        meta={agentList.meta}
        filters={filters}
        emptyMessage="No AI agents have been configured yet."
        onSearchChange={agentList.setSearch}
        onFilterChange={agentList.setFilter}
        onSortChange={agentList.setSort}
        onPageChange={agentList.setPage}
        onPageSizeChange={agentList.setPageSize}
        onRetry={agentList.refetch}
        onAddRecord={onNavigateToCreate}
        onRowClick={(row) => onNavigateToDetail(row.id, row.name)}
        onImportJson={handleImportJson}
      />
    );
  }

  if (!isCreateMode && agentDetail.state !== "loaded") {
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
      title={isCreateMode ? "New AI agent" : agent?.name ?? "AI agent detail"}
      breadcrumbs={["Start", "AI Agents", isCreateMode ? "New" : agent?.name ?? "Detail"]}
      isDirty={isDirty}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={handleSave}
      onDismiss={() => {
        setFormValues(initialValues);
        setErrors({});
      }}
      onExportJson={!isCreateMode ? handleExportJson : undefined}
      sidebar={agent ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
          <DetailSidebarItem label="Status">{statusLabels[agent.status]}</DetailSidebarItem>
          <DetailSidebarItem label="Provider">{providerLookup[agent.providerId] ?? "Unknown"}</DetailSidebarItem>
          <DetailSidebarItem label="Tools">{agent.toolIds.length}</DetailSidebarItem>
          <DetailSidebarItem label="Updated">{formatTimestamp(agent.updatedAt)}</DetailSidebarItem>
        </div>
      ) : undefined}
    >
      <DetailFieldGroup title="Agent Configuration" className="bg-card/70">
        <DetailField label="Name" required {...definedString(errors.name)}>
          <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>
        <DetailField label="Status" required>
          <Select value={formValues.status} onValueChange={(value) => handleFieldChange("status", value as AiAgentStatus)}>
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
        <DetailField label="Provider" required {...definedString(errors.providerId)}>
          <Select value={formValues.providerId} onValueChange={(value) => handleFieldChange("providerId", value)}>
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
          <Input value={formValues.modelOverride} onChange={(event) => handleFieldChange("modelOverride", event.target.value)} aria-label="Model override" />
        </DetailField>
        <DetailField label="Description" className="md:col-span-2">
          <Input value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" />
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Runtime Prompt" className="bg-card/70">
        <DetailField label="System prompt" required className="md:col-span-2" {...definedString(errors.systemPrompt)}>
          <Textarea value={formValues.systemPrompt} onChange={(event) => handleFieldChange("systemPrompt", event.target.value)} aria-label="System prompt" rows={10} />
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Tools" className="bg-card/70">
        <DetailField label="Available tools" className="md:col-span-2">
          <div className="grid gap-2 md:grid-cols-2">
            {tools.map((tool) => (
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
    </DetailPage>
  );
}
