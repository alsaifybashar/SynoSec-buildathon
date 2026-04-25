import {
  apiRoutes,
  type ExecutionConstraint,
  type ListExecutionConstraintsResponse
} from "@synosec/contracts";
import { createResourceClient, type ExecutionConstraintsQuery } from "@/shared/lib/resource-client";

export const executionConstraintsResource = createResourceClient<
  ExecutionConstraint,
  ExecutionConstraintsQuery,
  ListExecutionConstraintsResponse
>({
  path: apiRoutes.executionConstraints,
  dataKey: "constraints",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    kind: undefined,
    provider: undefined
  }
});
