import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type Application,
  type ApplicationEnvironment,
  type CreateRuntimeBody,
  type ListApplicationsResponse,
  type ListRuntimesResponse,
  type Runtime,
  type RuntimeProvider,
  type RuntimeServiceType,
  type RuntimeStatus
} from "@synosec/contracts";
import { fetchJson } from "../lib/api";
import { DetailField, DetailPage } from "./detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "./list-page";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
  const [reloadToken, setReloadToken] = useState(0);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [formValues, setFormValues] = useState<RuntimeFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<RuntimeFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof RuntimeFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isCreateMode = runtimeId === "new";

  const loadApplications = useCallback(async () => {
    const payload = await fetchJson<ListApplicationsResponse>(apiRoutes.applications);
    return payload.applications;
  }, []);

  const loadRuntimes = useCallback(async () => {
    const payload = await fetchJson<ListRuntimesResponse>(apiRoutes.runtimes);
    return payload.runtimes;
  }, []);

  const loadRuntime = useCallback(async () => {
    if (!runtimeId || runtimeId === "new") {
      return null;
    }

    return fetchJson<Runtime>(`${apiRoutes.runtimes}/${runtimeId}`);
  }, [runtimeId]);

  useEffect(() => {
    let active = true;

    loadApplications()
      .then((nextApplications) => {
        if (active) {
          setApplications(nextApplications);
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
  }, [loadApplications]);

  useEffect(() => {
    let active = true;

    async function hydrateDetail() {
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

      try {
        const selected = await loadRuntime();

        if (!active || !selected) {
          return;
        }

        const values = toFormValues(selected);
        setRuntime(selected);
        setFormValues(values);
        setInitialValues(values);
        setErrors({});
      } catch (error) {
        if (!active) {
          return;
        }

        toast.error("Runtime not found", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
        onNavigateToList();
      }
    }

    void hydrateDetail();

    return () => {
      active = false;
    };
  }, [loadRuntime, onNavigateToList, runtimeId]);

  const applicationLookup = useMemo(
    () => Object.fromEntries(applications.map((application) => [application.id, application.name])),
    [applications]
  );

  const runtimeColumns = useMemo<ListPageColumn<Runtime>[]>(() => [
    {
      id: "name",
      header: "Name",
      cell: (row) => <span className="font-medium text-foreground">{row.name}</span>,
      sortValue: (row) => row.name,
      searchValue: (row) => `${row.name} ${row.region} ${applicationLookup[row.applicationId ?? ""] ?? ""}`
    },
    {
      id: "serviceType",
      header: "Service type",
      cell: (row) => <span className="text-muted-foreground">{serviceTypeLabels[row.serviceType]}</span>,
      sortValue: (row) => row.serviceType
    },
    {
      id: "provider",
      header: "Provider",
      cell: (row) => <span className="text-muted-foreground">{providerLabels[row.provider]}</span>,
      sortValue: (row) => row.provider
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge label={statusLabels[row.status]} className={statusBadgeStyles[row.status]} />,
      sortValue: (row) => row.status
    },
    {
      id: "application",
      header: "Application",
      cell: (row) => <span className="text-muted-foreground">{applicationLookup[row.applicationId ?? ""] ?? "Unlinked"}</span>,
      sortValue: (row) => applicationLookup[row.applicationId ?? ""] ?? ""
    }
  ], [applicationLookup]);

  const runtimeFilter = useMemo<ListPageFilter<Runtime>>(() => ({
    label: "Filter runtimes by status",
    placeholder: "Filter by status",
    allLabel: "All statuses",
    options: [
      { label: "Healthy", value: "healthy" },
      { label: "Degraded", value: "degraded" },
      { label: "Retired", value: "retired" }
    ],
    getValue: (row) => row.status
  }), []);

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
        setReloadToken((current) => current + 1);
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
      setReloadToken((current) => current + 1);
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
        key={reloadToken}
        title="Runtimes"
        recordLabel="Runtime"
        columns={runtimeColumns}
        loadData={loadRuntimes}
        filter={runtimeFilter}
        emptyMessage="No runtimes matched the current search and filter."
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
    >
      <DetailField label="Name" required {...definedString(errors.name)}>
        <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
      </DetailField>

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

      <DetailField label="Provider" required hint="Record the platform or hosting provider backing this runtime.">
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

      <DetailField label="Region" required {...definedString(errors.region)}>
        <Input value={formValues.region} onChange={(event) => handleFieldChange("region", event.target.value)} aria-label="Region" />
      </DetailField>

      <DetailField label="Status" required hint="Reflect whether the runtime is healthy, degraded, or retired.">
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

      <DetailField label="Application" hint="Optionally link this runtime to an application inventory record.">
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
    </DetailPage>
  );
}
