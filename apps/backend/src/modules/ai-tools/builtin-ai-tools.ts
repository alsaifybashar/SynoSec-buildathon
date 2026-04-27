import type { AiTool, AiToolsListQuery, ToolBuiltinActionKey } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";
import { sortAndFilterAiTools } from "./ai-tool-surface.js";
import { getSemanticFamilyBuiltinAiTools } from "./semantic-family-tools.js";

const builtinTimestamp = "2026-04-25T00:00:00.000Z";

const workflowFindingEvidenceSchema = {
  type: "object",
  additionalProperties: false,
  description: "One grounded evidence record. Provide `quote` plus either `sourceTool` or a persisted reference like `toolRunRef`, `observationRef`, `artifactRef`, `traceEventId`, or `externalUrl`.",
  properties: {
    sourceTool: { type: "string", description: "Optional tool name or tool id that produced the evidence. If omitted, the runtime will derive it from `toolRunRef` when possible." },
    quote: { type: "string", description: "Short verbatim excerpt from the persisted tool output or observation." },
    artifactRef: { type: "string", description: "Optional persisted artifact id that anchors this quote." },
    observationRef: { type: "string", description: "Optional persisted observation id that anchors this quote." },
    toolRunRef: { type: "string", description: "Optional persisted tool run id that anchors this quote." },
    traceEventId: { type: "string", description: "Optional workflow trace event id that anchors this quote." },
    externalUrl: { type: "string", description: "Optional external URL when the evidence comes from a fetched reference." }
  },
  required: ["quote"]
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
    id: "builtin-report-system-graph-batch",
    name: "Report System Graph Batch",
    kind: "builtin-action",
    status: "active",
    source: "system",
    description: "Persist one incremental batch of workflow system-graph data. Use this after collecting evidence to submit normalized `resources`, `resourceRelationships`, `findings`, `findingRelationships`, and optional `paths` in a single payload. Provide stable ids so later batches can refine earlier entities without duplication. Every finding must include grounded `evidence`, every finding must attach to concrete `resourceIds`, and non-`related` finding relationships must include grounded `evidence`. Source-tool-only evidence is accepted only when it resolves to exactly one executed result in the current run; otherwise provide `toolRunRef`, `observationRef`, `artifactRef`, `traceEventId`, or `externalUrl`. Returns acceptance plus the ids merged from the batch. It does not complete the run.",
    executorType: "builtin",
    builtinActionKey: "report_system_graph_batch",
    bashSource: null,
    capabilities: ["workflow-reporting"],
    category: "utility",
    riskTier: "passive",
    timeoutMs: 1000,
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: {
      type: "object",
      additionalProperties: false,
      description: "Incremental workflow system graph batch. Use stable ids. On first submission for an id, include the required identifying fields. On later submissions, provide only the fields you want to refine.",
      properties: {
        resources: {
          type: "array",
          description: "System resources such as hosts, services, applications, datastores, endpoints, or trust zones.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", description: "Stable model-chosen id for this resource. Reuse it to refine the same resource later." },
              kind: { type: "string", enum: ["host", "service", "application", "endpoint", "database", "queue", "storage", "identity", "network", "external", "custom"], description: "Canonical resource kind. Use `custom` only when no canonical kind fits." },
              customKind: { type: "string", description: "Required when `kind` is `custom`. Short specific subtype such as web_application or trust_zone." },
              name: { type: "string", description: "Human-readable label for the resource." },
              summary: { type: "string", description: "Optional concise description of why this resource matters." },
              evidence: {
                type: "array",
                description: "Optional evidence that grounds this resource in observed data.",
                items: workflowFindingEvidenceSchema
              },
              tags: { type: "array", description: "Optional short labels for grouping or filtering.", items: { type: "string" } }
            }
          }
        },
        resourceRelationships: {
          type: "array",
          description: "Directed edges between resources such as reaches, depends_on, exposes, contains, or lateral_movement.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", description: "Stable model-chosen id for this relationship." },
              kind: { type: "string", enum: ["hosts", "exposes", "connects_to", "depends_on", "contains", "trusts", "routes_to", "authenticates_to", "custom"], description: "Canonical resource relationship kind. Use `custom` only when no canonical kind fits." },
              customKind: { type: "string", description: "Required when `kind` is `custom`. Short specific subtype for renderer and inspectors." },
              sourceResourceId: { type: "string", description: "Stable id of the source resource." },
              targetResourceId: { type: "string", description: "Stable id of the target resource." },
              summary: { type: "string", description: "Short explanation of the relationship." },
              evidence: {
                type: "array",
                description: "Optional evidence that grounds this resource-to-resource relationship.",
                items: workflowFindingEvidenceSchema
              }
            }
          }
        },
        findings: {
          type: "array",
          description: "Vulnerabilities or weaknesses attached to one or more resources.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", description: "Stable model-chosen id for this finding. Reuse it to refine the same finding later." },
              type: { type: "string", description: "Finding taxonomy type such as service_exposure, auth_weakness, misconfiguration, or other." },
              title: { type: "string", description: "Short finding title." },
              severity: { type: "string", description: "Severity level: info, low, medium, high, or critical." },
              confidence: { type: "number", description: "Confidence score from 0 to 1." },
              evidence: {
                type: "array",
                description: "Grounded evidence records for the finding. Required on first submission for a finding id.",
                items: workflowFindingEvidenceSchema
              },
              impact: { type: "string", description: "Short statement of why the finding matters." },
              recommendation: { type: "string", description: "Short remediation guidance." },
              validationStatus: { type: "string", description: "Validation state such as unverified, suspected, single_source, cross_validated, or reproduced." },
              resourceId: { type: "string", description: "Primary affected resource id." },
              resourceIds: { type: "array", description: "All affected resource ids. Required on first submission for a finding id.", items: { type: "string" } }
            }
          }
        },
        findingRelationships: {
          type: "array",
          description: "Directed links between findings such as enables, derived_from, related, or lateral_movement.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", description: "Stable model-chosen id for this finding relationship." },
              kind: { type: "string", enum: ["enables", "derived_from", "related", "lateral_movement"], description: "Relationship kind between the two findings." },
              sourceFindingId: { type: "string", description: "Stable id of the source finding." },
              targetFindingId: { type: "string", description: "Stable id of the target finding." },
              summary: { type: "string", description: "Short explanation of how the source and target findings relate." },
              impact: { type: "string", description: "Optional statement of why this relationship matters." },
              confidence: { type: "number", description: "Confidence score from 0 to 1." },
              validationStatus: { type: "string", description: "Validation state for the relationship." },
              evidence: {
                type: "array",
                description: "Grounded evidence supporting the relationship. Required for any non-related relationship. If you provide only `sourceTool`, it must resolve to exactly one executed result in this run.",
                items: workflowFindingEvidenceSchema
              }
            }
          }
        },
        paths: {
          type: "array",
          description: "Optional higher-level attack path or chain groupings.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", description: "Stable model-chosen id for this path grouping." },
              title: { type: "string", description: "Short path title." },
              summary: { type: "string", description: "Optional path explanation." },
              severity: { type: "string", description: "Optional severity for the path grouping." },
              resourceIds: { type: "array", description: "Referenced resource ids in this path.", items: { type: "string" } },
              findingIds: { type: "array", description: "Referenced finding ids in this path.", items: { type: "string" } }
            }
          }
        }
      },
      required: []
    },
    outputSchema: {
      type: "object",
      properties: {
        accepted: { type: "boolean" },
        resourceIds: { type: "array", items: { type: "string" } },
        findingIds: { type: "array", items: { type: "string" } },
        relationshipIds: { type: "array", items: { type: "string" } },
        pathIds: { type: "array", items: { type: "string" } }
      },
      required: ["accepted", "resourceIds", "findingIds", "relationshipIds", "pathIds"]
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
    description: "Use this as the final workflow action after any evidence gathering or report_system_graph_batch calls you want to make. Provide only `summary`. Returns `{ accepted: true }` when the run is closed. It does not create findings or accept extra closeout fields.",
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
