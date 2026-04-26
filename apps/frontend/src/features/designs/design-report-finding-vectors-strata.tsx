import type { ExecutionReportFinding } from "@synosec/contracts";
import { FindingsAlternativeFrame } from "@/features/designs/finding-vector-frame";
import {
  NodeMap,
  columnarLayout,
  type GraphEdge,
  type GraphModel,
  type GraphNode
} from "@/features/designs/node-map";

/**
 * vectors · target
 * Same horizontal node map, but a Target column is prepended so the asset
 * the recon was aimed at is the visual anchor on the left. Reads as
 * Target · Tool · Evidence · Finding — answering "what was probed" before
 * "what was probed with".
 */

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildTargetModel(
  finding: ExecutionReportFinding,
  allFindings: ExecutionReportFinding[]
): { model: GraphModel; columns: string[][]; labels: string[] } {
  const tools = Array.from(new Set(finding.evidence.map((e) => e.sourceTool)));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const colTarget: string[] = [];
  const colTool: string[] = [];
  const colEvidence: string[] = [];
  const colFinding: string[] = [];
  const colRelated: string[] = [];

  nodes.push({
    id: "tgt",
    label: finding.targetLabel,
    sublabel: finding.type,
    kind: "tool"
  });
  colTarget.push("tgt");

  tools.forEach((tool) => {
    const id = `t:${tool}`;
    nodes.push({ id, label: tool, kind: "tool" });
    colTool.push(id);
    edges.push({ from: "tgt", to: id, variant: "supports" });
  });

  finding.evidence.forEach((ev, i) => {
    const id = `e:${i}`;
    nodes.push({
      id,
      label: `Signal ${String(i + 1).padStart(2, "0")}`,
      sublabel: ev.toolRunRef ? `run:${ev.toolRunRef.slice(0, 8)}` : truncate(ev.quote.replace(/\s+/g, " "), 24),
      kind: "evidence"
    });
    colEvidence.push(id);
    edges.push({ from: `t:${ev.sourceTool}`, to: id, variant: "supports" });
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

  const lookup = new Map(allFindings.map((x) => [x.id, x]));
  const seen = new Set<string>();
  function add(ids: string[], variant: "derived" | "related" | "enables", reverse = false) {
    for (const id of ids) {
      const target = lookup.get(id);
      if (!target || seen.has(id)) continue;
      seen.add(id);
      const nid = `r:${id}`;
      nodes.push({
        id: nid,
        label: target.title,
        sublabel: variant === "derived" ? "Derived from" : variant === "enables" ? "Enables" : "Related",
        kind: "related",
        severity: target.severity
      });
      colRelated.push(nid);
      edges.push(reverse ? { from: nid, to: "f", variant } : { from: "f", to: nid, variant });
    }
  }
  add(finding.derivedFromFindingIds, "derived", true);
  add(finding.relatedFindingIds, "related");
  add(finding.enablesFindingIds, "enables");

  const columns =
    colRelated.length > 0
      ? [colTarget, colTool, colEvidence, colFinding, colRelated]
      : [colTarget, colTool, colEvidence, colFinding];
  const labels =
    colRelated.length > 0
      ? ["Target", "Tool", "Evidence", "Finding", "Related"]
      : ["Target", "Tool", "Evidence", "Finding"];

  return { model: { nodes, edges }, columns, labels };
}

export function DesignReportFindingVectorsStrata() {
  return (
    <FindingsAlternativeFrame
      breadcrumbLabel="Vectors · target"
      graphLabel="ATTACK VECTOR · TARGET-FIRST"
      renderGraph={({ finding, allFindings }) => {
        const { model, columns, labels } = buildTargetModel(finding, allFindings);
        return <NodeMap model={model} layout={columnarLayout({ columns, labels })} />;
      }}
    />
  );
}
