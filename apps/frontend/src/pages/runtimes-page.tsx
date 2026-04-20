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
import { fetchJson } from "@/lib/api";
import { useResourceDetail } from "@/hooks/useResourceDetail";
import { useResourceList } from "@/hooks/useResourceList";
import { applicationsResource, runtimesResource } from "@/lib/resources";
import { DetailField, DetailFieldGroup, DetailPage, DetailSidebarItem } from "@/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/components/list-page";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

export function RuntimesPage({
  runtimeId,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  runtimeId?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string) => void;
}) {
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [formValues, setFormValues] = useState<RuntimeFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<RuntimeFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof RuntimeFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isCreateMode = runtimeId === "new";
  const runtimeList = useResourceList(runtimesResource);
  const runtimeDetail = useResourceDetail(runtimesResource, runtimeId && runtimeId !== "new" ? runtimeId : null);

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

  useEffect(() => {
    if (!runtimeId) {
      return;
    }

    if (runtimeId === "new") {
      const empty = createEmptyFormValues();
      setRuntime(null);
      setFormValues(empty);
      setInitialValues(empty);
      setErrors({});
      return;
    }

    if (runtimeDetail.state === "error") {
      toast.error("Runtime not found", {
        description: runtimeDetail.message
      });
      onNavigateToList();
      return;
    }

    if (runtimeDetail.state !== "loaded") {
      return;
    }

    const values = toFormValues(runtimeDetail.item);
    setRuntime(runtimeDetail.item);
    setFormValues(values);
    setInitialValues(values);
    setErrors({});
  }, [onNavigateToList, runtimeDetail, runtimeId]);

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
      cell: (row) => <span className="text-muted-foreground">{serviceTypeLabels[row.serviceType]}</span>,
      sortable: false
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
      id: "application",
      header: "Application",
      cell: (row) => <span className="text-muted-foreground">{applicationLookup[row.applicationId ?? ""] ?? "Unlinked"}</span>,
      sortable: false
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

  const isDirty = useMemo(() => JSON.stringify(formValues) !== JSON.stringify(initialValues), [formValues, initialValues]);

  function handleFieldChange<Key extends keyof RuntimeFormValues>(key: Key, value: RuntimeFormValues[Key]) {
    setFormValues((current) => ({
      ...current,
      [key]: value
    }));

    if (errors[key]) {
      setErrors((current) => ({
        ...current,
        [key]: undefined
      }));
    }
  }

  async function handleSave() {
    const nextErrors = validateForm(formValues);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Validation failed", {
        description: "Fix the highlighted fields before saving."
      });
      return;
    }

    setSaving(true);

    try {
      const body = JSON.stringify(toRequestBody(formValues));

      if (isCreateMode) {
        const created = await fetchJson<Runtime>(apiRoutes.runtimes, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        toast.success("Runtime created");
        onNavigateToDetail(created.id);
        return;
      }

      if (!runtime) {
        return;
      }

      const updated = await fetchJson<Runtime>(`${apiRoutes.runtimes}/${runtime.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body
      });
      const nextValues = toFormValues(updated);
      setRuntime(updated);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      toast.success("Runtime updated");
    } catch (error) {
      toast.error("Runtime request failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setSaving(false);
    }
  }

  function handleDismiss() {
    setFormValues(initialValues);
    setErrors({});
  }

  if (!runtimeId) {
    return (
      <ListPage
        title="Runtimes"
        recordLabel="Runtime"
        columns={runtimeColumns}
        query={runtimeList.query}
        dataState={runtimeList.dataState}
        items={runtimeList.items}
        meta={runtimeList.meta}
        filters={runtimeFilters}
        emptyMessage="No runtimes matched the current search and filter."
        onSearchChange={runtimeList.setSearch}
        onFilterChange={runtimeList.setFilter}
        onSortChange={runtimeList.setSort}
        onPageChange={runtimeList.setPage}
        onPageSizeChange={runtimeList.setPageSize}
        onRetry={runtimeList.refetch}
        onAddRecord={onNavigateToCreate}
        onRowClick={(selected) => onNavigateToDetail(selected.id)}
      />
    );
  }

  return (
    <DetailPage
      title={isCreateMode ? "New runtime" : runtime?.name ?? "Runtime detail"}
      breadcrumbs={["Start", "Runtimes", isCreateMode ? "New" : runtime?.name ?? "Detail"]}
      isDirty={isDirty}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={handleSave}
      onDismiss={handleDismiss}
      sidebar={
        !isCreateMode && runtime ? (
          <>
            <DetailSidebarItem label="Status">
              <StatusBadge label={statusLabels[runtime.status]} className={statusBadgeStyles[runtime.status]} />
            </DetailSidebarItem>
            <DetailSidebarItem label="Application">
              {applicationLookup[runtime.applicationId ?? ""] ?? "Unlinked"}
            </DetailSidebarItem>
            <DetailSidebarItem label="Created">
              {formatTimestamp(runtime.createdAt)}
            </DetailSidebarItem>
            <DetailSidebarItem label="Updated">
              {formatTimestamp(runtime.updatedAt)}
            </DetailSidebarItem>
          </>
        ) : undefined
      }
    >
      <DetailFieldGroup title="Identity">
        <DetailField label="Name" required {...definedString(errors.name)}>
          <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>

        <DetailField label="Region" required {...definedString(errors.region)}>
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

        <DetailField label="Provider" required>
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

        <DetailField label="Environment" required>
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
        <DetailField label="Status" required>
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

        <DetailField label="Application">
          <Select value={formValues.applicationId || "__none__"} onValueChange={(value) => handleFieldChange("applicationId", value === "__none__" ? "" : value)}>
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
