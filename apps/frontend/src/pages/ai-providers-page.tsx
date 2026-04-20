import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type AiProvider,
  type AiProviderKind,
  type AiProviderStatus,
  type CreateAiProviderBody
} from "@synosec/contracts";
import { fetchJson } from "@/lib/api";
import { useResourceDetail } from "@/hooks/useResourceDetail";
import { useResourceList } from "@/hooks/useResourceList";
import { aiProvidersResource } from "@/lib/resources";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/components/list-page";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [provider, setProvider] = useState<AiProvider | null>(null);
  const [formValues, setFormValues] = useState<ProviderFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<ProviderFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof ProviderFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isCreateMode = providerId === "new";
  const providerList = useResourceList(aiProvidersResource);
  const providerDetail = useResourceDetail(aiProvidersResource, providerId && providerId !== "new" ? providerId : null);

  useEffect(() => {
    if (!providerId) {
      return;
    }

    if (providerId === "new") {
      const empty = createEmptyFormValues();
      setProvider(null);
      setFormValues(empty);
      setInitialValues(empty);
      setErrors({});
      return;
    }

    if (providerDetail.state === "error") {
      toast.error("AI provider not found", { description: providerDetail.message });
      onNavigateToList();
      return;
    }

    if (providerDetail.state !== "loaded") {
      const empty = createEmptyFormValues();
      setProvider(null);
      setFormValues(empty);
      setInitialValues(empty);
      setErrors({});
      return;
    }

    const values = toFormValues(providerDetail.item);
    setProvider(providerDetail.item);
    setFormValues(values);
    setInitialValues(values);
    setErrors({});
  }, [onNavigateToList, providerDetail, providerId]);

  const columns = useMemo<ListPageColumn<AiProvider>[]>(() => [
    { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { id: "kind", header: "Kind", cell: (row) => <span className="text-muted-foreground">{kindLabels[row.kind]}</span> },
    { id: "status", header: "Status", cell: (row) => <span className="text-muted-foreground">{statusLabels[row.status]}</span> },
    { id: "model", header: "Model", cell: (row) => <span className="text-muted-foreground">{row.model}</span> },
    { id: "apiKey", header: "Secret", sortable: false, cell: (row) => <span className="text-muted-foreground">{row.apiKeyConfigured ? "Configured" : "Not configured"}</span> }
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

  const isDirty = JSON.stringify(formValues) !== JSON.stringify(initialValues);

  function handleFieldChange<Key extends keyof ProviderFormValues>(field: Key, value: ProviderFormValues[Key]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
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

      if (isCreateMode || !provider) {
        const created = await fetchJson<AiProvider>(apiRoutes.aiProviders, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        toast.success("AI provider created");
        onNavigateToDetail(created.id, created.name);
        return;
      }

      const updated = await fetchJson<AiProvider>(`${apiRoutes.aiProviders}/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body
      });

      const nextValues = toFormValues(updated);
      setProvider(updated);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      toast.success("AI provider updated");
    } catch (error) {
      toast.error("AI provider request failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setSaving(false);
    }
  }

  if (!providerId) {
    return (
      <ListPage
        title="AI Providers"
        recordLabel="AI Provider"
        columns={columns}
        query={providerList.query}
        dataState={providerList.dataState}
        items={providerList.items}
        meta={providerList.meta}
        filters={filters}
        emptyMessage="No AI providers have been configured yet."
        onSearchChange={providerList.setSearch}
        onFilterChange={providerList.setFilter}
        onSortChange={providerList.setSort}
        onPageChange={providerList.setPage}
        onPageSizeChange={providerList.setPageSize}
        onRetry={providerList.refetch}
        onAddRecord={onNavigateToCreate}
        onRowClick={(row) => onNavigateToDetail(row.id, row.name)}
      />
    );
  }

  if (!isCreateMode && providerDetail.state !== "loaded") {
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
      title={isCreateMode ? "New AI provider" : provider?.name ?? "AI provider detail"}
      breadcrumbs={["Start", "AI Providers", isCreateMode ? "New" : provider?.name ?? "Detail"]}
      isDirty={isDirty}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={handleSave}
      onDismiss={() => {
        setFormValues(initialValues);
        setErrors({});
      }}
      sidebar={provider ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
          <DetailSidebarItem label="Kind">{kindLabels[provider.kind]}</DetailSidebarItem>
          <DetailSidebarItem label="Status">{statusLabels[provider.status]}</DetailSidebarItem>
          <DetailSidebarItem label="Secret">{provider.apiKeyConfigured ? "Configured" : "Not configured"}</DetailSidebarItem>
          <DetailSidebarItem label="Updated">{formatTimestamp(provider.updatedAt)}</DetailSidebarItem>
        </div>
      ) : undefined}
    >
      <DetailFieldGroup title="Provider Configuration" className="bg-card/70">
        <DetailField label="Name" required {...definedString(errors.name)}>
          <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>
        <DetailField label="Kind" required>
          <Select value={formValues.kind} onValueChange={(value) => handleFieldChange("kind", value as AiProviderKind)}>
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
          <Select value={formValues.status} onValueChange={(value) => handleFieldChange("status", value as AiProviderStatus)}>
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
        <DetailField label="Model" required {...definedString(errors.model)}>
          <Input value={formValues.model} onChange={(event) => handleFieldChange("model", event.target.value)} aria-label="Model" />
        </DetailField>
        <DetailField label="Base URL" {...definedString(errors.baseUrl)}>
          <Input value={formValues.baseUrl} onChange={(event) => handleFieldChange("baseUrl", event.target.value)} aria-label="Base URL" />
        </DetailField>
        <DetailField label="Description">
          <Input value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" />
        </DetailField>
        <DetailField label="API Key" hint={provider?.apiKeyConfigured ? "Leave blank to keep the current secret." : "Stored as a write-only secret."}>
          <Input
            type="password"
            value={formValues.apiKey}
            onChange={(event) => handleFieldChange("apiKey", event.target.value)}
            aria-label="API Key"
            placeholder={provider?.apiKeyConfigured ? "Configured; leave blank to keep current value" : ""}
          />
        </DetailField>
      </DetailFieldGroup>
    </DetailPage>
  );
}
