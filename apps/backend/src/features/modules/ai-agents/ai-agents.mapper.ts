import type { AiAgent, AiAgentTool } from "../../../platform/generated/prisma/index.js";
import type { AiAgent as ContractAiAgent } from "@synosec/contracts";

type AgentWithTools = AiAgent & {
  tools: Pick<AiAgentTool, "toolId" | "ord">[];
};

export function mapAiAgentRow(row: AgentWithTools): ContractAiAgent {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    description: row.description,
    providerId: row.providerId,
    systemPrompt: row.systemPrompt,
    modelOverride: row.modelOverride,
    toolIds: [...row.tools].sort((left, right) => left.ord - right.ord).map((tool) => tool.toolId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
