import type { AiTool as PrismaAiTool } from "@prisma/client";
import type { AiTool } from "@synosec/contracts";
import { resolveToolExecutionFields, stripExecutionConfig } from "./tool-execution-config.js";

export function mapAiToolRow(row: PrismaAiTool): AiTool {
  const execution = resolveToolExecutionFields({
    id: row.id,
    name: row.name,
    binary: row.binary,
    category: row.category as AiTool["category"],
    riskTier: row.riskTier as AiTool["riskTier"]
  }, row.inputSchema);
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    source: row.source,
    description: row.description,
    binary: row.binary,
    category: row.category as AiTool["category"],
    riskTier: row.riskTier as AiTool["riskTier"],
    notes: row.notes,
    ...execution,
    inputSchema: stripExecutionConfig(row.inputSchema) as AiTool["inputSchema"],
    outputSchema: row.outputSchema as AiTool["outputSchema"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
