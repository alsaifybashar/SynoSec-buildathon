import type { AiTool as PrismaAiTool } from "../../../platform/generated/prisma/index.js";
import type { AiTool } from "@synosec/contracts";

export function mapAiToolRow(row: PrismaAiTool): AiTool {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    source: row.source,
    description: row.description,
    adapter: row.adapter === null ? undefined : row.adapter as AiTool["adapter"],
    binary: row.binary,
    category: row.category as AiTool["category"],
    riskTier: row.riskTier as AiTool["riskTier"],
    notes: row.notes,
    inputSchema: row.inputSchema as AiTool["inputSchema"],
    outputSchema: row.outputSchema as AiTool["outputSchema"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
