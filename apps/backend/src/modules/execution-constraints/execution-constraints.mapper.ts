import type { ExecutionConstraint as PrismaExecutionConstraint } from "@prisma/client";
import type { ExecutionConstraint } from "@synosec/contracts";

export function mapExecutionConstraintRow(row: PrismaExecutionConstraint): ExecutionConstraint {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    provider: row.provider,
    version: row.version,
    description: row.description,
    ruleSpec: row.ruleSpec as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
