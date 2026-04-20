import { useCallback, useEffect, useState } from "react";
import type { ListQueryState, PaginatedResource, ResourceClient } from "@/lib/resources";
import { parseListQueryState, updateUrlQuery } from "@/lib/resources";

const MINIMUM_LOADING_MS = 300;

type ResourceListState<T> =
  | { state: "loading"; data: PaginatedResource<T> | null }
  | { state: "loaded"; data: PaginatedResource<T> }
  | { state: "error"; data: PaginatedResource<T> | null; message: string };

export function useResourceList<TItem, TQuery extends ListQueryState>(client: ResourceClient<TItem, TQuery>) {
  const [query, setQuery] = useState<TQuery>(() => parseListQueryState(client.defaultQuery, window.location.search));
  const [dataState, setDataState] = useState<ResourceListState<TItem>>({
    state: "loading",
    data: null
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const handlePopState = () => {
      setQuery(parseListQueryState(client.defaultQuery, window.location.search));
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [client]);

  useEffect(() => {
    let active = true;
    setDataState((current) => ({ state: "loading", data: current.data }));

    Promise.all([
      client.list(query),
      new Promise((resolve) => window.setTimeout(resolve, MINIMUM_LOADING_MS))
    ])
      .then(([data]) => {
        if (active) {
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
  }, [client, query, reloadToken]);

  const updateQuery = useCallback((nextQuery: TQuery) => {
    setQuery(nextQuery);
    updateUrlQuery(nextQuery, client.defaultQuery);
  }, [client.defaultQuery]);

  const setSearch = useCallback((value: string) => {
    updateQuery({ ...query, q: value, page: 1 });
  }, [query, updateQuery]);

  const setFilter = useCallback((key: string, value: string | undefined) => {
    updateQuery({ ...query, [key]: value, page: 1 });
  }, [query, updateQuery]);

  const setSort = useCallback((sortBy: string) => {
    const nextDirection = query.sortBy === sortBy && query.sortDirection === "asc" ? "desc" : "asc";
    updateQuery({ ...query, sortBy, sortDirection: nextDirection, page: 1 });
  }, [query, updateQuery]);

  const setPage = useCallback((page: number) => {
    updateQuery({ ...query, page });
  }, [query, updateQuery]);

  const setPageSize = useCallback((pageSize: number) => {
    updateQuery({ ...query, pageSize, page: 1 });
  }, [query, updateQuery]);

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
