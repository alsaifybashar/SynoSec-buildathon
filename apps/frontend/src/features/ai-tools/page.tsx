import { startTransition, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiTool,
  type ToolBuiltinActionKey,
  type AiToolRunResult,
  type AiToolStatus,
  type CreateAiToolBody,
  type ToolPrivilegeProfile,
  type ToolSandboxProfile,
  type ToolCategory,
  type ToolRiskTier
} from "@synosec/contracts";
import { aiToolsResource } from "@/features/ai-tools/resource";
import { aiToolTransfer } from "@/features/ai-tools/transfer";
import { fetchJson } from "@/shared/lib/api";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { useResourceList } from "@/shared/hooks/use-resource-list";
import { listPageSizes, type ResourceClient, type AiToolsQuery } from "@/shared/lib/resource-client";
import { exportResourceRecords, importResourceRecords } from "@/shared/lib/resource-transfer";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/shared/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { Textarea } from "@/shared/ui/textarea";
import { BashEditor } from "@/shared/ui/bash-editor";

type ToolFormValues = {
  name: string;
  status: AiToolStatus;
  source: "custom" | "system";
  description: string;
  binary: string;
  bashSource: string;
  capabilitiesText: string;
  category: ToolCategory;
  riskTier: ToolRiskTier;
  notes: string;
  sandboxProfile: ToolSandboxProfile;
  privilegeProfile: ToolPrivilegeProfile;
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
const sandboxProfileOptions: ToolSandboxProfile[] = ["network-recon", "read-only-parser", "active-recon", "controlled-exploit-lab"];
const privilegeProfileOptions: ToolPrivilegeProfile[] = ["read-only-network", "active-network", "controlled-exploit"];

function createEmptyFormValues(): ToolFormValues {
  return {
    name: "",
    status: "active",
    source: "custom",
    description: "",
    binary: "",
    bashSource: "#!/usr/bin/env bash\nset -euo pipefail\nprintf '%s\\n' 'Tool implementation is required before execution.' >&2\nexit 1\n",
    capabilitiesText: "",
    category: "utility",
    riskTier: "passive",
    notes: "",
    sandboxProfile: "read-only-parser",
    privilegeProfile: "read-only-network",
    timeoutMsText: "",
    inputSchemaText: JSON.stringify({ type: "object", properties: {} }, null, 2),
    outputSchemaText: JSON.stringify({ type: "object", properties: { output: { type: "string" } }, required: ["output"] }, null, 2)
  };
}

function toFormValues(tool: AiTool): ToolFormValues {
  return {
    name: tool.name,
    status: tool.status,
    source: tool.source,
    description: tool.description ?? "",
    binary: tool.binary ?? "",
    bashSource: tool.bashSource ?? "",
    capabilitiesText: tool.capabilities.join("\n"),
    category: tool.category,
    riskTier: tool.riskTier,
    notes: tool.notes ?? "",
    sandboxProfile: tool.sandboxProfile,
    privilegeProfile: tool.privilegeProfile,
    timeoutMsText: String(tool.timeoutMs),
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
  if (!values.description.trim()) {
    errors.description = "Description is required.";
  }
  if (!values.bashSource.trim()) {
    errors.bashSource = "Bash source is required.";
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
      description: values.description.trim(),
      binary: values.binary.trim() || null,
      executorType: "bash",
      bashSource: values.bashSource,
      capabilities: values.capabilitiesText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      category: values.category,
      riskTier: values.riskTier,
      notes: values.notes.trim() || null,
      sandboxProfile: values.sandboxProfile,
      privilegeProfile: values.privilegeProfile,
      timeoutMs: timeoutMs ?? 30000,
      inputSchema: inputSchema as Record<string, unknown>,
      outputSchema: outputSchema as Record<string, unknown>
    },
    errors: {}
  };
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCrudCapability(value: boolean) {
  return value ? "Allowed" : "Blocked";
}

function describeSourceBehavior(tool: AiTool) {
  if (tool.source === "system") {
    return "Built-in system actions are listed here but remain read-only.";
  }

  return "Edits remain on the custom tool record.";
}

function describeBuiltinAction(tool: AiTool) {
  const actionKey = tool.builtinActionKey;
  if (!actionKey) {
    return null;
  }

  const labels: Record<ToolBuiltinActionKey, string> = {
    report_finding: "Workflow built-in: persists a structured workflow finding.",
    deep_analysis: "Attack map built-in: performs deeper orchestrator analysis on a significant finding.",
    attack_chain_correlation: "Attack map built-in: correlates confirmed findings into chained attack paths."
  };

  return labels[actionKey];
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

function riskBadgeClassName(riskTier: ToolRiskTier) {
  switch (riskTier) {
    case "passive":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
    case "active":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700";
    case "controlled-exploit":
      return "border-red-500/30 bg-red-500/10 text-red-700";
  }
}

function describeRunStatus(result: AiToolRunResult | null) {
  if (!result) {
    return "";
  }

  if (result.exitCode === 0) {
    return result.statusReason ? `Succeeded: ${result.statusReason}` : "Succeeded";
  }

  return result.statusReason ? `Failed: ${result.statusReason}` : `Failed with exit code ${result.exitCode}`;
}

function createExampleRunInput(tool: AiTool) {
  const properties = tool.inputSchema["properties"];
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return {};
  }

  const example: Record<string, string | number | boolean | string[]> = {};
  for (const [key, rawSchema] of Object.entries(properties)) {
    if (!rawSchema || typeof rawSchema !== "object" || Array.isArray(rawSchema)) {
      continue;
    }

    const schema = rawSchema as Record<string, unknown>;
    if (schema["default"] !== undefined) {
      const value = schema["default"];
      if (
        typeof value === "string"
        || typeof value === "number"
        || typeof value === "boolean"
        || (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
      ) {
        example[key] = value;
        continue;
      }
    }

    switch (schema["type"]) {
      case "string":
        example[key] = "";
        break;
      case "number":
      case "integer":
        example[key] = 0;
        break;
      case "boolean":
        example[key] = false;
        break;
      case "array":
        example[key] = [];
        break;
      default:
        break;
    }
  }

  return example;
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
  const [runInputText, setRunInputText] = useState(JSON.stringify({}, null, 2));
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<AiToolRunResult | null>(null);
  const [runningTool, setRunningTool] = useState(false);
  const isCreateMode = toolId === "new";
  const aiToolsListResource = useMemo<ResourceClient<AiTool, AiToolsQuery>>(() => ({
    ...aiToolsResource,
    defaultQuery: {
      ...aiToolsResource.defaultQuery,
      pageSize: 50
    }
  }), []);
  const toolList = useResourceList(aiToolsListResource);
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
    setRunInputText(JSON.stringify(createExampleRunInput(toolDetail.item), null, 2));
    setRunError(null);
    setRunResult(null);
  }, [onNavigateToList, toolDetail, toolId]);

  const columns = useMemo<ListPageColumn<AiTool>[]>(() => [
    { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { id: "source", header: "Source", cell: (row) => <span className="text-muted-foreground">{row.source}</span> },
    { id: "category", header: "Category", cell: (row) => <span className="text-muted-foreground">{row.category}</span> },
    { id: "status", header: "Status", cell: (row) => <span className="text-muted-foreground">{statusLabels[row.status]}</span> },
    {
      id: "riskTier",
      header: "Risk",
      cell: (row) => (
        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium capitalize", riskBadgeClassName(row.riskTier))}>
          {row.riskTier}
        </span>
      )
    }
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
      id: "category",
      label: "Filter by tool category",
      placeholder: "Filter by category",
      allLabel: "All categories",
      options: categoryOptions.map((category) => ({ value: category, label: category }))
    },
    {
      id: "status",
      label: "Filter by tool status",
      placeholder: "Filter by status",
      allLabel: "All statuses",
      options: Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
    },
    {
      id: "riskTier",
      label: "Filter by risk tier",
      placeholder: "Filter by risk tier",
      allLabel: "All risk tiers",
      options: riskTierOptions.map((riskTier) => ({ value: riskTier, label: riskTier }))
    }
  ], []);

  const isDirty = JSON.stringify(formValues) !== JSON.stringify(initialValues);
  const canCreateTool = aiToolsResource.capabilities.canCreate;
  const canUpdateTool = !isCreateMode && tool ? aiToolsResource.capabilities.canUpdate(tool) : canCreateTool;
  const canDeleteTool = tool ? aiToolsResource.capabilities.canDelete(tool) : false;
  const isToolEditable = isCreateMode ? canCreateTool : canUpdateTool;
  const isBuiltinTool = tool?.executorType === "builtin";
  const isToolRunnable = !isCreateMode && tool?.executorType === "bash";

  function handleFieldChange<Key extends keyof ToolFormValues>(field: Key, value: ToolFormValues[Key]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSave() {
    if (!isToolEditable) {
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

  async function handleRunTool() {
    if (!tool || isCreateMode) {
      return;
    }

    let parsedInput: Record<string, unknown>;
    try {
      parsedInput = JSON.parse(runInputText) as Record<string, unknown>;
    } catch {
      setRunError("Run input must be valid JSON.");
      setRunResult(null);
      return;
    }

    setRunningTool(true);
    setRunError(null);

    try {
      const result = await fetchJson<AiToolRunResult>(`${apiRoutes.aiTools}/${tool.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: parsedInput })
      });
      setRunResult(result);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Tool run failed.");
      setRunResult(null);
    } finally {
      setRunningTool(false);
    }
  }

  function handleExportJson() {
    if (!tool || tool.source === "system") {
      return;
    }

    exportResourceRecords(aiToolTransfer, [tool], `ai-tool-${tool.name}`);
  }

  async function handleImportJson(file: File) {
    try {
      const created = await importResourceRecords(aiToolTransfer, file);
      toast.success(created.length === 1 ? "AI tool imported" : `${created.length} AI tools imported`);
      toolList.refetch();
    } catch (error) {
      toast.error("AI tool import failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  function handleListExportJson(selected: AiTool) {
    exportResourceRecords(aiToolTransfer, [selected], `ai-tool-${selected.name}`);
  }

  async function handleDeleteTool(selected: AiTool) {
    await fetchJson<void>(`${apiRoutes.aiTools}/${selected.id}`, {
      method: "DELETE"
    });
    toolList.refetch();
  }

  if (!toolId) {
    return (
      <div className="space-y-3 pb-6">
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
          onImportJson={handleImportJson}
          getRowLabel={(row) => row.name}
          onExportRowJson={handleListExportJson}
          canExportRow={(row) => row.source !== "system"}
          onDeleteRow={handleDeleteTool}
          canDeleteRow={(row) => aiToolsResource.capabilities.canDelete(row)}
        />
      </div>
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
      isDirty={isToolEditable ? isDirty : false}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={handleSave}
      onDismiss={() => {
        setFormValues(initialValues);
        setErrors({});
      }}
      onExportJson={!isCreateMode && tool?.source !== "system" ? handleExportJson : undefined}
      saveLabel={isToolEditable ? "Save" : "Read only"}
      sidebar={tool ? (
        <>
          <DetailSidebarItem label="Source">{tool.source}</DetailSidebarItem>
          <DetailSidebarItem label="Source behavior">{describeSourceBehavior(tool)}</DetailSidebarItem>
          <DetailSidebarItem label="Executor">{tool.executorType}</DetailSidebarItem>
          {tool.builtinActionKey ? <DetailSidebarItem label="Built-in key">{tool.builtinActionKey}</DetailSidebarItem> : null}
          <DetailSidebarItem label="Status">{statusLabels[tool.status]}</DetailSidebarItem>
          <DetailSidebarItem label="Create">{formatCrudCapability(canCreateTool)}</DetailSidebarItem>
          <DetailSidebarItem label="Update">{formatCrudCapability(canUpdateTool)}</DetailSidebarItem>
          <DetailSidebarItem label="Delete">{formatCrudCapability(canDeleteTool)}</DetailSidebarItem>
          <DetailSidebarItem label="Updated">{formatTimestamp(tool.updatedAt)}</DetailSidebarItem>
        </>
      ) : undefined}
    >
      <DetailFieldGroup title="Definition" className="bg-card/70">
        <DetailField label="Name" required {...definedString(errors.name)}>
          <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" disabled={!isToolEditable} />
        </DetailField>
        <DetailField label="Status">
          <Select value={formValues.status} onValueChange={(value) => handleFieldChange("status", value as AiToolStatus)} disabled={!isToolEditable}>
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
        <DetailField label="Category">
          <Select value={formValues.category} onValueChange={(value) => handleFieldChange("category", value as ToolCategory)} disabled={!isToolEditable}>
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
          <Select value={formValues.riskTier} onValueChange={(value) => handleFieldChange("riskTier", value as ToolRiskTier)} disabled={!isToolEditable}>
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
        <DetailField label="Description" required className="md:col-span-2" {...definedString(errors.description)}>
          <Input value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" disabled={!isToolEditable} />
        </DetailField>
        <DetailField label="Notes" className="md:col-span-2">
          <Input value={formValues.notes} onChange={(event) => handleFieldChange("notes", event.target.value)} aria-label="Notes" disabled={!isToolEditable} />
        </DetailField>
      </DetailFieldGroup>

      {tool?.executorType === "builtin" ? (
        <DetailFieldGroup title="Built-in Action" className="bg-card/70">
          <DetailField label="Execution owner" className="md:col-span-2">
            <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-foreground">
              {describeBuiltinAction(tool) ?? "Built-in action provided by a backend execution engine."}
            </div>
          </DetailField>
        </DetailFieldGroup>
      ) : null}

      <DetailFieldGroup title="Evidence Contract" className="bg-card/70">
        <DetailField label="Example input" className="md:col-span-2">
          <Textarea
            value={tool ? JSON.stringify(createExampleRunInput(tool), null, 2) : ""}
            readOnly
            aria-label="Example tool input"
            rows={6}
            className="font-mono text-sm"
          />
        </DetailField>
        <DetailField label="Input schema" className="md:col-span-2" {...definedString(errors.inputSchemaText)}>
          <Textarea value={formValues.inputSchemaText} onChange={(event) => handleFieldChange("inputSchemaText", event.target.value)} aria-label="Input schema" rows={10} className="font-mono text-sm" disabled={!isToolEditable} />
        </DetailField>
        <DetailField label="Structured result schema" className="md:col-span-2" {...definedString(errors.outputSchemaText)}>
          <p className="mb-2 text-sm leading-6 text-muted-foreground">
            Evidence tools return a structured result envelope. `output` is required. `observations` are optional evidence records and are not persisted findings.
          </p>
          <Textarea value={formValues.outputSchemaText} onChange={(event) => handleFieldChange("outputSchemaText", event.target.value)} aria-label="Output schema" rows={10} className="font-mono text-sm" disabled={!isToolEditable} />
        </DetailField>
      </DetailFieldGroup>

      {isToolRunnable && tool ? (
        <DetailFieldGroup title="Test Tool" className="bg-card/70">
          <DetailField label="Input JSON" className="md:col-span-2">
            <Textarea
              value={runInputText}
              onChange={(event) => {
                setRunInputText(event.target.value);
                setRunError(null);
              }}
              aria-label="Run input JSON"
              rows={10}
              className="font-mono text-sm"
            />
          </DetailField>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="button" onClick={() => void handleRunTool()} disabled={runningTool}>
              {runningTool ? "Running…" : "Run Tool"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!tool) {
                  return;
                }
                setRunInputText(JSON.stringify(createExampleRunInput(tool), null, 2));
                setRunError(null);
              }}
              disabled={runningTool}
            >
              Use Example Input
            </Button>
            {runError ? <p className="text-sm text-destructive">{runError}</p> : null}
          </div>
          <DetailField label="Last run status" className="md:col-span-2">
            <Input
              value={describeRunStatus(runResult)}
              readOnly
              aria-label="Tool last run status"
            />
          </DetailField>
          <DetailField label="Command preview" className="md:col-span-2">
            <Textarea
              value={runResult?.commandPreview ?? ""}
              readOnly
              aria-label="Tool command preview"
              rows={3}
              className="font-mono text-sm"
            />
          </DetailField>
          <DetailField label="Raw output" className="md:col-span-2">
            <Textarea
              value={runResult?.output ?? ""}
              readOnly
              aria-label="Tool raw output"
              rows={8}
              className="font-mono text-sm"
            />
          </DetailField>
          <DetailField label="Parsed evidence result" className="md:col-span-2">
            <p className="mb-2 text-sm leading-6 text-muted-foreground">
              Parsed observations here become evidence artifacts. Findings are created separately by workflow system actions such as vulnerability reporting.
            </p>
            <Textarea
              value={runResult ? JSON.stringify({
                exitCode: runResult.exitCode,
                statusReason: runResult.statusReason,
                durationMs: runResult.durationMs,
                target: runResult.target,
                port: runResult.port,
                observations: runResult.observations
              }, null, 2) : ""}
              readOnly
              aria-label="Tool parsed result"
              rows={12}
              className="font-mono text-sm"
            />
          </DetailField>
        </DetailFieldGroup>
      ) : null}

      {!isBuiltinTool ? (
        <DetailFieldGroup title="Execution" className="bg-card/70">
        <DetailField label="Binary">
          <Input value={formValues.binary} onChange={(event) => handleFieldChange("binary", event.target.value)} aria-label="Binary" disabled={!isToolEditable} />
        </DetailField>
        <DetailField label="Timeout (ms)" {...definedString(errors.timeoutMsText)}>
          <Input value={formValues.timeoutMsText} onChange={(event) => handleFieldChange("timeoutMsText", event.target.value)} aria-label="Timeout milliseconds" disabled={!isToolEditable} />
        </DetailField>
        <DetailField label="Sandbox profile">
          <Select value={formValues.sandboxProfile} onValueChange={(value) => handleFieldChange("sandboxProfile", value as ToolSandboxProfile)} disabled={!isToolEditable}>
            <SelectTrigger aria-label="Sandbox profile">
              <SelectValue placeholder="Select sandbox profile" />
            </SelectTrigger>
            <SelectContent>
              {sandboxProfileOptions.map((profile) => (
                <SelectItem key={profile} value={profile}>{profile}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Privilege profile">
          <Select value={formValues.privilegeProfile} onValueChange={(value) => handleFieldChange("privilegeProfile", value as ToolPrivilegeProfile)} disabled={!isToolEditable}>
            <SelectTrigger aria-label="Privilege profile">
              <SelectValue placeholder="Select privilege profile" />
            </SelectTrigger>
            <SelectContent>
              {privilegeProfileOptions.map((profile) => (
                <SelectItem key={profile} value={profile}>{profile}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Capabilities" className="md:col-span-2">
          <Textarea value={formValues.capabilitiesText} onChange={(event) => handleFieldChange("capabilitiesText", event.target.value)} aria-label="Capabilities" rows={4} className="font-mono text-sm" disabled={!isToolEditable} />
        </DetailField>
        <DetailField label="Bash source" required className="md:col-span-2" {...definedString(errors.bashSource)}>
          <BashEditor
            value={formValues.bashSource}
            onChange={(next) => handleFieldChange("bashSource", next)}
            disabled={!isToolEditable}
            filename={formValues.name ? `${formValues.name.replace(/[^A-Za-z0-9._-]+/g, "-").toLowerCase()}.sh` : "tool.sh"}
            aria-label="Bash source"
          />
        </DetailField>
        </DetailFieldGroup>
      ) : null}
    </DetailPage>
  );
}
