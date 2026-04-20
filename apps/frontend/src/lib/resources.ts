import {
  apiRoutes,
  type AiAgent,
  type AiProvider,
  type AiTool,
  type Application,
  type ListAiAgentsResponse,
  type ListAiProvidersResponse,
  type ListAiToolsResponse,
  type ListApplicationsResponse,
  type ListRuntimesResponse,
  type Runtime,
} from "@synosec/contracts";
import { fetchJson } from "@/lib/api";

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

export type ResourceClient<TItem, TQuery extends ListQueryState> = {
  defaultQuery: TQuery;
  list: (query: TQuery) => Promise<PaginatedResource<TItem>>;
  detail: (id: string) => Promise<TItem>;
};

type OptionalString = string | undefined;
type ApplicationsQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "status" | "environment" | "lastScannedAt" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  status: OptionalString;
  environment: OptionalString;
};

type RuntimesQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "status" | "provider" | "environment" | "region" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  status: OptionalString;
  provider: OptionalString;
  environment: OptionalString;
};

type AiProvidersQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "kind" | "status" | "model" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  kind: OptionalString;
  status: OptionalString;
};

type AiAgentsQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "status" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  status: OptionalString;
  providerId: OptionalString;
};

type AiToolsQuery = {
  page: number;
  pageSize: number;
  q: string;
  sortBy: "name" | "source" | "category" | "status" | "createdAt" | "updatedAt";
  sortDirection: SortDirection;
  source: OptionalString;
  category: OptionalString;
  status: OptionalString;
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

export function updateUrlQuery<TQuery extends ListQueryState>(query: TQuery, defaults: TQuery) {
  const queryString = buildQueryString(query, defaults);
  const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
  window.history.pushState({}, "", nextUrl);
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
}) {
  return {
    defaultQuery: options.defaultQuery,
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

export const applicationsResource = createResourceClient<Application, ApplicationsQuery, ListApplicationsResponse>({
  path: apiRoutes.applications,
  dataKey: "applications",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    status: undefined,
    environment: undefined
  }
});

export const runtimesResource = createResourceClient<Runtime, RuntimesQuery, ListRuntimesResponse>({
  path: apiRoutes.runtimes,
  dataKey: "runtimes",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    status: undefined,
    provider: undefined,
    environment: undefined
  }
});

export const aiProvidersResource = createResourceClient<AiProvider, AiProvidersQuery, ListAiProvidersResponse>({
  path: apiRoutes.aiProviders,
  dataKey: "providers",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    kind: undefined,
    status: undefined
  }
});

export const aiAgentsResource = createResourceClient<AiAgent, AiAgentsQuery, ListAiAgentsResponse>({
  path: apiRoutes.aiAgents,
  dataKey: "agents",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    status: undefined,
    providerId: undefined
  }
});

export const aiToolsResource = createResourceClient<AiTool, AiToolsQuery, ListAiToolsResponse>({
  path: apiRoutes.aiTools,
  dataKey: "tools",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    source: undefined,
    category: undefined,
    status: undefined
  }
});
