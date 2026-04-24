import type { AiTool } from "@synosec/contracts";
import { getToolCatalog, type ToolPhase } from "@/execution-engine/tools/index.js";
import type { AgentToolPolicy } from "@/shared/seed-data/agent-tool-policies.js";

type CatalogMetadata = {
  phase: ToolPhase;
  tags: string[];
};

const defaultMetadata: CatalogMetadata = {
  phase: "utility",
  tags: []
};

const metadataByToolId = new Map(
  getToolCatalog().map((entry) => [
    entry.id,
    {
      phase: entry.phase,
      tags: entry.tags
    } satisfies CatalogMetadata
  ])
);

export async function resolveAgentTools(
  agentId: string,
  explicitToolIds: string[],
  allTools: AiTool[],
  policy: AgentToolPolicy | undefined
): Promise<AiTool[]> {
  const toolsById = new Map(allTools.map((tool) => [tool.id, tool]));

  if (!policy || policy.agentId !== agentId) {
    return explicitToolIds
      .map((toolId) => toolsById.get(toolId))
      .filter((tool): tool is AiTool => Boolean(tool));
  }

  const dynamicMatches = allTools.filter((tool) => matchesPolicy(tool, policy));
  const cappedDynamicMatches = typeof policy.selectionCriteria.maxCount === "number"
    ? dynamicMatches.slice(0, Math.max(0, policy.selectionCriteria.maxCount))
    : dynamicMatches;

  const orderedIds = [
    ...policy.pinnedToolIds,
    ...explicitToolIds,
    ...cappedDynamicMatches.map((tool) => tool.id)
  ];

  const seen = new Set<string>();
  const resolved: AiTool[] = [];
  for (const toolId of orderedIds) {
    if (seen.has(toolId)) {
      continue;
    }

    const tool = toolsById.get(toolId);
    if (!tool) {
      continue;
    }

    seen.add(toolId);
    resolved.push(tool);
  }

  return resolved;
}

function matchesPolicy(tool: AiTool, policy: AgentToolPolicy) {
  const criteria = policy.selectionCriteria;
  const metadata = metadataByToolId.get(tool.id) ?? defaultMetadata;

  if (criteria.categories && !criteria.categories.includes(tool.category)) {
    return false;
  }

  if (criteria.riskTiers && !criteria.riskTiers.includes(tool.riskTier)) {
    return false;
  }

  if (criteria.phases && !criteria.phases.includes(metadata.phase)) {
    return false;
  }

  if (criteria.tags && criteria.tags.length > 0) {
    const tagSet = new Set(metadata.tags);
    if (!criteria.tags.some((tag) => tagSet.has(tag))) {
      return false;
    }
  }

  return true;
}
