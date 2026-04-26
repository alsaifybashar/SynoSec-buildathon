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
 * vectors · validation
 * Same horizontal node map, but a Validation column is inserted between
 * the evidence and the finding. The validation node carries the finding's
 * validation status (single source / cross-validated / reproduced…) so the
 * confidence path is visible alongside the chain itself.
 */

const VALIDATION_LABEL: Record<string, string> = {
  single_source: "Single source",
  cross_validated: "Cross-validated",
  reproduced: "Reproduced",
  blocked: "Blocked",
  relationship_only: "Relationship only"
};

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildValidationModel(
  finding: ExecutionReportFinding,
  allFindings: ExecutionReportFinding[]
): { model: GraphModel; columns: string[][]; labels: string[] } {
  const tools = Array.from(new Set(finding.evidence.map((e) => e.sourceTool)));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const colTool: string[] = [];
  const colEvidence: string[] = [];
  const colValidation: string[] = [];
  const colFinding: string[] = [];
  const colRelated: string[] = [];

  tools.forEach((tool) => {
    const id = `t:${tool}`;
    nodes.push({ id, label: tool, kind: "tool" });
    colTool.push(id);
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
    edges.push({ from: id, to: "v", variant: "supports" });
  });

  const status = finding.validationStatus ?? "single_source";
  nodes.push({
    id: "v",
    label: VALIDATION_LABEL[status] ?? status.replaceAll("_", " "),
    sublabel: `conf ${(finding.confidence ?? 0).toFixed(2)}`,
    kind: "evidence"
  });
  colValidation.push("v");
  edges.push({ from: "v", to: "f", variant: "supports" });

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
      ? [colTool, colEvidence, colValidation, colFinding, colRelated]
      : [colTool, colEvidence, colValidation, colFinding];
  const labels =
    colRelated.length > 0
      ? ["Tool", "Evidence", "Validation", "Finding", "Related"]
      : ["Tool", "Evidence", "Validation", "Finding"];

  return { model: { nodes, edges }, columns, labels };
}

export function DesignReportFindingVectorsCompass() {
  return (
    <FindingsAlternativeFrame
      breadcrumbLabel="Vectors · validation"
      graphLabel="ATTACK VECTOR · VALIDATION"
      renderGraph={({ finding, allFindings }) => {
        const { model, columns, labels } = buildValidationModel(finding, allFindings);
        return <NodeMap model={model} layout={columnarLayout({ columns, labels })} />;
      }}
    />
  );
}
