import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiTool,
  type AiToolStatus,
  type CreateAiToolBody,
  type ToolExecutionMode,
  type ToolPrivilegeProfile,
  type ToolSandboxProfile,
  type ToolCategory,
  type ToolRiskTier
} from "@synosec/contracts";
import { fetchJson } from "@/lib/api";
import { useResourceDetail } from "@/hooks/useResourceDetail";
import { useResourceList } from "@/hooks/useResourceList";
import { aiToolsResource } from "@/lib/resources";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/components/list-page";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ToolFormValues = {
  name: string;
  status: AiToolStatus;
  source: "custom" | "system";
  description: string;
  binary: string;
  scriptPath: string;
  capabilitiesText: string;
  category: ToolCategory;
  riskTier: ToolRiskTier;
  notes: string;
  executionMode: ToolExecutionMode;
  sandboxProfile: ToolSandboxProfile | "";
  privilegeProfile: ToolPrivilegeProfile | "";
  defaultArgsText: string;
  timeoutMsText: string;
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
const executionModeOptions: ToolExecutionMode[] = ["catalog", "sandboxed"];
const sandboxProfileOptions: ToolSandboxProfile[] = ["network-recon", "read-only-parser", "active-recon", "controlled-exploit-lab"];
const privilegeProfileOptions: ToolPrivilegeProfile[] = ["read-only-network", "active-network", "controlled-exploit"];

function createEmptyFormValues(): ToolFormValues {
  return {
    name: "",
    status: "active",
    source: "custom",
    description: "",
    binary: "",
    scriptPath: "",
    capabilitiesText: "",
    category: "utility",
    riskTier: "passive",
    notes: "",
    executionMode: "catalog",
    sandboxProfile: "",
    privilegeProfile: "",
    defaultArgsText: "",
    timeoutMsText: "",
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
    binary: tool.binary ?? "",
    scriptPath: tool.scriptPath ?? "",
    capabilitiesText: tool.capabilities.join("\n"),
    category: tool.category,
    riskTier: tool.riskTier,
    notes: tool.notes ?? "",
    executionMode: tool.executionMode,
    sandboxProfile: tool.sandboxProfile ?? "",
    privilegeProfile: tool.privilegeProfile ?? "",
    defaultArgsText: tool.defaultArgs.join("\n"),
    timeoutMsText: tool.timeoutMs == null ? "" : String(tool.timeoutMs),
    inputSchemaText: JSON.stringify(tool.inputSchema, null, 2),
    outputSchemaText: JSON.stringify(tool.outputSchema, null, 2)
  };
}

function parseRequestBody(values: ToolFormValues): { body?: CreateAiToolBody; errors: Partial<Record<keyof ToolFormValues, string>> } {
  const errors: Partial<Record<keyof ToolFormValues, string>> = {};
  let inputSchema: unknown;
  let outputSchema: unknown;
  let timeoutMs: number | null = null;

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

  if (values.timeoutMsText.trim()) {
    const parsed = Number(values.timeoutMsText);
    if (!Number.isInteger(parsed) || parsed < 1000) {
      errors.timeoutMsText = "Timeout must be an integer of at least 1000ms.";
    } else {
      timeoutMs = parsed;
    }
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
      binary: values.binary.trim() || null,
      scriptPath: values.scriptPath.trim() || null,
      capabilities: values.capabilitiesText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      category: values.category,
      riskTier: values.riskTier,
      notes: values.notes.trim() || null,
      executionMode: values.executionMode,
      sandboxProfile: values.sandboxProfile || null,
      privilegeProfile: values.privilegeProfile || null,
      defaultArgs: values.defaultArgsText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      timeoutMs,
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
  toolNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  toolId?: string;
  toolNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
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
      const empty = createEmptyFormValues();
      setTool(null);
      setFormValues(empty);
      setInitialValues(empty);
      setErrors({});
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
        onNavigateToDetail(created.id, created.name);
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
        onRowClick={(row) => onNavigateToDetail(row.id, row.name)}
      />
    );
  }

  if (!isCreateMode && toolDetail.state !== "loaded") {
    return (
      <DetailLoadingState
        title={toolNameHint ?? "AI tool detail"}
        breadcrumbs={["Start", "AI Tools", toolNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message="Loading AI tool..."
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
          <DetailSidebarItem label="Execution">{tool.executionMode}</DetailSidebarItem>
          <DetailSidebarItem label="Sandbox">{tool.sandboxProfile ?? "Not set"}</DetailSidebarItem>
          <DetailSidebarItem label="Privilege">{tool.privilegeProfile ?? "Not set"}</DetailSidebarItem>
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
        <DetailField label="Binary">
          <Input value={formValues.binary} onChange={(event) => handleFieldChange("binary", event.target.value)} aria-label="Binary" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Script path">
          <Input value={formValues.scriptPath} onChange={(event) => handleFieldChange("scriptPath", event.target.value)} aria-label="Script path" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Capabilities" className="md:col-span-2">
          <Textarea value={formValues.capabilitiesText} onChange={(event) => handleFieldChange("capabilitiesText", event.target.value)} aria-label="Capabilities" rows={4} className="font-mono text-sm" disabled={Boolean(isSystemTool)} />
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
        <DetailField label="Execution mode">
          <Select value={formValues.executionMode} onValueChange={(value) => handleFieldChange("executionMode", value as ToolExecutionMode)} disabled={Boolean(isSystemTool)}>
            <SelectTrigger aria-label="Execution mode">
              <SelectValue placeholder="Select execution mode" />
            </SelectTrigger>
            <SelectContent>
              {executionModeOptions.map((mode) => (
                <SelectItem key={mode} value={mode}>{mode}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Sandbox profile">
          <Select value={formValues.sandboxProfile || "__empty__"} onValueChange={(value) => handleFieldChange("sandboxProfile", value === "__empty__" ? "" : value as ToolSandboxProfile)} disabled={Boolean(isSystemTool)}>
            <SelectTrigger aria-label="Sandbox profile">
              <SelectValue placeholder="Select sandbox profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Not set</SelectItem>
              {sandboxProfileOptions.map((profile) => (
                <SelectItem key={profile} value={profile}>{profile}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Privilege profile">
          <Select value={formValues.privilegeProfile || "__empty__"} onValueChange={(value) => handleFieldChange("privilegeProfile", value === "__empty__" ? "" : value as ToolPrivilegeProfile)} disabled={Boolean(isSystemTool)}>
            <SelectTrigger aria-label="Privilege profile">
              <SelectValue placeholder="Select privilege profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Not set</SelectItem>
              {privilegeProfileOptions.map((profile) => (
                <SelectItem key={profile} value={profile}>{profile}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Default args" className="md:col-span-2">
          <Textarea value={formValues.defaultArgsText} onChange={(event) => handleFieldChange("defaultArgsText", event.target.value)} aria-label="Default args" rows={5} className="font-mono text-sm" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Timeout (ms)" {...definedString(errors.timeoutMsText)}>
          <Input value={formValues.timeoutMsText} onChange={(event) => handleFieldChange("timeoutMsText", event.target.value)} aria-label="Timeout milliseconds" disabled={Boolean(isSystemTool)} />
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
