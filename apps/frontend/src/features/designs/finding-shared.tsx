import { Archive, ArrowLeft, Download, Trash2 } from "lucide-react";
import type { Components } from "react-markdown";
import type { ExecutionReportDetail, ExecutionReportFinding, ExecutionReportToolActivity } from "@synosec/contracts";
import { Button } from "@/shared/ui/button";

export const SEVERITY_STROKE: Record<NonNullable<ExecutionReportFinding["severity"]>, string> = {
  info: "#64748b",
  low: "#2563eb",
  medium: "#ca8a04",
  high: "#ea580c",
  critical: "#dc2626"
};

export const SEVERITY_BADGE: Record<NonNullable<ExecutionReportFinding["severity"]>, string> = {
  critical: "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-300",
  high: "bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-300",
  medium: "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-300",
  low: "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-300",
  info: "bg-slate-500/10 border-slate-500/40 text-slate-600 dark:text-slate-300"
};

export type ToolEvidence = {
  toolName: string;
  quote: string;
  status?: ExecutionReportToolActivity["status"];
  command?: string;
  outputPreview?: string | null;
};

export function toolEvidenceForFinding(
  finding: ExecutionReportFinding,
  toolActivity: ExecutionReportToolActivity[]
): ToolEvidence[] {
  const out = new Map<string, ToolEvidence>();
  for (const ev of finding.evidence) {
    out.set(ev.sourceTool, { toolName: ev.sourceTool, quote: ev.quote });
  }
  for (const id of finding.sourceToolIds) {
    if (!out.has(id)) out.set(id, { toolName: id, quote: "" });
  }
  for (const item of out.values()) {
    const activity = toolActivity.find((t) => t.toolName === item.toolName);
    if (activity) {
      item.status = activity.status;
      item.command = activity.command;
      item.outputPreview = activity.outputPreview;
    }
  }
  return [...out.values()];
}

export function chainForFinding(report: ExecutionReportDetail, findingId: string) {
  return report.graph.nodes.find((n) => n.kind === "chain" && n.findingIds.includes(findingId));
}

export const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-7 text-2xl font-semibold tracking-tight text-foreground first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold text-foreground first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-5 text-base font-semibold text-foreground first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-3 text-[0.95rem] leading-7 text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6 text-[0.95rem] leading-7 text-foreground/90 marker:text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6 text-[0.95rem] leading-7 text-foreground/90 marker:text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
  code: ({ children, className }) => {
    if (className) return <code className={className}>{children}</code>;
    return <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[0.84em] text-foreground">{children}</code>;
  },
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-lg bg-muted/40 p-4 font-mono text-xs leading-6 text-foreground">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground">{children}</blockquote>,
  a: ({ children, href }) => <a href={href} className="text-primary underline-offset-2 hover:underline">{children}</a>,
  hr: () => <hr className="my-6 border-border" />
};

// Compact markdown variant for tight surfaces — smaller spacing/headings.
export const MARKDOWN_COMPONENTS_COMPACT: Components = {
  h1: ({ children }) => <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground first:mt-0">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 text-base font-semibold text-foreground first:mt-0">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="my-2 text-sm leading-6 text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 text-sm leading-6 text-foreground/90 marker:text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-foreground/90 marker:text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
  code: ({ children, className }) => {
    if (className) return <code className={className}>{children}</code>;
    return <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.8em] text-foreground">{children}</code>;
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-[0.72rem] leading-5 text-foreground">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">{children}</blockquote>,
  a: ({ children, href }) => <a href={href} className="text-primary underline-offset-2 hover:underline">{children}</a>,
  hr: () => <hr className="my-4 border-border" />
};

export function MetaInline({ report }: { report: ExecutionReportDetail }) {
  const items: Array<{ label: string; value: string }> = [
    { label: "kind", value: report.executionKind },
    { label: "status", value: report.status },
    { label: "target", value: report.targetLabel },
    { label: "findings", value: String(report.findingsCount) },
    { label: "max sev", value: report.highestSeverity ?? "none" }
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {i > 0 ? <span aria-hidden className="h-3 w-px bg-border" /> : null}
          <span className="font-mono uppercase tracking-[0.2em]">{item.label}</span>
          <span className="text-foreground">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

export function ReportPageActions() {
  return (
    <div className="flex flex-wrap items-center gap-2 px-0 py-0">
      <Button type="button" variant="outline" className="h-8 text-[0.72rem]">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <Button type="button" variant="outline" className="h-8 text-[0.72rem]">
        <Archive className="h-4 w-4" />
        Archive
      </Button>
      <Button type="button" variant="destructive" className="h-8 text-[0.72rem]">
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      <div className="ml-auto">
        <Button type="button" variant="outline" className="h-8 text-[0.72rem]">
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </div>
    </div>
  );
}
