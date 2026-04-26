import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { exportResourceRecords, importResourceRecords, type ResourceTransferConfig } from "@/shared/lib/resource-transfer";
import {
  parseListQueryState,
  type ListQueryState,
  type PaginatedResource
} from "./query-state";

const MINIMUM_LOADING_MS = 300;
const listCache = new WeakMap<object, Map<string, PaginatedResource<unknown>>>();

type ResourceListState<T> =
  | { state: "loading"; data: PaginatedResource<T> | null }
  | { state: "loaded"; data: PaginatedResource<T> }
  | { state: "error"; data: PaginatedResource<T> | null; message: string };

type ResourceDetailState<T> =
  | { state: "idle"; item: null }
  | { state: "loading"; item: null }
  | { state: "loaded"; item: T }
  | { state: "error"; item: null; message: string };

type ContextLoadState<TContext> =
  | { state: "idle"; context: TContext | null }
  | { state: "loading"; context: TContext | null }
  | { state: "loaded"; context: TContext }
  | { state: "error"; context: TContext | null; message: string };

type ValidationErrors<TFormValues> = Partial<Record<keyof TFormValues, string>> | Record<string, string>;

export type CrudDataPort<TItem, TQuery extends ListQueryState, TCreateBody, TUpdateBody = TCreateBody> = {
  list(query: TQuery): Promise<PaginatedResource<TItem>>;
  detail(id: string): Promise<TItem>;
  create(body: TCreateBody): Promise<TItem>;
  update(id: string, body: TUpdateBody): Promise<TItem>;
  remove(id: string): Promise<void>;
};

export type CrudFeatureRouteState<TQuery extends ListQueryState> = {
  query: TQuery;
  setSearch(value: string): void;
  setFilter(key: string, value: string | undefined): void;
  setSort(columnId: string): void;
  setPage(page: number): void;
  setPageSize(pageSize: number): void;
  refetchList(): void;
  reloadToken: number;
};

type ParseRequestBodyResult<TFormValues, TRequestBody> = {
  body?: TRequestBody;
  errors: ValidationErrors<TFormValues>;
};

export type CrudFeatureControllerConfig<
  TItem extends { id: string },
  TFormValues,
  TQuery extends ListQueryState,
  TContext,
  TCreateBody,
  TUpdateBody = TCreateBody
> = {
  recordLabel: string;
  titleLabel?: string;
  port: CrudDataPort<TItem, TQuery, TCreateBody, TUpdateBody>;
  transfer: ResourceTransferConfig<TItem, TCreateBody>;
  defaultQuery: TQuery;
  loadContext?: () => Promise<TContext>;
  createEmptyFormValues: (context: TContext | null) => TFormValues;
  toFormValues: (item: TItem) => TFormValues;
  parseRequestBody: (args: {
    formValues: TFormValues;
    context: TContext | null;
    item: TItem | null;
    isCreateMode: boolean;
  }) => ParseRequestBodyResult<TFormValues, TCreateBody | TUpdateBody>;
  getItemLabel?: (item: TItem) => string;
  isDirtyForm?: (formValues: TFormValues, initialValues: TFormValues) => boolean;
  applyContextDefaults?: (args: {
    formValues: TFormValues;
    context: TContext;
    initialValues: TFormValues;
    item: TItem | null;
    isCreateMode: boolean;
  }) => { formValues: TFormValues; initialValues?: TFormValues };
};

type ControllerArgs<TQuery extends ListQueryState> = {
  recordId?: string;
  routeState: CrudFeatureRouteState<TQuery>;
  onNavigateToList: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
};

function getCachedList<TItem>(client: object, key: string) {
  return (listCache.get(client)?.get(key) ?? null) as PaginatedResource<TItem> | null;
}

function setCachedList<TItem>(client: object, key: string, data: PaginatedResource<TItem>) {
  const current = listCache.get(client) ?? new Map<string, PaginatedResource<unknown>>();
  current.set(key, data as PaginatedResource<unknown>);
  listCache.set(client, current);
}

