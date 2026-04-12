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

      <Card className="m-3">
        <CardContent className="grid gap-5 p-6 md:grid-cols-2">{children}</CardContent>
      </Card>
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
    <label className={className ? `block space-y-1.5 ${className}` : "block space-y-1.5"}>
      <span className="flex items-center gap-1.5 text-sm font-medium">
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
                  aria-label={`${label} help`}
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </span>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}
