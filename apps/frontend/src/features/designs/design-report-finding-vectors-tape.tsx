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
 * vectors · lifecycle
 * Same horizontal node map, but the trailing "Related" column is replaced
 * with the actual kill-chain that the finding feeds into. Reads the attack
 * vector as a lifecycle: Tool · Evidence · Finding · Chain — the missing
 * answer to "what does this enable".
 */

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildLifecycleModel(
  finding: ExecutionReportFinding,
  allFindings: ExecutionReportFinding[]
): { model: GraphModel; columns: string[][]; labels: string[] } {
  const tools = Array.from(new Set(finding.evidence.map((e) => e.sourceTool)));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const colTool: string[] = [];
  const colEvidence: string[] = [];
  const colFinding: string[] = [];
  const colChain: string[] = [];

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

  if (finding.chain) {
    const chainNode: GraphNode = {
      id: "ch",
      label: finding.chain.title,
      sublabel: `chain · ${finding.chain.severity ?? "—"}`,
      kind: "related"
    };
    if (finding.chain.severity) chainNode.severity = finding.chain.severity;
    nodes.push(chainNode);
    colChain.push("ch");
    edges.push({ from: "f", to: "ch", variant: "enables" });

    const lookup = new Map(allFindings.map((x) => [x.id, x]));
    for (const id of finding.enablesFindingIds) {
      const target = lookup.get(id);
      if (!target) continue;
      const nid = `r:${id}`;
      nodes.push({
        id: nid,
        label: target.title,
        sublabel: "Enables",
        kind: "related",
        severity: target.severity
      });
      colChain.push(nid);
      edges.push({ from: "f", to: nid, variant: "enables" });
    }
  } else {
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
        colChain.push(nid);
        edges.push(reverse ? { from: nid, to: "f", variant } : { from: "f", to: nid, variant });
      }
    }
    add(finding.derivedFromFindingIds, "derived", true);
    add(finding.relatedFindingIds, "related");
    add(finding.enablesFindingIds, "enables");
  }

  return {
    model: { nodes, edges },
    columns: [colTool, colEvidence, colFinding, colChain],
    labels: ["Tool", "Evidence", "Finding", finding.chain ? "Chain" : "Downstream"]
  };
}

export function DesignReportFindingVectorsTape() {
  return (
    <FindingsAlternativeFrame
      breadcrumbLabel="Vectors · lifecycle"
      graphLabel="ATTACK VECTOR · LIFECYCLE"
      renderGraph={({ finding, allFindings }) => {
        const { model, columns, labels } = buildLifecycleModel(finding, allFindings);
        return <NodeMap model={model} layout={columnarLayout({ columns, labels })} />;
      }}
    />
  );
}
