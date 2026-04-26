import { apiRoutes, type AiTool, type ListAiToolsResponse } from "@synosec/contracts";
import { createResourceClient, type AiToolsQuery } from "@/shared/lib/resource-client";

export const aiToolsResource = createResourceClient<AiTool, AiToolsQuery, ListAiToolsResponse>({
  path: apiRoutes.aiTools,
  dataKey: "tools",
  capabilities: {
    canCreate: true,
    canUpdate: (tool) => tool.source !== "system",
    canDelete: (tool) => tool.source !== "system"
  },
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    surface: "primary",
    source: undefined,
    category: undefined,
    status: undefined,
    riskTier: undefined
  }
});
