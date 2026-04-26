import type { ExecutionReportDetail, ExecutionReportFinding } from "@synosec/contracts";
import { FindingsAlternativeFrame } from "@/features/designs/finding-vector-frame";
import {
  NodeMap,
  columnarLayout,
  type GraphEdge,
  type GraphModel,
  type GraphNode
} from "@/features/designs/node-map";

/**
 * vectors · method
 * Horizontal node map with the evidence column split into Command and
 * Signal: Tool · Command · Signal · Finding. Makes the methodology of how
 * the recon produced the signal visible at a glance — every signal can be
 * traced back to the exact command that captured it.
 */

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildMethodModel(
  finding: ExecutionReportFinding,
  report: ExecutionReportDetail
): { model: GraphModel; columns: string[][]; labels: string[] } {
  const tools = Array.from(new Set(finding.evidence.map((e) => e.sourceTool)));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const colTool: string[] = [];
  const colCommand: string[] = [];
  const colSignal: string[] = [];
  const colFinding: string[] = [];

  for (const tool of tools) {
    const id = `t:${tool}`;
    nodes.push({ id, label: tool, kind: "tool" });
    colTool.push(id);

    const ta = report.toolActivity.find((x) => x.toolName === tool);
    const cmdId = `c:${tool}`;
    nodes.push({
      id: cmdId,
      label: ta?.command ? truncate(ta.command, 22) : "ran",
      sublabel: ta?.phase ?? "—",
      kind: "evidence"
    });
    colCommand.push(cmdId);
    edges.push({ from: id, to: cmdId, variant: "supports" });
  }

  finding.evidence.forEach((ev, i) => {
    const id = `s:${i}`;
    nodes.push({
      id,
      label: `Signal ${String(i + 1).padStart(2, "0")}`,
      sublabel: truncate(ev.quote.replace(/\s+/g, " "), 24),
      kind: "evidence"
    });
    colSignal.push(id);
    edges.push({ from: `c:${ev.sourceTool}`, to: id, variant: "supports" });
    edges.push({ from: id, to: "f", variant: "supports" });
  });

  nodes.push({
    id: "f",
    label: finding.title,
    sublabel: finding.targetLabel,
    kind: "finding",
    severity: finding.severity
  });
  colFinding.push("f");

  return {
    model: { nodes, edges },
    columns: [colTool, colCommand, colSignal, colFinding],
    labels: ["Tool", "Command", "Signal", "Finding"]
  };
}

export function DesignReportFindingVectorsMatrix() {
  return (
    <FindingsAlternativeFrame
      breadcrumbLabel="Vectors · method"
      graphLabel="ATTACK VECTOR · METHOD"
      renderGraph={({ finding, report }) => {
        const { model, columns, labels } = buildMethodModel(finding, report);
        return <NodeMap model={model} layout={columnarLayout({ columns, labels })} />;
      }}
    />
  );
}
