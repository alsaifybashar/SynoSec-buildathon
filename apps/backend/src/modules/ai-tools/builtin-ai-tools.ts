import type { AiTool, AiToolsListQuery, ToolBuiltinActionKey } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { sortAndFilterAiTools } from "./ai-tool-surface.js";
import { getSemanticFamilyBuiltinAiTools } from "./semantic-family-tools.js";

const builtinTimestamp = "2026-04-25T00:00:00.000Z";

const workflowFindingEvidenceSchema = {
  type: "object",
  properties: {
    sourceTool: { type: "string" },
    quote: { type: "string" },
    artifactRef: { type: "string" },
    observationRef: { type: "string" },
    toolRunRef: { type: "string" },
    traceEventId: { type: "string" },
    externalUrl: { type: "string" }
  },
  required: ["sourceTool", "quote"]
};

const workflowAttackVectorSchema = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["enables", "derived_from", "related", "lateral_movement"] },
    sourceFindingId: { type: "string" },
    destinationFindingId: { type: "string" },
    summary: { type: "string" },
    preconditions: {
      type: "array",
      items: { type: "string" }
    },
    impact: { type: "string" },
    transitionEvidence: {
      oneOf: [
        {
          type: "array",
          items: workflowFindingEvidenceSchema
        },
        { type: "string" }
      ]
    },
    confidence: {
      oneOf: [
        { type: "number" },
        { type: "string" }
      ]
    },
    validationStatus: { type: "string" }
  },
  required: ["kind", "sourceFindingId", "destinationFindingId", "summary", "impact", "confidence"]
};

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
    description: "Persist one finding-only workflow report. Use this when you have evidence that a specific weakness exists: provide `title` plus at least one grounded `evidence` item, then let the server infer or default missing fields such as type, severity, confidence, impact, recommendation, target details, and reproduction details. Prefer canonical object inputs, but this action still accepts finding-compatible legacy shapes such as JSON-string payloads, numeric-string confidence, string `target`, and omitted `mode` values that default to `finding`. Returns the canonical normalized result with `accepted`, `findingId`, `title`, `severity`, and `host`. It does not create attack-vector links and it does not complete the run.",
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
        mode: { type: "string", enum: ["finding"] },
        type: { type: "string" },
        title: { type: "string" },
        severity: { type: "string" },
        confidence: {
          oneOf: [
            { type: "number" },
            { type: "string" }
          ]
        },
        impact: { type: "string" },
        recommendation: { type: "string" },
        target: {
          oneOf: [
            { type: "string" },
            {
              type: "object",
              properties: {
                host: { type: "string" },
                port: {
                  oneOf: [
                    { type: "number" },
                    { type: "string" }
                  ]
                },
                url: { type: "string" },
                path: { type: "string" }
              }
            }
          ]
        },
        evidence: {
          oneOf: [
            {
              type: "array",
              items: workflowFindingEvidenceSchema
            },
            { type: "string" }
          ]
        },
        explanationSummary: { type: "string" },
        confidenceReason: { type: "string" },
        relationshipExplanations: { type: "object" },
        validationStatus: { type: "string" },
        reproduction: { type: "object" },
        tags: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["title", "evidence"],
      description: "Preferred finding submission. `title` and grounded `evidence` are required. Other fields are optional and are defaulted or inferred server-side. Compatibility inputs such as string target, JSON-string evidence array, numeric-string confidence, and omitted finding mode are also accepted."
    },
    outputSchema: {
      type: "object",
      properties: {
        accepted: { type: "boolean" },
        findingId: { type: "string" },
        title: { type: "string" },
        severity: { type: "string" },
        host: { type: "string" }
      },
      required: ["accepted", "findingId", "title", "severity", "host"]
    },
    createdAt: builtinTimestamp,
    updatedAt: builtinTimestamp
  },
  {
    id: "builtin-report-attack-vectors",
    name: "Report Attack Vectors",
    kind: "builtin-action",
    status: "active",
    source: "system",
    description: "Persist one or more explicit attack-vector links between existing findings. Use this only after `report_finding` has returned the `findingId` values you want to connect. Provide `attackVectors` as an array of relationship records; each record must reference existing findings, and every non-`related` vector must include grounded `transitionEvidence`. Returns the canonical batch result with `accepted` and created `attackVectorIds`. It does not create findings and it does not complete the run.",
    executorType: "builtin",
    builtinActionKey: "report_attack_vectors",
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
        attackVectors: {
          type: "array",
          items: workflowAttackVectorSchema
        }
      },
      required: ["attackVectors"]
    },
    outputSchema: {
      type: "object",
      properties: {
        accepted: { type: "boolean" },
        attackVectorIds: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["accepted", "attackVectorIds"]
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
    description: "Use this as the final workflow action after any evidence gathering or report_finding calls you want to make. Provide only `summary`. Returns `{ accepted: true }` when the run is closed. It does not create findings or accept extra closeout fields.",
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
      additionalProperties: false,
      properties: {
        summary: { type: "string" }
      },
      required: ["summary"]
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
