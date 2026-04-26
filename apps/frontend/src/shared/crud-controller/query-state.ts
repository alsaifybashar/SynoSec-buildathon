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

export function buildQueryString(query: ListQueryState, defaults: Partial<ListQueryState> = {}) {
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
