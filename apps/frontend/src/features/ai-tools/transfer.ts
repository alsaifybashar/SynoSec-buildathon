import {
  aiToolSchema,
  apiRoutes,
  createAiToolBodySchema,
  type AiTool,
  type CreateAiToolBody
} from "@synosec/contracts";
import { type ResourceTransferConfig } from "@/shared/lib/resource-transfer";

export const aiToolTransfer = {
  table: "ai-tools",
  route: apiRoutes.aiTools,
  itemSchema: aiToolSchema,
  createBodySchema: createAiToolBodySchema,
  toCreateBody: (tool: AiTool): CreateAiToolBody => ({
    name: tool.name,
    status: tool.status,
    source: "custom",
    description: tool.description ?? "",
    executorType: "bash",
    bashSource: tool.bashSource ?? "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"imported tool\"}'",
    category: tool.category,
    riskTier: tool.riskTier,
    timeoutMs: tool.timeoutMs,
    constraintProfile: tool.constraintProfile,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema
  })
} satisfies ResourceTransferConfig<AiTool, CreateAiToolBody>;
