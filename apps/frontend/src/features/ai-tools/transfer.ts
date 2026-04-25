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
    binary: tool.binary,
    executorType: "bash",
    bashSource: tool.bashSource ?? "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"imported tool\"}'",
    capabilities: tool.capabilities,
    category: tool.category,
    riskTier: tool.riskTier,
    notes: tool.notes,
    sandboxProfile: tool.sandboxProfile,
    privilegeProfile: tool.privilegeProfile,
    timeoutMs: tool.timeoutMs,
    constraintProfile: tool.constraintProfile,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema
  })
} satisfies ResourceTransferConfig<AiTool, CreateAiToolBody>;
