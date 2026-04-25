import { useEffect, useMemo, useState } from "react";
import type { ApplicationConstraintBinding } from "@synosec/contracts";
import { ExternalLink } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";

type ConstraintWithDocs = ApplicationConstraintBinding & {
  constraint: NonNullable<ApplicationConstraintBinding["constraint"]>;
};

export function WorkflowConstraintConfirmation({
  open,
  constraints,
  pending,
  onCancel,
  onConfirm
}: {
  open: boolean;
  constraints: ConstraintWithDocs[];
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  const documentationUrls = useMemo(
    () => [...new Set(constraints.flatMap((binding) => binding.constraint.documentationUrls))],
    [constraints]
  );

  useEffect(() => {
    if (!open) {
      setAcknowledged(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="workflow-constraint-dialog-title">
      <Card className="w-full max-w-2xl border-warning/30 shadow-2xl">
        <CardHeader>
          <CardTitle id="workflow-constraint-dialog-title">Review Constraint Requirements Before Run</CardTitle>
          <CardDescription>
            This application has registered execution constraints. Review the linked policy documentation and confirm the application is configured before starting the workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Registered constraints</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {constraints.map((binding) => (
                <li key={binding.constraintId} className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
                  <p className="font-medium text-foreground">{binding.constraint.name}</p>
                  {binding.constraint.description ? (
                    <p className="mt-1">{binding.constraint.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Documentation links</p>
            {documentationUrls.length > 0 ? (
              <ul className="space-y-2">
                {documentationUrls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No documentation links are attached to these constraints. Confirm the application is configured before proceeding.
              </p>
            )}
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-current"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>I reviewed the constraint documentation and confirmed the application is configured for this workflow run.</span>
          </label>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={!acknowledged || pending}>
            {pending ? "Starting..." : "Continue to Run"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
