import { aiAgentsController } from "@/features/ai-agents/ai-agents.controller";
import { aiAgentsDefinition } from "@/features/ai-agents/definition";
import { DetailLoadingState, DetailPage } from "@/shared/components/detail-page";
import { ListPage } from "@/shared/components/list-page";

export function AiAgentsPage({
  agentId,
  agentNameHint,
  onNavigateToList,
  onNavigateToCreate,
  onNavigateToDetail
}: {
  agentId?: string;
  agentNameHint?: string;
  onNavigateToList: () => void;
  onNavigateToCreate: () => void;
  onNavigateToDetail: (id: string, label?: string) => void;
}) {
  const routeState = aiAgentsController.useRouteState();
  const controller = aiAgentsController.useController({
    ...(agentId ? { recordId: agentId } : {}),
    routeState,
    onNavigateToList,
    onNavigateToDetail
  });
  const breadcrumbsLabel = aiAgentsDefinition.detail.breadcrumbsLabel ?? aiAgentsDefinition.list.title;
  const context = controller.contextState.context ?? {
    tools: [],
    runtimeLabel: "Anthropic · claude-sonnet-4-6"
  };

  if (!agentId) {
    return (
      <ListPage
        title={aiAgentsDefinition.list.title}
        recordLabel={aiAgentsDefinition.recordLabel}
        columns={aiAgentsDefinition.list.columns(context)}
        query={routeState.query}
        dataState={controller.list.dataState}
        items={controller.list.items}
        meta={controller.list.meta}
        filters={aiAgentsDefinition.list.filters?.(context) ?? []}
        emptyMessage={aiAgentsDefinition.list.emptyMessage}
        onSearchChange={routeState.setSearch}
        onFilterChange={routeState.setFilter}
        onSortChange={routeState.setSort}
        onPageChange={routeState.setPage}
        onPageSizeChange={routeState.setPageSize}
        onRetry={routeState.refetchList}
        onAddRecord={onNavigateToCreate}
        onRowClick={(item) => onNavigateToDetail(item.id, aiAgentsDefinition.getItemLabel?.(item))}
        onImportJson={controller.importJson}
        onExportRowJson={controller.exportRowJson}
        onDeleteRow={controller.deleteRow}
        {...(aiAgentsDefinition.getItemLabel ? { getRowLabel: aiAgentsDefinition.getItemLabel } : {})}
      />
    );
  }

  if (controller.contextState.state !== "loaded") {
    return (
      <DetailLoadingState
        title={agentNameHint ?? aiAgentsDefinition.detail.loadingTitle}
        breadcrumbs={["Start", breadcrumbsLabel, agentNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message={controller.contextState.state === "error" ? controller.contextState.message : aiAgentsDefinition.detail.loadingMessage}
      />
    );
  }

  if (!controller.isCreateMode && controller.detail.state !== "loaded") {
    return (
      <DetailLoadingState
        title={agentNameHint ?? aiAgentsDefinition.detail.loadingTitle}
        breadcrumbs={["Start", breadcrumbsLabel, agentNameHint ?? "Loading"]}
        onBack={onNavigateToList}
        message={aiAgentsDefinition.detail.loadingMessage}
      />
    );
  }

  const title = controller.isCreateMode
    ? aiAgentsDefinition.detail.createTitle
    : controller.item
      ? aiAgentsDefinition.detail.getTitle?.(controller.item)
        ?? aiAgentsDefinition.getItemLabel?.(controller.item)
        ?? aiAgentsDefinition.detail.loadingTitle
      : aiAgentsDefinition.detail.loadingTitle;

  return (
    <DetailPage
      title={title}
      breadcrumbs={["Start", breadcrumbsLabel, controller.isCreateMode ? "New" : controller.item ? (aiAgentsDefinition.getItemLabel?.(controller.item) ?? "Detail") : "Detail"]}
      isDirty={controller.isDirty}
      isSaving={controller.saving}
      onBack={onNavigateToList}
      onSave={() => {
        void controller.save();
      }}
      onDismiss={controller.resetForm}
      {...(!controller.isCreateMode ? { onExportJson: controller.exportCurrent } : {})}
      {...(!controller.isCreateMode && controller.item && aiAgentsDefinition.detail.renderSidebar
        ? { sidebar: aiAgentsDefinition.detail.renderSidebar({ item: controller.item, context: controller.contextState.context }) }
        : {})}
    >
      {aiAgentsDefinition.detail.renderContent({
        item: controller.item,
        formValues: controller.formValues,
        errors: controller.errors,
        isCreateMode: controller.isCreateMode,
        context: controller.contextState.context,
        handleFieldChange: controller.handleFieldChange,
        setFormValues: controller.setFormValues
      })}
    </DetailPage>
  );
}
