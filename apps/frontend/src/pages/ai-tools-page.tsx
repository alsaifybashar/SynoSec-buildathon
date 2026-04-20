import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiTool,
  type AiToolStatus,
  type CreateAiToolBody,
  type ToolAdapter,
  type ToolCategory,
  type ToolRiskTier
} from "@synosec/contracts";
import { fetchJson } from "@/lib/api";
import { useResourceDetail } from "@/hooks/useResourceDetail";
import { useResourceList } from "@/hooks/useResourceList";
import { aiToolsResource } from "@/lib/resources";
import { DetailField, DetailFieldGroup, DetailPage, DetailSidebarItem } from "@/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/components/list-page";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ToolFormValues = {
  name: string;
  status: AiToolStatus;
  source: "custom" | "system";
  description: string;
  adapter: ToolAdapter;
  binary: string;
  category: ToolCategory;
  riskTier: ToolRiskTier;
  notes: string;
  inputSchemaText: string;
  outputSchemaText: string;
};

const statusLabels: Record<AiToolStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  missing: "Missing",
  manual: "Manual"
};

const categoryOptions: ToolCategory[] = ["web", "network", "content", "dns", "subdomain", "cloud", "utility", "password", "windows", "kubernetes", "forensics", "reversing", "exploitation"];
const riskTierOptions: ToolRiskTier[] = ["passive", "active", "controlled-exploit"];
const adapterOptions: ToolAdapter[] = ["external_tool", "http_probe", "httpx_probe", "web_crawl", "historical_urls", "feroxbuster_scan", "service_scan", "subdomain_enum", "nikto_scan", "nuclei_scan", "web_fingerprint", "content_discovery", "db_injection_check"];

function createEmptyFormValues(): ToolFormValues {
  return {
    name: "",
    status: "active",
    source: "custom",
    description: "",
    adapter: "external_tool",
    binary: "",
    category: "utility",
    riskTier: "passive",
    notes: "",
    inputSchemaText: JSON.stringify({ type: "object", properties: {} }, null, 2),
    outputSchemaText: JSON.stringify({ type: "object", properties: {} }, null, 2)
  };
}

function toFormValues(tool: AiTool): ToolFormValues {
  return {
    name: tool.name,
    status: tool.status,
    source: tool.source,
    description: tool.description ?? "",
    adapter: tool.adapter ?? "external_tool",
    binary: tool.binary ?? "",
    category: tool.category,
    riskTier: tool.riskTier,
    notes: tool.notes ?? "",
    inputSchemaText: JSON.stringify(tool.inputSchema, null, 2),
    outputSchemaText: JSON.stringify(tool.outputSchema, null, 2)
  };
}

function parseRequestBody(values: ToolFormValues): { body?: CreateAiToolBody; errors: Partial<Record<keyof ToolFormValues, string>> } {
  const errors: Partial<Record<keyof ToolFormValues, string>> = {};
  let inputSchema: unknown;
  let outputSchema: unknown;

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  try {
    inputSchema = JSON.parse(values.inputSchemaText);
  } catch {
    errors.inputSchemaText = "Input schema must be valid JSON.";
  }

  try {
    outputSchema = JSON.parse(values.outputSchemaText);
  } catch {
    errors.outputSchemaText = "Output schema must be valid JSON.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    body: {
      name: values.name.trim(),
      status: values.status,
      source: "custom",
      description: values.description.trim() || null,
      adapter: values.adapter,
      binary: values.binary.trim() || null,
      category: values.category,
      riskTier: values.riskTier,
      notes: values.notes.trim() || null,
      inputSchema: inputSchema as Record<string, unknown>,
      outputSchema: outputSchema as Record<string, unknown>
    },
    errors: {}
  };
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

