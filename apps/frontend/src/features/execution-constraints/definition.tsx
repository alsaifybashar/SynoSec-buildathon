import {
  apiRoutes,
  type CreateExecutionConstraintBody,
  type ExecutionConstraint,
  type ExecutionConstraintKind
} from "@synosec/contracts";
import { executionConstraintTransfer } from "@/features/execution-constraints/transfer";
import { executionConstraintsResource } from "@/features/execution-constraints/resource";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailSidebarItem } from "@/shared/components/detail-page";
import type { ExecutionConstraintsQuery } from "@/shared/lib/resource-client";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

type ConstraintFormValues = {
  name: string;
  kind: ExecutionConstraintKind;
  provider: string;
  version: string;
  description: string;
  ruleSpec: string;
};

const kindLabels: Record<ExecutionConstraintKind, string> = {
  provider_policy: "Provider Policy",
  legal_scope: "Legal Scope",
  workflow_gate: "Workflow Gate"
};

function createEmptyFormValues(): ConstraintFormValues {
  return {
    name: "",
    kind: "provider_policy",
    provider: "",
    version: "1",
    description: "",
    ruleSpec: "{\n  \"excludedPaths\": [],\n  \"requireRateLimitSupport\": false\n}"
  };
}

function toFormValues(constraint: ExecutionConstraint): ConstraintFormValues {
  return {
    name: constraint.name,
    kind: constraint.kind,
    provider: constraint.provider ?? "",
    version: String(constraint.version),
    description: constraint.description ?? "",
    ruleSpec: JSON.stringify(constraint.ruleSpec, null, 2)
  };
}

function toRequestBody(values: ConstraintFormValues): CreateExecutionConstraintBody {
  return {
    name: values.name.trim(),
    kind: values.kind,
    provider: values.provider.trim() || null,
    version: Number(values.version),
    description: values.description.trim() || null,
    ruleSpec: JSON.parse(values.ruleSpec)
  };
}

function validateForm(values: ConstraintFormValues) {
  const errors: Partial<Record<keyof ConstraintFormValues, string>> = {};
  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }
  if (!values.version.trim() || Number.isNaN(Number(values.version)) || Number(values.version) < 1) {
    errors.version = "Version must be a positive integer.";
  }
  try {
    const parsed = JSON.parse(values.ruleSpec);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors.ruleSpec = "Rule spec must be a JSON object.";
    }
  } catch {
    errors.ruleSpec = "Rule spec must be valid JSON.";
  }
  return errors;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

export const executionConstraintsDefinition: CrudFeatureDefinition<
  ExecutionConstraint,
  ConstraintFormValues,
  CreateExecutionConstraintBody,
  ExecutionConstraintsQuery
> = {
  recordLabel: "Execution Constraint",
  titleLabel: "execution constraint",
  route: apiRoutes.executionConstraints,
  resource: executionConstraintsResource,
  transfer: executionConstraintTransfer,
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
  getItemLabel: (constraint) => constraint.name,
  list: {
    title: "Execution Constraints",
    emptyMessage: "No execution constraints have been configured yet.",
    columns: () => [
      { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
      { id: "kind", header: "Kind", cell: (row) => <span className="text-muted-foreground">{kindLabels[row.kind]}</span> },
      { id: "provider", header: "Provider", cell: (row) => <span className="text-muted-foreground">{row.provider ?? "Generic"}</span> },
      { id: "version", header: "Version", cell: (row) => <span className="text-muted-foreground">v{row.version}</span> }
    ],
    filters: () => [
      {
        id: "kind",
        label: "Filter by constraint kind",
        placeholder: "Filter by kind",
        allLabel: "All kinds",
        options: Object.entries(kindLabels).map(([value, label]) => ({ value, label }))
      }
    ]
  },
  detail: {
    loadingTitle: "Execution constraint detail",
    loadingMessage: "Loading execution constraint...",
    createTitle: "New execution constraint",
    renderSidebar: ({ item }) => (
      <>
        <DetailSidebarItem label="Kind">{kindLabels[item.kind]}</DetailSidebarItem>
        <DetailSidebarItem label="Provider">{item.provider ?? "Generic"}</DetailSidebarItem>
        <DetailSidebarItem label="Version">v{item.version}</DetailSidebarItem>
        <DetailSidebarItem label="Updated">{formatTimestamp(item.updatedAt)}</DetailSidebarItem>
      </>
    ),
    renderContent: ({ formValues, errors, handleFieldChange }) => (
      <>
        <DetailFieldGroup title="Constraint">
          <DetailField label="Name" required {...definedString(errors["name"] as string | undefined)}>
            <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
          </DetailField>
          <DetailField label="Kind" required>
            <Select value={formValues.kind} onValueChange={(value) => handleFieldChange("kind", value as ExecutionConstraintKind)}>
              <SelectTrigger aria-label="Kind">
                <SelectValue placeholder="Select kind" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(kindLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailField>
          <DetailField label="Provider">
            <Input value={formValues.provider} onChange={(event) => handleFieldChange("provider", event.target.value)} aria-label="Provider" placeholder="cloudflare" />
          </DetailField>
          <DetailField label="Version" required {...definedString(errors["version"] as string | undefined)}>
            <Input value={formValues.version} onChange={(event) => handleFieldChange("version", event.target.value)} aria-label="Version" />
          </DetailField>
          <DetailField label="Description">
            <Textarea value={formValues.description} onChange={(event) => handleFieldChange("description", event.target.value)} aria-label="Description" rows={4} />
          </DetailField>
        </DetailFieldGroup>

        <DetailFieldGroup title="Rule Spec">
          <DetailField label="Rule JSON" required hint="Stored as the constraint evaluation payload consumed by the broker." {...definedString(errors["ruleSpec"] as string | undefined)}>
            <Textarea value={formValues.ruleSpec} onChange={(event) => handleFieldChange("ruleSpec", event.target.value)} aria-label="Rule JSON" rows={18} className="font-mono text-xs" />
          </DetailField>
        </DetailFieldGroup>
      </>
    )
  }
};
