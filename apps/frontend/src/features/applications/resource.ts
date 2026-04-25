import { apiRoutes, type Application, type ListApplicationsResponse } from "@synosec/contracts";
import { createResourceClient, type ApplicationsQuery } from "@/shared/lib/resource-client";

export const applicationsResource = createResourceClient<Application, ApplicationsQuery, ListApplicationsResponse>({
  path: apiRoutes.applications,
  dataKey: "applications",
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
