import { randomUUID } from "crypto";
import type {
  AgentNote,
  AuditEntry,
  DfsNode,
  Finding,
  Observation,
  OsiLayer,
  ScanScope,
  ToolRun,
  ToolRequest
} from "@synosec/contracts";
import { createAuditEntry } from "../db/neo4j.js";
import type { LlmClient } from "../llm/client.js";
import { evidenceStore } from "../broker/evidence-store.js";
import { ScanToolRunner } from "../tools/scan-tools.js";

export interface AgentContext {
  scanId: string;
  scope: ScanScope;
  parentFindings: Finding[];
  roundSummary: string;
}

export interface AgentResult {
  requestedToolRuns: ToolRequest[];
  childNodes: Omit<DfsNode, "id" | "createdAt" | "scanId" | "parentId">[];
  agentSummary: string;
  /**
   * When `false`, the orchestrator will call `analyzeAndPlan` after running
   * these tool requests to get the next set of actions. When `true` or
   * `undefined`, the agentic loop stops for this node.
   */
  isDone?: boolean;
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

  protected publishNote(
    context: AgentContext,
    input: Omit<AgentNote, "id" | "scanId" | "agentId" | "createdAt">
  ): AgentNote {
    const agentNote: AgentNote = {
      id: randomUUID(),
      scanId: context.scanId,
      agentId: this.agentId,
      createdAt: new Date().toISOString(),
      ...input
    };
    evidenceStore.addAgentNote(agentNote);
    return agentNote;
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

  /**
   * Called after each tool batch runs. Receives all observations and findings
   * accumulated so far and decides whether to run more tools or stop.
   *
   * The default implementation always stops. Override in subclasses that need
   * an iterative reasoning loop (e.g. L4 error recovery, L7 follow-up probing).
   */
  async analyzeAndPlan(
    _node: DfsNode,
    _context: AgentContext,
    _observations: Observation[],
    _findings: Array<Omit<Finding, "id" | "createdAt">>,
    _iteration: number,
    _toolRuns: ToolRun[]
  ): Promise<AgentResult> {
    return {
      requestedToolRuns: [],
      childNodes: [],
      agentSummary: "Analysis complete — no further actions needed.",
      isDone: true
    };
  }
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
