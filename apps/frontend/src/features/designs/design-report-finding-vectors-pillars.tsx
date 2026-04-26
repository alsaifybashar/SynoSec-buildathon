import type { ExecutionReportDetail, ExecutionReportFinding } from "@synosec/contracts";
import { FindingsAlternativeFrame } from "@/features/designs/finding-vector-frame";
import { DetailFieldGroup } from "@/shared/components/detail-page";
import {
  NodeMap,
  buildModel,
  columnarLayout,
  type GraphEdge,
  type GraphModel,
  type GraphNode
} from "@/features/designs/node-map";

/**
 * vectors · phase
 * Same horizontal node map, but columns are kill-chain phases sourced from
 * tool-activity (Recon · Discovery · Exploitation · Synthesis). Each tool
 * sits in the column for the phase it actually ran in; the finding lives
 * in Synthesis. Reads as a kill-chain pipeline rather than a generic
 * tool→evidence stack.
 */

const PHASES: Array<{ id: string; label: string }> = [
  { id: "recon", label: "Recon" },
  { id: "discovery", label: "Discovery" },
  { id: "exploitation", label: "Exploitation" },
  { id: "synthesis", label: "Synthesis" }
];

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildPhaseModel(
  finding: ExecutionReportFinding,
  report: ExecutionReportDetail
): { model: GraphModel; columns: string[][]; labels: string[] } {
  const phaseByTool = new Map<string, string>();
  for (const ta of report.toolActivity) {
    phaseByTool.set(ta.toolName, ta.phase);
  }

  const cols: Record<string, string[]> = { recon: [], discovery: [], exploitation: [], synthesis: [] };
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const tools = Array.from(new Set(finding.evidence.map((e) => e.sourceTool)));
  for (const tool of tools) {
    const phase = phaseByTool.get(tool) ?? "recon";
    const id = `t:${tool}`;
    nodes.push({ id, label: tool, kind: "tool" });
    (cols[phase] ?? cols["recon"]!).push(id);
  }

  finding.evidence.forEach((ev, i) => {
    const phase = phaseByTool.get(ev.sourceTool) ?? "recon";
    const id = `e:${i}`;
    nodes.push({
      id,
      label: `Signal ${String(i + 1).padStart(2, "0")}`,
      sublabel: ev.toolRunRef ? `run:${ev.toolRunRef.slice(0, 8)}` : truncate(ev.quote.replace(/\s+/g, " "), 24),
      kind: "evidence"
    });
    // place evidence one column to the right of its tool's phase, capped at exploitation
    const idx = PHASES.findIndex((p) => p.id === phase);
    const targetIdx = Math.min(idx + 1, 2);
    cols[PHASES[targetIdx]!.id]!.push(id);
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
  cols["synthesis"]!.push("f");

  return {
    model: { nodes, edges },
    columns: PHASES.map((p) => cols[p.id]!),
    labels: PHASES.map((p) => p.label)
  };
}

function buildInspectorVariantModels(finding: ExecutionReportFinding, report: ExecutionReportDetail) {
  const defaultModel = buildModel(finding, report.findings);
  const phaseModel = buildPhaseModel(finding, report);
  const derivedIds = finding.derivedFromFindingIds.map((id) => `r:${id}`);
  const relatedIds = finding.relatedFindingIds.map((id) => `r:${id}`);
  const enablesIds = finding.enablesFindingIds.map((id) => `r:${id}`);

  const relationshipColumns = [
    derivedIds.length > 0 ? derivedIds : [],
    ["f"],
    [...relatedIds, ...enablesIds].length > 0 ? [...relatedIds, ...enablesIds] : [],
    finding.chain ? ["chain"] : []
  ];
  const relationshipLabels = ["Evidence lineage", "Current finding", "Peer impact", "Chain"];
  const relationshipModel: GraphModel = {
    nodes: [
      ...defaultModel.nodes,
      ...(finding.chain
        ? [{
            id: "chain",
            label: finding.chain.title,
            sublabel: finding.chain.severity ?? finding.severity,
            kind: "related" as const,
            severity: finding.chain.severity ?? finding.severity
          }]
        : [])
    ],
    edges: [
      ...defaultModel.edges,
      ...(finding.chain ? [{ from: "f", to: "chain", variant: "enables" as const }] : [])
    ]
  };

  const nodeCatalog = defaultModel.nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.kind] = (acc[node.kind] ?? 0) + 1;
    return acc;
  }, {});

  return {
    defaultModel,
    phaseModel,
    relationshipModel,
    relationshipColumns,
    relationshipLabels,
    nodeCatalog
  };
}

