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
import { useCrudPage } from "@/shared/crud/use-crud-page";
import { DetailField, DetailFieldGroup, DetailLoadingState, DetailPage, DetailSidebarItem } from "@/shared/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
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

export function RuntimesPage({
  runtimeId,
  runtimeNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  runtimeId?: string;
  runtimeNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    let active = true;

    applicationsResource.list({
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

  const crud = useCrudPage({
    recordLabel: "Runtime",
    recordId: runtimeId,
    route: apiRoutes.runtimes,
    resource: runtimesResource,
    transfer: runtimeTransfer,
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
    getItemLabel: (runtime) => runtime.name
  });

  const applicationLookup = useMemo(
    () => Object.fromEntries(applications.map((application) => [application.id, application.name])),
    [applications]
  );

  const runtimeColumns = useMemo<ListPageColumn<Runtime>[]>(() => [
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
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge label={statusLabels[row.status]} className={statusBadgeStyles[row.status]} />
    },
    {
      id: "applicationId",
      header: "Application",
      cell: (row) => <span className="text-muted-foreground">{applicationLookup[row.applicationId ?? ""] ?? "Unlinked"}</span>
    }
  ], [applicationLookup]);

  const runtimeFilters = useMemo<ListPageFilter[]>(() => [
    {
      id: "status",
      label: "Filter runtimes by status",
      placeholder: "Filter by status",
      allLabel: "All statuses",
      options: [
        { label: "Healthy", value: "healthy" },
        { label: "Degraded", value: "degraded" },
        { label: "Retired", value: "retired" }
      ]
    },
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
  ], []);

  if (!runtimeId) {
    return (
      <ListPage
        title="Runtimes"
        recordLabel="Runtime"
        columns={runtimeColumns}
        query={crud.list.query}
        dataState={crud.list.dataState}
        items={crud.list.items}
        meta={crud.list.meta}
        filters={runtimeFilters}
        emptyMessage="No runtimes matched the current search and filter."
        onSearchChange={crud.list.setSearch}
        onFilterChange={crud.list.setFilter}
        onSortChange={crud.list.setSort}
        onPageChange={crud.list.setPage}
        onPageSizeChange={crud.list.setPageSize}
        onRetry={crud.list.refetch}
        onAddRecord={onNavigateToCreate}
        onRowClick={(selected) => onNavigateToDetail(selected.id, selected.name)}
        onImportJson={crud.importJson}
        getRowLabel={(selected) => selected.name}
        onExportRowJson={crud.exportRowJson}
        onDeleteRow={crud.deleteRow}
      />
    );
  }

  if (!crud.isCreateMode && crud.detail.state !== "loaded") {
    return (
      <DetailLoadingState
        title={runtimeNameHint ?? "Runtime detail"}
        breadcrumbs={["Start", "Runtimes", runtimeNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message="Loading runtime..."
      />
    );
  }

  return (
    <DetailPage
      title={crud.isCreateMode ? "New runtime" : crud.item?.name ?? "Runtime detail"}
      breadcrumbs={["Start", "Runtimes", crud.isCreateMode ? "New" : crud.item?.name ?? "Detail"]}
      {...(!crud.isCreateMode && crud.item ? { subtitle: crud.item.id, timestamp: formatTimestamp(crud.item.updatedAt) } : {})}
      isDirty={crud.isDirty}
      isSaving={crud.saving}
      onBack={onNavigateToList}
      onSave={() => {
        void crud.save();
      }}
      onDismiss={crud.resetForm}
      onExportJson={!crud.isCreateMode ? crud.exportCurrent : undefined}
      sidebar={
        !crud.isCreateMode && crud.item ? (
          <>
            <DetailSidebarItem label="Status">
              <StatusBadge label={statusLabels[crud.item.status]} className={statusBadgeStyles[crud.item.status]} />
            </DetailSidebarItem>
            <DetailSidebarItem label="Application">
              {applicationLookup[crud.item.applicationId ?? ""] ?? "Unlinked"}
            </DetailSidebarItem>
            <DetailSidebarItem label="Created">
              {formatTimestamp(crud.item.createdAt)}
            </DetailSidebarItem>
            <DetailSidebarItem label="Updated">
              {formatTimestamp(crud.item.updatedAt)}
            </DetailSidebarItem>
          </>
        ) : undefined
      }
    >
      <DetailFieldGroup title="Identity">
        <DetailField label="Name" required {...definedString(crud.errors.name)}>
          <Input value={crud.formValues.name} onChange={(event) => crud.handleFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>

        <DetailField label="Region" required {...definedString(crud.errors.region)}>
          <Input value={crud.formValues.region} onChange={(event) => crud.handleFieldChange("region", event.target.value)} aria-label="Region" />
        </DetailField>
      </DetailFieldGroup>

      <DetailFieldGroup title="Infrastructure">
        <DetailField label="Service type" required hint="Choose the runtime's primary operational role.">
          <Select value={crud.formValues.serviceType} onValueChange={(value: RuntimeServiceType) => crud.handleFieldChange("serviceType", value)}>
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

        <DetailField label="Provider" required>
          <Select value={crud.formValues.provider} onValueChange={(value: RuntimeProvider) => crud.handleFieldChange("provider", value)}>
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

        <DetailField label="Environment" required>
          <Select value={crud.formValues.environment} onValueChange={(value: ApplicationEnvironment) => crud.handleFieldChange("environment", value)}>
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
        <DetailField label="Status" required>
          <Select value={crud.formValues.status} onValueChange={(value: RuntimeStatus) => crud.handleFieldChange("status", value)}>
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

        <DetailField label="Application">
          <Select value={crud.formValues.applicationId || "__none__"} onValueChange={(value) => crud.handleFieldChange("applicationId", value === "__none__" ? "" : value)}>
            <SelectTrigger aria-label="Application" className="w-fit min-w-[12rem] max-w-[16rem]">
              <SelectValue placeholder="Select application" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No application</SelectItem>
              {applications.map((application) => (
                <SelectItem key={application.id} value={application.id}>
                  {application.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>
      </DetailFieldGroup>
    </DetailPage>
  );
}
