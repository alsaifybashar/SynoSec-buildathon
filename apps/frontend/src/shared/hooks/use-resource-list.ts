import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ListQueryState, PaginatedResource, ResourceClient } from "@/shared/lib/resource-client";
import { parseListQueryState } from "@/shared/lib/resource-client";

type ResourceListState<T> =
  | { state: "loading"; data: PaginatedResource<T> | null }
  | { state: "loaded"; data: PaginatedResource<T> }
  | { state: "error"; data: PaginatedResource<T> | null; message: string };

function createListQueryKey<TQuery extends ListQueryState>(client: object, pathname: string, query: TQuery) {
  return ["resource-list", client, pathname, query] as const;
}

export function useResourceList<TItem, TQuery extends ListQueryState>(client: ResourceClient<TItem, TQuery>) {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState<TQuery>(() => parseListQueryState(client.defaultQuery, location.search));

  useEffect(() => {
    setQuery(parseListQueryState(client.defaultQuery, location.search));
  }, [client.defaultQuery, location.search]);

  const queryResult = useQuery({
    queryKey: createListQueryKey(client, location.pathname, query),
    queryFn: () => client.list(query),
    placeholderData: keepPreviousData
  });

  const dataState: ResourceListState<TItem> = queryResult.isPending
    ? { state: "loading", data: queryResult.data ?? null }
    : queryResult.isError
      ? {
          state: "error",
          data: queryResult.data ?? null,
          message: queryResult.error instanceof Error ? queryResult.error.message : "Failed to load records."
        }
      : { state: "loaded", data: queryResult.data };

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
    void queryResult.refetch();
  }, [queryResult]);

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
