import { apiRoutes, type ListWorkflowsResponse, type Workflow } from "@synosec/contracts";
import { createResourceClient, type WorkflowsQuery } from "@/shared/lib/resource-client";

export const workflowsResource = createResourceClient<Workflow, WorkflowsQuery, ListWorkflowsResponse>({
  path: apiRoutes.workflows,
  dataKey: "workflows",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    status: undefined,
    applicationId: undefined
  }
});
