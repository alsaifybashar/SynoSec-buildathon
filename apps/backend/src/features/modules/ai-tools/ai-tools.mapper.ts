import type { AiTool as PrismaAiTool } from "../../../platform/generated/prisma/index.js";
import type { AiTool } from "@synosec/contracts";
import { mapToolExecutionFields, stripExecutionConfig } from "./tool-execution-config.js";

export function mapAiToolRow(row: PrismaAiTool): AiTool {
  const execution = mapToolExecutionFields(row.inputSchema);
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
