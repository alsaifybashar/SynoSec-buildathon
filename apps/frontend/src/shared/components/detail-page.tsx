import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, Check, CircleHelp, Download, Undo2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
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
        <div className="mx-3 -mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[0.625rem] uppercase tracking-[0.25em] text-muted-foreground md:justify-start">
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
              <Button type="button" variant="outline" onClick={onBack} className="h-8 text-[0.72rem]">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <DetailActionFade show={isDirty} className="flex items-center gap-2">
                <>
                  <div aria-hidden className="mx-1 hidden h-6 w-px bg-border/70 md:block" />
                  <Button type="button" onClick={() => void onSave()} disabled={isSaving} className="h-8 text-[0.72rem]">
                    <Check className="h-4 w-4" />
                    {saveLabel}
                  </Button>
                  <Button type="button" variant="outline" onClick={onDismiss} disabled={isSaving} className="h-8 text-[0.72rem]">
                    <Undo2 className="h-4 w-4" />
                    Dismiss
                  </Button>
                </>
              </DetailActionFade>
              {onExportJson ? (
                <div className="ml-auto">
                  <Button type="button" variant="outline" onClick={onExportJson} className="h-8 text-[0.72rem]">
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
          <aside className="self-start rounded-md border border-border/60 bg-card/40 p-5">
            <p className="mb-4 font-mono text-[0.625rem] font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Metadata
            </p>
            <div className="space-y-4">{sidebar}</div>
          </aside>
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
    <section
      className={["-mx-1 grid gap-5 border-l border-border/60 py-3 pl-6 pr-6 lg:grid-cols-2", className]
        .filter(Boolean)
        .join(" ")}
    >
      {title ? (
        <p className="col-span-full font-mono text-[0.625rem] font-medium uppercase tracking-[0.3em] text-muted-foreground">
          {title}
        </p>
      ) : null}
      {children}
    </section>
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
      <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      <div className="text-xs text-foreground">{children}</div>
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
      <div className="flex items-center gap-1.5 font-mono text-[0.6rem] font-medium uppercase tracking-[0.28em] text-muted-foreground">
        <span>
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </span>
        {hint ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex cursor-default items-center text-muted-foreground transition hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                  aria-label={`Show guidance for ${label}`}
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
      <div className="rounded-xl border border-border/70 bg-card/70 px-4 py-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4 text-muted-foreground" />
          <span>{message}</span>
        </div>
      </div>
    </DetailPage>
  );
}
