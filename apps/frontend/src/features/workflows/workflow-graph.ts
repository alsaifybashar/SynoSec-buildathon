import type { ExecutionReportGraph, WorkflowLaunch, WorkflowLaunchTargetRun, WorkflowReportedFinding } from "@synosec/contracts";

function parseTimestamp(value: string | null) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function toRunSortTimestamp(run: WorkflowLaunchTargetRun) {
  return parseTimestamp(run.completedAt) > Number.NEGATIVE_INFINITY
    ? parseTimestamp(run.completedAt)
    : parseTimestamp(run.startedAt);
}

function createChainNodeId(finding: WorkflowReportedFinding) {
  if (finding.chain?.id && finding.chain.id.trim().length > 0) {
    return finding.chain.id;
  }
  const title = finding.chain?.title ?? "chain";
  return `chain:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function selectLatestWorkflowLaunchRun(launch: WorkflowLaunch): WorkflowLaunchTargetRun | null {
  if (launch.runs.length === 0) {
    return null;
  }

  return launch.runs.reduce<WorkflowLaunchTargetRun | null>((latest, current) => {
    if (!latest) {
      return current;
    }

    const latestTime = toRunSortTimestamp(latest);
    const currentTime = toRunSortTimestamp(current);
    if (currentTime > latestTime) {
      return current;
    }

    if (currentTime < latestTime) {
      return latest;
    }

    return current.runId > latest.runId ? current : latest;
  }, null);
}

export function buildExecutionGraphFromWorkflowFindings(findings: WorkflowReportedFinding[]): ExecutionReportGraph {
  const nodesById = new Map<ExecutionReportGraph["nodes"][number]["id"], ExecutionReportGraph["nodes"][number]>();
  const edgesById = new Map<ExecutionReportGraph["edges"][number]["id"], ExecutionReportGraph["edges"][number]>();
  const findingIds = new Set(findings.map((finding) => finding.id));
  const chainNodesById = new Map<string, Extract<ExecutionReportGraph["nodes"][number], { kind: "chain" }>>();

  for (const finding of findings) {
    nodesById.set(finding.id, {
      id: finding.id,
      kind: "finding",
      findingId: finding.id,
      title: finding.title,
      summary: finding.impact,
      severity: finding.severity,
      confidence: finding.confidence,
      targetLabel: finding.target.url ?? `${finding.target.host}${finding.target.port ? `:${finding.target.port}` : ""}${finding.target.path ?? ""}`,
      createdAt: finding.createdAt
    });

    finding.evidence.forEach((evidence, index) => {
      const evidenceNodeId = `${finding.id}:evidence:${index}`;
      nodesById.set(evidenceNodeId, {
        id: evidenceNodeId,
        kind: "evidence",
        title: `${finding.title} evidence ${index + 1}`,
        summary: evidence.quote,
        sourceTool: evidence.sourceTool,
        quote: evidence.quote,
        severity: finding.severity,
        refs: [{
          ...(evidence.artifactRef ? { artifactRef: evidence.artifactRef } : {}),
          ...(evidence.observationRef ? { observationRef: evidence.observationRef } : {}),
          ...(evidence.toolRunRef ? { toolRunRef: evidence.toolRunRef } : {}),
          ...(evidence.traceEventId ? { traceEventId: evidence.traceEventId } : {}),
          ...(evidence.externalUrl ? { externalUrl: evidence.externalUrl } : {})
        }],
        createdAt: finding.createdAt
      });
      edgesById.set(`${evidenceNodeId}:supports:${finding.id}`, {
        id: `${evidenceNodeId}:supports:${finding.id}`,
        kind: "supports",
        source: evidenceNodeId,
        target: finding.id,
        createdAt: finding.createdAt
      });
    });

    for (const relatedFindingId of finding.derivedFromFindingIds) {
      if (!findingIds.has(relatedFindingId)) {
        continue;
      }
      edgesById.set(`${relatedFindingId}:derived:${finding.id}`, {
        id: `${relatedFindingId}:derived:${finding.id}`,
        kind: "derived_from",
        source: relatedFindingId,
        target: finding.id,
        createdAt: finding.createdAt
      });
    }

    for (const relatedFindingId of finding.relatedFindingIds) {
      if (!findingIds.has(relatedFindingId)) {
        continue;
      }
      edgesById.set(`${finding.id}:related:${relatedFindingId}`, {
        id: `${finding.id}:related:${relatedFindingId}`,
        kind: "correlates_with",
        source: finding.id,
        target: relatedFindingId,
        createdAt: finding.createdAt
      });
    }

    for (const relatedFindingId of finding.enablesFindingIds) {
      if (!findingIds.has(relatedFindingId)) {
        continue;
      }
      edgesById.set(`${finding.id}:enables:${relatedFindingId}`, {
        id: `${finding.id}:enables:${relatedFindingId}`,
        kind: "enables",
        source: finding.id,
        target: relatedFindingId,
        createdAt: finding.createdAt
      });
    }

    if (finding.chain) {
      const chainNodeId = createChainNodeId(finding);
      const existingChainNode = chainNodesById.get(chainNodeId);
      if (existingChainNode) {
        if (!existingChainNode.findingIds.includes(finding.id)) {
          existingChainNode.findingIds.push(finding.id);
        }
      } else {
        chainNodesById.set(chainNodeId, {
          id: chainNodeId,
          kind: "chain",
          title: finding.chain.title,
          summary: finding.chain.summary,
          severity: finding.chain.severity ?? finding.severity,
          findingIds: [finding.id],
          createdAt: finding.createdAt
        });
      }
      edgesById.set(`${finding.id}:chain:${chainNodeId}`, {
        id: `${finding.id}:chain:${chainNodeId}`,
        kind: "enables",
        source: finding.id,
        target: chainNodeId,
        createdAt: finding.createdAt
      });
    }
  }

  for (const chainNode of chainNodesById.values()) {
    nodesById.set(chainNode.id, chainNode);
  }

  return {
    nodes: [...nodesById.values()],
    edges: [...edgesById.values()].filter((edge) => nodesById.has(edge.source) && nodesById.has(edge.target))
  };
}
