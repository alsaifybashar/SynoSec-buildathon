import type { Workflow } from "../../generated/prisma/index.js";
import type { Workflow as ContractWorkflow } from "@synosec/contracts";

export function mapWorkflowRow(row: Workflow): ContractWorkflow {
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    status: row.status,
    maxDepth: row.maxDepth,
    targetMode: row.targetMode,
    applicationId: row.applicationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
