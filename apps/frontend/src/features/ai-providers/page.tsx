import { useMemo } from "react";
import {
  apiRoutes,
  type AiProvider,
  type AiProviderKind,
  type AiProviderStatus,
  type CreateAiProviderBody
} from "@synosec/contracts";
import { aiProvidersResource } from "@/features/ai-providers/resource";
import { aiProviderTransfer } from "@/features/ai-providers/transfer";
import { useCrudPage } from "@/shared/crud/use-crud-page";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/shared/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

type ProviderFormValues = {
  name: string;
  kind: AiProviderKind;
  status: AiProviderStatus;
  description: string;
  baseUrl: string;
  model: string;
  apiKey: string;
};

const kindLabels: Record<AiProviderKind, string> = {
  anthropic: "Anthropic",
  local: "Local"
};

const statusLabels: Record<AiProviderStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  error: "Error"
};

function createEmptyFormValues(): ProviderFormValues {
  return {
    name: "",
    kind: "anthropic",
    status: "active",
    description: "",
    baseUrl: "",
    model: "claude-sonnet-4-5",
    apiKey: ""
  };
}

function toFormValues(provider: AiProvider): ProviderFormValues {
  return {
    name: provider.name,
    kind: provider.kind,
    status: provider.status,
    description: provider.description ?? "",
    baseUrl: provider.baseUrl ?? "",
    model: provider.model,
    apiKey: ""
  };
}

function toRequestBody(values: ProviderFormValues): CreateAiProviderBody {
  const body: CreateAiProviderBody = {
    name: values.name.trim(),
    kind: values.kind,
    status: values.status,
    description: values.description.trim() || null,
    baseUrl: values.kind === "local" ? values.baseUrl.trim() || null : null,
    model: values.model.trim()
  };

  if (values.apiKey.trim()) {
    body.apiKey = values.apiKey.trim();
  }

  return body;
}

function validateForm(values: ProviderFormValues) {
  const errors: Partial<Record<keyof ProviderFormValues, string>> = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!values.model.trim()) {
    errors.model = "Model is required.";
  }

  if (values.kind === "local") {
    if (!values.baseUrl.trim()) {
      errors.baseUrl = "Base URL is required for local providers.";
    } else {
      try {
        new URL(values.baseUrl.trim());
      } catch {
        errors.baseUrl = "Base URL must be a valid absolute URL.";
      }
    }
  }

  return errors;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

export function AiProvidersPage({
  providerId,
  providerNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  providerId?: string;
  providerNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  const crud = useCrudPage({
    recordLabel: "AI Provider",
    titleLabel: "AI provider",
    recordId: providerId,
    route: apiRoutes.aiProviders,
    resource: aiProvidersResource,
    transfer: aiProviderTransfer,
    createEmptyFormValues,
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
    getItemLabel: (provider) => provider.name
  });

  const columns = useMemo<ListPageColumn<AiProvider>[]>(() => [
    { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { id: "kind", header: "Kind", cell: (row) => <span className="text-muted-foreground">{kindLabels[row.kind]}</span> },
    { id: "status", header: "Status", cell: (row) => <span className="text-muted-foreground">{statusLabels[row.status]}</span> },
    { id: "model", header: "Model", cell: (row) => <span className="text-muted-foreground">{row.model}</span> },
    { id: "apiKey", header: "Secret", cell: (row) => <span className="text-muted-foreground">{row.apiKeyConfigured ? "Configured" : "Not configured"}</span> }
  ], []);

  const filters = useMemo<ListPageFilter[]>(() => [
    {
      id: "kind",
      label: "Filter by provider kind",
      placeholder: "Filter by kind",
      allLabel: "All kinds",
      options: Object.entries(kindLabels).map(([value, label]) => ({ value, label }))
    },
    {
      id: "status",
      label: "Filter by provider status",
      placeholder: "Filter by status",
      allLabel: "All statuses",
      options: Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
    }
  ], []);

  if (!providerId) {
    return (
      <ListPage
        title="AI Providers"
        recordLabel="AI Provider"
        columns={columns}
        query={crud.list.query}
        dataState={crud.list.dataState}
        items={crud.list.items}
        meta={crud.list.meta}
        filters={filters}
        emptyMessage="No AI providers have been configured yet."
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
        title={providerNameHint ?? "AI provider detail"}
        breadcrumbs={["Start", "AI Providers", providerNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message="Loading AI provider..."
      />
    );
  }

  return (
    <DetailPage
      title={crud.isCreateMode ? "New AI provider" : crud.item?.name ?? "AI provider detail"}
      breadcrumbs={["Start", "AI Providers", crud.isCreateMode ? "New" : crud.item?.name ?? "Detail"]}
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
          <DetailSidebarItem label="Kind">{kindLabels[crud.item.kind]}</DetailSidebarItem>
          <DetailSidebarItem label="Status">{statusLabels[crud.item.status]}</DetailSidebarItem>
          <DetailSidebarItem label="Secret">{crud.item.apiKeyConfigured ? "Configured" : "Not configured"}</DetailSidebarItem>
          <DetailSidebarItem label="Updated">{formatTimestamp(crud.item.updatedAt)}</DetailSidebarItem>
        </>
      ) : undefined}
    >
      <DetailFieldGroup title="Provider Configuration" className="bg-card/70">
        <DetailField label="Name" required {...definedString(crud.errors.name)}>
          <Input value={crud.formValues.name} onChange={(event) => crud.handleFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>
        <DetailField label="Kind" required>
          <Select value={crud.formValues.kind} onValueChange={(value) => crud.handleFieldChange("kind", value as AiProviderKind)}>
            <SelectTrigger aria-label="Kind">
              <SelectValue placeholder="Select kind" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(kindLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
        <DetailField label="Status" required>
          <Select value={crud.formValues.status} onValueChange={(value) => crud.handleFieldChange("status", value as AiProviderStatus)}>
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
        <DetailField label="Model" required {...definedString(crud.errors.model)}>
          <Input value={crud.formValues.model} onChange={(event) => crud.handleFieldChange("model", event.target.value)} aria-label="Model" />
        </DetailField>
        <DetailField label="Base URL" {...definedString(crud.errors.baseUrl)}>
          <Input value={crud.formValues.baseUrl} onChange={(event) => crud.handleFieldChange("baseUrl", event.target.value)} aria-label="Base URL" />
        </DetailField>
        <DetailField label="Description">
          <Input value={crud.formValues.description} onChange={(event) => crud.handleFieldChange("description", event.target.value)} aria-label="Description" />
        </DetailField>
        <DetailField label="API Key" hint={crud.item?.apiKeyConfigured ? "Leave blank to keep the current secret." : "Stored as a write-only secret."}>
          <Input
            type="password"
            value={crud.formValues.apiKey}
            onChange={(event) => crud.handleFieldChange("apiKey", event.target.value)}
            aria-label="API Key"
            placeholder={crud.item?.apiKeyConfigured ? "Configured; leave blank to keep current value" : ""}
          />
        </DetailField>
      </DetailFieldGroup>
    </DetailPage>
  );
}
