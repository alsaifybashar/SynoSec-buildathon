import {
  apiRoutes,
  type CreateTargetBody,
  type Target,
  type TargetEnvironment,
  type TargetStatus
} from "@synosec/contracts";
import { targetsResource } from "@/features/targets/resource";
import { targetTransfer } from "@/features/targets/transfer";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailSidebarItem } from "@/shared/components/detail-page";
import type { TargetsQuery } from "@/shared/lib/resource-client";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

type TargetFormValues = {
  name: string;
  baseUrl: string;
  environment: TargetEnvironment;
  status: TargetStatus;
  lastScannedAt: string;
};

const environmentLabels: Record<TargetEnvironment, string> = {
  production: "Production",
  staging: "Staging",
  development: "Development"
};

const statusLabels: Record<TargetStatus, string> = {
  active: "Active",
  investigating: "Investigating",
  archived: "Archived"
};

const environmentBadgeStyles: Record<TargetEnvironment, string> = {
  production: "bg-primary/10 text-primary",
  staging: "bg-secondary text-secondary-foreground",
  development: "bg-muted text-muted-foreground"
};

const statusBadgeStyles: Record<TargetStatus, string> = {
  active: "bg-primary/10 text-primary",
  investigating: "bg-secondary text-secondary-foreground",
  archived: "bg-muted text-muted-foreground"
};

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  );
}

function createEmptyFormValues(): TargetFormValues {
  return {
    name: "",
    baseUrl: "",
    environment: "production",
    status: "active",
    lastScannedAt: ""
  };
}

function toFormValues(target: Target): TargetFormValues {
  return {
    name: target.name,
    baseUrl: target.baseUrl ?? "",
    environment: target.environment,
    status: target.status,
    lastScannedAt: target.lastScannedAt ? target.lastScannedAt.slice(0, 16) : ""
  };
}

function toRequestBody(values: TargetFormValues): CreateTargetBody {
  return {
    name: values.name.trim(),
    baseUrl: values.baseUrl.trim(),
    environment: values.environment,
    status: values.status,
    lastScannedAt: values.lastScannedAt ? new Date(values.lastScannedAt).toISOString() : null
  };
}

function validateForm(values: TargetFormValues) {
  const errors: Partial<Record<keyof TargetFormValues, string>> = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  if (values.baseUrl.trim()) {
    try {
      new URL(values.baseUrl.trim());
    } catch {
      errors.baseUrl = "Base URL must be a valid absolute URL.";
    }
  }

  return errors;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

export const targetsDefinition: CrudFeatureDefinition<
  Target,
  TargetFormValues,
  CreateTargetBody,
  TargetsQuery
> = {
  recordLabel: "Target",
  titleLabel: "target",
  route: apiRoutes.targets,
  resource: targetsResource,
  transfer: targetTransfer,
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
  getItemLabel: (target) => target.name,
  list: {
    title: "Targets",
    emptyMessage: "No targets matched the current search and filter.",
    columns: () => [
      { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
      { id: "baseUrl", header: "Base URL", cell: (row) => <span className="text-muted-foreground">{row.baseUrl ?? "Not set"}</span> },
      { id: "environment", header: "Environment", cell: (row) => <StatusBadge label={environmentLabels[row.environment]} className={environmentBadgeStyles[row.environment]} /> }
    ],
    filters: () => [
      {
        id: "environment",
        label: "Filter targets by environment",
        placeholder: "Filter by environment",
        allLabel: "All environments",
        options: [
          { label: "Production", value: "production" },
          { label: "Staging", value: "staging" },
          { label: "Development", value: "development" }
        ]
      }
    ]
  },
  detail: {
    loadingTitle: "Target detail",
    loadingMessage: "Loading target...",
    createTitle: "New target",
    renderSidebar: ({ item }) => (
      <>
        <DetailSidebarItem label="Status">
          <StatusBadge label={statusLabels[item.status]} className={statusBadgeStyles[item.status]} />
        </DetailSidebarItem>
        <DetailSidebarItem label="Environment" hint="The deployment tier this target record represents.">
          <StatusBadge label={environmentLabels[item.environment]} className={environmentBadgeStyles[item.environment]} />
        </DetailSidebarItem>
        <DetailSidebarItem label="Last scanned">
          {formatTimestamp(item.lastScannedAt)}
        </DetailSidebarItem>
        <DetailSidebarItem label="Created">
          {formatTimestamp(item.createdAt)}
        </DetailSidebarItem>
        <DetailSidebarItem label="Updated">
          {formatTimestamp(item.updatedAt)}
        </DetailSidebarItem>
      </>
    ),
    renderContent: ({ formValues, errors, handleFieldChange }) => (
      <>
        <DetailFieldGroup title="General">
          <DetailField label="Name" required hint="Operator-facing target label used across workflows and reports." {...definedString(errors["name"] as string | undefined)}>
            <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
          </DetailField>

          <DetailField
            label="Base URL"
            hint="The target's own base URL is the scan surface used by workflows."
            {...definedString(errors["baseUrl"] as string | undefined)}
          >
            <Input value={formValues.baseUrl} onChange={(event) => handleFieldChange("baseUrl", event.target.value)} aria-label="Base URL" />
          </DetailField>
        </DetailFieldGroup>

        <DetailFieldGroup title="Configuration">
          <DetailField label="Environment" required hint="Use the environment that best matches the target surface operators are allowed to assess.">
            <Select value={formValues.environment} onValueChange={(value: TargetEnvironment) => handleFieldChange("environment", value)}>
              <SelectTrigger aria-label="Environment" className="w-fit min-w-[10rem] max-w-[12rem]">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(environmentLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailField>

          <DetailField label="Last scanned" hint="Manual scan bookkeeping only. This value does not trigger or schedule scans by itself.">
            <Input
              type="datetime-local"
              value={formValues.lastScannedAt}
              onChange={(event) => handleFieldChange("lastScannedAt", event.target.value)}
              aria-label="Last scanned"
            />
          </DetailField>
        </DetailFieldGroup>
      </>
    )
  }
};
