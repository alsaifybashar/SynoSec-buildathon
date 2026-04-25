import {
  apiRoutes,
  type AiProvider,
  type AiProviderKind,
  type AiProviderStatus,
  type CreateAiProviderBody
} from "@synosec/contracts";
import { aiProvidersResource } from "@/features/ai-providers/resource";
import { aiProviderTransfer } from "@/features/ai-providers/transfer";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailSidebarItem } from "@/shared/components/detail-page";
import type { AiProvidersQuery } from "@/shared/lib/resource-client";
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

export const aiProvidersDefinition: CrudFeatureDefinition<
  AiProvider,
  ProviderFormValues,
  CreateAiProviderBody,
  AiProvidersQuery
> = {
  recordLabel: "AI Provider",
  titleLabel: "AI provider",
  route: apiRoutes.aiProviders,
  resource: aiProvidersResource,
  transfer: aiProviderTransfer,
  createEmptyFormValues: () => createEmptyFormValues(),
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
  getItemLabel: (provider) => provider.name,
  list: {
    title: "AI Providers",
    emptyMessage: "No AI providers have been configured yet.",
    columns: () => [
      { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
      { id: "kind", header: "Kind", cell: (row) => <span className="text-muted-foreground">{kindLabels[row.kind]}</span> },
      { id: "model", header: "Model", cell: (row) => <span className="text-muted-foreground">{row.model}</span> },
      { id: "apiKey", header: "Secret", cell: (row) => <span className="text-muted-foreground">{row.apiKeyConfigured ? "Configured" : "Not configured"}</span> }
    ],
    filters: () => [
      {
        id: "kind",
        label: "Filter by provider kind",
        placeholder: "Filter by kind",
        allLabel: "All kinds",
        options: Object.entries(kindLabels).map(([value, label]) => ({ value, label }))
      },
    ]
  },
  detail: {
    loadingTitle: "AI provider detail",
    loadingMessage: "Loading AI provider...",
    createTitle: "New AI provider",
    renderSidebar: ({ item }) => (
      <>
        <DetailSidebarItem label="Kind">{kindLabels[item.kind]}</DetailSidebarItem>
        <DetailSidebarItem label="Status">{statusLabels[item.status]}</DetailSidebarItem>
        <DetailSidebarItem label="Secret">{item.apiKeyConfigured ? "Configured" : "Not configured"}</DetailSidebarItem>
        <DetailSidebarItem label="Updated">{formatTimestamp(item.updatedAt)}</DetailSidebarItem>
      </>
    ),
    renderContent: ({ item, formValues, errors, handleFieldChange }) => (
      <DetailFieldGroup title="Provider Configuration" className="bg-card/70">
        <DetailField label="Name" required {...definedString(errors["name"] as string | undefined)}>
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
        <DetailField label="Model" required {...definedString(errors["model"] as string | undefined)}>
          <Input value={formValues.model} onChange={(event) => handleFieldChange("model", event.target.value)} aria-label="Model" />
        </DetailField>
        <DetailField label="Base URL" {...definedString(errors["baseUrl"] as string | undefined)}>
          <Input value={formValues.baseUrl} onChange={(event) => handleFieldChange("baseUrl", event.target.value)} aria-label="Base URL" />
        </DetailField>
        <DetailField label="Description">
          <Input value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" />
        </DetailField>
        <DetailField label="API Key" hint={item?.apiKeyConfigured ? "Leave blank to keep the current secret." : "Stored as a write-only secret."}>
          <Input
            type="password"
            value={formValues.apiKey}
            onChange={(event) => handleFieldChange("apiKey", event.target.value)}
            aria-label="API Key"
            placeholder={item?.apiKeyConfigured ? "Configured; leave blank to keep current value" : ""}
          />
        </DetailField>
      </DetailFieldGroup>
    )
  }
};
