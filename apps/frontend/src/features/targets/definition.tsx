import {
  apiRoutes,
  type CreateTargetBody,
  type Target,
  type TargetDeployment,
  type TargetDeploymentProvider,
  type TargetDeploymentServiceType,
  type TargetDeploymentStatus,
  type TargetEnvironment,
  type TargetStatus
} from "@synosec/contracts";
import { targetsResource } from "@/features/targets/resource";
import { targetTransfer } from "@/features/targets/transfer";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailSidebarItem } from "@/shared/components/detail-page";
import type { TargetsQuery } from "@/shared/lib/resource-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

type DeploymentFormValue = {
  id?: string;
  name: string;
  serviceType: TargetDeploymentServiceType;
  provider: TargetDeploymentProvider;
  environment: TargetEnvironment;
  region: string;
  status: TargetDeploymentStatus;
};

type TargetFormValues = {
  name: string;
  baseUrl: string;
  environment: TargetEnvironment;
  status: TargetStatus;
  lastScannedAt: string;
  deployments: DeploymentFormValue[];
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

const deploymentStatusLabels: Record<TargetDeploymentStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  retired: "Retired"
};

const serviceTypeLabels: Record<TargetDeploymentServiceType, string> = {
  gateway: "Gateway",
  api: "API",
  worker: "Worker",
  database: "Database",
  queue: "Queue",
  storage: "Storage",
  other: "Other"
};

