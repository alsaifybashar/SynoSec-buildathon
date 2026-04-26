import type { AiAgent, AiAgentTool } from "@prisma/client";
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
    systemPrompt: row.systemPrompt,
    toolIds: [...row.tools].sort((left, right) => left.ord - right.ord).map((tool) => tool.toolId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
