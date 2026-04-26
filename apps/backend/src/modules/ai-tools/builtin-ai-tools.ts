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
        accepted: { type: "boolean" },
        error: { type: "string" },
        failures: {
          type: "array",
          items: { type: "string" }
        }
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
    description: "Persist findings and attack-vector links through a single mode-based action. Use `mode: \"finding\"` for evidence-backed weakness reporting (optionally with `attackVectors` between existing finding ids) and `mode: \"attack_vector\"` to submit one or more vectors between existing findings only. Provide persisted evidence references for findings and transition evidence for non-related vectors. Returns finding metadata plus created attack-vector ids and does not complete the run.",
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
      oneOf: [
        {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["finding"] },
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
            tags: { type: "array" },
            attackVectors: { type: "array" }
          },
          required: ["mode", "type", "title", "severity", "confidence", "impact", "recommendation", "target", "evidence"],
          description: "If the finding participates in a path, include relationship fields with explanationSummary and confidenceReason. attackVectors may only reference existing finding ids."
        },
        {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["attack_vector"] },
            attackVectors: { type: "array" }
          },
          required: ["mode", "attackVectors"],
          description: "Submit one or more attack vectors between existing finding ids only."
        }
      ]
    },
    outputSchema: {
      type: "object",
      properties: {
        accepted: { type: "boolean" },
        findingId: { type: "string" },
        title: { type: "string" },
        severity: { type: "string" },
        host: { type: "string" },
        attackVectorIds: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["attackVectorIds"]
    },
    createdAt: builtinTimestamp,
    updatedAt: builtinTimestamp
  },
  {
    id: "builtin-report-attack-vector",
    name: "Report Attack Vector",
    kind: "builtin-action",
    status: "active",
    source: "system",
    description: "Deprecated compatibility action for older workflow runs. Use this only when an existing run still calls `report_attack_vector`; for new workflows, use report_finding with `mode: \"attack_vector\"`. Provide kind, source/destination finding ids, impact, confidence, and grounded transition evidence for non-related vectors. Returns the created attack vector id and does not complete the run.",
    executorType: "builtin",
    builtinActionKey: "report_attack_vector" as ToolBuiltinActionKey,
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
        kind: { type: "string", enum: ["enables", "derived_from", "related", "lateral_movement"] },
        sourceFindingId: { type: "string" },
        destinationFindingId: { type: "string" },
        summary: { type: "string" },
        preconditions: { type: "array" },
        impact: { type: "string" },
        transitionEvidence: { type: "array" },
        confidence: { type: "number" },
        validationStatus: { type: "string" }
      },
      required: ["kind", "sourceFindingId", "destinationFindingId", "summary", "impact", "confidence"],
      description: "For enables, derived_from, and lateral_movement vectors, include transitionEvidence grounded in persisted tool results."
    },
    outputSchema: {
      type: "object",
      properties: {
        attackVectorId: { type: "string" },
        kind: { type: "string" },
        sourceFindingId: { type: "string" },
        destinationFindingId: { type: "string" }
      },
      required: ["attackVectorId", "kind", "sourceFindingId", "destinationFindingId"]
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
        residualRisk: { type: "string" },
        handoff: { type: "object" }
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
