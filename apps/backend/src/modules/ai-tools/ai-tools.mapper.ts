import type { AiTool as PrismaAiTool } from "@prisma/client";
import type { AiTool } from "@synosec/contracts";
import { resolveToolExecutionFields, stripExecutionConfig } from "./tool-execution-config.js";

export function mapAiToolRow(row: PrismaAiTool): AiTool {
  const execution = resolveToolExecutionFields({
    id: row.id,
    name: row.name,
    category: row.category as AiTool["category"],
    riskTier: row.riskTier as AiTool["riskTier"]
  }, row.inputSchema);
  return {
    id: row.id,
    name: row.name,
    kind: "raw-adapter",
    status: row.status,
    source: "custom",
    description: row.description,
    builtinActionKey: null,
    category: row.category as AiTool["category"],
    riskTier: row.riskTier as AiTool["riskTier"],
    executorType: execution.executorType,
    bashSource: execution.bashSource,
    capabilities: execution.capabilities,
    timeoutMs: execution.timeoutMs,
    ...(execution.constraintProfile ? { constraintProfile: execution.constraintProfile } : {}),
    coveredToolIds: [],
    candidateToolIds: [],
    inputSchema: stripExecutionConfig(row.inputSchema) as AiTool["inputSchema"],
    outputSchema: row.outputSchema as AiTool["outputSchema"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
