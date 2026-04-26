import { apiRoutes, type AiAgent, type ListAiAgentsResponse } from "@synosec/contracts";
import { createResourceClient, type AiAgentsQuery } from "@/shared/lib/resource-client";

export const aiAgentsResource = createResourceClient<AiAgent, AiAgentsQuery, ListAiAgentsResponse>({
  path: apiRoutes.aiAgents,
  dataKey: "agents",
  defaultQuery: {
    page: 1,
    pageSize: 25,
    q: "",
    sortBy: "name",
    sortDirection: "asc",
    status: undefined
  }
});
