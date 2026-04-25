import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type Application,
  type ApplicationEnvironment,
  type CreateRuntimeBody,
  type Runtime,
  type RuntimeProvider,
  type RuntimeServiceType,
  type RuntimeStatus
} from "@synosec/contracts";
import { applicationsResource } from "@/features/applications/resource";
import { runtimesResource } from "@/features/runtimes/resource";
import { runtimeTransfer } from "@/features/runtimes/transfer";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailSidebarItem } from "@/shared/components/detail-page";
import type { RuntimesQuery } from "@/shared/lib/resource-client";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

type RuntimeFormValues = {
  name: string;
  serviceType: RuntimeServiceType;
  provider: RuntimeProvider;
  environment: ApplicationEnvironment;
  region: string;
  status: RuntimeStatus;
  applicationId: string;
};

type RuntimeDefinitionContext = {
  applications: Application[];
  applicationLookup: Record<string, string>;
};

const serviceTypeLabels: Record<RuntimeServiceType, string> = {
  gateway: "Gateway",
  api: "API",
  worker: "Worker",
  database: "Database",
  queue: "Queue",
  storage: "Storage",
  other: "Other"
};

const providerLabels: Record<RuntimeProvider, string> = {
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  "on-prem": "On-prem",
  docker: "Docker",
  vercel: "Vercel",
  other: "Other"
};

const environmentLabels: Record<ApplicationEnvironment, string> = {
  production: "Production",
  staging: "Staging",
  development: "Development"
};

const statusLabels: Record<RuntimeStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  retired: "Retired"
};

const statusBadgeStyles: Record<RuntimeStatus, string> = {
  healthy: "bg-success/15 text-success",
  degraded: "bg-warning/15 text-warning",
  retired: "bg-muted text-muted-foreground"
};

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  );
}

function createEmptyFormValues(): RuntimeFormValues {
  return {
    name: "",
    serviceType: "gateway",
    provider: "docker",
    environment: "production",
    region: "",
    status: "healthy",
    applicationId: ""
  };
}

function toFormValues(runtime: Runtime): RuntimeFormValues {
  return {
    name: runtime.name,
    serviceType: runtime.serviceType,
    provider: runtime.provider,
    environment: runtime.environment,
    region: runtime.region,
    status: runtime.status,
    applicationId: runtime.applicationId ?? ""
  };
}

function toRequestBody(values: RuntimeFormValues): CreateRuntimeBody {
  return {
    name: values.name.trim(),
    serviceType: values.serviceType,
    provider: values.provider,
    environment: values.environment,
    region: values.region.trim(),
    status: values.status,
    applicationId: values.applicationId
  };
}

function validateForm(values: RuntimeFormValues) {
  const errors: Partial<Record<keyof RuntimeFormValues, string>> = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!values.region.trim()) {
    errors.region = "Region is required.";
  }

  return errors;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

