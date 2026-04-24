import type { AiTool, AiToolsListQuery, ToolBuiltinActionKey } from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { paginateItems, type PaginatedResult } from "@/shared/pagination/paginated-result.js";

const builtinTimestamp = "2026-04-25T00:00:00.000Z";

const builtinAiTools: AiTool[] = [
  {
    id: "builtin-report-finding",
    name: "Report Finding",
    status: "active",
    source: "system",
    description: "Workflow engine action for persisting one evidence-backed workflow finding.",
    binary: null,
    executorType: "builtin",
    builtinActionKey: "report_finding",
    bashSource: null,
    capabilities: ["workflow-reporting"],
    category: "utility",
    riskTier: "passive",
    notes: "Executed by the workflow execution service, not by a shell script.",
    sandboxProfile: "read-only-parser",
    privilegeProfile: "read-only-network",
    timeoutMs: 1000,
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
        evidence: { type: "array" }
      },
      required: ["type", "title", "severity", "confidence", "impact", "recommendation", "target", "evidence"]
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
    id: "builtin-report-vulnerability",
    name: "Report Vulnerability",
    status: "active",
    source: "system",
    description: "Single-agent scan action for persisting one structured evidence-backed vulnerability.",
    binary: null,
    executorType: "builtin",
    builtinActionKey: "report_vulnerability",
    bashSource: null,
    capabilities: ["scan-reporting"],
    category: "utility",
    riskTier: "passive",
    notes: "Executed by the single-agent security loop, not by a shell script.",
    sandboxProfile: "read-only-parser",
    privilegeProfile: "read-only-network",
    timeoutMs: 1000,
    inputSchema: {
      type: "object",
      properties: {
        primaryLayer: { type: "string" },
        category: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        impact: { type: "string" },
        recommendation: { type: "string" },
        severity: { type: "string" },
        confidence: { type: "number" },
        target: { type: "object" },
        evidence: { type: "array" },
        technique: { type: "string" }
      },
      required: [
        "primaryLayer",
        "category",
        "title",
        "description",
        "impact",
        "recommendation",
        "severity",
        "confidence",
        "target",
        "evidence",
        "technique"
      ]
    },
    outputSchema: {
      type: "object",
      properties: {
        accepted: { type: "boolean" },
        vulnerabilityId: { type: "string" }
      },
      required: ["accepted", "vulnerabilityId"]
    },
    createdAt: builtinTimestamp,
    updatedAt: builtinTimestamp
  }
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
  const normalizedQuery = query.q?.trim().toLowerCase();
  const merged = [...items, ...getBuiltinAiTools()]
    .filter((tool) => !query.status || tool.status === query.status)
    .filter((tool) => !query.source || tool.source === query.source)
    .filter((tool) => !query.category || tool.category === query.category)
    .filter((tool) => {
      if (!normalizedQuery) {
        return true;
      }

      return [tool.name, tool.description ?? "", tool.notes ?? ""]
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

  return paginateItems(merged, query.page, query.pageSize);
}
