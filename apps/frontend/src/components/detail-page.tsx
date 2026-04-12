import type { ReactNode } from "react";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
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
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6 pb-6">
      <PageHeader title={title} breadcrumbs={breadcrumbs} />

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

      {sidebar ? (
        <div className="m-3 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardContent className="space-y-2 p-6">{children}</CardContent>
          </Card>
          <Card className="self-start bg-muted/40">
            <CardContent className="space-y-4 p-5">{sidebar}</CardContent>
          </Card>
        </div>
      ) : (
        <Card className="m-3">
          <CardContent className="space-y-2 p-6">{children}</CardContent>
        </Card>
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
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-md bg-foreground px-3 py-2 text-left text-xs leading-relaxed text-background shadow-md peer-hover:block peer-focus-visible:block"
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
