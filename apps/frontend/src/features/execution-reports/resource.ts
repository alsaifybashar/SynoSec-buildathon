import { apiRoutes, type ExecutionReportDetail, type ListExecutionReportsResponse } from "@synosec/contracts";
import { createResourceClient, type ExecutionReportsQuery } from "@/shared/lib/resource-client";

export const executionReportsResource = createResourceClient<ExecutionReportDetail, ExecutionReportsQuery, ListExecutionReportsResponse>({
  path: apiRoutes.executionReports,
  dataKey: "reports",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "generatedAt",
    sortDirection: "desc",
    executionKind: undefined,
    status: undefined
  },
  capabilities: {
    canCreate: false,
    canUpdate: () => false,
    canDelete: () => false
  }
});