function useRuntimeDefinitionContext(): RuntimeDefinitionContext {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    let active = true;

    void applicationsResource.list({
      ...applicationsResource.defaultQuery,
      pageSize: 100
    })
      .then((result) => {
        if (active) {
          setApplications(result.items);
        }
      })
      .catch((error) => {
        toast.error("Failed to load applications", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const applicationLookup = useMemo(
    () => Object.fromEntries(applications.map((application) => [application.id, application.name])),
    [applications]
  );

  return {
    applications,
    applicationLookup
  };
}

export const runtimesDefinition: CrudFeatureDefinition<
  Runtime,
  RuntimeFormValues,
  CreateRuntimeBody,
  RuntimesQuery,
  RuntimeDefinitionContext
> = {
  recordLabel: "Runtime",
  titleLabel: "runtime",
  route: apiRoutes.runtimes,
  resource: runtimesResource,
  transfer: runtimeTransfer,
  useContext: useRuntimeDefinitionContext,
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
  getItemLabel: (runtime) => runtime.name,
  list: {
    title: "Runtimes",
    emptyMessage: "No runtimes matched the current search and filter.",
    columns: (context) => [
      {
        id: "name",
        header: "Name",
        cell: (row) => <span className="font-medium text-foreground">{row.name}</span>
      },
      {
        id: "serviceType",
        header: "Service type",
        cell: (row) => <span className="text-muted-foreground">{serviceTypeLabels[row.serviceType]}</span>
      },
      {
        id: "provider",
        header: "Provider",
        cell: (row) => <span className="text-muted-foreground">{providerLabels[row.provider]}</span>
      },
      {
        id: "applicationId",
        header: "Application",
        cell: (row) => <span className="text-muted-foreground">{context.applicationLookup[row.applicationId ?? ""] ?? "Unlinked"}</span>
      }
    ],
    filters: () => [
      {
        id: "provider",
        label: "Filter runtimes by provider",
        placeholder: "Filter by provider",
        allLabel: "All providers",
        options: Object.entries(providerLabels).map(([value, label]) => ({ label, value }))
      },
      {
        id: "environment",
        label: "Filter runtimes by environment",
        placeholder: "Filter by environment",
        allLabel: "All environments",
        options: Object.entries(environmentLabels).map(([value, label]) => ({ label, value }))
      }
    ]
  },
  detail: {
    loadingTitle: "Runtime detail",
    loadingMessage: "Loading runtime...",
    createTitle: "New runtime",
    getSubtitle: (item) => item.id,
    getTimestamp: (item) => formatTimestamp(item.updatedAt),
    renderSidebar: ({ item, context }) => (
      <>
        <DetailSidebarItem label="Status">
          <StatusBadge label={statusLabels[item.status]} className={statusBadgeStyles[item.status]} />
        </DetailSidebarItem>
        <DetailSidebarItem label="Application" hint="The parent application currently linked to this runtime record.">
          {context.applicationLookup[item.applicationId ?? ""] ?? "Unlinked"}
        </DetailSidebarItem>
        <DetailSidebarItem label="Created">
          {formatTimestamp(item.createdAt)}
        </DetailSidebarItem>
        <DetailSidebarItem label="Updated">
          {formatTimestamp(item.updatedAt)}
        </DetailSidebarItem>
      </>
    ),
    renderContent: ({ formValues, errors, context, handleFieldChange }) => (
      <>
        <DetailFieldGroup title="Identity">
          <DetailField label="Name" required hint="Human-readable runtime name used in workflow targeting and inventory views." {...definedString(errors["name"] as string | undefined)}>
            <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
          </DetailField>

          <DetailField label="Region" required hint="Cloud region, datacenter, or locality string that helps operators distinguish deployment location." {...definedString(errors["region"] as string | undefined)}>
            <Input value={formValues.region} onChange={(event) => handleFieldChange("region", event.target.value)} aria-label="Region" />
          </DetailField>
        </DetailFieldGroup>

        <DetailFieldGroup title="Infrastructure">
          <DetailField label="Service type" required hint="Choose the runtime's primary operational role.">
            <Select value={formValues.serviceType} onValueChange={(value: RuntimeServiceType) => handleFieldChange("serviceType", value)}>
              <SelectTrigger aria-label="Service type" className="w-fit min-w-[10rem] max-w-[12rem]">
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(serviceTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailField>

          <DetailField label="Provider" required hint="Infrastructure platform or hosting context that owns this runtime.">
            <Select value={formValues.provider} onValueChange={(value: RuntimeProvider) => handleFieldChange("provider", value)}>
              <SelectTrigger aria-label="Provider" className="w-fit min-w-[10rem] max-w-[12rem]">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(providerLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailField>

          <DetailField label="Environment" required hint="Execution tier for this runtime. Keep this aligned with the application surface being assessed.">
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
        </DetailFieldGroup>

        <DetailFieldGroup title="Status & linking">
          <DetailField label="Status" required hint="Operational state of the runtime inventory record, not live health telemetry.">
            <Select value={formValues.status} onValueChange={(value: RuntimeStatus) => handleFieldChange("status", value)}>
              <SelectTrigger aria-label="Status" className="w-fit min-w-[10rem] max-w-[12rem]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailField>

          <DetailField label="Application" hint="Optional link back to the application this runtime belongs to.">
            <Select value={formValues.applicationId || "__none__"} onValueChange={(value) => handleFieldChange("applicationId", value === "__none__" ? "" : value)}>
              <SelectTrigger aria-label="Application" className="w-fit min-w-[12rem] max-w-[16rem]">
                <SelectValue placeholder="Select application" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No application</SelectItem>
                {context.applications.map((application) => (
                  <SelectItem key={application.id} value={application.id}>
                    {application.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailField>
        </DetailFieldGroup>
      </>
    )
  }
};
