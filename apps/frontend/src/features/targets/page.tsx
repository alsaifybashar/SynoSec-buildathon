import { targetsController } from "@/features/targets/targets.controller";
import { targetsDefinition } from "@/features/targets/definition";
import { DetailLoadingState, DetailPage } from "@/shared/components/detail-page";
import { ListPage } from "@/shared/components/list-page";

export function TargetsPage({
  targetId,
  targetNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  targetId?: string;
  targetNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  const routeState = targetsController.useRouteState();
  const controller = targetsController.useController({
    ...(targetId ? { recordId: targetId } : {}),
    routeState,
    onNavigateToList,
    onNavigateToDetail
  });
  const breadcrumbsLabel = targetsDefinition.detail.breadcrumbsLabel ?? targetsDefinition.list.title;

  if (!targetId) {
    return (
      <ListPage
        title={targetsDefinition.list.title}
        recordLabel={targetsDefinition.recordLabel}
        columns={targetsDefinition.list.columns(undefined)}
        query={routeState.query}
        dataState={controller.list.dataState}
        items={controller.list.items}
        meta={controller.list.meta}
        filters={targetsDefinition.list.filters?.(undefined) ?? []}
        emptyMessage={targetsDefinition.list.emptyMessage}
        onSearchChange={routeState.setSearch}
        onFilterChange={routeState.setFilter}
        onSortChange={routeState.setSort}
        onPageChange={routeState.setPage}
        onPageSizeChange={routeState.setPageSize}
        onRetry={routeState.refetchList}
        onAddRecord={onNavigateToCreate}
        onRowClick={(item) => onNavigateToDetail(item.id, targetsDefinition.getItemLabel?.(item))}
        onImportJson={controller.importJson}
        onExportRowJson={controller.exportRowJson}
        onDeleteRow={controller.deleteRow}
        {...(targetsDefinition.getItemLabel ? { getRowLabel: targetsDefinition.getItemLabel } : {})}
      />
    );
  }

  if (!controller.isCreateMode && controller.detail.state !== "loaded") {
    return (
      <DetailLoadingState
        title={targetNameHint ?? targetsDefinition.detail.loadingTitle}
        breadcrumbs={["Start", breadcrumbsLabel, targetNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message={targetsDefinition.detail.loadingMessage}
      />
    );
  }

  const title = controller.isCreateMode
    ? targetsDefinition.detail.createTitle
    : controller.item
      ? targetsDefinition.detail.getTitle?.(controller.item)
        ?? targetsDefinition.getItemLabel?.(controller.item)
        ?? targetsDefinition.detail.loadingTitle
      : targetsDefinition.detail.loadingTitle;

  return (
    <DetailPage
      title={title}
      breadcrumbs={["Start", breadcrumbsLabel, controller.isCreateMode ? "New" : controller.item ? (targetsDefinition.getItemLabel?.(controller.item) ?? "Detail") : "Detail"]}
      isDirty={controller.isDirty}
      isSaving={controller.saving}
      onBack={onNavigateToList}
      onSave={() => {
        void controller.save();
      }}
      onDismiss={controller.resetForm}
      {...(!controller.isCreateMode ? { onExportJson: controller.exportCurrent } : {})}
      {...(!controller.isCreateMode && controller.item && targetsDefinition.detail.renderSidebar
        ? { sidebar: targetsDefinition.detail.renderSidebar({ item: controller.item, context: undefined }) }
        : {})}
    >
      {targetsDefinition.detail.renderContent({
        item: controller.item,
        formValues: controller.formValues,
        errors: controller.errors,
        isCreateMode: controller.isCreateMode,
        context: undefined,
        handleFieldChange: controller.handleFieldChange,
        setFormValues: controller.setFormValues
      })}
    </DetailPage>
  );
}
