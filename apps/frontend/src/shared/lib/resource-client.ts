import { fetchJson } from "@/shared/lib/api";
import type {
  AiToolsListQuery,
  TargetsListQuery,
  WorkflowsListQuery
} from "@synosec/contracts";
import {
  buildQueryString,
  listPageSizes,
  parseListQueryState,
  updateUrlQuery,
  type ListQueryState,
  type PaginatedResource,
  type SortDirection
} from "@/shared/crud-controller/query-state";

export {
  listPageSizes,
  parseListQueryState,
  updateUrlQuery,
  type ListQueryState,
  type PaginatedResource,
  type SortDirection
};

export type ResourceCrudCapabilities<TItem> = {
  canCreate: boolean;
  canUpdate: (item: TItem) => boolean;
  canDelete: (item: TItem) => boolean;
};

export type ResourceClient<TItem, TQuery extends ListQueryState> = {
  defaultQuery: TQuery;
  capabilities: ResourceCrudCapabilities<TItem>;
  list: (query: TQuery) => Promise<PaginatedResource<TItem>>;
  detail: (id: string) => Promise<TItem>;
};

// UI-state form of contract list-query types: required defaults instead of
// optional, plus an index signature so they satisfy ListQueryState.
type UiQuery<TBase> = {
  [K in keyof TBase]-?: undefined extends TBase[K] ? TBase[K] | undefined : TBase[K];
} & { [key: string]: number | string | undefined };

type OptionalString = string | undefined;

export type TargetsQuery = UiQuery<{
  page: number;
  pageSize: number;
  q: string;
  sortBy: NonNullable<TargetsListQuery["sortBy"]>;
  sortDirection: SortDirection;
  status: NonNullable<TargetsListQuery["status"]> | undefined;
  environment: NonNullable<TargetsListQuery["environment"]> | undefined;
}>;

export type AiToolsQuery = UiQuery<{
  page: number;
  pageSize: number;
  q: string;
  sortBy: NonNullable<AiToolsListQuery["sortBy"]>;
  sortDirection: SortDirection;
  accessProfile: NonNullable<AiToolsListQuery["accessProfile"]> | undefined;
  source: NonNullable<AiToolsListQuery["source"]> | undefined;
  category: NonNullable<AiToolsListQuery["category"]> | undefined;
  status: NonNullable<AiToolsListQuery["status"]> | undefined;
  riskTier: OptionalString;
}>;

export type WorkflowsQuery = UiQuery<{
  page: number;
  pageSize: number;
  q: string;
  sortBy: NonNullable<WorkflowsListQuery["sortBy"]>;
  sortDirection: SortDirection;
  status: NonNullable<WorkflowsListQuery["status"]> | undefined;
}>;

export type ExecutionReportsQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "generatedAt" | "updatedAt" | "findingsCount" | "highestSeverity" | "executionKind" | "status" | "title";
  sortDirection: SortDirection;
  executionKind: OptionalString;
  status: OptionalString;
  archived: "exclude" | "only" | "include";
  [key: string]: number | string | undefined;
};

export type ExecutionConstraintsQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "kind" | "provider" | "version" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  kind: OptionalString;
  provider: OptionalString;
  [key: string]: number | string | undefined;
};

function normalizePaginatedResponse<TItem, TResponse extends Record<string, unknown>>(payload: TResponse, dataKey: string): PaginatedResource<TItem> {
  const items = payload[dataKey];
  if (!Array.isArray(items)) {
    throw new Error(`Expected array response field "${dataKey}".`);
  }

  return {
    items: items as TItem[],
    page: Number(payload["page"] ?? 1),
    pageSize: Number(payload["pageSize"] ?? 25),
    total: Number(payload["total"] ?? items.length),
    totalPages: Number(payload["totalPages"] ?? 1)
  };
}

export function createResourceClient<
  TItem,
  TQuery extends ListQueryState,
  TResponse extends Record<string, unknown>
>(options: {
  path: string;
  dataKey: string;
  defaultQuery: TQuery;
  capabilities?: Partial<ResourceCrudCapabilities<TItem>>;
}) {
  return {
    defaultQuery: options.defaultQuery,
    capabilities: {
      canCreate: options.capabilities?.canCreate ?? true,
      canUpdate: options.capabilities?.canUpdate ?? (() => true),
      canDelete: options.capabilities?.canDelete ?? (() => true)
    },
    async list(query: TQuery) {
      const queryString = buildQueryString(query, {} as TQuery);
      const url = queryString ? `${options.path}?${queryString}` : options.path;
      const payload = await fetchJson<TResponse>(url);
      return normalizePaginatedResponse<TItem, TResponse>(payload, options.dataKey);
    },
    async detail(id: string) {
      return fetchJson<TItem>(`${options.path}/${id}`);
    }
  } satisfies ResourceClient<TItem, TQuery>;
}
