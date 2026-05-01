import {
  apiRoutes,
  localDemoTargetDefaults,
  localFullStackTargetDefaults,
  localJuiceShopTargetDefaults,
  type CreateTargetBody,
  type Target,
  type TargetEnvironment,
  type TargetStatus
} from "@synosec/contracts";
import { Info } from "lucide-react";
import { targetsResource } from "@/features/targets/resource";
import { targetTransfer } from "@/features/targets/transfer";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailField, DetailFieldGroup, DetailFormCard, DetailSidebarItem } from "@/shared/components/detail-page";
import type { TargetsQuery } from "@/shared/lib/resource-client";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

export type TargetFormValues = {
  name: string;
  baseUrl: string;
  executionBaseUrl: string;
  environment: TargetEnvironment;
  status: TargetStatus;
  lastScannedAt: string;
};

export const environmentLabels: Record<TargetEnvironment, string> = {
  production: "Production",
  staging: "Staging",
  development: "Development"
};

export const statusLabels: Record<TargetStatus, string> = {
  active: "Active",
  investigating: "Investigating",
  archived: "Archived"
};

export const environmentBadgeStyles: Record<TargetEnvironment, string> = {
  production: "bg-primary/10 text-primary",
  staging: "bg-secondary text-secondary-foreground",
  development: "bg-muted text-muted-foreground"
};

export const statusBadgeStyles: Record<TargetStatus, string> = {
  active: "bg-primary/10 text-primary",
  investigating: "bg-secondary text-secondary-foreground",
  archived: "bg-muted text-muted-foreground"
};

export function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${className}`}>
      {label}
    </span>
  );
}

export function createEmptyFormValues(): TargetFormValues {
  return {
    name: "",
    baseUrl: "",
    executionBaseUrl: "",
    environment: "production",
    status: "active",
    lastScannedAt: ""
  };
}

export function toFormValues(target: Target): TargetFormValues {
  return {
    name: target.name,
    baseUrl: target.baseUrl ?? "",
    executionBaseUrl: target.executionBaseUrl ?? "",
    environment: target.environment,
    status: target.status,
    lastScannedAt: target.lastScannedAt ? target.lastScannedAt.slice(0, 16) : ""
  };
}

export function toRequestBody(values: TargetFormValues): CreateTargetBody {
  return {
    name: values.name.trim(),
    baseUrl: values.baseUrl.trim(),
    executionBaseUrl: values.executionBaseUrl.trim(),
    environment: values.environment,
    status: values.status,
    lastScannedAt: values.lastScannedAt ? new Date(values.lastScannedAt).toISOString() : null
  };
}

export function validateForm(values: TargetFormValues) {
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

  if (values.executionBaseUrl.trim()) {
    try {
      new URL(values.executionBaseUrl.trim());
    } catch {
      errors.executionBaseUrl = "Execution URL must be a valid absolute URL.";
    }
  }

  return errors;
}

export function formatTimestamp(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function definedString(value: string | undefined) {
  return value ? { error: value } : {};
}

const seededTargetCatalog = [
  {
    hostUrl: localDemoTargetDefaults.hostUrl,
    vulnerabilities: [
      "SQL injection simulation on /login",
      "Unauthenticated admin panel on /admin",
      "Sensitive data exposure on /api/users",
      "Directory listing simulation on /files",
      "Reflected XSS on /search",
      "Verbose errors and missing security headers"
    ]
  },
  {
    hostUrl: localFullStackTargetDefaults.hostUrl,
    vulnerabilities: [
      "Vendor directory leaks vendor slugs and invoice references",
      "Invoice detail IDOR leaks treasury approval codes",
      "Support search leaks case ids and recovery workflow hints",
      "Support case IDOR leaks finance-manager recovery tokens",
      "Recovery token exchange creates finance-manager sessions",
      "Finance export requires chained invoice approval or manager session"
    ]
  },
  {
    hostUrl: localJuiceShopTargetDefaults.hostUrl,
    vulnerabilities: [
      "Broad OWASP Juice Shop challenge surface with intentionally insecure workflows",
      "Multiple auth, access control, injection, and data exposure paths",
      "Built-in score board and challenge model for repeatable lab validation",
      "Pinned official Docker image for controlled local-only testing"
    ]
  }
] as const;

function getSeededTargetDefinition(target: Pick<Target, "baseUrl" | "environment">) {
  if (target.environment !== "development") {
    return null;
  }

  return seededTargetCatalog.find((entry) => entry.hostUrl === target.baseUrl) ?? null;
}

function SeededTargetTooltipContent({ vulnerabilities }: { vulnerabilities: readonly string[] }) {
  return (
    <div className="space-y-2">
      <p className="font-medium text-popover-foreground">Lab target</p>
      <ul className="list-disc space-y-1 pl-4">
        {vulnerabilities.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

function SeededTargetHint({ vulnerabilities }: { vulnerabilities: readonly string[] }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            aria-label="Show lab target vulnerabilities"
            onClick={(event) => event.stopPropagation()}
          >
            <Info className="h-3 w-3" />
            Lab target
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-80">
          <SeededTargetTooltipContent vulnerabilities={vulnerabilities} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TargetNameCell({ target }: { target: Target }) {
  const seededDefinition = getSeededTargetDefinition(target);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium text-foreground">{target.name}</span>
      {seededDefinition ? <SeededTargetHint vulnerabilities={seededDefinition.vulnerabilities} /> : null}
    </div>
  );
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
      { id: "name", header: "Name", cell: (row) => <TargetNameCell target={row} /> },
      { id: "baseUrl", header: "Base URL", cell: (row) => <span className="text-muted-foreground">{row.baseUrl ?? "Not set"}</span> },
      { id: "environment", header: "Environment", cell: (row) => <StatusBadge label={environmentLabels[row.environment]} className={environmentBadgeStyles[row.environment]} /> }
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
        {getSeededTargetDefinition(item) ? (
          <DetailSidebarItem label="Lab target vulnerabilities" hint={getSeededTargetDefinition(item)!.vulnerabilities.join("\n")}>
            Known lab target
          </DetailSidebarItem>
        ) : null}
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
    renderContent: ({ formValues, errors, handleFieldChange }) => (
      <DetailFormCard>
        <DetailFieldGroup title="General">
          <DetailField label="Name" required hint="Operator-facing target label used across workflows and reports." {...definedString(errors["name"] as string | undefined)}>
            <Input value={formValues.name} onChange={(event) => handleFieldChange("name", event.target.value)} aria-label="Name" />
          </DetailField>

          <DetailField
            label="Base URL"
            hint="Operator-facing URL for opening this target from the browser."
            {...definedString(errors["baseUrl"] as string | undefined)}
          >
            <Input value={formValues.baseUrl} onChange={(event) => handleFieldChange("baseUrl", event.target.value)} aria-label="Base URL" />
          </DetailField>

          <DetailField
            label="Execution URL"
            hint="Optional runtime URL used by connector-executed tools when it differs from the browser URL."
            {...definedString(errors["executionBaseUrl"] as string | undefined)}
          >
            <Input
              value={formValues.executionBaseUrl}
              onChange={(event) => handleFieldChange("executionBaseUrl", event.target.value)}
              aria-label="Execution URL"
            />
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
      </DetailFormCard>
    )
  }
};
