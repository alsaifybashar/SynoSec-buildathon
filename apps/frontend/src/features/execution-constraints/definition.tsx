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
  denyProviderOwnedTargets: boolean;
  requireVerifiedOwnership: boolean;
  allowActiveExploit: boolean;
  requireRateLimitSupport: boolean;
  rateLimitRps: string;
  requireHostAllowlistSupport: boolean;
  requirePathExclusionSupport: boolean;
  excludedPaths: string;
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
    denyProviderOwnedTargets: false,
    requireVerifiedOwnership: false,
    allowActiveExploit: false,
    requireRateLimitSupport: false,
    rateLimitRps: "",
    requireHostAllowlistSupport: false,
    requirePathExclusionSupport: false,
    excludedPaths: ""
  };
}

function toFormValues(constraint: ExecutionConstraint): ConstraintFormValues {
  return {
    name: constraint.name,
    kind: constraint.kind,
    provider: constraint.provider ?? "",
    version: String(constraint.version),
    description: constraint.description ?? "",
    denyProviderOwnedTargets: constraint.denyProviderOwnedTargets,
    requireVerifiedOwnership: constraint.requireVerifiedOwnership,
    allowActiveExploit: constraint.allowActiveExploit,
    requireRateLimitSupport: constraint.requireRateLimitSupport,
    rateLimitRps: constraint.rateLimitRps == null ? "" : String(constraint.rateLimitRps),
    requireHostAllowlistSupport: constraint.requireHostAllowlistSupport,
    requirePathExclusionSupport: constraint.requirePathExclusionSupport,
    excludedPaths: constraint.excludedPaths.join("\n")
  };
}

function parseExcludedPaths(value: string) {
  return Array.from(new Set(
    value
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  ));
}

function toRequestBody(values: ConstraintFormValues): CreateExecutionConstraintBody {
  return {
    name: values.name.trim(),
    kind: values.kind,
    provider: values.provider.trim() || null,
    version: Number(values.version),
    description: values.description.trim() || null,
    denyProviderOwnedTargets: values.denyProviderOwnedTargets,
    requireVerifiedOwnership: values.requireVerifiedOwnership,
    allowActiveExploit: values.allowActiveExploit,
    requireRateLimitSupport: values.requireRateLimitSupport,
    rateLimitRps: values.rateLimitRps.trim() ? Number(values.rateLimitRps) : null,
    requireHostAllowlistSupport: values.requireHostAllowlistSupport,
    requirePathExclusionSupport: values.requirePathExclusionSupport,
    excludedPaths: parseExcludedPaths(values.excludedPaths)
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

  if (values.rateLimitRps.trim()) {
    const parsedRateLimit = Number(values.rateLimitRps);
    if (!Number.isInteger(parsedRateLimit) || parsedRateLimit < 1) {
      errors.rateLimitRps = "Throttle must be a positive integer when set.";
    }
  }

  return errors;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

function renderToggleField(
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
  hint?: string
) {
  return (
    <DetailField label={label} {...(hint ? { hint } : {})}>
      <label className="flex items-center gap-3 rounded-[4px] border border-border px-3 py-2 text-sm text-foreground">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label} />
        <span>{checked ? "Enabled" : "Disabled"}</span>
      </label>
    </DetailField>
  );
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

        <DetailFieldGroup title="Policy Checklist">
          {renderToggleField(
            "Deny provider-owned targets",
            formValues.denyProviderOwnedTargets,
            (checked) => handleFieldChange("denyProviderOwnedTargets", checked),
            "Blocks testing against provider-owned destinations such as Cloudflare-owned domains."
          )}
          {renderToggleField(
            "Require verified ownership",
            formValues.requireVerifiedOwnership,
            (checked) => handleFieldChange("requireVerifiedOwnership", checked),
            "Only allow runs against targets marked as ownership-verified."
          )}
          {renderToggleField(
            "Allow active exploit",
            formValues.allowActiveExploit,
            (checked) => handleFieldChange("allowActiveExploit", checked),
            "Controlled exploit tools remain blocked unless this is explicitly enabled."
          )}
          {renderToggleField(
            "Require rate-limit support",
            formValues.requireRateLimitSupport,
            (checked) => handleFieldChange("requireRateLimitSupport", checked),
            "Deny tools that cannot consume an enforced request throttle."
          )}
          <DetailField
            label="Throttle (req/s)"
            hint="Optional hard cap applied to compatible tools. Leaving this blank means no explicit throttle is defined on the constraint."
            {...definedString(errors["rateLimitRps"] as string | undefined)}
          >
            <Input
              type="number"
              min="1"
              value={formValues.rateLimitRps}
              onChange={(event) => handleFieldChange("rateLimitRps", event.target.value)}
              aria-label="Throttle requests per second"
              placeholder="5"
            />
          </DetailField>
          {renderToggleField(
            "Require host allowlist support",
            formValues.requireHostAllowlistSupport,
            (checked) => handleFieldChange("requireHostAllowlistSupport", checked),
            "Deny tools that cannot stay pinned to the selected host."
          )}
          {renderToggleField(
            "Require path exclusion support",
            formValues.requirePathExclusionSupport,
            (checked) => handleFieldChange("requirePathExclusionSupport", checked),
            "Deny tools that cannot exclude prohibited paths."
          )}
          <DetailField
            label="Excluded paths"
            hint="One path per line. These will be injected into compatible tools."
            className="md:col-span-2"
          >
            <Textarea
              value={formValues.excludedPaths}
              onChange={(event) => handleFieldChange("excludedPaths", event.target.value)}
              aria-label="Excluded paths"
              rows={10}
              className="font-mono text-xs"
              placeholder="/cdn-cgi/"
            />
          </DetailField>
        </DetailFieldGroup>
      </>
    )
  }
};
