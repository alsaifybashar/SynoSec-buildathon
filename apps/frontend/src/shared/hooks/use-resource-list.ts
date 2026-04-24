import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ListQueryState, PaginatedResource, ResourceClient } from "@/shared/lib/resource-client";
import { parseListQueryState } from "@/shared/lib/resource-client";

const MINIMUM_LOADING_MS = 300;
const listCache = new WeakMap<object, Map<string, PaginatedResource<unknown>>>();

type ResourceListState<T> =
  | { state: "loading"; data: PaginatedResource<T> | null }
  | { state: "loaded"; data: PaginatedResource<T> }
  | { state: "error"; data: PaginatedResource<T> | null; message: string };

function getCachedList<TItem>(client: object, key: string) {
  return (listCache.get(client)?.get(key) ?? null) as PaginatedResource<TItem> | null;
}

function setCachedList<TItem>(client: object, key: string, data: PaginatedResource<TItem>) {
  const current = listCache.get(client) ?? new Map<string, PaginatedResource<unknown>>();
  current.set(key, data as PaginatedResource<unknown>);
  listCache.set(client, current);
}

export function useResourceList<TItem, TQuery extends ListQueryState>(client: ResourceClient<TItem, TQuery>) {
  const location = useLocation();
  const navigate = useNavigate();
  const getUrlCacheKey = useCallback(() => `${location.pathname}${location.search}`, [location.pathname, location.search]);
  const [query, setQuery] = useState<TQuery>(() => parseListQueryState(client.defaultQuery, location.search));
  const initialCacheKey = getUrlCacheKey();
  const initialCachedData = getCachedList<TItem>(client, initialCacheKey);
  const [dataState, setDataState] = useState<ResourceListState<TItem>>(
    initialCachedData
      ? { state: "loaded", data: initialCachedData }
      : { state: "loading", data: null }
  );
  const [reloadToken, setReloadToken] = useState(0);
  const hasLoadedRouteRef = useRef(false);
  const lastPathnameRef = useRef(location.pathname);

  useEffect(() => {
    setQuery(parseListQueryState(client.defaultQuery, location.search));
  }, [client.defaultQuery, location.search]);

  useEffect(() => {
    let active = true;
    const currentPathname = location.pathname;
    const cacheKey = getUrlCacheKey();
    const cachedData = getCachedList<TItem>(client, cacheKey);
    const shouldDelay =
      cachedData === null && (!hasLoadedRouteRef.current || lastPathnameRef.current !== currentPathname);

    lastPathnameRef.current = currentPathname;
    setDataState((current) => ({ state: "loading", data: cachedData ?? current.data }));

    const listRequest = client.list(query);
    const loadRequest = shouldDelay
      ? Promise.all([
        listRequest,
        new Promise((resolve) => window.setTimeout(resolve, MINIMUM_LOADING_MS))
      ]).then(([data]) => data)
      : listRequest;

    loadRequest
      .then((data) => {
        if (active) {
          setCachedList(client, cacheKey, data);
          hasLoadedRouteRef.current = true;
          setDataState({ state: "loaded", data });
        }
      })
      .catch((error) => {
        if (active) {
          setDataState({
            state: "error",
            data: null,
            message: error instanceof Error ? error.message : "Failed to load records."
          });
        }
      });

    return () => {
      active = false;
    };
  }, [client, getUrlCacheKey, location.pathname, query, reloadToken]);

  const updateQuery = useCallback((updater: TQuery | ((current: TQuery) => TQuery)) => {
    setQuery((current) => {
      const nextQuery = typeof updater === "function"
        ? (updater as (current: TQuery) => TQuery)(current)
        : updater;

      const params = new URLSearchParams();

      for (const [key, rawValue] of Object.entries(nextQuery)) {
        if (rawValue === undefined || rawValue === "") {
          continue;
        }

        if (rawValue === client.defaultQuery[key]) {
          continue;
        }

        params.set(key, String(rawValue));
      }

      const nextSearch = params.toString();
      const currentSearch = location.search.startsWith("?") ? location.search.slice(1) : location.search;
      if (currentSearch !== nextSearch) {
        navigate(
          {
            pathname: location.pathname,
            search: nextSearch ? `?${nextSearch}` : ""
          },
          { replace: true }
        );
      }
      return nextQuery;
    });
  }, [client.defaultQuery, location.pathname, location.search, navigate]);

  const setSearch = useCallback((value: string) => {
    updateQuery((current) => ({ ...current, q: value, page: 1 }));
  }, [updateQuery]);

  const setFilter = useCallback((key: string, value: string | undefined) => {
    updateQuery((current) => ({ ...current, [key]: value, page: 1 }));
  }, [updateQuery]);

  const setSort = useCallback((sortBy: string) => {
    updateQuery((current) => {
      const nextDirection = current.sortBy === sortBy && current.sortDirection === "asc" ? "desc" : "asc";
      return { ...current, sortBy, sortDirection: nextDirection, page: 1 };
    });
  }, [updateQuery]);

  const setPage = useCallback((page: number) => {
    updateQuery((current) => ({ ...current, page }));
  }, [updateQuery]);

  const setPageSize = useCallback((pageSize: number) => {
    updateQuery((current) => ({ ...current, pageSize, page: 1 }));
  }, [updateQuery]);

  const refetch = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  return {
    query,
    dataState,
    items: dataState.data?.items ?? [],
    meta: dataState.data ?? {
      items: [],
      page: query.page,
      pageSize: query.pageSize,
      total: 0,
      totalPages: 0
    },
    setSearch,
    setFilter,
    setSort,
    setPage,
    setPageSize,
    refetch
  };
}
