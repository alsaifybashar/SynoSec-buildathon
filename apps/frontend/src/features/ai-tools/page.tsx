import { startTransition, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiTool,
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
import { PageHeader } from "@/shared/components/page-header";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { Spinner } from "@/shared/ui/spinner";
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
    bashSource: tool.bashSource,
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
  const [viewMode, setViewMode] = useState<"list" | "grouped">("list");
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

  const groupedItems = useMemo(() => {
    return toolList.items.reduce<Record<ToolCategory, AiTool[]>>((groups, item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
      return groups;
    }, {} as Record<ToolCategory, AiTool[]>);
  }, [toolList.items]);

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
    if (!tool) {
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

  const viewModeToggle = (
    <div className="flex items-center gap-2">
      <Button type="button" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")}>List View</Button>
      <Button type="button" variant={viewMode === "grouped" ? "default" : "outline"} onClick={() => setViewMode("grouped")}>Grouped View</Button>
    </div>
  );

  if (!toolId) {
    if (viewMode === "grouped") {
      return (
        <div className="space-y-3 pb-6">
          <PageHeader title="AI Tools" breadcrumbs={["Start", "AI Tools"]} />

          <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="flex flex-col gap-2 px-3 py-2.5 md:flex-row md:items-center md:gap-2.5">
              <div className="relative min-w-0 flex-1 md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={toolList.query.q ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    startTransition(() => toolList.setSearch(value));
                  }}
                  placeholder="search ai tools"
                  className="h-9 pl-9 font-mono text-[0.75rem] placeholder:normal-case placeholder:text-muted-foreground/70"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 md:ml-auto md:flex-nowrap">
                {filters.map((filter) => {
                  const selectedValue = typeof toolList.query[filter.id] === "string"
                    ? String(toolList.query[filter.id])
                    : "__all__";

                  return (
                    <div key={filter.id} className="md:w-[9.375rem] md:shrink-0">
                      <Select
                        value={selectedValue}
                        onValueChange={(value) => {
                          startTransition(() => toolList.setFilter(filter.id, value === "__all__" ? undefined : value));
                        }}
                      >
                        <SelectTrigger aria-label={filter.label} className="h-9 text-[0.75rem]">
                          <SelectValue placeholder={filter.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">{filter.allLabel}</SelectItem>
                          {filter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}

                <div aria-hidden className="hidden h-6 w-px bg-border/70 md:block" />
                <div className="ml-auto flex items-center gap-2 md:ml-0">
                  {viewModeToggle}
                  <Button onClick={onNavigateToCreate} className="h-9 text-[0.75rem]">Add AI Tool</Button>
                </div>
              </div>
            </div>
          </div>

          {toolList.dataState.state === "loading" && !toolList.dataState.data ? (
            <Card className="mx-3 border-border/70">
              <CardContent className="flex min-h-32 items-center justify-center py-8">
                <Spinner className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ) : toolList.dataState.state === "error" ? (
            <Card className="mx-3 border-destructive/20">
              <CardContent className="space-y-4 p-6 text-center">
                <p className="text-sm font-medium text-foreground">The tool list could not be loaded.</p>
                <p className="text-sm text-muted-foreground">{toolList.dataState.message}</p>
                <div>
                  <Button type="button" variant="outline" onClick={toolList.refetch}>Retry</Button>
                </div>
              </CardContent>
            </Card>
          ) : toolList.items.length === 0 ? (
            <div className="mx-6 mb-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No AI tools have been configured yet.
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <Card key={category} className="border-border/70">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                        <div>
                          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">{category}</h2>
                          <p className="text-xs text-muted-foreground">{items.length} tool{items.length === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="rounded-xl border border-border/70 bg-card/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/20"
                            onClick={() => onNavigateToDetail(item.id, item.name)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-foreground">{item.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{item.source} · {statusLabels[item.status]}</p>
                              </div>
                              <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium capitalize", riskBadgeClassName(item.riskTier))}>
                                {item.riskTier}
                              </span>
                            </div>
                            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.description ?? "No description provided."}</p>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 border-t border-border/70 px-4 py-4 text-[0.75rem] text-muted-foreground md:grid-cols-3 md:items-center">
                <div className="w-full md:w-[9.375rem]">
                  <Select
                    value={String(toolList.query.pageSize)}
                    onValueChange={(value) => {
                      startTransition(() => toolList.setPageSize(Number(value)));
                    }}
                  >
                    <SelectTrigger aria-label="Page size" className="h-9 text-[0.75rem]">
                      <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                      {listPageSizes.map((pageSize) => (
                        <SelectItem key={pageSize} value={String(pageSize)}>
                          {pageSize} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Button type="button" variant="outline" className="h-9 text-[0.75rem]" onClick={() => toolList.setPage(Math.max(1, toolList.meta.page - 1))} disabled={toolList.meta.page <= 1}>
                    Previous
                  </Button>
                  <span>Page {toolList.meta.page} of {toolList.meta.totalPages || 1}</span>
                  <Button type="button" variant="outline" className="h-9 text-[0.75rem]" onClick={() => toolList.setPage(toolList.meta.page + 1)} disabled={toolList.meta.totalPages === 0 || toolList.meta.page >= toolList.meta.totalPages}>
                    Next
                  </Button>
                </div>

                <div className="flex items-center justify-end">
                  <span>
                    {toolList.meta.total === 0
                      ? "0 results"
                      : `${(toolList.meta.page - 1) * toolList.meta.pageSize + 1}-${Math.min(toolList.meta.page * toolList.meta.pageSize, toolList.meta.total)} of ${toolList.meta.total}`}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3 pb-6">
        <div className="flex items-center justify-end gap-2">{viewModeToggle}</div>
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
          onDeleteRow={handleDeleteTool}
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
      isDirty={isSystemTool ? false : isDirty}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={handleSave}
      onDismiss={() => {
        setFormValues(initialValues);
        setErrors({});
      }}
      onExportJson={!isCreateMode ? handleExportJson : undefined}
      saveLabel={isSystemTool ? "System tool" : "Save"}
      sidebar={tool ? (
        <>
          <DetailSidebarItem label="Source">{tool.source}</DetailSidebarItem>
          <DetailSidebarItem label="Status">{statusLabels[tool.status]}</DetailSidebarItem>
          <DetailSidebarItem label="Updated">{formatTimestamp(tool.updatedAt)}</DetailSidebarItem>
        </>
      ) : undefined}
    >
      <DetailFieldGroup title="Definition" className="bg-card/70">
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
        <DetailField label="Description" required className="md:col-span-2" {...definedString(errors.description)}>
          <Input value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Notes" className="md:col-span-2">
          <Input value={formValues.notes} onChange={(event) => handleFieldChange("notes", event.target.value)} aria-label="Notes" disabled={Boolean(isSystemTool)} />
        </DetailField>
      </DetailFieldGroup>

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
          <Textarea value={formValues.inputSchemaText} onChange={(event) => handleFieldChange("inputSchemaText", event.target.value)} aria-label="Input schema" rows={10} className="font-mono text-sm" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Structured result schema" className="md:col-span-2" {...definedString(errors.outputSchemaText)}>
          <p className="mb-2 text-sm leading-6 text-muted-foreground">
            Evidence tools return a structured result envelope. `output` is required. `observations` are optional evidence records and are not persisted findings.
          </p>
          <Textarea value={formValues.outputSchemaText} onChange={(event) => handleFieldChange("outputSchemaText", event.target.value)} aria-label="Output schema" rows={10} className="font-mono text-sm" disabled={Boolean(isSystemTool)} />
        </DetailField>
      </DetailFieldGroup>

      {!isCreateMode && tool ? (
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

      <DetailFieldGroup title="Execution" className="bg-card/70">
        <DetailField label="Binary">
          <Input value={formValues.binary} onChange={(event) => handleFieldChange("binary", event.target.value)} aria-label="Binary" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Timeout (ms)" {...definedString(errors.timeoutMsText)}>
          <Input value={formValues.timeoutMsText} onChange={(event) => handleFieldChange("timeoutMsText", event.target.value)} aria-label="Timeout milliseconds" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Sandbox profile">
          <Select value={formValues.sandboxProfile} onValueChange={(value) => handleFieldChange("sandboxProfile", value as ToolSandboxProfile)} disabled={Boolean(isSystemTool)}>
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
          <Select value={formValues.privilegeProfile} onValueChange={(value) => handleFieldChange("privilegeProfile", value as ToolPrivilegeProfile)} disabled={Boolean(isSystemTool)}>
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
          <Textarea value={formValues.capabilitiesText} onChange={(event) => handleFieldChange("capabilitiesText", event.target.value)} aria-label="Capabilities" rows={4} className="font-mono text-sm" disabled={Boolean(isSystemTool)} />
        </DetailField>
        <DetailField label="Bash source" required className="md:col-span-2" {...definedString(errors.bashSource)}>
          <BashEditor
            value={formValues.bashSource}
            onChange={(next) => handleFieldChange("bashSource", next)}
            disabled={Boolean(isSystemTool)}
            filename={formValues.name ? `${formValues.name.replace(/[^A-Za-z0-9._-]+/g, "-").toLowerCase()}.sh` : "tool.sh"}
            aria-label="Bash source"
          />
        </DetailField>
      </DetailFieldGroup>
    </DetailPage>
  );
}
