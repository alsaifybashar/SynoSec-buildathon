import { useCallback, type ReactNode } from "react";
import { useCrudPage, type ValidationErrors } from "@/shared/crud/use-crud-page";
import { DetailLoadingState, DetailPage } from "@/shared/components/detail-page";
import { ListPage, type ListPageColumn, type ListPageFilter } from "@/shared/components/list-page";
import type { ListQueryState, ResourceClient } from "@/shared/lib/resource-client";
import type { ResourceTransferConfig } from "@/shared/lib/resource-transfer";

export type CrudFeaturePageProps = {
  recordId?: string | undefined;
  recordNameHint?: string | undefined;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
};

type CrudDefinitionContextHook<TContext> = () => TContext;

type CrudDetailRenderArgs<
  TItem extends { id: string },
  TFormValues,
  TContext
> = {
  item: TItem | null;
  formValues: TFormValues;
  errors: ValidationErrors<TFormValues>;
  isCreateMode: boolean;
  context: TContext;
  handleFieldChange: <Key extends keyof TFormValues>(field: Key, value: TFormValues[Key]) => void;
  setFormValues: React.Dispatch<React.SetStateAction<TFormValues>>;
};

type CrudSidebarRenderArgs<
  TItem extends { id: string },
  TContext
> = {
  item: TItem;
  context: TContext;
};

type CrudPageLifecycleArgs<
  TItem extends { id: string },
  TFormValues,
  TContext
> = {
  recordId?: string | undefined;
  context: TContext;
  item: TItem | null;
  formValues: TFormValues;
  handleFieldChange: <Key extends keyof TFormValues>(field: Key, value: TFormValues[Key]) => void;
  setFormValues: React.Dispatch<React.SetStateAction<TFormValues>>;
  setInitialValues: React.Dispatch<React.SetStateAction<TFormValues>>;
};

export type CrudFeatureDefinition<
  TItem extends { id: string },
  TFormValues,
  TRequestBody,
  TQuery extends ListQueryState,
  TContext = undefined
> = {
  recordLabel: string;
  titleLabel?: string;
  route: string;
  resource: ResourceClient<TItem, TQuery>;
  transfer: ResourceTransferConfig<TItem, TRequestBody>;
  createEmptyFormValues: (context: TContext) => TFormValues;
  toFormValues: (item: TItem) => TFormValues;
  parseRequestBody: (formValues: TFormValues) => {
    body?: TRequestBody;
    errors: ValidationErrors<TFormValues>;
  };
  getItemLabel?: (item: TItem) => string;
  useContext?: CrudDefinitionContextHook<TContext>;
  useSetup?: (args: CrudPageLifecycleArgs<TItem, TFormValues, TContext>) => void;
  list: {
    title: string;
    emptyMessage: string;
    columns: (context: TContext) => ListPageColumn<TItem>[];
    filters?: (context: TContext) => ListPageFilter[];
  };
  detail: {
    loadingTitle: string;
    loadingMessage: string;
    createTitle: string;
    breadcrumbsLabel?: string;
    getTitle?: (item: TItem) => string;
    getSubtitle?: (item: TItem, context: TContext) => string | undefined;
    getTimestamp?: (item: TItem, context: TContext) => string | undefined;
    renderContent: (args: CrudDetailRenderArgs<TItem, TFormValues, TContext>) => ReactNode;
    renderSidebar?: (args: CrudSidebarRenderArgs<TItem, TContext>) => ReactNode;
  };
};

function useNoopContext(): undefined {
  return undefined;
}

function useNoopSetup() {}

export function createCrudFeaturePage<
  TItem extends { id: string },
  TFormValues,
  TRequestBody,
  TQuery extends ListQueryState,
  TContext = undefined
