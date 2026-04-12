import type { ReactNode } from "react";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { Button } from "./ui/button";
import { PageHeader } from "./page-header";

export function DetailPage({
  title,
  breadcrumbs,
  isDirty,
  isSaving = false,
  onBack,
  onSave,
  onDismiss,
  saveLabel = "Save",
  actions,
  sidebar,
  children
}: {
  title: string;
  breadcrumbs: string[];
  isDirty: boolean;
  isSaving?: boolean;
  onBack: () => void;
  onSave: () => void | Promise<void>;
  onDismiss: () => void;
  saveLabel?: string;
  actions?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6 pb-6">
      <PageHeader title={title} breadcrumbs={breadcrumbs} />

      {actions ? (
        <div className="m-3 flex flex-wrap items-center gap-2 pt-6">{actions}</div>
      ) : (
        <div className="m-3 flex flex-wrap items-center gap-2 pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={!isDirty || isSaving}>
            {saveLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onDismiss} disabled={!isDirty || isSaving}>
            Dismiss
          </Button>
        </div>
      )}

      {sidebar ? (
        <div className="m-3 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-2 px-1">{children}</div>
          <div className="self-start px-1">{sidebar}</div>
        </div>
      ) : (
        <div className="m-3 px-1">{children}</div>
      )}
    </div>
  );
}

export function DetailFieldGroup({
  title,
  className,
  children
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={["grid gap-5 md:grid-cols-2 rounded-lg p-4 -mx-1", className]
        .filter(Boolean)
        .join(" ")}
    >
      {title ? (
        <p className="col-span-full text-xs uppercase tracking-widest text-muted-foreground mb-1">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function DetailSidebarItem({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function DetailField({
  label,
  required = false,
  hint,
  error,
  className,
  children
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className ? `block space-y-1.5 ${className}` : "block space-y-1.5"}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </span>
        {hint ? (
          <span className="relative inline-flex">
            <button
              type="button"
              className="peer inline-flex items-center text-muted-foreground transition hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
              aria-label={`Show guidance for ${label}`}
              title={hint}
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-md bg-foreground px-3 py-2 text-left text-xs leading-relaxed text-background shadow-md peer-hover:block peer-focus-visible:block"
            >
              {hint}
            </span>
          </span>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
