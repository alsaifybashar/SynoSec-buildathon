import {
  aiAgentSchema,
  apiRoutes,
  createAiAgentBodySchema,
  type AiAgent,
  type CreateAiAgentBody
} from "@synosec/contracts";
import { type ResourceTransferConfig } from "@/shared/lib/resource-transfer";

export const aiAgentTransfer = {
  table: "ai-agents",
  route: apiRoutes.aiAgents,
  itemSchema: aiAgentSchema,
  createBodySchema: createAiAgentBodySchema,
  toCreateBody: (agent: AiAgent): CreateAiAgentBody => ({
    name: agent.name,
    status: agent.status,
    description: agent.description,
    providerId: agent.providerId,
    systemPrompt: agent.systemPrompt,
    modelOverride: agent.modelOverride,
    toolIds: agent.toolIds
  })
} satisfies ResourceTransferConfig<AiAgent, CreateAiAgentBody>;
