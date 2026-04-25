import { apiRoutes, type ListTargetsResponse, type Target } from "@synosec/contracts";
import { createResourceClient, type TargetsQuery } from "@/shared/lib/resource-client";

export const targetsResource = createResourceClient<Target, TargetsQuery, ListTargetsResponse>({
  path: apiRoutes.targets,
  dataKey: "targets",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    status: undefined,
    environment: undefined
  }
});
