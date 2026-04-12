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
import type { LlmClient } from "../llm/client.js";

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
  constructor(protected readonly llmClient: LlmClient) {}

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

  protected async generateJson<T>(params: {
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<T> {
    const text = await this.llmClient.generateText(params);
    return parseJsonResponse<T>(text);
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
