import type { AiAgent } from "@prisma/client";
import type { AiAgent as ContractAiAgent } from "@synosec/contracts";

export function mapAiAgentRow(row: AiAgent): ContractAiAgent {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    description: row.description,
    systemPrompt: row.systemPrompt,
    toolAccessMode: row.toolAccessMode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
