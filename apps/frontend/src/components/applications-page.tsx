import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type Application,
  type ApplicationEnvironment,
  type ApplicationStatus,
  type CreateApplicationBody,
  type ListApplicationsResponse
} from "@synosec/contracts";
import { fetchJson } from "../lib/api";
import { DetailField, DetailPage } from "./detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "./list-page";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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

const applicationColumns: ListPageColumn<Application>[] = [
  { id: "name", header: "Name", cell: (row) => row.name, sortValue: (row) => row.name, searchValue: (row) => `${row.name} ${row.baseUrl ?? ""}` },
  { id: "baseUrl", header: "Base URL", cell: (row) => row.baseUrl ?? "Not set", sortValue: (row) => row.baseUrl ?? "" },
  { id: "environment", header: "Environment", cell: (row) => environmentLabels[row.environment], sortValue: (row) => row.environment },
  { id: "status", header: "Status", cell: (row) => statusLabels[row.status], sortValue: (row) => row.status },
  {
    id: "lastScannedAt",
    header: "Last scanned",
    cell: (row) => formatTimestamp(row.lastScannedAt),
    sortValue: (row) => row.lastScannedAt ?? "",
    className: "text-right"
  }
];

const applicationFilter: ListPageFilter<Application> = {
  label: "Filter applications by status",
  placeholder: "Filter by status",
  allLabel: "All statuses",
  options: [
    { label: "Active", value: "active" },
    { label: "Investigating", value: "investigating" },
    { label: "Archived", value: "archived" }
  ],
  getValue: (row) => row.status
};

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

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

export function ApplicationsPage({
  applicationId,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  applicationId?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string) => void;
}) {
  const [reloadToken, setReloadToken] = useState(0);
  const [application, setApplication] = useState<Application | null>(null);
  const [formValues, setFormValues] = useState<ApplicationFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<ApplicationFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isCreateMode = applicationId === "new";

  const loadApplications = useCallback(async () => {
    const payload = await fetchJson<ListApplicationsResponse>(apiRoutes.applications);
    return payload.applications;
  }, []);

  const loadApplication = useCallback(async () => {
    const payload = await fetchJson<ListApplicationsResponse>(apiRoutes.applications);

    if (!applicationId || applicationId === "new") {
      return null;
    }

    return payload.applications.find((candidate) => candidate.id === applicationId) ?? null;
  }, [applicationId]);

  useEffect(() => {
    let active = true;

    async function hydrateDetail() {
      if (!applicationId) {
        return;
      }

      if (applicationId === "new") {
        const empty = createEmptyFormValues();
        setApplication(null);
        setFormValues(empty);
        setInitialValues(empty);
        setErrors({});
        return;
      }

      const selected = await loadApplication();

      if (!active) {
        return;
      }

      if (!selected) {
        toast.error("Application not found");
        onNavigateToList();
        return;
      }

      const values = toFormValues(selected);
      setApplication(selected);
      setFormValues(values);
      setInitialValues(values);
      setErrors({});
    }

    void hydrateDetail();

    return () => {
      active = false;
    };
  }, [applicationId, loadApplication, onNavigateToList]);

  const isDirty = useMemo(() => JSON.stringify(formValues) !== JSON.stringify(initialValues), [formValues, initialValues]);

  function handleFieldChange<Key extends keyof ApplicationFormValues>(key: Key, value: ApplicationFormValues[Key]) {
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
        const created = await fetchJson<Application>(apiRoutes.applications, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        toast.success("Application created");
        setReloadToken((current) => current + 1);
        onNavigateToDetail(created.id);
        return;
      }

      if (!application) {
        return;
      }

      const updated = await fetchJson<Application>(`${apiRoutes.applications}/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body
      });
      const nextValues = toFormValues(updated);
      setApplication(updated);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      setReloadToken((current) => current + 1);
      toast.success("Application updated");
    } catch (error) {
      toast.error("Application request failed", {
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

  if (!applicationId) {
    return (
      <ListPage
        key={reloadToken}
        title="Applications"
        recordLabel="Application"
        columns={applicationColumns}
        loadData={loadApplications}
        filter={applicationFilter}
        emptyMessage="No applications matched the current search and filter."
        onAddRecord={onNavigateToCreate}
        onRowClick={(selected) => onNavigateToDetail(selected.id)}
      />
    );
  }

  return (
    <DetailPage
      title={isCreateMode ? "New application" : application?.name ?? "Application detail"}
      breadcrumbs={["Start", "Applications", isCreateMode ? "New" : application?.name ?? "Detail"]}
      isDirty={isDirty}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={handleSave}
      onDismiss={handleDismiss}
      saveLabel={isCreateMode ? "Save" : "Save"}
    >
      <DetailField
        label="Name"
        required
        {...definedString(errors.name)}
      >
        <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
      </DetailField>

      <DetailField
        label="Base URL"
        hint="Optional. Include the primary absolute URL when this application exposes a reachable web surface."
        {...definedString(errors.baseUrl)}
      >
        <Input value={formValues.baseUrl} onChange={(event) => handleFieldChange("baseUrl", event.target.value)} aria-label="Base URL" />
      </DetailField>

      <DetailField label="Environment" required hint="Choose the environment that best reflects how this application is currently operated.">
        <Select value={formValues.environment} onValueChange={(value: ApplicationEnvironment) => handleFieldChange("environment", value)}>
          <SelectTrigger aria-label="Environment" className="ml-auto w-fit min-w-[11rem] max-w-full">
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

      <DetailField label="Status" required hint="Use status to reflect whether the application is active, under investigation, or archived.">
        <Select value={formValues.status} onValueChange={(value: ApplicationStatus) => handleFieldChange("status", value)}>
          <SelectTrigger aria-label="Status" className="ml-auto w-fit min-w-[11rem] max-w-full">
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

      <DetailField label="Last scanned" hint="Optional. Use the most recent known successful scan timestamp when there is one.">
        <Input
          type="datetime-local"
          value={formValues.lastScannedAt}
          onChange={(event) => handleFieldChange("lastScannedAt", event.target.value)}
          aria-label="Last scanned"
        />
      </DetailField>
    </DetailPage>
  );
}
