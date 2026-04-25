import { apiRoutes, type AiProvider, type ListAiProvidersResponse } from "@synosec/contracts";
import { createResourceClient, type AiProvidersQuery } from "@/shared/lib/resource-client";

export const aiProvidersResource = createResourceClient<AiProvider, AiProvidersQuery, ListAiProvidersResponse>({
  path: apiRoutes.aiProviders,
  dataKey: "providers",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    kind: undefined,
    status: undefined
  }
});
