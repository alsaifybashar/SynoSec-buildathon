import {
  apiRoutes,
  type CreateTargetBody,
  type ListTargetsResponse,
  type Target
} from "@synosec/contracts";
import { type CrudDataPort } from "@/shared/crud-controller/create-crud-feature-controller";
import { buildQueryString, type PaginatedResource } from "@/shared/crud-controller/query-state";
import { fetchJson } from "@/shared/lib/api";
import type { TargetsQuery } from "@/shared/lib/resource-client";

function normalizePaginatedTargets(payload: ListTargetsResponse): PaginatedResource<Target> {
  return {
    items: payload.targets,
    page: payload.page,
    pageSize: payload.pageSize,
    total: payload.total,
    totalPages: payload.totalPages
  };
}

export const targetsPort: CrudDataPort<Target, TargetsQuery, CreateTargetBody> = {
  async list(query) {
    const queryString = buildQueryString(query);
    const payload = await fetchJson<ListTargetsResponse>(
      queryString ? `${apiRoutes.targets}?${queryString}` : apiRoutes.targets
    );
    return normalizePaginatedTargets(payload);
  },
  detail(id) {
    return fetchJson<Target>(`${apiRoutes.targets}/${id}`);
  },
  create(body) {
    return fetchJson<Target>(apiRoutes.targets, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  },
  update(id, body) {
    return fetchJson<Target>(`${apiRoutes.targets}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  },
  async remove(id) {
    await fetchJson<void>(`${apiRoutes.targets}/${id}`, {
      method: "DELETE"
    });
  }
};
