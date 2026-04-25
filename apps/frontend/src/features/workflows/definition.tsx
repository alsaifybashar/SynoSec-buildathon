import { useEffect } from "react";
import { apiRoutes, type Workflow } from "@synosec/contracts";
import { useWorkflowDefinitionContext, type WorkflowDefinitionContext } from "@/features/workflows/context";
import { WorkflowConfigEditor, workflowStatusLabels } from "@/features/workflows/workflow-config-editor";
import {
  createEmptyFormValues,
  toWorkflowFormValues,
  toWorkflowRequestBody,
  validateWorkflowForm,
  type WorkflowFormValues
} from "@/features/workflows/workflow-form";
import { workflowTransfer } from "@/features/workflows/transfer";
import { workflowsResource } from "@/features/workflows/resource";
import type { CrudFeatureDefinition } from "@/shared/crud/crud-feature";
import { DetailSidebarItem } from "@/shared/components/detail-page";
import type { WorkflowsQuery } from "@/shared/lib/resource-client";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export const workflowsDefinition: CrudFeatureDefinition<
  Workflow,
  WorkflowFormValues,
  ReturnType<typeof toWorkflowRequestBody>,
  WorkflowsQuery,
  WorkflowDefinitionContext
> = {
  recordLabel: "Workflow",
  titleLabel: "workflow",
  route: apiRoutes.workflows,
  resource: workflowsResource,
  transfer: workflowTransfer,
  useContext: useWorkflowDefinitionContext,
  useSetup: ({ recordId, context, formValues, setFormValues, setInitialValues }) => {
    useEffect(() => {
      if (recordId !== "new") {
        return;
      }

      if (!context.defaultApplicationId && !context.defaultAgentId) {
        return;
      }

      if (formValues.applicationId || formValues.agentId) {
        return;
      }

      const nextValues = createEmptyFormValues(context.defaultApplicationId, "", context.defaultAgentId);
      setFormValues(nextValues);
      setInitialValues(nextValues);
    }, [context.defaultAgentId, context.defaultApplicationId, formValues.agentId, formValues.applicationId, recordId, setFormValues, setInitialValues]);
  },
  createEmptyFormValues: (context) => createEmptyFormValues(context.defaultApplicationId, "", context.defaultAgentId),
  toFormValues: toWorkflowFormValues,
  parseRequestBody: (formValues) => {
    const errors = validateWorkflowForm(formValues);
    if (Object.keys(errors).length > 0) {
      return { errors };
    }

    return {
      body: toWorkflowRequestBody(formValues),
      errors: {}
    };
  },
  getItemLabel: (workflow) => workflow.name,
  list: {
    title: "Workflows",
    emptyMessage: "No workflows have been configured yet.",
    columns: (context) => [
      { id: "name", header: "Name", cell: (row) => <span className="font-medium text-foreground">{row.name}</span> },
      { id: "applicationId", header: "Target", cell: (row) => <span className="text-muted-foreground">{context.applicationLookup[row.applicationId] ?? "Unknown"}</span> },
      { id: "agentId", header: "Agent", cell: (row) => <span className="text-muted-foreground">{context.agentLookup[row.agentId]?.name ?? "Unknown"}</span> }
    ],
    filters: () => []
  },
  detail: {
    loadingTitle: "Workflow detail",
    loadingMessage: "Loading workflow...",
    createTitle: "New workflow",
    renderSidebar: ({ item, context }) => (
      <>
        <DetailSidebarItem label="Status">{workflowStatusLabels[item.status]}</DetailSidebarItem>
        <DetailSidebarItem label="Application">{context.applicationLookup[item.applicationId] ?? "Unknown"}</DetailSidebarItem>
        <DetailSidebarItem label="Agent">{context.agentLookup[item.agentId]?.name ?? "Unknown"}</DetailSidebarItem>
        <DetailSidebarItem label="Allowed tools">
          {item.allowedToolIds.length > 0 ? item.allowedToolIds.length : context.agentLookup[item.agentId]?.toolIds.length ?? 0}
        </DetailSidebarItem>
        <DetailSidebarItem label="Updated">{formatTimestamp(item.updatedAt)}</DetailSidebarItem>
      </>
    ),
    renderContent: ({ formValues, errors, context, handleFieldChange }) => {
      const filteredRuntimes = context.runtimes.filter(
        (runtime) => !formValues.applicationId || runtime.applicationId === formValues.applicationId
      );

      return (
        <WorkflowConfigEditor
          formValues={formValues}
          errors={errors as Record<string, string>}
          applications={context.applications}
          agents={context.agents}
          agentLookup={context.agentLookup}
          toolLookup={context.toolLookup}
          filteredRuntimes={filteredRuntimes}
          onFieldChange={handleFieldChange}
        />
      );
    }
  }
};
