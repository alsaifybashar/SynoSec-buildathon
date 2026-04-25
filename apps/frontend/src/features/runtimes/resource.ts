import { apiRoutes, type ListRuntimesResponse, type Runtime } from "@synosec/contracts";
import { createResourceClient, type RuntimesQuery } from "@/shared/lib/resource-client";

export const runtimesResource = createResourceClient<Runtime, RuntimesQuery, ListRuntimesResponse>({
  path: apiRoutes.runtimes,
  dataKey: "runtimes",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    status: undefined,
    provider: undefined,
    environment: undefined
  }
});
