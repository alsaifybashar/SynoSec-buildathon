import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type Application,
  type ApplicationEnvironment,
  type ApplicationStatus,
  type CreateApplicationBody
} from "@synosec/contracts";
import { fetchJson } from "@/lib/api";
import { useResourceDetail } from "@/hooks/useResourceDetail";
import { useResourceList } from "@/hooks/useResourceList";
import { applicationsResource } from "@/lib/resources";
import { DetailField, DetailFieldGroup, DetailPage, DetailSidebarItem } from "@/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/components/list-page";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const applicationColumns: ListPageColumn<Application>[] = [
  { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
  { id: "baseUrl", header: "Base URL", cell: (row) => <span className="text-muted-foreground">{row.baseUrl ?? "Not set"}</span> },
  { id: "environment", header: "Environment", cell: (row) => <StatusBadge label={environmentLabels[row.environment]} className={environmentBadgeStyles[row.environment]} /> },
  { id: "status", header: "Status", cell: (row) => <StatusBadge label={statusLabels[row.status]} className={statusBadgeStyles[row.status]} /> },
  {
    id: "lastScannedAt",
    header: "Last scanned",
    cell: (row) => <span className="text-muted-foreground">{formatTimestamp(row.lastScannedAt)}</span>,
    className: "text-right"
  }
];

const applicationFilters: ListPageFilter[] = [
  {
    id: "status",
    label: "Filter applications by status",
    placeholder: "Filter by status",
    allLabel: "All statuses",
    options: [
      { label: "Active", value: "active" },
      { label: "Investigating", value: "investigating" },
      { label: "Archived", value: "archived" }
    ]
  },
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
];

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
  const [application, setApplication] = useState<Application | null>(null);
  const [formValues, setFormValues] = useState<ApplicationFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<ApplicationFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isCreateMode = applicationId === "new";
  const applicationList = useResourceList(applicationsResource);
  const applicationDetail = useResourceDetail(applicationsResource, applicationId && applicationId !== "new" ? applicationId : null);

  useEffect(() => {
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

    if (applicationDetail.state === "error") {
      toast.error("Application not found", {
        description: applicationDetail.message
      });
      onNavigateToList();
      return;
    }

    if (applicationDetail.state !== "loaded") {
      return;
    }

    const values = toFormValues(applicationDetail.item);
    setApplication(applicationDetail.item);
    setFormValues(values);
    setInitialValues(values);
    setErrors({});
  }, [applicationDetail, applicationId, onNavigateToList]);

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
        title="Applications"
        recordLabel="Application"
        columns={applicationColumns}
        query={applicationList.query}
        dataState={applicationList.dataState}
        items={applicationList.items}
        meta={applicationList.meta}
        filters={applicationFilters}
        emptyMessage="No applications matched the current search and filter."
        onSearchChange={applicationList.setSearch}
        onFilterChange={applicationList.setFilter}
        onSortChange={applicationList.setSort}
        onPageChange={applicationList.setPage}
        onPageSizeChange={applicationList.setPageSize}
        onRetry={applicationList.refetch}
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
      sidebar={
        !isCreateMode && application ? (
          <>
            <DetailSidebarItem label="Status">
              <StatusBadge label={statusLabels[application.status]} className={statusBadgeStyles[application.status]} />
            </DetailSidebarItem>
            <DetailSidebarItem label="Environment">
              <StatusBadge label={environmentLabels[application.environment]} className={environmentBadgeStyles[application.environment]} />
            </DetailSidebarItem>
            <DetailSidebarItem label="Last scanned">
              {formatTimestamp(application.lastScannedAt)}
            </DetailSidebarItem>
            <DetailSidebarItem label="Created">
              {formatTimestamp(application.createdAt)}
            </DetailSidebarItem>
            <DetailSidebarItem label="Updated">
              {formatTimestamp(application.updatedAt)}
            </DetailSidebarItem>
          </>
        ) : undefined
      }
    >
      <DetailFieldGroup title="General">
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
      </DetailFieldGroup>

      <DetailFieldGroup title="Configuration">
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

        <DetailField label="Status" required>
          <Select value={formValues.status} onValueChange={(value: ApplicationStatus) => handleFieldChange("status", value)}>
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

        <DetailField label="Last scanned">
          <Input
            type="datetime-local"
            value={formValues.lastScannedAt}
            onChange={(event) => handleFieldChange("lastScannedAt", event.target.value)}
            aria-label="Last scanned"
          />
        </DetailField>
      </DetailFieldGroup>
    </DetailPage>
  );
}
