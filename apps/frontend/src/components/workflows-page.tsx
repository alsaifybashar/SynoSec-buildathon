import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type Application,
  type CreateWorkflowBody,
  type ListApplicationsResponse,
  type ListWorkflowsResponse,
  type Workflow,
  type WorkflowStatus,
  type WorkflowTargetMode,
  type WorkflowTrigger
} from "@synosec/contracts";
import { fetchJson } from "../lib/api";
import { DetailField, DetailFieldGroup, DetailPage, DetailSidebarItem } from "./detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "./list-page";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type WorkflowFormValues = {
  name: string;
  trigger: WorkflowTrigger;
  status: WorkflowStatus;
  maxDepth: string;
  targetMode: WorkflowTargetMode;
  applicationId: string;
};

const triggerLabels: Record<WorkflowTrigger, string> = {
  manual: "Manual",
  schedule: "Schedule",
  event: "Event"
};

const statusLabels: Record<WorkflowStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused"
};

const targetModeLabels: Record<WorkflowTargetMode, string> = {
  application: "Application",
  runtime: "Runtime",
  manual: "Manual"
};

const triggerBadgeStyles: Record<WorkflowTrigger, string> = {
  manual: "bg-primary/10 text-primary",
  schedule: "bg-accent text-accent-foreground",
  event: "bg-secondary text-secondary-foreground"
};

const statusBadgeStyles: Record<WorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/15 text-success",
  paused: "bg-warning/15 text-warning"
};

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  );
}

function createEmptyFormValues(): WorkflowFormValues {
  return {
    name: "",
    trigger: "manual",
    status: "draft",
    maxDepth: "3",
    targetMode: "application",
    applicationId: ""
  };
}

function toFormValues(workflow: Workflow): WorkflowFormValues {
  return {
    name: workflow.name,
    trigger: workflow.trigger,
    status: workflow.status,
    maxDepth: String(workflow.maxDepth),
    targetMode: workflow.targetMode,
    applicationId: workflow.applicationId ?? ""
  };
}

function toRequestBody(values: WorkflowFormValues): CreateWorkflowBody {
  return {
    name: values.name.trim(),
    trigger: values.trigger,
    status: values.status,
    maxDepth: Number(values.maxDepth),
    targetMode: values.targetMode,
    applicationId: values.applicationId
  };
}

