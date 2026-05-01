import { apiRoutes, type AiTool, type ListAiToolsResponse } from "@synosec/contracts";
import { createResourceClient, type AiToolsQuery } from "@/shared/lib/resource-client";

export const aiToolsResource = createResourceClient<AiTool, AiToolsQuery, ListAiToolsResponse>({
  path: apiRoutes.toolRegistry,
  dataKey: "tools",
  capabilities: {
    canCreate: false,
    canUpdate: () => false,
    canDelete: () => false
  },
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    accessProfile: undefined,
    source: undefined,
    category: undefined,
    status: undefined,
    riskTier: undefined
  }
});