const providerLabels: Record<TargetDeploymentProvider, string> = {
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  "on-prem": "On-prem",
  docker: "Docker",
  vercel: "Vercel",
  other: "Other"
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

function createEmptyDeployment(): DeploymentFormValue {
  return {
    name: "",
    serviceType: "gateway",
    provider: "docker",
    environment: "production",
    region: "",
    status: "healthy"
  };
}

function createEmptyFormValues(): TargetFormValues {
  return {
    name: "",
    baseUrl: "",
    environment: "production",
    status: "active",
    lastScannedAt: "",
    deployments: []
  };
}

function toDeploymentFormValue(deployment: TargetDeployment): DeploymentFormValue {
  return {
    id: deployment.id,
    name: deployment.name,
    serviceType: deployment.serviceType,
    provider: deployment.provider,
    environment: deployment.environment,
    region: deployment.region,
    status: deployment.status
  };
}

function toFormValues(target: Target): TargetFormValues {
  return {
    name: target.name,
    baseUrl: target.baseUrl ?? "",
    environment: target.environment,
    status: target.status,
    lastScannedAt: target.lastScannedAt ? target.lastScannedAt.slice(0, 16) : "",
    deployments: target.deployments?.map(toDeploymentFormValue) ?? []
  };
}

function toRequestBody(values: TargetFormValues): CreateTargetBody {
  return {
    name: values.name.trim(),
    baseUrl: values.baseUrl.trim(),
    environment: values.environment,
    status: values.status,
    lastScannedAt: values.lastScannedAt ? new Date(values.lastScannedAt).toISOString() : null,
    deployments: values.deployments
      .filter((deployment) => deployment.name.trim() || deployment.region.trim())
      .map((deployment) => ({
        ...(deployment.id ? { id: deployment.id } : {}),
        name: deployment.name.trim(),
        serviceType: deployment.serviceType,
        provider: deployment.provider,
        environment: deployment.environment,
        region: deployment.region.trim(),
        status: deployment.status
      }))
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

  const invalidDeployment = values.deployments.find((deployment) =>
    (deployment.name.trim() && !deployment.region.trim()) || (!deployment.name.trim() && deployment.region.trim())
  );
  if (invalidDeployment) {
    errors.deployments = "Each deployment needs both a name and region.";
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
      { id: "environment", header: "Environment", cell: (row) => <StatusBadge label={environmentLabels[row.environment]} className={environmentBadgeStyles[row.environment]} /> },
      { id: "deployments", header: "Deployments", cell: (row) => <span className="text-muted-foreground">{row.deployments?.length ?? 0}</span>, className: "text-right" }
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
        <DetailSidebarItem label="Deployments" hint="Embedded deployment inventory now owned directly by the target.">
          {item.deployments?.length ?? 0}
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
    renderContent: ({ item, formValues, errors, handleFieldChange, setFormValues }) => (
      <>
        <DetailFieldGroup title="General">
          <DetailField label="Name" required hint="Operator-facing target label used across workflows and reports." {...definedString(errors["name"] as string | undefined)}>
            <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
          </DetailField>

          <DetailField
            label="Base URL"
            hint="Optional. Include the primary absolute URL when this target exposes a reachable web surface."
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

        <DetailFieldGroup title="Deployments">
          <DetailField label="Embedded deployments" hint="Add the deployment/runtime inventory that belongs to this target." className="md:col-span-2" {...definedString(errors["deployments"] as string | undefined)}>
            <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
              {formValues.deployments.length === 0 ? <p className="text-sm text-muted-foreground">No deployments configured.</p> : null}
              {formValues.deployments.map((deployment, index) => (
                <div key={deployment.id ?? `deployment-${index}`} className="grid gap-3 rounded-xl border border-border/70 bg-background/70 p-3 md:grid-cols-2 xl:grid-cols-3">
                  <Input
                    value={deployment.name}
                    onChange={(event) => setFormValues((current) => ({
                      ...current,
                      deployments: current.deployments.map((entry, entryIndex) => entryIndex === index ? { ...entry, name: event.target.value } : entry)
                    }))}
                    aria-label={`Deployment name ${index + 1}`}
                    placeholder="Deployment name"
                  />
                  <Input
                    value={deployment.region}
                    onChange={(event) => setFormValues((current) => ({
                      ...current,
                      deployments: current.deployments.map((entry, entryIndex) => entryIndex === index ? { ...entry, region: event.target.value } : entry)
                    }))}
                    aria-label={`Deployment region ${index + 1}`}
                    placeholder="Region"
                  />
                  <Select value={deployment.serviceType} onValueChange={(value: TargetDeploymentServiceType) => setFormValues((current) => ({
                    ...current,
                    deployments: current.deployments.map((entry, entryIndex) => entryIndex === index ? { ...entry, serviceType: value } : entry)
                  }))}>
                    <SelectTrigger aria-label={`Deployment service type ${index + 1}`}>
                      <SelectValue placeholder="Service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(serviceTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={deployment.provider} onValueChange={(value: TargetDeploymentProvider) => setFormValues((current) => ({
                    ...current,
                    deployments: current.deployments.map((entry, entryIndex) => entryIndex === index ? { ...entry, provider: value } : entry)
                  }))}>
                    <SelectTrigger aria-label={`Deployment provider ${index + 1}`}>
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(providerLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={deployment.environment} onValueChange={(value: TargetEnvironment) => setFormValues((current) => ({
                    ...current,
                    deployments: current.deployments.map((entry, entryIndex) => entryIndex === index ? { ...entry, environment: value } : entry)
                  }))}>
                    <SelectTrigger aria-label={`Deployment environment ${index + 1}`}>
                      <SelectValue placeholder="Environment" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(environmentLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={deployment.status} onValueChange={(value: TargetDeploymentStatus) => setFormValues((current) => ({
                    ...current,
                    deployments: current.deployments.map((entry, entryIndex) => entryIndex === index ? { ...entry, status: value } : entry)
                  }))}>
                    <SelectTrigger aria-label={`Deployment status ${index + 1}`}>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(deploymentStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="md:col-span-2 xl:col-span-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormValues((current) => ({
                        ...current,
                        deployments: current.deployments.filter((_, entryIndex) => entryIndex !== index)
                      }))}
                    >
                      Remove deployment
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormValues((current) => ({
                  ...current,
                  deployments: [...current.deployments, createEmptyDeployment()]
                }))}
              >
                Add deployment
              </Button>
            </div>
          </DetailField>
          <DetailField label="Registered target assets" hint="Existing target assets remain attached to the target record and are preserved on update." className="md:col-span-2">
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
        </DetailFieldGroup>
      </>
    )
  }
};
