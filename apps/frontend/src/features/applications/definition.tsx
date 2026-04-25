import {
  apiRoutes,
  type Application,
  type ApplicationEnvironment,
  type ApplicationStatus,
  type CreateApplicationBody
} from "@synosec/contracts";
import { applicationsResource } from "@/features/applications/resource";
import { applicationTransfer } from "@/features/applications/transfer";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailSidebarItem } from "@/shared/components/detail-page";
import type { ApplicationsQuery } from "@/shared/lib/resource-client";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

type ApplicationFormValues = {
  name: string;
  baseUrl: string;
  environment: ApplicationEnvironment;
  status: ApplicationStatus;
  lastScannedAt: string;
};

const environmentLabels: Record<ApplicationEnvironment, string> = {
  production: "Production",
  staging: "Staging",
  development: "Development"
};

const statusLabels: Record<ApplicationStatus, string> = {
  active: "Active",
  investigating: "Investigating",
  archived: "Archived"
};

const environmentBadgeStyles: Record<ApplicationEnvironment, string> = {
  production: "bg-primary/10 text-primary",
  staging: "bg-secondary text-secondary-foreground",
  development: "bg-muted text-muted-foreground"
};

const statusBadgeStyles: Record<ApplicationStatus, string> = {
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

function createEmptyFormValues(): ApplicationFormValues {
  return {
    name: "",
    baseUrl: "",
    environment: "production",
    status: "active",
    lastScannedAt: ""
  };
}

function toFormValues(application: Application): ApplicationFormValues {
  return {
    name: application.name,
    baseUrl: application.baseUrl ?? "",
    environment: application.environment,
    status: application.status,
    lastScannedAt: application.lastScannedAt ? application.lastScannedAt.slice(0, 16) : ""
  };
}

function toRequestBody(values: ApplicationFormValues): CreateApplicationBody {
  return {
    name: values.name.trim(),
    baseUrl: values.baseUrl.trim(),
    environment: values.environment,
    status: values.status,
    lastScannedAt: values.lastScannedAt ? new Date(values.lastScannedAt).toISOString() : null
  };
}

function validateForm(values: ApplicationFormValues) {
  const errors: Partial<Record<keyof ApplicationFormValues, string>> = {};

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

export const applicationsDefinition: CrudFeatureDefinition<
  Application,
  ApplicationFormValues,
  CreateApplicationBody,
  ApplicationsQuery
> = {
  recordLabel: "Application",
  titleLabel: "application",
  route: apiRoutes.applications,
  resource: applicationsResource,
  transfer: applicationTransfer,
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
  getItemLabel: (application) => application.name,
  list: {
    title: "Applications",
    emptyMessage: "No applications matched the current search and filter.",
    columns: () => [
      { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
      { id: "baseUrl", header: "Base URL", cell: (row) => <span className="text-muted-foreground">{row.baseUrl ?? "Not set"}</span> },
      { id: "environment", header: "Environment", cell: (row) => <StatusBadge label={environmentLabels[row.environment]} className={environmentBadgeStyles[row.environment]} /> },
      {
        id: "lastScannedAt",
        header: "Last scanned",
        cell: (row) => <span className="text-muted-foreground">{formatTimestamp(row.lastScannedAt)}</span>,
        className: "text-right"
      }
    ],
    filters: () => [
      {
        id: "environment",
        label: "Filter applications by environment",
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
    loadingTitle: "Application detail",
    loadingMessage: "Loading application...",
    createTitle: "New application",
    renderSidebar: ({ item }) => (
      <>
        <DetailSidebarItem label="Status">
          <StatusBadge label={statusLabels[item.status]} className={statusBadgeStyles[item.status]} />
        </DetailSidebarItem>
        <DetailSidebarItem label="Environment" hint="The deployment tier this application record represents.">
          <StatusBadge label={environmentLabels[item.environment]} className={environmentBadgeStyles[item.environment]} />
        </DetailSidebarItem>
        <DetailSidebarItem label="Last scanned" hint="The most recent scan timestamp recorded on this application.">
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
    renderContent: ({ item, formValues, errors, handleFieldChange }) => (
      <>
        <DetailFieldGroup title="General">
          <DetailField label="Name" required hint="Operator-facing label used across workflow and runtime selectors." {...definedString(errors["name"] as string | undefined)}>
            <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
          </DetailField>

          <DetailField
            label="Base URL"
            hint="Optional. Include the primary absolute URL when this application exposes a reachable web surface."
            {...definedString(errors["baseUrl"] as string | undefined)}
          >
            <Input value={formValues.baseUrl} onChange={(event) => handleFieldChange("baseUrl", event.target.value)} aria-label="Base URL" />
          </DetailField>
        </DetailFieldGroup>

        <DetailFieldGroup title="Configuration">
          <DetailField label="Environment" required hint="Use the environment that best matches the target surface operators are allowed to assess.">
            <Select value={formValues.environment} onValueChange={(value: ApplicationEnvironment) => handleFieldChange("environment", value)}>
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

        <DetailFieldGroup title="Policy Surface">
          <DetailField label="Registered targets" hint="Targets linked to this application and exposed to workflows when choosing a scan destination." className="md:col-span-2">
            <div className="space-y-2 rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              {item?.targetAssets?.length
                ? item.targetAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                      <span className="font-medium text-foreground">{asset.label}</span>
                      <span>{asset.provider ?? asset.kind}{asset.isDefault ? " · default" : ""}</span>
                    </div>
                  ))
                : <span>No registered target assets.</span>}
            </div>
          </DetailField>
          <DetailField label="Bound constraints" className="md:col-span-2">
            <div className="space-y-2 rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              {item?.constraintBindings?.length
                ? item.constraintBindings.map((binding) => (
                    <div key={binding.constraintId} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                      <span className="font-medium text-foreground">{binding.constraint?.name ?? binding.constraintId}</span>
                      <span>{binding.constraint?.provider ?? binding.constraint?.kind ?? "bound"}</span>
                    </div>
                  ))
                : <span>No bound execution constraints.</span>}
            </div>
          </DetailField>
        </DetailFieldGroup>
      </>
    )
  }
};
