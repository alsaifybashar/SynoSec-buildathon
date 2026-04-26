import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiTool,
  type ToolBuiltinActionKey,
  type AiToolRunResult,
  type AiToolStatus,
  type AiToolKind,
  type CreateAiToolBody,
  type ToolCategory,
  type ToolRiskTier
} from "@synosec/contracts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { aiToolsResource } from "@/features/ai-tools/resource";
import { aiToolTransfer } from "@/features/ai-tools/transfer";
import { fetchJson } from "@/shared/lib/api";
import { useResourceDetail } from "@/shared/hooks/use-resource-detail";
import { useResourceList } from "@/shared/hooks/use-resource-list";
import { type ResourceClient, type AiToolsQuery } from "@/shared/lib/resource-client";
import { exportResourceRecords, importResourceRecords } from "@/shared/lib/resource-transfer";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage } from "@/shared/components/detail-page";
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
  bashSource: string;
  category: ToolCategory;
  riskTier: ToolRiskTier;
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

const categoryOptions: ToolCategory[] = ["topology", "auth", "web", "network", "content", "dns", "subdomain", "cloud", "utility", "password", "windows", "kubernetes", "forensics", "reversing", "exploitation"];
const riskTierOptions: ToolRiskTier[] = ["passive", "active", "controlled-exploit"];
const kindLabels: Record<AiToolKind, string> = {
  "builtin-action": "Built-in Action",
  "semantic-family": "Capability Tool",
  "raw-adapter": "Raw Adapter"
};

function createDefaultInputSchemaText() {
  return JSON.stringify({ type: "object", properties: {} }, null, 2);
}

function createDefaultOutputSchemaText() {
  return JSON.stringify({ type: "object", properties: { output: { type: "string" } }, required: ["output"] }, null, 2);
}

function createEmptyFormValues(): ToolFormValues {
  return {
    name: "",
    status: "active",
    source: "custom",
    description: "",
    bashSource: "#!/usr/bin/env bash\nset -euo pipefail\nprintf '%s\\n' 'Tool implementation is required before execution.' >&2\nexit 1\n",
    category: "utility",
    riskTier: "passive",
    timeoutMsText: "",
    inputSchemaText: createDefaultInputSchemaText(),
    outputSchemaText: createDefaultOutputSchemaText()
  };
}

