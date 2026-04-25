import { fetchJson } from "@/shared/lib/api";

export const listPageSizes = [10, 25, 50, 100] as const;

export type SortDirection = "asc" | "desc";

export type ListQueryState = {
  page: number;
  pageSize: number;
  q: string;
  sortBy?: string;
  sortDirection: SortDirection;
  [key: string]: number | string | undefined;
};

export type PaginatedResource<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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

type OptionalString = string | undefined;
export type TargetsQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "status" | "environment" | "lastScannedAt" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  status: OptionalString;
  environment: OptionalString;
  [key: string]: number | string | undefined;
};

export type AiProvidersQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "kind" | "status" | "model" | "apiKey" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  kind: OptionalString;
  status: OptionalString;
  [key: string]: number | string | undefined;
};

export type AiAgentsQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "status" | "providerId" | "toolIds" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  status: OptionalString;
  providerId: OptionalString;
  [key: string]: number | string | undefined;
};

export type AiToolsQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "source" | "category" | "status" | "riskTier" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  source: OptionalString;
  category: OptionalString;
  status: OptionalString;
  riskTier: OptionalString;
  [key: string]: number | string | undefined;
};

export type WorkflowsQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "status" | "targetId" | "agentId" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  status: OptionalString;
  targetId: OptionalString;
  [key: string]: number | string | undefined;
};

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

function buildQueryString(query: ListQueryState, defaults: ListQueryState) {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === "") {
      continue;
    }

    const defaultValue = defaults[key];
    if (rawValue === defaultValue) {
      continue;
    }

    params.set(key, String(rawValue));
  }

  return params.toString();
}

export function parseListQueryState<TQuery extends ListQueryState>(defaults: TQuery, search: string): TQuery {
  const params = new URLSearchParams(search);
  const nextQuery = { ...defaults } as Record<string, string | number | undefined>;

  for (const [key, value] of params.entries()) {
    if (!(key in defaults)) {
      continue;
    }

    const defaultValue = defaults[key];
    if (typeof defaultValue === "number") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        nextQuery[key] = parsed;
      }
      continue;
    }

    nextQuery[key] = value;
  }

  return nextQuery as TQuery;
}

export function updateUrlQuery<TQuery extends ListQueryState>(
  query: TQuery,
  defaults: TQuery,
  mode: "push" | "replace" = "push"
) {
  const queryString = buildQueryString(query, defaults);
  const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (currentUrl === nextUrl) {
    return;
  }

  if (mode === "replace") {
    window.history.replaceState(window.history.state, "", nextUrl);
    return;
  }

  window.history.pushState(window.history.state, "", nextUrl);
}

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