>(definition: CrudFeatureDefinition<TItem, TFormValues, TRequestBody, TQuery, TContext>) {
  const useFeatureContext = (definition.useContext ?? useNoopContext) as CrudDefinitionContextHook<TContext>;
  const useFeatureSetup = (definition.useSetup ?? useNoopSetup) as (
    args: CrudPageLifecycleArgs<TItem, TFormValues, TContext>
  ) => void;

  return function CrudFeaturePage(props: CrudFeaturePageProps) {
    const {
      recordId,
      recordNameHint,
      onNavigateToList,
      onNavigateToCreate,
      onNavigateToDetail
    } = props;

    const context = useFeatureContext();
    const createEmptyFormValues = useCallback(() => definition.createEmptyFormValues(context), [context]);
    const crud = useCrudPage({
      recordLabel: definition.recordLabel,
      ...(definition.titleLabel ? { titleLabel: definition.titleLabel } : {}),
      recordId,
      route: definition.route,
      resource: definition.resource,
      transfer: definition.transfer,
      createEmptyFormValues,
      toFormValues: definition.toFormValues,
      parseRequestBody: definition.parseRequestBody,
      onNavigateToList,
      onNavigateToDetail,
      ...(definition.getItemLabel ? { getItemLabel: definition.getItemLabel } : {})
    });

    useFeatureSetup({
      recordId,
      context,
      item: crud.item,
      formValues: crud.formValues,
      handleFieldChange: crud.handleFieldChange,
      setFormValues: crud.setFormValues,
      setInitialValues: crud.setInitialValues
    });

    const columns = definition.list.columns(context);
    const filters = definition.list.filters?.(context) ?? [];
    const breadcrumbsLabel = definition.detail.breadcrumbsLabel ?? definition.list.title;

    if (!recordId) {
      return (
        <ListPage
          title={definition.list.title}
          recordLabel={definition.recordLabel}
          columns={columns}
          query={crud.list.query}
          dataState={crud.list.dataState}
          items={crud.list.items}
          meta={crud.list.meta}
          filters={filters}
          emptyMessage={definition.list.emptyMessage}
          onSearchChange={crud.list.setSearch}
          onFilterChange={crud.list.setFilter}
          onSortChange={crud.list.setSort}
          onPageChange={crud.list.setPage}
          onPageSizeChange={crud.list.setPageSize}
          onRetry={crud.list.refetch}
          onAddRecord={onNavigateToCreate}
          onRowClick={(item) => onNavigateToDetail(item.id, definition.getItemLabel?.(item))}
          onImportJson={crud.importJson}
          {...(definition.getItemLabel ? { getRowLabel: definition.getItemLabel } : {})}
          onExportRowJson={crud.exportRowJson}
          onDeleteRow={crud.deleteRow}
        />
      );
    }

    if (!crud.isCreateMode && crud.detail.state !== "loaded") {
      return (
        <DetailLoadingState
          title={recordNameHint ?? definition.detail.loadingTitle}
          breadcrumbs={["Start", breadcrumbsLabel, recordNameHint ?? "Loading"]}
          onBack={onNavigateToList}
          message={definition.detail.loadingMessage}
        />
      );
    }

    const title = crud.isCreateMode
      ? definition.detail.createTitle
      : crud.item
      ? definition.detail.getTitle?.(crud.item) ?? definition.getItemLabel?.(crud.item) ?? definition.detail.loadingTitle
      : definition.detail.loadingTitle;

    return (
      <DetailPage
        title={title}
        breadcrumbs={["Start", breadcrumbsLabel, crud.isCreateMode ? "New" : crud.item ? (definition.getItemLabel?.(crud.item) ?? "Detail") : "Detail"]}
        {...(!crud.isCreateMode && crud.item && definition.detail.getSubtitle
          ? (() => {
              const subtitle = definition.detail.getSubtitle?.(crud.item, context);
              return subtitle ? { subtitle } : {};
            })()
          : {})}
        {...(!crud.isCreateMode && crud.item && definition.detail.getTimestamp
          ? (() => {
              const timestamp = definition.detail.getTimestamp?.(crud.item, context);
              return timestamp ? { timestamp } : {};
            })()
          : {})}
        isDirty={crud.isDirty}
        isSaving={crud.saving}
        onBack={onNavigateToList}
        onSave={() => {
          void crud.save();
        }}
        onDismiss={crud.resetForm}
        {...(!crud.isCreateMode ? { onExportJson: crud.exportCurrent } : {})}
        {...(!crud.isCreateMode && crud.item && definition.detail.renderSidebar
          ? { sidebar: definition.detail.renderSidebar({ item: crud.item, context }) }
          : {})}
      >
        {definition.detail.renderContent({
          item: crud.item,
          formValues: crud.formValues,
          errors: crud.errors,
          isCreateMode: crud.isCreateMode,
          context,
          handleFieldChange: crud.handleFieldChange,
          setFormValues: crud.setFormValues
        })}
      </DetailPage>
    );
  };
}
