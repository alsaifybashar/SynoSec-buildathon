import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, Check, Download, HelpCircle, Undo2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { PageHeader } from "@/shared/components/page-header";
import { Spinner } from "@/shared/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

const actionFadeDurationMs = 50;

export function DetailActionFade({
  show,
  children,
  className
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [isRendered, setIsRendered] = useState(show);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    let frameId: number | null = null;
    let timeoutId: number | null = null;

    if (show) {
      setIsRendered(true);
      frameId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      timeoutId = window.setTimeout(() => {
        setIsRendered(false);
      }, actionFadeDurationMs);
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [show]);

  if (!isRendered) {
    return null;
  }

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transition: `opacity ${actionFadeDurationMs}ms ease`
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

export function DetailPage({
  title,
  breadcrumbs,
  subtitle,
  timestamp,
  isDirty,
  isSaving = false,
  onBack,
  onSave,
  onDismiss,
  onExportJson,
  saveLabel = "Save",
  actions,
  sidebar,
  relatedContent,
  children
}: {
  title: string;
  breadcrumbs: string[];
  subtitle?: string;
  timestamp?: string;
  isDirty: boolean;
  isSaving?: boolean;
  onBack: () => void;
  onSave: () => void | Promise<void>;
  onDismiss: () => void;
  onExportJson?: (() => void) | undefined;
  saveLabel?: string;
  actions?: ReactNode;
  sidebar?: ReactNode;
  relatedContent?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 pb-6 md:space-y-4">
      <PageHeader title={title} breadcrumbs={breadcrumbs} />

      {subtitle || timestamp ? (
        <div className="mx-3 -mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-eyebrow uppercase tracking-[0.25em] text-muted-foreground md:justify-start">
          {subtitle ? <span>ID · {subtitle}</span> : null}
          {subtitle && timestamp ? <span aria-hidden className="h-px w-3 bg-border" /> : null}
          {timestamp ? <span>updated · {timestamp}</span> : null}
        </div>
      ) : null}

      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          {actions ? (
            actions
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onBack} className="h-9 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <DetailActionFade show={isDirty} className="flex items-center gap-2">
                <>
                  <div aria-hidden className="mx-1 hidden h-6 w-px bg-border/70 md:block" />
                  <Button type="button" onClick={() => void onSave()} disabled={isSaving} className="h-9 text-sm">
                    <Check className="h-4 w-4" />
                    {saveLabel}
                  </Button>
                  <Button type="button" variant="outline" onClick={onDismiss} disabled={isSaving} className="h-9 text-sm">
                    <Undo2 className="h-4 w-4" />
                    Dismiss
                  </Button>
                </>
              </DetailActionFade>
              {onExportJson ? (
                <div className="ml-auto">
                  <Button type="button" variant="outline" onClick={onExportJson} className="h-9 text-sm">
                    <Download className="h-4 w-4" />
                    Export JSON
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {sidebar ? (
        <div className="m-3 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
          <div className="space-y-2 px-1">{children}</div>
          <DetailMetadataPanel className="self-start">
            {sidebar}
          </DetailMetadataPanel>
        </div>
      ) : (
        <div className="m-3 px-1">{children}</div>
      )}

      {relatedContent ? (
        <div className="m-3 px-1">
          {relatedContent}
        </div>
      ) : null}
    </div>
  );
}

export function DetailFormCard({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={[
        "rounded-sm border border-border/60 bg-card/40 px-5",
        "[&>section:first-child>p:first-child]:pt-3",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
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
    <section className={className}>
      {title ? (
        <p className="border-b border-border/50 pb-2 pt-6 font-mono text-eyebrow font-medium uppercase tracking-[0.2em] text-muted-foreground sm:pl-[calc(9rem+1.5rem)]">
          {title}
        </p>
      ) : null}
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

export function DetailMetadataPanel({
  title = "Metadata",
  hint,
  className,
  children
}: {
  title?: string;
  hint?: string;
  className?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <aside className={["group px-1", className].filter(Boolean).join(" ")}>
      <div className="mb-3 flex items-center gap-1.5 font-mono text-eyebrow font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <span>{title}</span>
        {hint ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DetailHintTrigger label={title} />
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      <div className="flex flex-col">{children}</div>
    </aside>
  );
}

export function DetailSidebarItem({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="group space-y-1 border-t border-border/40 py-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-1.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span>{label}</span>
        {hint ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DetailHintTrigger label={label} />
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      <div className="text-[0.78rem] leading-5 text-foreground">{children}</div>
    </div>
  );
}

export const DetailHintTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(function DetailHintTrigger(
  { label, className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={[
        "inline-flex h-3.5 w-3.5 items-center justify-center text-muted-foreground/60 opacity-0 transition group-hover:opacity-100 hover:text-primary focus-visible:opacity-100 focus-visible:text-primary focus-visible:outline-none",
        className
      ].filter(Boolean).join(" ")}
      aria-label={`Show guidance for ${label}`}
      {...props}
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </button>
  );
});

export function DetailField({
  label,
  required = false,
  hint,
  error,
  className,
  align = "start",
  children
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  align?: "start" | "center";
  children: ReactNode;
}) {
  const alignmentClass = align === "center" ? "sm:items-center" : "sm:items-start";
  const labelTopPadding = align === "center" ? "" : "pt-2";
  return (
    <div
      className={[
        "group grid gap-2 border-b border-border/40 py-3.5 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:gap-6",
        alignmentClass,
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={cn("flex items-center gap-1.5 font-mono text-[0.7rem] font-normal uppercase tracking-[0.05em] text-muted-foreground", labelTopPadding)}>
        <span className="inline-flex items-baseline gap-1">
          <span>{label}</span>
          {required ? (
            <span aria-hidden className="text-[0.7em] leading-none text-destructive/80">*</span>
          ) : null}
        </span>
        {hint ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DetailHintTrigger label={label} />
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      <div className="min-w-0 space-y-1.5">
        {children}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

export function DetailLoadingState({
  title,
  breadcrumbs,
  onBack,
  message = "Loading record..."
}: {
  title: string;
  breadcrumbs: string[];
  onBack: () => void;
  message?: string;
}) {
  return (
    <DetailPage
      title={title}
      breadcrumbs={breadcrumbs}
      isDirty={false}
      onBack={onBack}
      onSave={() => {}}
      onDismiss={() => {}}
    >
      <div className="rounded-sm border border-border/60 bg-card/40 px-4 py-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4 text-muted-foreground" />
          <span>{message}</span>
        </div>
      </div>
    </DetailPage>
  );
}
