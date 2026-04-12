import type { ReactNode } from "react";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { PageHeader } from "./page-header";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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
  tinted = false,
  className,
  children
}: {
  title?: string;
  tinted?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "grid gap-5 md:grid-cols-2 rounded-lg p-4 -mx-1",
        tinted ? "bg-muted/30" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title ? (
        <p className="col-span-full text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
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
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
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
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <span>
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </span>
        {hint ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center text-muted-foreground transition hover:text-foreground"
                  aria-label="Show field guidance"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
