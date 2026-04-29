import type { AiTool, AiToolRuntimeStateSummary } from "@synosec/contracts";
import { getToolCatalog } from "@/engine/tools/tool-catalog.js";
import { seededToolDefinitions } from "@/shared/seed-data/ai-builder-defaults.js";
import { getSemanticFamilyDefinitions } from "./semantic-family-tools.js";

const catalogToolIds = new Set<string>(getToolCatalog().map((entry) => entry.id));
const seededToolIds = new Set<string>(seededToolDefinitions.map((tool) => tool.id));
const semanticFamiliesById = new Map(
  getSemanticFamilyDefinitions().map((definition) => [definition.tool.id, definition] as const)
);

function isSemanticFamily(tool: AiTool) {
  return tool.kind === "semantic-family" || tool.capabilities.includes("semantic-family");
}

export function classifyAiToolKind(tool: AiTool): AiTool["kind"] {
  if (tool.executorType === "builtin") {
    return isSemanticFamily(tool) ? "semantic-family" : "builtin-action";
  }

  return "raw-adapter";
}

function summarizeRawTool(tool: AiTool): AiToolRuntimeStateSummary {
  const cataloged = catalogToolIds.has(tool.id);
  const installed = cataloged;
  const executable = tool.executorType === "bash" && tool.bashSource != null && tool.bashSource.trim().length > 0;

  return {
    cataloged,
    installed,
    executable,
    granted: false
  };
}

function summarizeBuiltinAction(): AiToolRuntimeStateSummary {
  return {
    cataloged: true,
    installed: true,
    executable: true,
    granted: true
  };
}

function summarizeSemanticFamily(tool: AiTool, coveredToolIds: string[], candidateToolIds: string[]): AiToolRuntimeStateSummary {
  const cataloged = coveredToolIds.some((toolId) => catalogToolIds.has(toolId) || seededToolIds.has(toolId));
  const installed = candidateToolIds.some((toolId) => catalogToolIds.has(toolId));
  const executable = candidateToolIds.some((toolId) => seededToolIds.has(toolId));

  return {
    cataloged,
    installed,
    executable,
    granted: true
  };
}

export function enrichAiTool(tool: AiTool): AiTool {
  const kind = classifyAiToolKind(tool);
  const familyDefinition = kind === "semantic-family" ? semanticFamiliesById.get(tool.id) : undefined;
  const coveredToolIds = familyDefinition ? [...familyDefinition.coveredToolIds] : [];
  const candidateToolIds = familyDefinition ? [...familyDefinition.candidateToolIds] : [];

  return {
    ...tool,
    kind,
    coveredToolIds,
    candidateToolIds,
    runtimeStateSummary: kind === "builtin-action"
      ? summarizeBuiltinAction()
      : kind === "semantic-family"
        ? summarizeSemanticFamily(tool, coveredToolIds, candidateToolIds)
        : summarizeRawTool(tool)
  };
}

export function sortAndFilterAiTools(items: AiTool[], query: {
  category?: AiTool["category"] | undefined;
  q?: string | undefined;
  riskTier?: AiTool["riskTier"] | undefined;
  sortBy?: "name" | "kind" | "source" | "status" | "category" | "riskTier" | "createdAt" | "updatedAt" | undefined;
  sortDirection?: "asc" | "desc" | undefined;
  source?: AiTool["source"] | undefined;
  status?: AiTool["status"] | undefined;
  accessProfile?: AiTool["accessProfile"] | undefined;
}) {
  const normalizedQuery = query.q?.trim().toLowerCase();
  return items
    .map(enrichAiTool)
    .filter((tool) => !query.status || tool.status === query.status)
    .filter((tool) => !query.source || tool.source === query.source)
    .filter((tool) => !query.accessProfile || tool.accessProfile === query.accessProfile)
    .filter((tool) => !query.category || tool.category === query.category)
    .filter((tool) => !query.riskTier || tool.riskTier === query.riskTier)
    .filter((tool) => {
      if (!normalizedQuery) {
        return true;
      }

      return [tool.name, tool.description ?? "", tool.id]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    })
    .sort((left, right) => {
      const sortBy = query.sortBy ?? "name";
      const direction = query.sortDirection === "desc" ? -1 : 1;
      const leftValue = left[sortBy];
      const rightValue = right[sortBy];

      if (leftValue === rightValue) {
        return left.name.localeCompare(right.name) * direction;
      }

      return (leftValue > rightValue ? 1 : -1) * direction;
    });
}
