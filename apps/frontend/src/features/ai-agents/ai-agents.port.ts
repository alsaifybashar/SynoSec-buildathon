import {
  apiRoutes,
  type AiAgent,
  type CreateAiAgentBody,
  type ListAiAgentsResponse
} from "@synosec/contracts";
import { type CrudDataPort } from "@/shared/crud-controller/create-crud-feature-controller";
import { buildQueryString, type PaginatedResource } from "@/shared/crud-controller/query-state";
import { fetchJson } from "@/shared/lib/api";
import type { AiAgentsQuery } from "@/shared/lib/resource-client";

function normalizePaginatedAgents(payload: ListAiAgentsResponse): PaginatedResource<AiAgent> {
  return {
    items: Array.isArray(payload["agents"]) ? payload["agents"] as AiAgent[] : [],
    page: typeof payload["page"] === "number" ? payload["page"] : 1,
    pageSize: typeof payload["pageSize"] === "number" ? payload["pageSize"] : 25,
    total: typeof payload["total"] === "number" ? payload["total"] : 0,
    totalPages: typeof payload["totalPages"] === "number" ? payload["totalPages"] : 0
  };
}

export const aiAgentsPort: CrudDataPort<AiAgent, AiAgentsQuery, CreateAiAgentBody> = {
  async list(query) {
    const queryString = buildQueryString(query);
    const payload = await fetchJson<ListAiAgentsResponse>(
      queryString ? `${apiRoutes.aiAgents}?${queryString}` : apiRoutes.aiAgents
    );
    return normalizePaginatedAgents(payload);
  },
  detail(id) {
    return fetchJson<AiAgent>(`${apiRoutes.aiAgents}/${id}`);
  },
  create(body) {
    return fetchJson<AiAgent>(apiRoutes.aiAgents, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  },
  update(id, body) {
    return fetchJson<AiAgent>(`${apiRoutes.aiAgents}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  },
  async remove(id) {
    await fetchJson<void>(`${apiRoutes.aiAgents}/${id}`, {
      method: "DELETE"
    });
  }
};
