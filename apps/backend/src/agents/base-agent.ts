import { randomUUID } from "crypto";
import type { AuditEntry, DfsNode, Finding, OsiLayer, ScanScope } from "@synosec/contracts";
import { createAuditEntry } from "../db/neo4j.js";
import type { LlmClient } from "../llm/client.js";
import { ScanToolRunner } from "../tools/scan-tools.js";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface AgentContext {
  scanId: string;
  scope: ScanScope;
  parentFindings: Finding[];
  roundSummary: string;
}

export interface AgentResult {
  findings: Omit<Finding, "id" | "createdAt">[];
  childNodes: Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">[];
  agentSummary: string;
}

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

export abstract class BaseAgent {
  constructor(protected readonly llmClient: LlmClient) {}

  abstract readonly agentId: string;
  abstract readonly layer: OsiLayer;

  protected validateScope(target: string, scope: ScanScope): boolean {
    // Check exclusions first
    for (const exclusion of scope.exclusions) {
      if (target === exclusion || target.startsWith(exclusion)) {
        return false;
      }
    }

    // Check target is within scope
    for (const scopeTarget of scope.targets) {
      if (target === scopeTarget || target.startsWith(scopeTarget)) {
        return true;
      }
      // Also allow reverse: if scope target is broader (CIDR prefix match)
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

  protected async generateJson<T>(params: {
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<T> {
    const text = await this.llmClient.generateText(params);
    return parseJsonResponse<T>(text);
  }

  protected createToolRunner(node: DfsNode, context: AgentContext): ScanToolRunner {
    return new ScanToolRunner({
      scanId: context.scanId,
      scope: context.scope,
      actor: this.agentId,
      targetNodeId: node.id
    });
  }

  abstract execute(node: DfsNode, context: AgentContext): Promise<AgentResult>;
}

function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const withoutFences = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(withoutFences) as T;
    } catch {
      const start = withoutFences.search(/[\[{]/);
      const end = Math.max(withoutFences.lastIndexOf("}"), withoutFences.lastIndexOf("]"));

      if (start >= 0 && end > start) {
        return JSON.parse(withoutFences.slice(start, end + 1)) as T;
      }

      throw new Error("LLM response did not contain valid JSON");
    }
  }
}