function withMinimumLoading<T>(promise: Promise<T>) {
  return Promise.all([
    promise,
    new Promise((resolve) => window.setTimeout(resolve, MINIMUM_LOADING_MS))
  ]).then(([value]) => value);
}

export function createCrudFeatureController<
  TItem extends { id: string },
  TFormValues,
  TQuery extends ListQueryState,
  TContext,
  TCreateBody,
  TUpdateBody = TCreateBody
>(config: CrudFeatureControllerConfig<TItem, TFormValues, TQuery, TContext, TCreateBody, TUpdateBody>) {
  const portCacheKey = { recordLabel: config.recordLabel };

  function useRouteState(): CrudFeatureRouteState<TQuery> {
    const location = useLocation();
    const navigate = useNavigate();
    const [query, setQuery] = useState<TQuery>(() => parseListQueryState(config.defaultQuery, location.search));
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
      setQuery(parseListQueryState(config.defaultQuery, location.search));
    }, [location.search]);

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
          if (rawValue === config.defaultQuery[key]) {
            continue;
          }
          params.set(key, String(rawValue));
        }

        const nextSearch = params.toString();
        const currentSearch = location.search.startsWith("?") ? location.search.slice(1) : location.search;
        if (currentSearch !== nextSearch) {
          navigate(
            { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
            { replace: true }
          );
        }

        return nextQuery;
      });
    }, [location.pathname, location.search, navigate]);

    return {
      query,
      setSearch: (value) => updateQuery((current) => ({ ...current, q: value, page: 1 })),
      setFilter: (key, value) => updateQuery((current) => ({ ...current, [key]: value, page: 1 })),
      setSort: (sortBy) => updateQuery((current) => ({
        ...current,
        sortBy,
        sortDirection: current.sortBy === sortBy && current.sortDirection === "asc" ? "desc" : "asc",
        page: 1
      })),
      setPage: (page) => updateQuery((current) => ({ ...current, page })),
      setPageSize: (pageSize) => updateQuery((current) => ({ ...current, pageSize, page: 1 })),
      refetchList: () => setReloadToken((current) => current + 1),
      reloadToken
    };
  }

  function useController(args: ControllerArgs<TQuery>) {
    const {
      recordId,
      routeState,
      onNavigateToList,
      onNavigateToDetail
    } = args;
    const {
      recordLabel,
      titleLabel = config.recordLabel,
      getItemLabel = (item: TItem) => ("name" in item && typeof item.name === "string" ? item.name : item.id)
    } = config;
    const location = useLocation();
    const [contextReloadToken, setContextReloadToken] = useState(0);
    const [contextState, setContextState] = useState<ContextLoadState<TContext>>(
      config.loadContext ? { state: "loading", context: null } : { state: "idle", context: null }
    );
    const [item, setItem] = useState<TItem | null>(null);
    const [formValues, setFormValues] = useState<TFormValues>(() => config.createEmptyFormValues(null));
    const [initialValues, setInitialValues] = useState<TFormValues>(() => config.createEmptyFormValues(null));
    const [errors, setErrors] = useState<ValidationErrors<TFormValues>>({});
    const [saving, setSaving] = useState(false);
    const initialCacheKey = `${location.pathname}${location.search}`;
    const initialCachedData = getCachedList<TItem>(portCacheKey, initialCacheKey);
    const [listDataState, setListDataState] = useState<ResourceListState<TItem>>(
      initialCachedData
        ? { state: "loaded", data: initialCachedData }
        : { state: "loading", data: null }
    );
    const [detailState, setDetailState] = useState<ResourceDetailState<TItem>>({ state: "idle", item: null });
    const hasLoadedRouteRef = useRef(false);
    const lastPathnameRef = useRef(location.pathname);
    const isCreateMode = recordId === "new";

    useEffect(() => {
      if (!config.loadContext) {
        return;
      }

      let active = true;
      setContextState((current) => ({
        state: "loading",
        context: current.context
      }));

      withMinimumLoading(config.loadContext())
        .then((context) => {
          if (!active) {
            return;
          }
          setContextState({ state: "loaded", context });
        })
        .catch((error) => {
          if (!active) {
            return;
          }
          const message = error instanceof Error ? error.message : "Failed to load dependencies.";
          setContextState((current) => ({
            state: "error",
            context: current.context,
            message
          }));
          toast.error(`Failed to load ${recordLabel.toLowerCase()} dependencies`, {
            description: message
          });
        });

      return () => {
        active = false;
      };
    }, [contextReloadToken, recordLabel]);

    useEffect(() => {
      let active = true;
      const currentPathname = location.pathname;
      const cacheKey = `${location.pathname}${location.search}`;
      const cachedData = getCachedList<TItem>(portCacheKey, cacheKey);
      const shouldDelay = cachedData === null && (!hasLoadedRouteRef.current || lastPathnameRef.current !== currentPathname);

      lastPathnameRef.current = currentPathname;
      setListDataState((current) => ({ state: "loading", data: cachedData ?? current.data }));

      const listRequest = config.port.list(routeState.query);
      const loadRequest = shouldDelay ? withMinimumLoading(listRequest) : listRequest;

      loadRequest
        .then((data) => {
          if (!active) {
            return;
          }
          setCachedList(portCacheKey, cacheKey, data);
          hasLoadedRouteRef.current = true;
          setListDataState({ state: "loaded", data });
        })
        .catch((error) => {
          if (!active) {
            return;
          }
          setListDataState({
            state: "error",
            data: null,
            message: error instanceof Error ? error.message : `Failed to load ${recordLabel.toLowerCase()}s.`
          });
        });

      return () => {
        active = false;
      };
    }, [location.pathname, location.search, recordLabel, routeState.query, routeState.reloadToken]);

    useEffect(() => {
      const empty = config.createEmptyFormValues(contextState.context);

      if (!recordId) {
        setDetailState({ state: "idle", item: null });
        return;
      }

      if (recordId === "new") {
        setItem(null);
        setDetailState({ state: "idle", item: null });
        setFormValues(empty);
        setInitialValues(empty);
        setErrors({});
        return;
      }

      let active = true;
      setDetailState({ state: "loading", item: null });
      setItem(null);
      setFormValues(empty);
      setInitialValues(empty);
      setErrors({});

      withMinimumLoading(config.port.detail(recordId))
        .then((loadedItem) => {
          if (!active) {
            return;
          }

          const nextValues = config.toFormValues(loadedItem);
          setItem(loadedItem);
          setFormValues(nextValues);
          setInitialValues(nextValues);
          setDetailState({ state: "loaded", item: loadedItem });
        })
        .catch((error) => {
          if (!active) {
            return;
          }

          const message = error instanceof Error ? error.message : `Failed to load ${titleLabel}.`;
          setDetailState({ state: "error", item: null, message });
          toast.error(`${titleLabel} not found`, { description: message });
          onNavigateToList();
        });

      return () => {
        active = false;
      };
    }, [config, contextState.context, onNavigateToList, recordId, titleLabel]);

    useEffect(() => {
      if (!config.applyContextDefaults || !isCreateMode || contextState.state !== "loaded") {
        return;
      }

      setFormValues((current) => {
        const next = config.applyContextDefaults?.({
          formValues: current,
          context: contextState.context,
          initialValues,
          item,
          isCreateMode: true
        });
        return next ? next.formValues : current;
      });
      setInitialValues((current) => {
        const next = config.applyContextDefaults?.({
          formValues,
          context: contextState.context,
          initialValues: current,
          item,
          isCreateMode: true
        });
        return next?.initialValues ?? current;
      });
    }, [config, contextState, formValues, initialValues, isCreateMode, item]);

    const isDirty = useMemo(() => {
      if (config.isDirtyForm) {
        return config.isDirtyForm(formValues, initialValues);
      }

      return JSON.stringify(formValues) !== JSON.stringify(initialValues);
    }, [formValues, initialValues]);

    const handleFieldChange = useCallback(<Key extends keyof TFormValues>(field: Key, value: TFormValues[Key]) => {
      setFormValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => {
        const next = { ...current } as Record<string, string | undefined>;
        delete next[String(field)];
        return next as ValidationErrors<TFormValues>;
      });
    }, []);

    const resetForm = useCallback(() => {
      setFormValues(initialValues);
      setErrors({});
    }, [initialValues]);

    const save = useCallback(async () => {
      const { body, errors: nextErrors } = config.parseRequestBody({
        formValues,
        context: contextState.context,
        item,
        isCreateMode
      });

      if (!body) {
        setErrors(nextErrors);
        toast.error("Validation failed", {
          description: `Fix the highlighted ${recordLabel.toLowerCase()} fields before saving.`
        });
        return null;
      }

      setSaving(true);

      try {
        if (isCreateMode || !item) {
          const created = await config.port.create(body as TCreateBody);
          routeState.refetchList();
          toast.success(`${recordLabel} created`);
          onNavigateToDetail(created.id, getItemLabel(created));
          return created;
        }

        const updated = await config.port.update(item.id, body as TUpdateBody);
        const nextValues = config.toFormValues(updated);
        setItem(updated);
        setFormValues(nextValues);
        setInitialValues(nextValues);
        setDetailState({ state: "loaded", item: updated });
        routeState.refetchList();
        toast.success(`${recordLabel} updated`);
        return updated;
      } catch (error) {
        toast.error(`${recordLabel} request failed`, {
          description: error instanceof Error ? error.message : "Unknown error"
        });
        return null;
      } finally {
        setSaving(false);
      }
    }, [config, contextState.context, formValues, getItemLabel, isCreateMode, item, onNavigateToDetail, recordLabel, routeState]);

    const exportCurrent = useCallback(() => {
      if (!item) {
        return;
      }
      exportResourceRecords(config.transfer, [item], `${recordLabel.toLowerCase().replaceAll(" ", "-")}-${getItemLabel(item)}`);
    }, [config.transfer, getItemLabel, item, recordLabel]);

    const importJson = useCallback(async (file: File) => {
      try {
        const created = await importResourceRecords(config.transfer, file);
        toast.success(created.length === 1 ? `${recordLabel} imported` : `${created.length} ${recordLabel.toLowerCase()}s imported`);
        routeState.refetchList();
      } catch (error) {
        toast.error(`${recordLabel} import failed`, {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }, [config.transfer, recordLabel, routeState]);

    const exportRowJson = useCallback((selected: TItem) => {
      exportResourceRecords(config.transfer, [selected], `${recordLabel.toLowerCase().replaceAll(" ", "-")}-${getItemLabel(selected)}`);
    }, [config.transfer, getItemLabel, recordLabel]);

    const deleteRow = useCallback(async (selected: TItem) => {
      await config.port.remove(selected.id);
      routeState.refetchList();
    }, [config.port, routeState]);

    return {
      context: contextState.context,
      contextState,
      refetchContext: () => setContextReloadToken((current) => current + 1),
      item,
      setItem,
      formValues,
      setFormValues,
      initialValues,
      setInitialValues,
      errors,
      saving,
      isCreateMode,
      isDirty,
      list: {
        dataState: listDataState,
        items: listDataState.data?.items ?? [],
        meta: listDataState.data ?? {
          items: [],
          page: routeState.query.page,
          pageSize: routeState.query.pageSize,
          total: 0,
          totalPages: 0
        }
      },
      detail: detailState,
      handleFieldChange,
      resetForm,
      save,
      exportCurrent,
      importJson,
      exportRowJson,
      deleteRow
    };
  }

  return {
    useRouteState,
    useController
  };
}