export function AiToolsPage({
  toolId,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  toolId?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string) => void;
}) {
  const [tool, setTool] = useState<AiTool | null>(null);
  const [formValues, setFormValues] = useState<ToolFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<ToolFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof ToolFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isCreateMode = toolId === "new";
  const toolList = useResourceList(aiToolsResource);
  const toolDetail = useResourceDetail(aiToolsResource, toolId && toolId !== "new" ? toolId : null);

  useEffect(() => {
    if (!toolId) {
      return;
    }

    if (toolId === "new") {
      const empty = createEmptyFormValues();
      setTool(null);
      setFormValues(empty);
      setInitialValues(empty);
      setErrors({});
      return;
    }

    if (toolDetail.state === "error") {
      toast.error("AI tool not found", { description: toolDetail.message });
      onNavigateToList();
      return;
    }

    if (toolDetail.state !== "loaded") {
      return;
    }

    const values = toFormValues(toolDetail.item);
    setTool(toolDetail.item);
    setFormValues(values);
    setInitialValues(values);
    setErrors({});
  }, [onNavigateToList, toolDetail, toolId]);

  const columns = useMemo<ListPageColumn<AiTool>[]>(() => [
    { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { id: "source", header: "Source", cell: (row) => <span className="text-muted-foreground">{row.source}</span> },
    { id: "category", header: "Category", cell: (row) => <span className="text-muted-foreground">{row.category}</span> },
    { id: "status", header: "Status", cell: (row) => <span className="text-muted-foreground">{statusLabels[row.status]}</span> },
    { id: "riskTier", header: "Risk", sortable: false, cell: (row) => <span className="text-muted-foreground">{row.riskTier}</span> }
  ], []);

  const filters = useMemo<ListPageFilter[]>(() => [
    {
      id: "source",
      label: "Filter by source",
      placeholder: "Filter by source",
      allLabel: "All sources",
      options: [
        { value: "system", label: "System" },
        { value: "custom", label: "Custom" }
      ]
    },
    {
      id: "status",
      label: "Filter by tool status",
      placeholder: "Filter by status",
      allLabel: "All statuses",
      options: Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
    }
  ], []);

  const isDirty = JSON.stringify(formValues) !== JSON.stringify(initialValues);
  const isSystemTool = !isCreateMode && tool?.source === "system";

  function handleFieldChange<Key extends keyof ToolFormValues>(field: Key, value: ToolFormValues[Key]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSave() {
    if (isSystemTool) {
      return;
    }

    const { body, errors: nextErrors } = parseRequestBody(formValues);
    if (!body) {
      setErrors(nextErrors);
      toast.error("Validation failed", { description: "Fix the highlighted fields before saving." });
      return;
    }

    setSaving(true);

    try {
      if (isCreateMode || !tool) {
        const created = await fetchJson<AiTool>(apiRoutes.aiTools, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        toast.success("AI tool created");
        onNavigateToDetail(created.id);
        return;
      }

      const updated = await fetchJson<AiTool>(`${apiRoutes.aiTools}/${tool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const nextValues = toFormValues(updated);
      setTool(updated);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      toast.success("AI tool updated");
    } catch (error) {
      toast.error("AI tool request failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setSaving(false);
    }
  }

  if (!toolId) {
    return (
      <ListPage
        title="AI Tools"
        recordLabel="AI Tool"
        columns={columns}
        query={toolList.query}
        dataState={toolList.dataState}
        items={toolList.items}
        meta={toolList.meta}
        filters={filters}
        emptyMessage="No AI tools have been configured yet."
        onSearchChange={toolList.setSearch}
        onFilterChange={toolList.setFilter}
        onSortChange={toolList.setSort}
        onPageChange={toolList.setPage}
        onPageSizeChange={toolList.setPageSize}
        onRetry={toolList.refetch}
        onAddRecord={onNavigateToCreate}
        onRowClick={(row) => onNavigateToDetail(row.id)}
      />
    );
  }

  return (
    <DetailPage
      title={isCreateMode ? "New AI tool" : tool?.name ?? "AI tool detail"}
      breadcrumbs={["Start", "AI Tools", isCreateMode ? "New" : tool?.name ?? "Detail"]}
      isDirty={isSystemTool ? false : isDirty}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={handleSave}
      onDismiss={() => {
        setFormValues(initialValues);
        setErrors({});
      }}
      saveLabel={isSystemTool ? "System tool" : "Save"}
      sidebar={tool ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
          <DetailSidebarItem label="Source">{tool.source}</DetailSidebarItem>
          <DetailSidebarItem label="Category">{tool.category}</DetailSidebarItem>
          <DetailSidebarItem label="Risk tier">{tool.riskTier}</DetailSidebarItem>
          <DetailSidebarItem label="Updated">{formatTimestamp(tool.updatedAt)}</DetailSidebarItem>
        </div>
      ) : undefined}
    >
      <DetailFieldGroup title="Tool Metadata" className="bg-card/70">
        <DetailField label="Name" required {...definedString(errors.name)}>
          <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Status">
          <Select value={formValues.status} onValueChange={(value) => handleFieldChange("status", value as AiToolStatus)} disabled={Boolean(isSystemTool)}>
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
        <DetailField label="Adapter">
          <Select value={formValues.adapter} onValueChange={(value) => handleFieldChange("adapter", value as ToolAdapter)} disabled={Boolean(isSystemTool)}>
            <SelectTrigger aria-label="Adapter">
              <SelectValue placeholder="Select adapter" />
            </SelectTrigger>
            <SelectContent>
              {adapterOptions.map((adapter) => (
                <SelectItem key={adapter} value={adapter}>{adapter}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Binary">
          <Input value={formValues.binary} onChange={(event) => handleFieldChange("binary", event.target.value)} aria-label="Binary" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Category">
          <Select value={formValues.category} onValueChange={(value) => handleFieldChange("category", value as ToolCategory)} disabled={Boolean(isSystemTool)}>
            <SelectTrigger aria-label="Category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Risk tier">
          <Select value={formValues.riskTier} onValueChange={(value) => handleFieldChange("riskTier", value as ToolRiskTier)} disabled={Boolean(isSystemTool)}>
            <SelectTrigger aria-label="Risk tier">
              <SelectValue placeholder="Select risk tier" />
            </SelectTrigger>
            <SelectContent>
              {riskTierOptions.map((riskTier) => (
                <SelectItem key={riskTier} value={riskTier}>{riskTier}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Description" className="md:col-span-2">
          <Input value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Notes" className="md:col-span-2">
          <Input value={formValues.notes} onChange={(event) => handleFieldChange("notes", event.target.value)} aria-label="Notes" disabled={Boolean(isSystemTool)} />
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Schemas" className="bg-card/70">
        <DetailField label="Input schema" className="md:col-span-2" {...definedString(errors.inputSchemaText)}>
          <Textarea value={formValues.inputSchemaText} onChange={(event) => handleFieldChange("inputSchemaText", event.target.value)} aria-label="Input schema" rows={10} className="font-mono text-sm" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Output schema" className="md:col-span-2" {...definedString(errors.outputSchemaText)}>
          <Textarea value={formValues.outputSchemaText} onChange={(event) => handleFieldChange("outputSchemaText", event.target.value)} aria-label="Output schema" rows={10} className="font-mono text-sm" disabled={Boolean(isSystemTool)} />
        </DetailField>
      </DetailFieldGroup>
    </DetailPage>
  );
}