function toFormValues(tool: AiTool): ToolFormValues {
  return {
    name: tool.name,
    status: tool.status,
    source: tool.source,
    description: tool.description ?? "",
    bashSource: tool.bashSource ?? "",
    category: tool.category,
    riskTier: tool.riskTier,
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
      executorType: "bash",
      bashSource: values.bashSource,
      category: values.category,
      riskTier: values.riskTier,
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

function describeBuiltinAction(tool: AiTool) {
  const actionKey = tool.builtinActionKey;
  if (!actionKey) {
    return null;
  }

  const labels: Partial<Record<ToolBuiltinActionKey, string>> = {
    log_progress: "Workflow built-in: persists a short operator-visible progress update into the workflow transcript.",
    report_finding: "Workflow built-in: persists a structured finding and supplies the metadata used to project execution-report graph nodes and edges.",
    complete_run: "Workflow built-in: marks the current workflow run as complete."
  };

  return labels[actionKey] ?? null;
}

function describeToolSurface(tool: AiTool) {
  if (tool.kind === "semantic-family") {
    return "Workflow-facing capability tool";
  }

  if (tool.kind === "builtin-action") {
    return "Workflow-facing control action";
  }

  return "Execution adapter and diagnostics object";
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

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  summary
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  summary?: string;
}) {
  return (
    <section className="rounded-[4px] border border-border/70 bg-card/50">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <div>
          <div className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.28em] text-muted-foreground">
            {title}
          </div>
          {summary ? <div className="mt-1 text-xs text-muted-foreground">{summary}</div> : null}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open ? <div className="border-t border-border/70 px-4 py-4">{children}</div> : null}
    </section>
  );
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
      setRunInputText(JSON.stringify({}, null, 2));
      setRunError(null);
      setRunResult(null);
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
    { id: "kind", header: "Kind", cell: (row) => <span className="text-muted-foreground">{kindLabels[row.kind ?? "raw-adapter"]}</span> },
    { id: "category", header: "Category", cell: (row) => <span className="text-muted-foreground">{row.category}</span> },
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
      id: "surface",
      label: "View surface",
      placeholder: "View surface",
      allLabel: "Primary capabilities",
      options: [
        { value: "primary", label: "Primary capabilities" },
        { value: "advanced", label: "Advanced and raw" },
        { value: "raw", label: "Raw adapters only" }
      ]
    },
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
  const isToolEditable = isCreateMode ? canCreateTool : canUpdateTool;
  const isBuiltinTool = tool?.executorType === "builtin";
  const isToolRunnable = !isCreateMode && tool?.executorType === "bash";
  const exampleRunInput = useMemo(() => (tool ? JSON.stringify(createExampleRunInput(tool), null, 2) : JSON.stringify({}, null, 2)), [tool]);

  function handleFieldChange<Key extends keyof ToolFormValues>(field: Key, value: ToolFormValues[Key]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleUseExampleInput() {
    setRunInputText(exampleRunInput);
    setRunError(null);
  }

  function handleResetRunInput() {
    setRunInputText(JSON.stringify({}, null, 2));
    setRunError(null);
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
          emptyMessage="No capabilities matched the current surface."
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

  const currentToolName = isCreateMode ? "New AI tool" : tool?.name ?? "AI tool detail";

  const detailPageProps = {
    title: currentToolName,
    breadcrumbs: ["Start", "AI Tools", isCreateMode ? "New" : tool?.name ?? "Detail"],
    isDirty: isToolEditable ? isDirty : false,
    isSaving: saving,
    onBack: onNavigateToList,
    onSave: handleSave,
    onDismiss: () => {
      setFormValues(initialValues);
      setErrors({});
      setRunError(null);
    },
    saveLabel: isToolEditable ? "Save" : "Read only"
  };

  return (
    <DetailPage
      {...detailPageProps}
      {...(!isCreateMode && tool ? { subtitle: tool.id, timestamp: formatTimestamp(tool.updatedAt) } : {})}
      {...(!isCreateMode && tool?.source !== "system" ? { onExportJson: handleExportJson } : {})}
    >
      <section className="space-y-4">
        <DetailFieldGroup title="Definition" className="bg-card/70">
          <DetailField label="Name" required {...definedString(errors.name)}>
            <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" disabled={!isToolEditable} />
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
          {tool ? (
            <>
              <DetailField label="Kind">
                <Input value={kindLabels[tool.kind ?? "raw-adapter"]} aria-label="Kind" disabled />
              </DetailField>
              <DetailField label="Surface role">
                <Input value={describeToolSurface(tool)} aria-label="Surface role" disabled />
              </DetailField>
            </>
          ) : null}
          {!isBuiltinTool ? (
            <DetailField label="Timeout (ms)" hint="Integer duration. Values under 1000ms are rejected." {...definedString(errors.timeoutMsText)}>
              <Input value={formValues.timeoutMsText} onChange={(event) => handleFieldChange("timeoutMsText", event.target.value)} aria-label="Timeout milliseconds" disabled={!isToolEditable} />
            </DetailField>
          ) : null}
        </DetailFieldGroup>

        {tool ? (
          <DetailFieldGroup title="Capability Runtime" className="bg-card/70">
            <DetailField label="Availability">
              <Input
                value={[
                  tool.runtimeStateSummary?.cataloged ? "cataloged" : "not cataloged",
                  tool.runtimeStateSummary?.installed ? "installed" : "not installed",
                  tool.runtimeStateSummary?.executable ? "executable" : "not executable",
                  tool.runtimeStateSummary?.granted ? "grantable" : "diagnostics only"
                ].join(" · ")}
                aria-label="Availability"
                disabled
              />
            </DetailField>
            <DetailField label="Candidate adapters">
              <Input value={(tool.candidateToolIds ?? []).length > 0 ? (tool.candidateToolIds ?? []).join(", ") : "None"} aria-label="Candidate adapters" disabled />
            </DetailField>
            <DetailField label="Covered adapters" className="md:col-span-2">
              <Textarea value={(tool.coveredToolIds ?? []).length > 0 ? (tool.coveredToolIds ?? []).join(", ") : "None"} aria-label="Covered adapters" rows={3} disabled />
            </DetailField>
          </DetailFieldGroup>
        ) : null}

        {!isBuiltinTool ? (
          <>
            <div className={cn("grid gap-4", isToolRunnable && tool ? "xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)]" : "")}>
              <DetailFieldGroup title="Source Code" className="bg-card/70">
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

              {isToolRunnable && tool ? (
                <DetailFieldGroup title="Run Tool" className="bg-card/70">
                  <DetailField label="Input JSON" className="md:col-span-2">
                    <Textarea
                      value={runInputText}
                      onChange={(event) => {
                        setRunInputText(event.target.value);
                        setRunError(null);
                      }}
                      aria-label="Run input JSON"
                      rows={16}
                      className="font-mono text-sm"
                    />
                  </DetailField>
                  <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleUseExampleInput} disabled={runningTool}>Use Example Input</Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleResetRunInput} disabled={runningTool}>Reset Input</Button>
                    <Button type="button" onClick={() => void handleRunTool()} disabled={runningTool}>{runningTool ? "Running…" : "Run Tool"}</Button>
                  </div>
                  <div className={cn(
                    "md:col-span-2 rounded-[4px] border p-4",
                    runError
                      ? "border-destructive/30 bg-destructive/10"
                      : runResult
                        ? (runResult.exitCode === 0 ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10")
                        : "border-border/70 bg-background/70"
                  )}>
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-muted-foreground">Run status</p>
                    <p className="mt-2 text-sm text-foreground">
                      {runError ? runError : (runResult ? describeRunStatus(runResult) : "No run executed yet.")}
                    </p>
                    {runResult ? (
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>exit code: {runResult.exitCode}</span>
                        <span>duration: {runResult.durationMs}ms</span>
                        {runResult.target ? <span>target: {runResult.target}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </DetailFieldGroup>
              ) : null}
            </div>
          </>
        ) : null}

        {isBuiltinTool && tool ? (
          <div className="rounded-[4px] border border-border/70 bg-background/70 p-4">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-muted-foreground">Built-in action</p>
            <p className="mt-2 text-sm text-foreground">{describeBuiltinAction(tool) ?? "Built-in action provided by a backend execution engine."}</p>
          </div>
        ) : null}

        {isToolRunnable && tool ? null : (
          <div className="rounded-[4px] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            {isBuiltinTool
              ? "Built-in tools do not expose a runnable shell test console here."
              : "Save a runnable bash tool to use the test console."}
          </div>
        )}
      </section>
    </DetailPage>
  );
}
