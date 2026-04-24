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
    source: tool.source,
    description: tool.description ?? "",
    binary: tool.binary,
    executorType: tool.executorType,
    bashSource: tool.bashSource,
    capabilities: tool.capabilities,
    category: tool.category,
    riskTier: tool.riskTier,
    notes: tool.notes,
    sandboxProfile: tool.sandboxProfile,
    privilegeProfile: tool.privilegeProfile,
    timeoutMs: tool.timeoutMs,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema
  })
} satisfies ResourceTransferConfig<AiTool, CreateAiToolBody>;