function validateForm(values: WorkflowFormValues) {
  const errors: Partial<Record<keyof WorkflowFormValues, string>> = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  const parsedMaxDepth = Number(values.maxDepth);
  if (!Number.isInteger(parsedMaxDepth) || parsedMaxDepth < 1 || parsedMaxDepth > 8) {
    errors.maxDepth = "Max depth must be an integer between 1 and 8.";
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

export function WorkflowsPage({
  workflowId,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  workflowId?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string) => void;
}) {
  const [reloadToken, setReloadToken] = useState(0);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [formValues, setFormValues] = useState<WorkflowFormValues>(createEmptyFormValues);
  const [initialValues, setInitialValues] = useState<WorkflowFormValues>(createEmptyFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof WorkflowFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isCreateMode = workflowId === "new";

  const loadApplications = useCallback(async () => {
    const payload = await fetchJson<ListApplicationsResponse>(apiRoutes.applications);
    return payload.applications;
  }, []);

  const loadWorkflows = useCallback(async () => {
    const payload = await fetchJson<ListWorkflowsResponse>(apiRoutes.workflows);
    return payload.workflows;
  }, []);

  const loadWorkflow = useCallback(async () => {
    if (!workflowId || workflowId === "new") {
      return null;
    }

    return fetchJson<Workflow>(`${apiRoutes.workflows}/${workflowId}`);
  }, [workflowId]);

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
      if (!workflowId) {
        return;
      }

      if (workflowId === "new") {
        const empty = createEmptyFormValues();
        setWorkflow(null);
        setFormValues(empty);
        setInitialValues(empty);
        setErrors({});
        return;
      }

      try {
        const selected = await loadWorkflow();

        if (!active || !selected) {
          return;
        }

        const values = toFormValues(selected);
        setWorkflow(selected);
        setFormValues(values);
        setInitialValues(values);
        setErrors({});
      } catch (error) {
        if (!active) {
          return;
        }

        toast.error("Workflow not found", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
        onNavigateToList();
      }
    }

    void hydrateDetail();

    return () => {
      active = false;
    };
  }, [loadWorkflow, onNavigateToList, workflowId]);

  const applicationLookup = useMemo(
    () => Object.fromEntries(applications.map((application) => [application.id, application.name])),
    [applications]
  );

  const workflowColumns = useMemo<ListPageColumn<Workflow>[]>(() => [
    {
      id: "name",
      header: "Name",
      cell: (row) => <span className="font-medium text-foreground">{row.name}</span>,
      sortValue: (row) => row.name,
      searchValue: (row) => `${row.name} ${applicationLookup[row.applicationId ?? ""] ?? ""}`
    },
    {
      id: "trigger",
      header: "Trigger",
      cell: (row) => <StatusBadge label={triggerLabels[row.trigger]} className={triggerBadgeStyles[row.trigger]} />,
      sortValue: (row) => row.trigger
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge label={statusLabels[row.status]} className={statusBadgeStyles[row.status]} />,
      sortValue: (row) => row.status
    },
    {
      id: "targetMode",
      header: "Target mode",
      cell: (row) => <span className="text-muted-foreground">{targetModeLabels[row.targetMode]}</span>,
      sortValue: (row) => row.targetMode
    },
    {
      id: "application",
      header: "Application",
      cell: (row) => <span className="text-muted-foreground">{applicationLookup[row.applicationId ?? ""] ?? "Unlinked"}</span>,
      sortValue: (row) => applicationLookup[row.applicationId ?? ""] ?? ""
    }
  ], [applicationLookup]);

  const workflowFilter = useMemo<ListPageFilter<Workflow>>(() => ({
    label: "Filter workflows by trigger",
    placeholder: "Filter by trigger",
    allLabel: "All triggers",
    options: [
      { label: "Manual", value: "manual" },
      { label: "Schedule", value: "schedule" },
      { label: "Event", value: "event" }
    ],
    getValue: (row) => row.trigger
  }), []);

  const isDirty = useMemo(() => JSON.stringify(formValues) !== JSON.stringify(initialValues), [formValues, initialValues]);

  function handleFieldChange<Key extends keyof WorkflowFormValues>(key: Key, value: WorkflowFormValues[Key]) {
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
        const created = await fetchJson<Workflow>(apiRoutes.workflows, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });
        toast.success("Workflow created");
        setReloadToken((current) => current + 1);
        onNavigateToDetail(created.id);
        return;
      }

      if (!workflow) {
        return;
      }

      const updated = await fetchJson<Workflow>(`${apiRoutes.workflows}/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body
      });
      const nextValues = toFormValues(updated);
      setWorkflow(updated);
      setFormValues(nextValues);
      setInitialValues(nextValues);
      setReloadToken((current) => current + 1);
      toast.success("Workflow updated");
    } catch (error) {
      toast.error("Workflow request failed", {
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

  if (!workflowId) {
    return (
      <ListPage
        key={reloadToken}
        title="Workflows"
        recordLabel="Workflow"
        columns={workflowColumns}
        loadData={loadWorkflows}
        filter={workflowFilter}
        emptyMessage="No workflows matched the current search and filter."
        onAddRecord={onNavigateToCreate}
        onRowClick={(selected) => onNavigateToDetail(selected.id)}
      />
    );
  }

  return (
    <DetailPage
      title={isCreateMode ? "New workflow" : workflow?.name ?? "Workflow detail"}
      breadcrumbs={["Start", "Workflows", isCreateMode ? "New" : workflow?.name ?? "Detail"]}
      isDirty={isDirty}
      isSaving={saving}
      onBack={onNavigateToList}
      onSave={handleSave}
      onDismiss={handleDismiss}
      sidebar={
        !isCreateMode && workflow ? (
          <>
            <DetailSidebarItem label="Status">
              <StatusBadge label={statusLabels[workflow.status]} className={statusBadgeStyles[workflow.status]} />
            </DetailSidebarItem>
            <DetailSidebarItem label="Trigger">
              <StatusBadge label={triggerLabels[workflow.trigger]} className={triggerBadgeStyles[workflow.trigger]} />
            </DetailSidebarItem>
            <DetailSidebarItem label="Application">
              {applicationLookup[workflow.applicationId ?? ""] ?? "Unlinked"}
            </DetailSidebarItem>
            <DetailSidebarItem label="Created">
              {formatTimestamp(workflow.createdAt)}
            </DetailSidebarItem>
            <DetailSidebarItem label="Updated">
              {formatTimestamp(workflow.updatedAt)}
            </DetailSidebarItem>
          </>
        ) : undefined
      }
    >
      <DetailFieldGroup title="General">
        <DetailField label="Name" required {...definedString(errors.name)}>
          <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
        </DetailField>

        <DetailField label="Trigger" required>
          <Select value={formValues.trigger} onValueChange={(value: WorkflowTrigger) => handleFieldChange("trigger", value)}>
            <SelectTrigger aria-label="Trigger" className="w-fit min-w-[10rem] max-w-[12rem]">
              <SelectValue placeholder="Select trigger" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(triggerLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailField>

        <DetailField label="Status" required>
          <Select value={formValues.status} onValueChange={(value: WorkflowStatus) => handleFieldChange("status", value)}>
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
      </DetailFieldGroup>

      <DetailFieldGroup title="Scan configuration">
        <DetailField label="Max depth" required hint="Limit how deep the playbook can explore.">
          <Input
            type="number"
            min={1}
            max={8}
            value={formValues.maxDepth}
            onChange={(event) => handleFieldChange("maxDepth", event.target.value)}
            aria-label="Max depth"
          />
        </DetailField>

        <DetailField label="Target mode" required hint="Choose whether this playbook targets an application, a runtime, or an ad-hoc manual scope.">
          <Select value={formValues.targetMode} onValueChange={(value: WorkflowTargetMode) => handleFieldChange("targetMode", value)}>
            <SelectTrigger aria-label="Target mode" className="w-fit min-w-[10rem] max-w-[12rem]">
              <SelectValue placeholder="Select target mode" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(targetModeLabels).map(([value, label]) => (
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
