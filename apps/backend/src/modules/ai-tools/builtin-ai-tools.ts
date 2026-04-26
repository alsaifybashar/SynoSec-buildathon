import type { AiTool, AiToolsListQuery, ToolBuiltinActionKey } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { sortAndFilterAiTools } from "./ai-tool-surface.js";
import { getSemanticFamilyBuiltinAiTools } from "./semantic-family-tools.js";

const builtinTimestamp = "2026-04-25T00:00:00.000Z";

const lifecycleBuiltinAiTools: AiTool[] = [
  {
    id: "builtin-log-progress",
    name: "Log Progress",
    kind: "builtin-action",
    status: "active",
    source: "system",
    description: "Persist a short operator-visible progress update in the workflow transcript. Use this before or after meaningful tool calls to explain the current action or decision in one concise sentence. Provide `message`. Returns acceptance only; it does not create evidence, findings, or attack-path links.",
    executorType: "builtin",
    builtinActionKey: "log_progress" as ToolBuiltinActionKey,
    bashSource: null,
    capabilities: ["workflow-control"],
    category: "utility",
    riskTier: "passive",
    timeoutMs: 1000,
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string" }
      },
      required: ["message"]
    },
    outputSchema: {
      type: "object",
      properties: {
        accepted: { type: "boolean" }
      },
      required: ["accepted"]
    },
    createdAt: builtinTimestamp,
    updatedAt: builtinTimestamp
  },
  {
    id: "builtin-report-finding",
    name: "Report Finding",
    kind: "builtin-action",
    status: "active",
    source: "system",
    description: "Persist one evidence-backed security finding. Run evidence tools first. Provide supported weakness details and persisted evidence quotes. Returns the finding id; use that id in related findings and handoff attack paths.",
    executorType: "builtin",
    builtinActionKey: "report_finding",
    bashSource: null,
    capabilities: ["workflow-reporting"],
    category: "utility",
    riskTier: "passive",
    timeoutMs: 1000,
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        title: { type: "string" },
        severity: { type: "string" },
        confidence: { type: "number" },
        impact: { type: "string" },
        recommendation: { type: "string" },
        target: { type: "object" },
        evidence: { type: "array" },
        derivedFromFindingIds: { type: "array" },
        relatedFindingIds: { type: "array" },
        enablesFindingIds: { type: "array" },
        chain: { type: "object" },
        explanationSummary: { type: "string" },
        confidenceReason: { type: "string" },
        relationshipExplanations: { type: "object" },
        validationStatus: { type: "string" },
        reproduction: { type: "object" },
        tags: { type: "array" }
      },
      required: ["type", "title", "severity", "confidence", "impact", "recommendation", "target", "evidence"],
      description: "If the finding participates in a path, include relationship fields together with explanationSummary and confidenceReason."
    },
    outputSchema: {
      type: "object",
      properties: {
        findingId: { type: "string" },
        title: { type: "string" },
        severity: { type: "string" },
        host: { type: "string" }
      },
      required: ["findingId", "title", "severity", "host"]
    },
    createdAt: builtinTimestamp,
    updatedAt: builtinTimestamp
  },
  {
    id: "builtin-complete-run",
    name: "Complete Run",
    kind: "builtin-action",
    status: "active",
    source: "system",
    description: "Finish the workflow run last, after required evidence, report_finding calls, finding ids, and any handoff attack paths have been submitted. Use this only as the final action. Provide `summary`, `recommendedNextStep`, `residualRisk`, and optional `handoff`. It does not create findings and cannot satisfy missing evidence, finding, or chain requirements.",
    executorType: "builtin",
    builtinActionKey: "complete_run",
    bashSource: null,
    capabilities: ["workflow-control"],
    category: "utility",
    riskTier: "passive",
    timeoutMs: 1000,
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        recommendedNextStep: { type: "string" },
        residualRisk: { type: "string" }
      },
      required: ["summary", "recommendedNextStep", "residualRisk"]
    },
    outputSchema: {
      type: "object",
      properties: {
        accepted: { type: "boolean" }
      },
      required: ["accepted"]
    },
    createdAt: builtinTimestamp,
    updatedAt: builtinTimestamp
  }
];

const builtinAiTools: AiTool[] = [
  ...lifecycleBuiltinAiTools,
  ...getSemanticFamilyBuiltinAiTools()
];

const builtinAiToolsById = new Map(builtinAiTools.map((tool) => [tool.id, tool]));
const builtinActionKeyById = new Map(builtinAiTools.map((tool) => [tool.id, tool.builtinActionKey]).filter((entry): entry is [string, ToolBuiltinActionKey] => Boolean(entry[1])));

export function getBuiltinAiTool(id: string) {
  return builtinAiToolsById.get(id) ?? null;
}

export function isBuiltinAiToolId(id: string) {
  return builtinAiToolsById.has(id);
}

export function getBuiltinActionKeyForToolId(id: string) {
  return builtinActionKeyById.get(id) ?? null;
}

export function getBuiltinAiTools() {
  return builtinAiTools.map((tool) => ({ ...tool }));
}

export function rejectBuiltinAiToolMutation(id: string): never {
  const tool = getBuiltinAiTool(id);
  throw new RequestError(400, tool ? `${tool.name} is a built-in system action and cannot be modified.` : "Built-in AI tools cannot be modified.", {
    code: "AI_TOOL_BUILTIN_IMMUTABLE",
    userFriendlyMessage: "Built-in AI tools are read-only."
  });
}

export function mergeAndPaginateAiTools(items: AiTool[], query: AiToolsListQuery): PaginatedResult<AiTool> {
  const mergedById = new Map<string, AiTool>();
  for (const tool of [...items, ...getBuiltinAiTools()]) {
    mergedById.set(tool.id, tool);
  }

  const merged = sortAndFilterAiTools([...mergedById.values()], query);

  return paginateItems(merged, query.page, query.pageSize);
}
