import { randomUUID } from "crypto";
import type {
  AuditEntry,
  DfsNode,
  Finding,
  GraceAgentContext,
  OsiLayer,
  ScanScope,
  ToolRequest
} from "@synosec/contracts";
import { createAuditEntry } from "../db/neo4j.js";

export interface AgentContext {
  scanId: string;
  scope: ScanScope;
  parentFindings: Finding[];
  roundSummary: string;
  graceContext?: GraceAgentContext;
}

export interface AgentResult {
  requestedToolRuns: ToolRequest[];
  childNodes: Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">[];
  agentSummary: string;
}

export abstract class BaseAgent {
  abstract readonly agentId: string;
  abstract readonly layer: OsiLayer;

  protected validateScope(target: string, scope: ScanScope): boolean {
    for (const exclusion of scope.exclusions) {
      if (target === exclusion || target.startsWith(exclusion)) {
        return false;
      }
    }

    for (const scopeTarget of scope.targets) {
      if (target === scopeTarget || target.startsWith(scopeTarget)) {
        return true;
      }
      if (scopeTarget.startsWith(target)) {
        return true;
      }
    }

    return false;
  }

  protected async audit(
    scanId: string,
    action: string,
    targetNodeId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    const entry: AuditEntry = {
      id: randomUUID(),
      scanId,
      timestamp: new Date().toISOString(),
      actor: this.agentId,
      action,
      targetNodeId,
      scopeValid: true,
      details
    };
    await createAuditEntry(entry);
  }

  abstract execute(node: DfsNode, context: AgentContext): Promise<AgentResult>;
}
