import type { AiTool, OsiLayer, ScanLayerCoverage } from "@synosec/contracts";
import { getToolCatalog } from "@/features/ai-tools/runtime/tool-catalog.js";
import type { ToolPhase } from "@/features/ai-tools/runtime/catalog/index.js";

export interface ToolSelectorContext {
  requestedLayers: OsiLayer[];
  currentCoverage: Map<OsiLayer, ScanLayerCoverage>;
  executedToolIds: string[];
  findings: { primaryLayer: OsiLayer; category: string }[];
  allowActiveExploits: boolean;
}

type SelectorOptions = {
  maxTools?: number;
  minTools?: number;
};

type CatalogMetadata = {
  osiLayers: OsiLayer[];
  phase: ToolPhase;
  tags: string[];
};

const defaultMetadata: CatalogMetadata = {
  osiLayers: ["L7"],
  phase: "utility",
  tags: []
};

const catalogMetadataById = new Map(
  getToolCatalog().map((entry) => [
    entry.id,
    {
      osiLayers: entry.osiLayers,
      phase: entry.phase,
      tags: entry.tags
    } satisfies CatalogMetadata
  ])
);

export function selectToolsForContext(
  allTools: AiTool[],
  context: ToolSelectorContext,
  options: SelectorOptions = {}
): AiTool[] {
  const maxTools = Math.max(1, options.maxTools ?? 12);
  const minTools = Math.max(1, Math.min(options.minTools ?? 3, maxTools));
  const uncoveredRequestedLayers = context.requestedLayers.filter((layer) => {
    const coverage = context.currentCoverage.get(layer);
    return !coverage || coverage.coverageStatus !== "covered";
  });
  const phaseStage = inferPhaseStage(context, uncoveredRequestedLayers);
  const executedToolIds = new Set(context.executedToolIds);

  const ranked = allTools
    .map((tool) => {
      const metadata = catalogMetadataById.get(tool.id) ?? defaultMetadata;
      const riskGate = getRiskGateScore(tool, context.allowActiveExploits);
      const layerAlignment = getLayerAlignmentScore(metadata.osiLayers, uncoveredRequestedLayers, context.requestedLayers);
      const phaseProgression = getPhaseProgressionScore(metadata.phase, phaseStage, context.allowActiveExploits);
      const weightedScore = (layerAlignment * 0.4) + (phaseProgression * 0.25) + (riskGate * 0.2);
      const recencyPenalty = executedToolIds.has(tool.id) ? 0.3 : 0;
      const score = riskGate === 0
        ? 0
        : Math.max(0, Math.min(1, weightedScore + 0.15 - recencyPenalty));

      return { tool, score, gatedOut: riskGate === 0 };
    })
    .sort((left, right) => right.score - left.score || left.tool.name.localeCompare(right.tool.name));

  const selectable = ranked.filter((entry) => !entry.gatedOut);
  const pool = selectable.some((entry) => entry.score > 0)
    ? selectable.filter((entry) => entry.score > 0)
    : selectable;
  const targetCount = Math.min(Math.max(minTools, Math.min(maxTools, pool.length)), pool.length);
  const selected = pool.slice(0, targetCount).map((entry) => entry.tool);

  if (selected.length <= 1) {
    return selected;
  }

  const selectedCategories = new Set(selected.map((tool) => tool.category));
  if (selectedCategories.size > 1) {
    return selected;
  }

  const replacement = pool
    .slice(targetCount)
    .find((entry) => !selectedCategories.has(entry.tool.category));

  if (!replacement) {
    return selected;
  }

  return [...selected.slice(0, -1), replacement.tool];
}

function getLayerAlignmentScore(
  toolLayers: OsiLayer[],
  uncoveredRequestedLayers: OsiLayer[],
  requestedLayers: OsiLayer[]
) {
  const relevantLayers = uncoveredRequestedLayers.length > 0 ? uncoveredRequestedLayers : requestedLayers;
  if (relevantLayers.length === 0) {
    return 0;
  }

  const overlapCount = toolLayers.filter((layer) => relevantLayers.includes(layer)).length;
  return overlapCount === 0 ? 0 : overlapCount / relevantLayers.length;
}

function inferPhaseStage(
  context: ToolSelectorContext,
  uncoveredRequestedLayers: OsiLayer[]
): "early" | "mid" | "late" {
  if (context.executedToolIds.length <= 1 && context.findings.length === 0) {
    return "early";
  }

  if (context.findings.length > 0 || uncoveredRequestedLayers.length === 0) {
    return "late";
  }

  return "mid";
}

function getPhaseProgressionScore(
  phase: ToolPhase,
  stage: "early" | "mid" | "late",
  allowActiveExploits: boolean
) {
  const stageWeights: Record<"early" | "mid" | "late", Record<ToolPhase, number>> = {
    early: {
      recon: 1,
      enum: 0.75,
      "vuln-scan": 0.45,
      exploit: allowActiveExploits ? 0.15 : 0,
      post: 0.25,
      report: 0.15,
      utility: 0.4
    },
    mid: {
      recon: 0.55,
      enum: 1,
      "vuln-scan": 0.95,
      exploit: allowActiveExploits ? 0.4 : 0,
      post: 0.35,
      report: 0.2,
      utility: 0.5
    },
    late: {
      recon: 0.25,
      enum: 0.5,
      "vuln-scan": 0.85,
      exploit: allowActiveExploits ? 1 : 0,
      post: 0.75,
      report: 0.7,
      utility: 0.45
    }
  };

  return stageWeights[stage][phase];
}

function getRiskGateScore(tool: AiTool, allowActiveExploits: boolean) {
  if (tool.riskTier === "controlled-exploit") {
    return allowActiveExploits ? 1 : 0;
  }

  if (tool.riskTier === "active") {
    return 0.7;
  }

  return 1;
}