export function DesignReportFindingVectorsPillars() {
  return (
    <FindingsAlternativeFrame
      breadcrumbLabel="Vectors · phase"
      graphLabel="ATTACK VECTOR · KILL-CHAIN PHASE"
      renderGraph={({ finding, report }) => {
        const { model, columns, labels } = buildPhaseModel(finding, report);
        return <NodeMap model={model} layout={columnarLayout({ columns, labels })} />;
      }}
      renderAfterFindings={({ report, selectedFinding }) => {
        const {
          defaultModel,
          phaseModel,
          relationshipModel,
          relationshipColumns,
          relationshipLabels,
          nodeCatalog
        } = buildInspectorVariantModels(selectedFinding, report);

        const cards = [
          {
            id: "timeline",
            title: "Timeline inspector",
            summary: "Moves from evidence collection to synthesis in phase columns. Best when operators review how tool activity flowed over time."
          },
          {
            id: "relationship",
            title: "Relationship inspector",
            summary: "Centers one finding and highlights derived, related, and enables links. Best for impact and pivot analysis."
          },
          {
            id: "evidence",
            title: "Evidence inspector",
            summary: "Prioritizes tool and signal nodes before relationship nodes. Best for verification and quote-to-finding audits."
          }
        ];

        return (
          <>
            <DetailFieldGroup title="Inspector Models" className="bg-card/70">
              <div className="col-span-full grid gap-3 md:grid-cols-3">
                {cards.map((card) => (
                  <article key={card.id} className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-4">
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="text-sm leading-6 text-foreground/90">{card.summary}</p>
                  </article>
                ))}
              </div>
            </DetailFieldGroup>

            <DetailFieldGroup title="Node Modeling" className="bg-card/70">
              <div className="col-span-full space-y-5">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {Object.entries(nodeCatalog).map(([kind, count]) => (
                    <span key={kind} className="rounded-full border border-border/70 px-2 py-1">
                      {kind}: {count}
                    </span>
                  ))}
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                  <section className="space-y-2 rounded-lg border border-border/70 bg-background/35 p-3">
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-muted-foreground">Evidence-first</p>
                    <NodeMap
                      model={defaultModel}
                      layout={columnarLayout({
                        columns: [
                          defaultModel.nodes.filter((n) => n.kind === "tool").map((n) => n.id),
                          defaultModel.nodes.filter((n) => n.kind === "evidence").map((n) => n.id),
                          defaultModel.nodes.filter((n) => n.kind === "finding").map((n) => n.id),
                          defaultModel.nodes.filter((n) => n.kind === "related").map((n) => n.id)
                        ],
                        labels: ["Tools", "Signals", "Finding", "Related"]
                      })}
                    />
                  </section>
                  <section className="space-y-2 rounded-lg border border-border/70 bg-background/35 p-3">
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-muted-foreground">Relationship-first</p>
                    <NodeMap
                      model={relationshipModel}
                      layout={columnarLayout({
                        columns: relationshipColumns,
                        labels: relationshipLabels
                      })}
                    />
                  </section>
                  <section className="space-y-2 rounded-lg border border-border/70 bg-background/35 p-3">
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-muted-foreground">Phase timeline</p>
                    <NodeMap
                      model={phaseModel.model}
                      layout={columnarLayout({
                        columns: phaseModel.columns,
                        labels: phaseModel.labels
                      })}
                    />
                  </section>
                </div>
              </div>
            </DetailFieldGroup>
          </>
        );
      }}
    />
  );
}
